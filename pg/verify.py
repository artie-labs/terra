#!/usr/bin/env python3
"""verify.py: compare the Terra source database with a replication destination.

For every base table in the source's public schema it compares:

  columns   name and, for a Postgres destination, data type
  rows      count (destination rows flagged __artie_delete are excluded)
  checksum  md5 over every row's text form, ordered by primary key
            (Postgres destinations only; see --dest-type)

Standard library only. Postgres is reached through the psql binary, Snowflake
through snowsql, BigQuery through bq. The Snowflake and BigQuery paths compare
columns, row counts and the sum of the primary key, not a checksum, because the
text form of timestamps and numerics differs by engine. They have not been run
against a real destination yet; see pg/README.md "Verify".

  python3 verify.py                                   # source 5432 vs subscriber 5433
  python3 verify.py --wait 120                        # retry for up to 120 s
  python3 verify.py --dest-type snowflake --dest "TERRA.PUBLIC" --wait 600
  python3 verify.py --dest-type bigquery  --dest "my-project.terra"

Exit status is 0 when every table matches, 1 otherwise.
"""

import argparse
import os
import subprocess
import sys
import time

DEFAULT_SOURCE = "postgresql://postgres:change-me-admin-password@localhost:5432/terra"
DEFAULT_DEST = "postgresql://postgres:change-me-admin-password@localhost:5433/terra"
SKIP_TABLES = {"test_heartbeat_table"}
NULL_TOKEN = "<null>"


def run(cmd, stdin=None):
    result = subprocess.run(cmd, input=stdin, text=True, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"{cmd[0]} failed")
    return result.stdout


def psql_rows(dsn, sql):
    out = run(["psql", dsn, "-X", "-q", "-At", "-F", "\t", "-v", "ON_ERROR_STOP=1"], "SET TIME ZONE 'UTC';\n" + sql)
    return [line.split("\t") for line in out.splitlines() if line != ""]


def quote(ident):
    return '"' + ident.replace('"', '""') + '"'


class PostgresSide:
    def __init__(self, dsn):
        self.dsn = dsn

    def tables(self):
        rows = psql_rows(self.dsn, (
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
        ))
        return [r[0] for r in rows if r[0] not in SKIP_TABLES]

    def columns(self, table):
        rows = psql_rows(self.dsn, (
            "SELECT column_name, data_type FROM information_schema.columns "
            f"WHERE table_schema = 'public' AND table_name = '{table}' ORDER BY column_name"
        ))
        return {name: dtype for name, dtype in rows}

    def primary_key(self, table):
        rows = psql_rows(self.dsn, (
            "SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid "
            "AND a.attnum = ANY(i.indkey) WHERE i.indrelid = 'public." + table + "'::regclass "
            "AND i.indisprimary ORDER BY array_position(i.indkey, a.attnum)"
        ))
        return [r[0] for r in rows]

    def summary(self, table, columns, pk):
        cols = [c for c in sorted(columns) if not c.startswith("__artie_")]
        where = "WHERE NOT coalesce(__artie_delete, false)" if "__artie_delete" in columns else ""
        row_text = ", ".join(f"coalesce({quote(c)}::text, '{NULL_TOKEN}')" for c in cols)
        order = ", ".join(quote(c) for c in pk) if pk else "1"
        sql = (
            f"SELECT count(*), coalesce(md5(string_agg(h, ',' ORDER BY {order})), '') "
            f"FROM (SELECT md5(concat_ws('|', {row_text})) AS h, {', '.join(quote(c) for c in pk) or '1'} "
            f"FROM {quote(table)} {where}) s"
        )
        count, checksum = psql_rows(self.dsn, sql)[0]
        return {"rows": int(count), "checksum": checksum, "columns": {c: columns[c] for c in cols}}


class SnowflakeSide:
    """Destination reached through the snowsql CLI. --dest is DATABASE.SCHEMA."""

    kind = "snowflake"

    def __init__(self, target):
        self.database, self.schema = target.split(".", 1)

    def query(self, sql):
        out = run(["snowsql", "-o", "friendly=false", "-o", "header=false", "-o", "timing=false",
                   "-o", "output_format=tsv", "-q", sql])
        return [line.split("\t") for line in out.splitlines() if line.strip()]

    def columns(self, table):
        rows = self.query(
            f"SELECT lower(column_name), data_type FROM {self.database}.information_schema.columns "
            f"WHERE table_schema = '{self.schema.upper()}' AND table_name = '{table.upper()}'"
        )
        return {name: dtype for name, dtype in rows}

    def summary(self, table, columns, pk):
        where = "WHERE NOT coalesce(__artie_delete, false)" if "__artie_delete" in columns else ""
        pk_sum = f"sum({pk[0]})" if pk else "0"
        count, total = self.query(f"SELECT count(*), coalesce({pk_sum}, 0) FROM {self.database}.{self.schema}.{table} {where}")[0]
        cols = [c for c in sorted(columns) if not c.startswith("__artie_")]
        return {"rows": int(count), "pk_sum": int(float(total)), "columns": {c: columns[c] for c in cols}}


class BigQuerySide:
    """Destination reached through the bq CLI. --dest is project.dataset."""

    kind = "bigquery"

    def __init__(self, target):
        self.project, self.dataset = target.split(".", 1)

    def query(self, sql):
        out = run(["bq", "query", "--nouse_legacy_sql", "--format=csv", "--quiet", sql])
        lines = [line for line in out.splitlines() if line.strip()]
        return [line.split(",") for line in lines[1:]]

    def columns(self, table):
        rows = self.query(
            f"SELECT lower(column_name), data_type FROM `{self.project}.{self.dataset}`.INFORMATION_SCHEMA.COLUMNS "
            f"WHERE table_name = '{table}'"
        )
        return {name: dtype for name, dtype in rows}

    def summary(self, table, columns, pk):
        where = "WHERE NOT coalesce(__artie_delete, false)" if "__artie_delete" in columns else ""
        pk_sum = f"sum({pk[0]})" if pk else "0"
        count, total = self.query(f"SELECT count(*), coalesce({pk_sum}, 0) FROM `{self.project}.{self.dataset}.{table}` {where}")[0]
        cols = [c for c in sorted(columns) if not c.startswith("__artie_")]
        return {"rows": int(count), "pk_sum": int(float(total)), "columns": {c: columns[c] for c in cols}}


def compare_once(source, dest, dest_type, tables):
    results = []
    for table in tables:
        src_cols = source.columns(table)
        pk = source.primary_key(table)
        src = source.summary(table, src_cols, pk)
        problems = []
        try:
            dst_cols = dest.columns(table)
            if not dst_cols:
                problems.append("missing on destination")
                dst = None
            else:
                dst = dest.summary(table, dst_cols, pk)
        except RuntimeError as error:
            problems.append(str(error).splitlines()[0][:120])
            dst = None
        if dst is not None:
            missing = sorted(set(src["columns"]) - set(dst["columns"]))
            extra = sorted(set(dst["columns"]) - set(src["columns"]))
            if missing:
                problems.append("destination lacks " + ", ".join(missing))
            if extra:
                problems.append("destination has extra " + ", ".join(extra))
            if dest_type == "postgres":
                mismatched = [c for c in src["columns"] if c in dst["columns"] and src["columns"][c] != dst["columns"][c]]
                if mismatched:
                    problems.append("type differs: " + ", ".join(f"{c} {src['columns'][c]} vs {dst['columns'][c]}" for c in mismatched))
                if src["checksum"] != dst["checksum"]:
                    problems.append("checksum differs")
            else:
                src_pk_sum = None
                if pk:
                    src_pk_sum = int(psql_rows(source.dsn, f"SELECT coalesce(sum({quote(pk[0])}), 0) FROM {quote(table)}")[0][0])
                if src_pk_sum is not None and src_pk_sum != dst["pk_sum"]:
                    problems.append("primary key sum differs")
            if src["rows"] != dst["rows"]:
                problems.append(f"rows {src['rows']} vs {dst['rows']}")
        results.append({"table": table, "source_rows": src["rows"], "dest_rows": dst["rows"] if dst else None,
                        "columns": len(src["columns"]), "problems": problems})
    return results


def render(results, dest_type):
    width = max(len(r["table"]) for r in results) if results else 10
    print(f"{'table':<{width}}  {'src rows':>9}  {'dst rows':>9}  cols  status")
    for r in results:
        dst_rows = "-" if r["dest_rows"] is None else str(r["dest_rows"])
        status = "ok" if not r["problems"] else "; ".join(r["problems"])
        print(f"{r['table']:<{width}}  {r['source_rows']:>9}  {dst_rows:>9}  {r['columns']:>4}  {status}")
    if dest_type != "postgres":
        print(f"note: {dest_type} compare is columns + row count + primary key sum, no checksum")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source", default=os.environ.get("SOURCE_DSN", DEFAULT_SOURCE))
    parser.add_argument("--dest", default=os.environ.get("DEST_DSN", DEFAULT_DEST))
    parser.add_argument("--dest-type", choices=["postgres", "snowflake", "bigquery"], default="postgres")
    parser.add_argument("--tables", help="comma separated subset; default is every base table in the source")
    parser.add_argument("--wait", type=float, default=0, help="seconds to keep retrying until everything matches")
    parser.add_argument("--interval", type=float, default=2)
    args = parser.parse_args()

    source = PostgresSide(args.source)
    if args.dest_type == "postgres":
        dest = PostgresSide(args.dest)
    elif args.dest_type == "snowflake":
        dest = SnowflakeSide(args.dest)
    else:
        dest = BigQuerySide(args.dest)

    deadline = time.monotonic() + args.wait
    attempt = 0
    while True:
        attempt += 1
        tables = args.tables.split(",") if args.tables else source.tables()
        results = compare_once(source, dest, args.dest_type, tables)
        failed = [r for r in results if r["problems"]]
        if not failed or time.monotonic() >= deadline:
            break
        if attempt == 1 or attempt % 10 == 0:
            print(f"verify: waiting, {len(failed)} table(s) not matched yet: " + ", ".join(r["table"] for r in failed), flush=True)
        time.sleep(args.interval)

    render(results, args.dest_type)
    if failed:
        print(f"verify: FAIL ({len(failed)} of {len(results)} tables differ, {attempt} attempt(s))")
        sys.exit(1)
    print(f"verify: PASS ({len(results)} tables match, {attempt} attempt(s))")


if __name__ == "__main__":
    main()

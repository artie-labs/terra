#!/usr/bin/env python3
"""verify.py: compare the Terra source database with a replication destination.

For every base table in the source's public schema it compares:

  columns   name and, for a Postgres destination, the full type
            (format_type, so numeric(6,2) and numeric(9,6) differ)
  rows      count (destination rows flagged __artie_delete are excluded)
  checksum  md5 over every row's text form, ordered by primary key
            (Postgres destinations only; see --dest-type)

Extra columns on the destination are reported but do not fail the check when
--allow-extra-columns is given. That is the default for Snowflake and
BigQuery, because Artie's docs say dropped and renamed source columns stay in
the destination unless hard deletes for columns are enabled (docs/sources.md:
artie-schema-evolution); after events 05 and 08 a destination legitimately
still has "name" and "status". Artie's own __artie_* columns are always ignored.

Standard library only. Postgres is reached through the psql binary, Snowflake
through snowsql, BigQuery through bq. The Snowflake and BigQuery paths compare
columns, row counts and the sum of the primary key, not a checksum, because the
text form of timestamps and numerics differs by engine. They have not been run
against a real destination yet; see pg/README.md "Verify".

  python3 verify.py                                   # source 5432 vs subscriber 5433
  python3 verify.py --wait 120                        # retry for up to 120 s
  python3 verify.py --dest-type snowflake --dest "TERRA.PUBLIC" --wait 600
  python3 verify.py --dest-type bigquery  --dest "my-project.terra"
  # Artie writing to Postgres, after event 05: Artie keeps "name" and only fills
  # display_name for rows changed since the rename, so leave it out.
  python3 verify.py --dest "$DEST_DSN" --dest-schema artie --allow-extra-columns --ignore-types \
                    --exclude-columns animals.display_name
  python3 verify.py --dest "$DEST_DSN" --dest-schema artie --allow-extra-columns --no-checksum   # names, counts, pk sums only

Exit status is 0 when every table matches, 1 otherwise.
"""

import argparse
import csv
import io
import os
import re
import subprocess
import sys
import time

# The same TERRA_ADMIN_PASSWORD that docker-compose.yml reads, so changing the
# password in one place keeps every documented command working.
ADMIN_PASSWORD = os.environ.get("TERRA_ADMIN_PASSWORD", "change-me-admin-password")
DEFAULT_SOURCE = f"postgresql://postgres:{ADMIN_PASSWORD}@localhost:5432/terra"
DEFAULT_DEST = f"postgresql://postgres:{ADMIN_PASSWORD}@localhost:5433/terra"
SKIP_TABLES = {"test_heartbeat_table"}
NULL_TOKEN = "<null>"
IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


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


def literal(value):
    return "'" + value.replace("'", "''") + "'"


class PostgresSide:
    def __init__(self, dsn, schema="public"):
        self.dsn = dsn
        self.schema = schema

    def tables(self):
        rows = psql_rows(self.dsn, (
            "SELECT table_name FROM information_schema.tables "
            f"WHERE table_schema = {literal(self.schema)} AND table_type = 'BASE TABLE' ORDER BY table_name"
        ))
        return [r[0] for r in rows if r[0] not in SKIP_TABLES]

    def columns(self, table):
        # format_type keeps precision and scale, so numeric(6,2) vs numeric fails.
        rows = psql_rows(self.dsn, (
            "SELECT a.attname, format_type(a.atttypid, a.atttypmod) FROM pg_attribute a "
            "JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace "
            f"WHERE n.nspname = {literal(self.schema)} AND c.relname = {literal(table)} AND a.attnum > 0 "
            "AND NOT a.attisdropped ORDER BY a.attname"
        ))
        return {name: dtype for name, dtype in rows}

    def primary_key(self, table):
        rows = psql_rows(self.dsn, (
            "SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid "
            f"AND a.attnum = ANY(i.indkey) WHERE i.indrelid = '{quote(self.schema)}.{quote(table)}'::regclass "
            "AND i.indisprimary ORDER BY array_position(i.indkey, a.attnum)"
        ))
        return [r[0] for r in rows]

    def summary(self, table, columns, pk, use_columns=None):
        # The checksum covers use_columns when given (the columns both sides
        # share), so an extra destination column cannot change it.
        cols = [c for c in sorted(use_columns or columns) if not c.startswith("__artie_")]
        where = "WHERE NOT coalesce(__artie_delete, false)" if "__artie_delete" in columns else ""
        row_text = ", ".join(f"coalesce({quote(c)}::text, '{NULL_TOKEN}')" for c in cols)
        order = ", ".join(quote(c) for c in pk) if pk else "1"
        sql = (
            f"SELECT count(*), coalesce(md5(string_agg(h, ',' ORDER BY {order})), '') "
            f"FROM (SELECT md5(concat_ws('|', {row_text})) AS h, {', '.join(quote(c) for c in pk) or '1'} "
            f"FROM {quote(self.schema)}.{quote(table)} {where}) s"
        )
        count, checksum = psql_rows(self.dsn, sql)[0]
        all_cols = [c for c in sorted(columns) if not c.startswith("__artie_")]
        return {"rows": int(count), "checksum": checksum, "columns": {c: columns[c] for c in all_cols}}


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
            f"WHERE table_schema = {literal(self.schema.upper())} AND table_name = {literal(table.upper())}"
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
        # bq may print status lines before the CSV; keep from the header on.
        lines = out.splitlines()
        start = next((i for i, line in enumerate(lines) if line and "," in line), len(lines))
        rows = list(csv.reader(io.StringIO("\n".join(lines[start:]))))
        return [row for row in rows[1:] if row]

    def columns(self, table):
        rows = self.query(
            f"SELECT lower(column_name), data_type FROM `{self.project}.{self.dataset}`.INFORMATION_SCHEMA.COLUMNS "
            f"WHERE table_name = {literal(table)}"
        )
        return {name: dtype for name, dtype in rows}

    def summary(self, table, columns, pk):
        where = "WHERE NOT coalesce(__artie_delete, false)" if "__artie_delete" in columns else ""
        pk_sum = f"sum({pk[0]})" if pk else "0"
        count, total = self.query(f"SELECT count(*), coalesce({pk_sum}, 0) FROM `{self.project}.{self.dataset}.{table}` {where}")[0]
        cols = [c for c in sorted(columns) if not c.startswith("__artie_")]
        return {"rows": int(count), "pk_sum": int(float(total)), "columns": {c: columns[c] for c in cols}}


def compare_once(source, dest, dest_type, tables, allow_extra, ignore_types=False, exclude=(), no_checksum=False):
    results = []
    for table in tables:
        src_cols = source.columns(table)
        pk = source.primary_key(table)
        problems = []
        dst = None
        skipped = set()
        try:
            dst_cols = dest.columns(table)
            if not dst_cols:
                problems.append("missing on destination")
                shared = None
            else:
                skipped = {col for tbl, col in exclude if tbl == table}
                shared = [c for c in src_cols if c in dst_cols and c not in skipped] or list(src_cols)
                dst = dest.summary(table, dst_cols, pk, shared) if dest_type == "postgres" else dest.summary(table, dst_cols, pk)
        except RuntimeError as error:
            problems.append(str(error).splitlines()[0][:120])
            shared = None
        src = source.summary(table, src_cols, pk, shared)
        if dst is not None:
            missing = sorted(set(src["columns"]) - set(dst["columns"]))
            extra = sorted(set(dst["columns"]) - set(src["columns"]))
            if missing:
                problems.append("destination lacks " + ", ".join(missing))
            if extra:
                problems.append("destination has extra " + ", ".join(extra))
            if dest_type == "postgres":
                mismatched = [] if ignore_types else [
                    c for c in src["columns"] if c in dst["columns"] and src["columns"][c] != dst["columns"][c]]
                if mismatched:
                    problems.append("type differs: " + ", ".join(f"{c} {src['columns'][c]} vs {dst['columns'][c]}" for c in mismatched))
                if not no_checksum and src["checksum"] != dst["checksum"]:
                    problems.append("checksum differs")
                if no_checksum and pk:
                    sums = []
                    for side in (source, dest):
                        sums.append(int(psql_rows(side.dsn, f"SELECT coalesce(sum({quote(pk[0])}), 0) FROM {quote(side.schema)}.{quote(table)}")[0][0]))
                    if sums[0] != sums[1]:
                        problems.append("primary key sum differs")
            else:
                src_pk_sum = None
                if pk:
                    src_pk_sum = int(psql_rows(source.dsn, f"SELECT coalesce(sum({quote(pk[0])}), 0) FROM {quote(table)}")[0][0])
                if src_pk_sum is not None and src_pk_sum != dst["pk_sum"]:
                    problems.append("primary key sum differs")
            if src["rows"] != dst["rows"]:
                problems.append(f"rows {src['rows']} vs {dst['rows']}")
        notes = []
        if dst is not None and skipped:
            notes.append("excluded from checksum: " + ", ".join(sorted(skipped)))
        if dst is not None and extra and allow_extra:
            problems = [p for p in problems if not p.startswith("destination has extra")]
            notes.append("extra on destination: " + ", ".join(extra))
        results.append({"table": table, "source_rows": src["rows"], "dest_rows": dst["rows"] if dst else None,
                        "columns": len(src["columns"]), "problems": problems, "notes": notes})
    return results


def render(results, dest_type):
    width = max(len(r["table"]) for r in results) if results else 10
    print(f"{'table':<{width}}  {'src rows':>9}  {'dst rows':>9}  cols  status")
    for r in results:
        dst_rows = "-" if r["dest_rows"] is None else str(r["dest_rows"])
        status = "ok" if not r["problems"] else "; ".join(r["problems"])
        if r.get("notes"):
            status += " (" + "; ".join(r["notes"]) + ")"
        print(f"{r['table']:<{width}}  {r['source_rows']:>9}  {dst_rows:>9}  {r['columns']:>4}  {status}")
    if dest_type != "postgres":
        print(f"note: {dest_type} compare is columns + row count + primary key sum, no checksum")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source", default=os.environ.get("SOURCE_DSN", DEFAULT_SOURCE))
    parser.add_argument("--dest", default=os.environ.get("DEST_DSN", DEFAULT_DEST))
    parser.add_argument("--dest-type", choices=["postgres", "snowflake", "bigquery"], default="postgres")
    parser.add_argument("--dest-schema", default="public", help="schema on a Postgres destination (default public)")
    parser.add_argument("--allow-extra-columns", action="store_true",
                        help="report, but do not fail on, destination columns the source lacks; implied for snowflake and bigquery")
    parser.add_argument("--ignore-types", action="store_true",
                        help="compare column names, counts and checksums only; for Postgres tables Artie created with its own types")
    parser.add_argument("--exclude-columns", default="",
                        help="comma separated table.column pairs to leave out of the checksum, e.g. animals.display_name "
                             "for a destination that only has display_name for rows changed after event 05")
    parser.add_argument("--no-checksum", action="store_true",
                        help="Postgres destinations: compare names, counts and the primary key sum only, as the Snowflake "
                             "and BigQuery modes do; for destinations whose text forms differ from the source")
    parser.add_argument("--tables", help="comma separated subset; default is every base table in the source")
    parser.add_argument("--wait", type=float, default=0, help="seconds to keep retrying until everything matches")
    parser.add_argument("--interval", type=float, default=2)
    args = parser.parse_args()

    source = PostgresSide(args.source)
    allow_extra = args.allow_extra_columns or args.dest_type != "postgres"
    if args.dest_type == "postgres":
        dest = PostgresSide(args.dest, args.dest_schema)
    elif args.dest_type == "snowflake":
        dest = SnowflakeSide(args.dest)
    else:
        dest = BigQuerySide(args.dest)

    deadline = time.monotonic() + args.wait
    attempt = 0
    while True:
        attempt += 1
        tables = [t.strip() for t in args.tables.split(",")] if args.tables else source.tables()
        bad = [t for t in tables if not IDENT.match(t)]
        if bad:
            sys.exit("verify: invalid table name(s): " + ", ".join(bad))
        if not tables:
            sys.exit("verify: FAIL (the source has no base tables in schema public; check --source)")
        exclude = [tuple(pair.split(".", 1)) for pair in args.exclude_columns.split(",") if pair.strip()]
        results = compare_once(source, dest, args.dest_type, tables, allow_extra, args.ignore_types, exclude, args.no_checksum)
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

#!/usr/bin/env python3
"""Draw the current public schema of a Postgres database as an SVG.

Reads information_schema and the foreign-key constraints through psql and
lays each table out as a box with its columns, with a line per foreign key.
Nothing is hand-drawn; re-run it whenever the schema changes.

    python3 pg/schema_svg.py --dsn postgresql://postgres:pw@localhost:5432/terra -o site/schema.svg
"""
import argparse
import os
import subprocess
from xml.sax.saxutils import escape

DEFAULT_DSN = "postgresql://postgres:change-me-admin-password@localhost:5432/terra"
ROW_H, PAD, COL_W, GAP_X, GAP_Y, FONT = 18, 10, 300, 70, 40, 13


def psql(dsn, sql):
    out = subprocess.run(["psql", dsn, "-X", "-q", "-At", "-F", "\t", "-v", "ON_ERROR_STOP=1"],
                         input=sql, text=True, capture_output=True, check=True).stdout
    return [line.split("\t") for line in out.splitlines() if line]


def load(dsn):
    tables = {}
    for table, column, dtype, nullable in psql(dsn, (
        "SELECT table_name, column_name, "
        "CASE WHEN data_type = 'USER-DEFINED' THEN udt_name "
        "     WHEN data_type = 'timestamp with time zone' THEN 'timestamptz' "
        "     WHEN data_type = 'character varying' THEN 'varchar' ELSE data_type END, is_nullable "
        "FROM information_schema.columns WHERE table_schema = 'public' "
        "AND table_name IN (SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') "
        "ORDER BY table_name, ordinal_position")):
        tables.setdefault(table, []).append((column, dtype, nullable == "NO"))
    pks = {}
    for table, column in psql(dsn, (
        "SELECT tc.table_name, kcu.column_name FROM information_schema.table_constraints tc "
        "JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name "
        "WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'")):
        pks.setdefault(table, set()).add(column)
    fks = psql(dsn, (
        "SELECT kcu.table_name, kcu.column_name, ccu.table_name, ccu.column_name "
        "FROM information_schema.table_constraints tc "
        "JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name "
        "JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name "
        "WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'"))
    return tables, pks, fks


def layout(tables):
    # Two columns: reference tables on the left, fact tables on the right.
    order = sorted(tables, key=lambda t: (len([1 for _ in tables[t]]), t))
    boxes, cols = {}, [0, 0]
    for i, table in enumerate(order):
        col = i % 2
        x = PAD + col * (COL_W + GAP_X)
        y = PAD + cols[col]
        h = ROW_H * (len(tables[table]) + 1) + PAD
        boxes[table] = (x, y, COL_W, h)
        cols[col] += h + GAP_Y
    return boxes, PAD * 2 + 2 * COL_W + GAP_X + 40, max(cols) + PAD + ROW_H


def render(tables, pks, fks, title):
    boxes, width, height = layout(tables)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" '
           f'font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="{FONT}">',
           f"<title>{escape(title)}</title>",
           '<rect width="100%" height="100%" fill="white"/>',
           '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">'
           '<path d="M0,0 L8,4 L0,8 z" fill="#111"/></marker></defs>']
    for table, (x, y, w, h) in boxes.items():
        out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="white" stroke="#111" stroke-width="1.5"/>')
        out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{ROW_H + 4}" fill="#111"/>')
        out.append(f'<text x="{x + 8}" y="{y + ROW_H - 3}" fill="white" font-weight="bold">{escape(table)}</text>')
        for i, (column, dtype, not_null) in enumerate(tables[table]):
            cy = y + ROW_H * (i + 2) + 2
            marker = "PK " if column in pks.get(table, set()) else "   "
            out.append(f'<text x="{x + 8}" y="{cy}" xml:space="preserve">{escape(marker + column)}</text>')
            out.append(f'<text x="{x + w - 8}" y="{cy}" text-anchor="end" fill="#555">{escape(dtype + ("" if not_null else "?"))}</text>')
    for src_table, src_col, dst_table, dst_col in fks:
        sx, sy, sw, sh = boxes[src_table]
        dx, dy, dw, dh = boxes[dst_table]
        srow = [c for c, _, _ in tables[src_table]].index(src_col)
        drow = [c for c, _, _ in tables[dst_table]].index(dst_col)
        y1 = sy + ROW_H * (srow + 2) - 4
        y2 = dy + ROW_H * (drow + 2) - 4
        if sx < dx:
            x1, x2 = sx + sw, dx
        elif sx > dx:
            x1, x2 = sx, dx + dw
        else:
            x1 = x2 = sx + sw
        mid = (x1 + x2) / 2 if x1 != x2 else x1 + 30
        out.append(f'<path d="M{x1},{y1} C{mid},{y1} {mid},{y2} {x2},{y2}" fill="none" stroke="#111" '
                   'stroke-width="1.2" marker-end="url(#arrow)"/>')
    out.append(f'<text x="{PAD}" y="{height - 6}" fill="#555">PK = primary key, ? = nullable, arrow = foreign key</text>')
    out.append("</svg>")
    return "\n".join(out)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dsn", default=os.environ.get("SOURCE_DSN", DEFAULT_DSN))
    parser.add_argument("-o", "--output", required=True)
    parser.add_argument("--title", default="Terra safari schema after the eight events")
    args = parser.parse_args()
    tables, pks, fks = load(args.dsn)
    with open(args.output, "w") as f:
        f.write(render(tables, pks, fks, args.title))
    print(f"wrote {args.output}: {len(tables)} tables, {len(fks)} foreign keys")


if __name__ == "__main__":
    main()

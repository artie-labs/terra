#!/usr/bin/env python3
"""Keep the run-time number in pg/README.md in sync with pg/bench.txt.

    python3 pg/bench_readme.py          # rewrite the marked line in pg/README.md
    python3 pg/bench_readme.py --check  # exit 1 if the README is out of date

The README carries one line between <!-- bench:start --> and <!-- bench:end -->.
That line is generated from the `total` in bench.txt, never typed by hand.
"""
import math
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
START, END = "<!-- bench:start -->", "<!-- bench:end -->"


def read_bench(path=None):
    """Parse bench.txt: phase values plus the provenance line bench.sh wrote.

    Shared with site/build.py, which imports it, so the format is parsed in
    one place.
    """
    values, note = {}, ""
    for line in (path or HERE / "bench.txt").read_text().splitlines():
        if line.startswith("# median of"):
            note = line[2:]
        if line.startswith("#") or not line.strip():
            continue
        key, value = line.split()
        values[key] = int(value)
    return values, note


def render(values):
    minutes = max(1, math.ceil(values["total"] / 60))
    noun = "minute" if minutes == 1 else "minutes"
    return (f"{START}Measured end to end, from `docker compose up` on fresh volumes to `verify.py` "
            f"passing against the subscriber: {values['total']} s, so budget {minutes} {noun} "
            f"(median of the runs recorded in [bench.txt](bench.txt)).{END}")


def main():
    readme = HERE / "README.md"
    text = readme.read_text()
    start, end = text.find(START), text.find(END)
    if start < 0 or end < 0:
        sys.exit("pg/README.md has no bench markers")
    new_line = render(read_bench()[0])
    updated = text[:start] + new_line + text[end + len(END):]
    if "--check" in sys.argv:
        if updated != text:
            sys.exit("pg/README.md run-time line is out of date; run python3 pg/bench_readme.py")
        print("pg/README.md matches pg/bench.txt")
        return
    readme.write_text(updated)
    print(new_line)


if __name__ == "__main__":
    main()

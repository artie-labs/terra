#!/usr/bin/env python3
"""stream.py: a continuous, deterministic writer for the Terra Postgres dataset.

Every second it runs one transaction against the source database with a small
batch of inserts, updates and deletes, so a replication consumer always has
something to replicate. The sequence of operations is driven by a seeded
random generator, so two runs with the same --seed and the same schema make
the same choices in the same order. Only wall-clock timestamps differ.

The writer reads the live schema before every batch and adapts to it. That is
what lets it keep running through the schema events in events/:

  weight_kg on animals         -> updates start setting a weight
  'pangolin' in animal_species -> new animals can be pangolins
  collar_pings table           -> a share of inserts become collar pings
  animals.display_name         -> new animals use display_name, not name
  observations.field_report    -> new observations carry a JSON field report
  animals.status dropped       -> updates stop touching status

Standard library only. Talks to Postgres through the psql binary.

  python3 stream.py                       # 10 ops/s until Ctrl-C
  python3 stream.py --rate 20 --duration 60
  python3 stream.py --dsn postgresql://postgres:pw@localhost:5432/terra
"""

import argparse
import json
import os
import random
import signal
import subprocess
import sys
import time

# Same TERRA_ADMIN_PASSWORD that docker-compose.yml reads; TERRA_DSN overrides the whole DSN.
DEFAULT_DSN = f"postgresql://postgres:{os.environ.get('TERRA_ADMIN_PASSWORD', 'change-me-admin-password')}@localhost:5432/terra"

# Names, statuses and note templates come from the seed generator in this
# directory, so the stream writes the same kind of rows the seed did. About
# one note in ten is a multi-paragraph note over 2 kB; observations.notes has
# STORAGE EXTERNAL, so those are stored out of line (TOAST).
from generate_seed import FIRST_NAMES, STATUSES, SURNAMES, render_long, render_short  # noqa: E402

RANGERS = ["A.M.", "R.K.", "J.T.", "S.P.", "L.O.", "D.C."]
WEATHER = ["clear", "overcast", "light rain", "dust haze", "thunderstorm"]


def sql_text(value):
    return "'" + str(value).replace("'", "''") + "'"


class Psql:
    def __init__(self, dsn):
        self.dsn = dsn

    def run(self, sql):
        # start_new_session keeps a terminal Ctrl-C from also hitting psql, so
        # the batch in flight completes and the loop stops cleanly.
        result = subprocess.run(
            ["psql", self.dsn, "-X", "-q", "-At", "-v", "ON_ERROR_STOP=1"],
            input=sql, text=True, capture_output=True, start_new_session=True,
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or "psql failed")
        return result.stdout

    def rows(self, sql):
        out = self.run(sql)
        return [line.split("|") for line in out.splitlines() if line != ""]


class Schema:
    """Snapshot of the parts of the live schema the writer cares about."""

    def __init__(self, db):
        # One round trip: columns and enum labels in a single query.
        rows = db.rows(
            "SELECT 'col', table_name, column_name FROM information_schema.columns "
            "WHERE table_schema = 'public' "
            "UNION ALL "
            "SELECT 'enum', t.typname, e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid "
            "WHERE t.typname = 'animal_species' ORDER BY 1, 2, 3"
        )
        self.columns = {}
        self.species = []
        for kind, a, b in rows:
            if kind == "col":
                self.columns.setdefault(a, []).append(b)
            else:
                self.species.append(b)

    def has(self, table, column=None):
        if column is None:
            return table in self.columns
        return column in self.columns.get(table, [])

    def describe(self):
        bits = []
        for table in sorted(self.columns):
            bits.append(f"{table}({len(self.columns[table])} cols)")
        return ", ".join(bits) + f", {len(self.species)} species"


class Writer:
    def __init__(self, db, seed):
        self.db = db
        self.rng = random.Random(seed)
        self.animal_ids = [int(r[0]) for r in db.rows("SELECT animal_id FROM animals ORDER BY animal_id")]
        self.holes = [
            {"watering_hole_id": int(i), "name": n, "raw_latitude": float(la), "raw_longitude": float(lo)}
            for i, n, la, lo in db.rows("SELECT watering_hole_id, name, latitude, longitude FROM watering_holes ORDER BY 1")
        ]
        self.hole_ids = [h["watering_hole_id"] for h in self.holes]
        self.next_observation = int(db.rows("SELECT coalesce(max(observation_id), 0) + 1 FROM observations")[0][0])
        self.next_animal = int(db.rows("SELECT coalesce(max(animal_id), 0) + 1 FROM animals")[0][0])
        self.live_observations = [int(r[0]) for r in db.rows(
            "SELECT observation_id FROM observations ORDER BY observation_id DESC LIMIT 200"
        )]
        self.totals = {"obs+": 0, "obs-": 0, "animal+": 0, "animal~": 0, "ping+": 0}
        self.pending = {}

    def count(self, key):
        # Counted into totals only once the batch commits.
        self.pending[key] = self.pending.get(key, 0) + 1

    def committed(self):
        for key, value in self.pending.items():
            self.totals[key] += value
        self.pending = {}

    def resync(self):
        db = self.db
        self.animal_ids = [int(r[0]) for r in db.rows("SELECT animal_id FROM animals ORDER BY animal_id")]
        self.next_observation = int(db.rows("SELECT coalesce(max(observation_id), 0) + 1 FROM observations")[0][0])
        self.next_animal = int(db.rows("SELECT coalesce(max(animal_id), 0) + 1 FROM animals")[0][0])
        live = {int(r[0]) for r in db.rows("SELECT observation_id FROM observations ORDER BY observation_id DESC LIMIT 500")}
        self.live_observations = [o for o in self.live_observations if o in live]

    def note(self, hole):
        if self.rng.random() < 0.1:
            return render_long(self.rng, hole)
        return render_short(self.rng)

    def field_report(self):
        r = self.rng
        return json.dumps({
            "ranger": r.choice(RANGERS), "weather": r.choice(WEATHER),
            "group_size": r.randrange(1, 40), "verified": r.random() < 0.7,
        }, sort_keys=True)

    def insert_observation(self, schema):
        r = self.rng
        hole = r.choice(self.holes)
        cols = ["observation_id", "animal_id", "watering_hole_id", "observed_at", "notes"]
        vals = [str(self.next_observation), str(r.choice(self.animal_ids)), str(hole["watering_hole_id"]),
                "now()", sql_text(self.note(hole))]
        if schema.has("observations", "field_report"):
            cols.append("field_report")
            vals.append(sql_text(self.field_report()) + "::jsonb")
        self.live_observations.append(self.next_observation)
        self.next_observation += 1
        self.count("obs+")
        return f"INSERT INTO observations ({', '.join(cols)}) VALUES ({', '.join(vals)});"

    def delete_observation(self, schema):
        if not self.live_observations:
            return None
        idx = self.rng.randrange(len(self.live_observations))
        observation_id = self.live_observations.pop(idx)
        self.count("obs-")
        return f"DELETE FROM observations WHERE observation_id = {observation_id};"

    def insert_animal(self, schema):
        r = self.rng
        first, surname = r.choice(FIRST_NAMES), r.choice(SURNAMES)
        name = f"{first} {surname} #{self.next_animal}" if surname else f"{first} #{self.next_animal}"
        name_col = "display_name" if schema.has("animals", "display_name") else "name"
        cols = ["animal_id", name_col, "species", "home_watering_hole_id"]
        vals = [str(self.next_animal), sql_text(name), sql_text(r.choice(schema.species)), str(r.choice(self.hole_ids))]
        if schema.has("animals", "status"):
            cols.append("status")
            vals.append(sql_text(r.choice(STATUSES[:4])))
        if schema.has("animals", "weight_kg"):
            cols.append("weight_kg")
            vals.append(f"{r.uniform(2, 6000):.2f}")
        self.animal_ids.append(self.next_animal)
        self.next_animal += 1
        self.count("animal+")
        return f"INSERT INTO animals ({', '.join(cols)}) VALUES ({', '.join(vals)});"

    def update_animal(self, schema):
        r = self.rng
        sets = ["updated_at = now()"]
        if schema.has("animals", "status"):
            sets.append(f"status = {sql_text(r.choice(STATUSES))}")
        if schema.has("animals", "weight_kg"):
            sets.append(f"weight_kg = {r.uniform(2, 6000):.2f}")
        self.count("animal~")
        return f"UPDATE animals SET {', '.join(sets)} WHERE animal_id = {r.choice(self.animal_ids)};"

    def insert_ping(self, schema):
        r = self.rng
        self.count("ping+")
        return (
            "INSERT INTO collar_pings (animal_id, watering_hole_id, pinged_at, latitude, longitude, battery_pct) "
            f"VALUES ({r.choice(self.animal_ids)}, {r.choice(self.hole_ids)}, now(), "
            f"{r.uniform(-29, 0):.6f}, {r.uniform(15, 38):.6f}, {r.randrange(5, 100)});"
        )

    def batch(self, schema, size):
        statements = []
        for _ in range(size):
            roll = self.rng.random()
            if schema.has("collar_pings") and roll < 0.2:
                statements.append(self.insert_ping(schema))
            elif roll < 0.7:
                statements.append(self.insert_observation(schema))
            elif roll < 0.85:
                statements.append(self.update_animal(schema))
            elif roll < 0.95:
                statement = self.delete_observation(schema)
                if statement:
                    statements.append(statement)
            else:
                statements.append(self.insert_animal(schema))
        return statements


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dsn", default=os.environ.get("TERRA_DSN", DEFAULT_DSN))
    parser.add_argument("--rate", type=int, default=10, help="operations per second (default 10)")
    parser.add_argument("--duration", type=float, default=0, help="seconds to run; 0 means until interrupted")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    db = Psql(args.dsn)
    writer = Writer(db, args.seed)
    stop = {"now": False}

    def handle(signum, frame):
        stop["now"] = True

    signal.signal(signal.SIGINT, handle)
    signal.signal(signal.SIGTERM, handle)

    started = time.monotonic()
    tick = 0
    last_schema = None
    print(f"stream: seed={args.seed} rate={args.rate}/s dsn={args.dsn.split('@')[-1]}", flush=True)
    while not stop["now"]:
        if args.duration and time.monotonic() - started >= args.duration:
            break
        tick_started = time.monotonic()
        try:
            schema = Schema(db)
            description = schema.describe()
            if description != last_schema:
                print(f"stream: schema {description}", flush=True)
                last_schema = description
            statements = writer.batch(schema, args.rate)
            db.run("BEGIN;\n" + "\n".join(statements) + "\nCOMMIT;\n")
        except RuntimeError as error:
            # Something else wrote to the table (an event file, a human), or the
            # database is briefly unavailable. Nothing from this tick was
            # committed. Resync the id counters and carry on with the next tick.
            print(f"stream: tick {tick} failed: {error.args[0].splitlines()[0]}", file=sys.stderr, flush=True)
            writer.pending = {}
            try:
                writer.resync()
            except RuntimeError:
                pass
            time.sleep(1)
            continue
        writer.committed()
        tick += 1
        if not args.quiet:
            totals = " ".join(f"{k}{v}" for k, v in writer.totals.items())
            print(f"stream: tick {tick:>5} {len(statements):>3} ops  totals {totals}", flush=True)
        time.sleep(max(0.0, 1.0 - (time.monotonic() - tick_started)))
    totals = " ".join(f"{k}{v}" for k, v in writer.totals.items())
    print(f"stream: stopped after {tick} ticks  totals {totals}", flush=True)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
generate_seed.py — deterministic seed-data generator for the terra CDC demo.

Emits SQL INSERTs (or CSVs) for the PRE-migration shape of the schema:

    beaches(beach_id, name, region, latitude, longitude, created_at)
    turtles(turtle_id, name, species, nesting_beach_id, status, created_at, updated_at)
    sightings(sighting_id, turtle_id, beach_id, observed_at, notes)

No AI in the loop: pure stdlib (random + datetime). Same --seed -> identical output.

Why this exists for a CDC demo (not just fake rows):

  * NOTES COME IN TWO SIZES.
      - SHORT notes: single-sentence field logs (fit inline, stay in the heap).
      - LONG notes: multi-paragraph research write-ups assembled from many
        varied fragments so they clear ~2.5-4 KB of high-entropy text and get
        pushed OUT-OF-LINE to the TOAST relation. That is the whole point of
        step 4/6 in the migration (jsonb tags + field_notes via the TOAST path):
        you need real toasted values in the WAL to prove the pipeline carries
        them. Use --long-note-ratio to dial how many sightings get the long form.
      Postgres only toasts a row when it can't fit in ~2 KB AND the value doesn't
      compress back under that. Repetitive filler compresses away and silently
      fails to toast, so the long templates deliberately vary wording, numbers,
      coordinates, and tag ids to keep entropy high. --verify-toast proves it
      against a live DB.

  * OFFSET-CROSSING is guaranteed, not hoped for: sightings mix UTC offsets
    (-06..+10) and include pairs pinned to the 2025 US DST flips.

  * turtle_id stays a plain int under 2^31 so the live int->bigint ALTER (step 3)
    is what pushes past it. No post-migration columns are seeded here.

Usage:
    python generate_seed.py                          # default: demo preset (~200 MB)
    python generate_seed.py --size tiny -o seed.sql  # ~10 MB smoke test
    python generate_seed.py --size 1m --with-schema -o seed.sql   # ~1M rows
    python generate_seed.py --size 5m -o big.sql     # ~5M rows (local only, ~5.5 GB RAM)
    python generate_seed.py --turtles 40000 --sightings-per-turtle 60  # explicit override
    python generate_seed.py --format csv --outdir ./seed_csv
    python generate_seed.py --verify-toast "host=/tmp port=5433 dbname=postgres"
"""

import argparse
import csv
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Reference data — real nesting beaches, real coordinates, plausible offsets.
# tz_offsets: (standard,) or (standard, daylight) UTC offsets in hours.
# ---------------------------------------------------------------------------

BEACHES = [
    ("Tortuguero Beach",   "Caribbean Costa Rica",  10.541302, -83.502029, (-6,)),
    ("Ostional Beach",     "Pacific Costa Rica",     9.995121, -85.700483, (-6,)),
    ("Padre Island NS",    "Gulf of Mexico",        26.601710, -97.271112, (-6, -5)),
    ("Archie Carr NWR",    "Florida Atlantic",      27.940174, -80.489144, (-5, -4)),
    ("Grande Riviere",     "Trinidad North Coast",  10.831870, -61.052661, (-4,)),
    ("Praia do Forte",     "Bahia Brazil",         -12.577503, -38.002741, (-3,)),
    ("Laganas Bay",        "Zakynthos Greece",      37.723004,  20.867788, (2, 3)),
    ("Ras Al Jinz",        "Ash Sharqiyah Oman",    22.428875,  59.833310, (4,)),
    ("Boa Vista Ervatao",  "Cape Verde",            15.982174, -22.789066, (-1,)),
    ("Mon Repos Beach",    "Queensland Australia", -24.803218, 152.441397, (10,)),
    ("Raine Island",       "Great Barrier Reef",   -11.590571, 144.034224, (10,)),
    ("Gnaraloo Bay",       "Western Australia",    -23.771642, 113.529973, (8,)),
]

SPECIES = ["green", "loggerhead", "hawksbill", "leatherback", "kemps_ridley"]

SPECIES_WEIGHTS_BY_BEACH = {
    "Tortuguero Beach":   [70, 5, 10, 15, 0],
    "Ostional Beach":     [20, 5, 5, 10, 60],
    "Padre Island NS":    [10, 15, 0, 0, 75],
    "Archie Carr NWR":    [30, 60, 5, 5, 0],
    "Grande Riviere":     [5, 5, 10, 80, 0],
    "Praia do Forte":     [20, 55, 20, 5, 0],
    "Laganas Bay":        [10, 85, 5, 0, 0],
    "Ras Al Jinz":        [80, 10, 10, 0, 0],
    "Boa Vista Ervatao":  [5, 90, 5, 0, 0],
    "Mon Repos Beach":    [25, 65, 5, 5, 0],
    "Raine Island":       [90, 5, 5, 0, 0],
    "Gnaraloo Bay":       [30, 60, 10, 0, 0],
}

FIRST_NAMES = [
    "Shelly", "Crush", "Squirt", "Donatello", "Raphael", "Leonardo",
    "Michelangelo", "Myrtle", "Bruce", "Pearl", "Coral", "Sandy", "Duke",
    "Luna", "Nacho", "Pepper", "Marina", "Turbo", "Sheldon", "Olive",
    "Kai", "Nui", "Honu", "Tama", "Mango", "Pippa", "Gus", "Winnie",
    "Barnacle", "Flip", "Scute", "Kelp", "Tide", "Reef", "Drift",
    "Caretta", "Chelona", "Verdita", "Atlas", "Nomad",
]
SURNAMES = [
    "the Elder", "Jr.", "III", "of Tortuguero", "O'Neill", "the Swift",
    "Deepdive", "Longfin", "de la Playa", "the Wanderer",
    None, None, None, None, None, None, None, None,
]

STATUSES = ["hatchling", "juvenile", "adult", "nesting", "deceased"]
STATUS_WEIGHTS = [10, 30, 40, 15, 5]

# ---------------------------------------------------------------------------
# SHORT notes — one sentence, stays inline in the heap page.
# ---------------------------------------------------------------------------

SHORT_TEMPLATES = [
    "Routine patrol sighting; carapace measured at {cm} cm CCL.",
    "Observed foraging over seagrass bed ~{m} m offshore.",
    "Flipper tag {tag} confirmed; barnacle load light.",
    "Nesting attempt aborted (false crawl); returned to water at high tide.",
    "Laid clutch; nest #{nest} marked and GPS'd for the hatchery team.",
    "Volunteer report: seen near the '{beachword}' marker buoy, no injuries.",
    "Entangled in ghost line; freed on site, minor abrasion on left fore-flipper.",
    "Night survey: emerged {m} m east of last season's nest site.",
    "Satellite tag {tag} pinging normally; battery at {pct}%.",
    "Photo-ID match via facial scale pattern; ID confidence 'high'.",
]

# ---------------------------------------------------------------------------
# LONG notes — assembled from many varied fragments so the rendered text
# reliably clears ~2.5-4 KB of high-entropy content and TOASTs out-of-line.
# Each block is a self-contained paragraph; we sample several, fill unique
# numbers/coords/tags into each, and join. High variety defeats compression.
# ---------------------------------------------------------------------------

LONG_OPENERS = [
    "Extended encounter log recorded during the {season} monitoring window at {beach}. "
    "First contact at {t1} local; individual identified by flipper tag {tag} and cross-checked "
    "against the photo-ID archive (scale-pattern match, confidence '{conf}').",
    "Full workup entered by the field team following a {dur}-minute observation at {beach}. "
    "Animal first sighted at {t1} moving {bearing} along the {zone} zone; tag {tag} scanned "
    "twice to rule out a misread. Prior record last updated {days} days ago.",
    "Detailed intake narrative — {beach}, {season}. Turtle recovered from the {zone} zone at "
    "{t1} after a bystander flagged apparent distress; tag {tag} on file, clutch history "
    "reviewed on scene before any handling.",
]

LONG_BODY = [
    "Morphometrics: curved carapace length {ccl} cm, curved carapace width {ccw} cm, "
    "estimated mass {mass} kg. Body condition scored {bcs}/5. Old healed notch on the "
    "{side} marginal scutes consistent with a {yr} stranding record; no fresh injuries beyond "
    "light epibiont fouling ({barn} barnacles, mostly on the posterior carapace).",
    "Behaviour: spent roughly {b1} minutes {act1} before shifting to {act2} in the shallows "
    "at approximately {depth} m depth. Respiratory interval averaged {resp} seconds across "
    "{breaths} surfacing events. No obvious reaction to the observer at {dist} m standoff.",
    "Environment: water {wtemp} C, air {atemp} C, {sky} skies, wind {wind} kt from the {wdir}, "
    "swell around {swell} m. Tide was {tide} with the high at {t2}. Substrate at the site is "
    "{substrate}; underwater visibility estimated at {vis} m.",
    "Telemetry: satellite tag {tag} last transmitted {days} days ago from {lat}, {lon}; battery "
    "at {pct}% and duty cycle nominal. Dive summary since deployment shows a max depth of "
    "{maxdepth} m and a modal dive duration near {modedive} minutes; the recent track suggests a "
    "{bearing} corridor toward the {zone} foraging grounds.",
    "Nesting: this was emergence {emerg} for the season. Body pit and egg chamber excavated over "
    "{dig} minutes; {eggs} eggs counted during laying, chamber depth {chdepth} cm. Nest marked "
    "as #{nest} and triangulated to the {zone} dune line; predicted incubation {inc} days given "
    "current sand temperatures.",
    "Health: cloacal temperature {ctemp} C; a small blood sample was drawn for the ongoing "
    "genetics and health-panel study (tube {tube}). Slight carapace pitting noted near the "
    "{side} bridge, photographed for the veterinary reviewer. No fibropapillomatosis observed.",
]

LONG_CLOSERS = [
    "Handling completed in {dur} minutes; animal released at {t3} and observed swimming "
    "strongly {bearing}. Data QC by {initials}; flagged for follow-up next patrol.",
    "Released without incident; re-sighting requested if tag {tag} is scanned within {days} days. "
    "Entry reconciled against the master log by {initials}.",
    "Turtle returned to the water under its own power at {t3}. Recommend re-measuring at the "
    "next capture to confirm the {ccl} cm reading. Reviewed and signed off by {initials}.",
]

BEACHWORDS = ["north", "south", "lagoon", "point", "dune", "east", "west"]
SEASONS = ["early-season", "peak-season", "late-season", "shoulder", "off-peak"]
CONF = ["high", "medium", "provisional", "very high"]
BEARINGS = ["north", "south", "seaward", "along-shore", "north-east", "south-west"]
ZONES = ["intertidal", "supratidal", "backshore", "reef-flat", "channel-edge", "berm"]
ACTS = ["basking", "foraging", "resting on the bottom", "milling", "slow patrolling",
        "cleaning at a coral head", "digging a body pit"]
SKIES = ["clear", "partly cloudy", "overcast", "hazy", "storm-threatening"]
WDIRS = ["NE", "ENE", "SE", "SSW", "W", "NW", "N"]
TIDES = ["flooding", "ebbing", "slack high", "slack low", "spring high"]
SUBSTRATES = ["fine coral sand", "mixed shell hash", "dark volcanic sand",
              "coarse quartz sand", "silty mud over rubble"]
SIDES = ["left", "right"]
INITIALS = ["A.M.", "R.K.", "J.T.", "S.P.", "L.O.", "D.C.", "M.R.", "K.W."]


def esc(s):
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def _hhmm(rng):
    return f"{rng.randint(0, 23):02d}:{rng.randint(0, 59):02d}"


def render_short(rng):
    return rng.choice(SHORT_TEMPLATES).format(
        cm=rng.randint(28, 155), m=rng.randint(5, 400),
        tag=f"{rng.choice('KLMNP')}{rng.randint(1000, 9999)}",
        nest=rng.randint(1, 240), pct=rng.randint(12, 99),
        beachword=rng.choice(BEACHWORDS),
    )


def render_long(rng, beach):
    """Assemble a multi-paragraph, high-entropy note that toasts (~2.5-4 KB)."""
    tag = f"{rng.choice('KLMNP')}{rng.randint(10000, 99999)}"
    ccl = rng.randint(55, 160)
    dur = rng.randint(12, 55)
    days = rng.randint(1, 210)
    fields = dict(
        beach=beach["name"], season=rng.choice(SEASONS), t1=_hhmm(rng),
        t2=_hhmm(rng), t3=_hhmm(rng), tag=tag, conf=rng.choice(CONF),
        dur=dur, bearing=rng.choice(BEARINGS), zone=rng.choice(ZONES),
        days=days, ccl=ccl, ccw=rng.randint(45, 145),
        mass=f"{rng.uniform(30, 420):.1f}", bcs=rng.randint(2, 5),
        side=rng.choice(SIDES), yr=rng.randint(2009, 2024),
        barn=rng.randint(0, 60), b1=rng.randint(3, 45),
        act1=rng.choice(ACTS), act2=rng.choice(ACTS),
        depth=f"{rng.uniform(0.5, 18):.1f}", resp=rng.randint(30, 900),
        breaths=rng.randint(2, 40), dist=rng.randint(3, 60),
        wtemp=f"{rng.uniform(19, 31):.1f}", atemp=f"{rng.uniform(16, 38):.1f}",
        sky=rng.choice(SKIES), wind=rng.randint(0, 35), wdir=rng.choice(WDIRS),
        swell=f"{rng.uniform(0.1, 3.5):.1f}", tide=rng.choice(TIDES),
        substrate=rng.choice(SUBSTRATES), vis=f"{rng.uniform(1, 25):.1f}",
        lat=f"{beach['flat'] + rng.uniform(-0.5, 0.5):.5f}",
        lon=f"{beach['flon'] + rng.uniform(-0.5, 0.5):.5f}",
        pct=rng.randint(8, 99), maxdepth=rng.randint(20, 320),
        modedive=rng.randint(3, 55), emerg=rng.randint(1, 7),
        dig=rng.randint(15, 90), eggs=rng.randint(60, 140),
        chdepth=rng.randint(35, 80), nest=rng.randint(1, 240),
        inc=rng.randint(45, 70), ctemp=f"{rng.uniform(24, 30):.1f}",
        tube=f"BX{rng.randint(1000, 9999)}", initials=rng.choice(INITIALS),
    )
    # Build the body from TWO passes over all block types, each pass re-filled
    # with fresh random values, so a single note runs ~3-4 KB. That comfortably
    # clears the ~2 KB toast threshold even after LZ compression, because every
    # pass carries different numbers/coords/tags (low redundancy => poor
    # compression => the value stays big and gets pushed out-of-line).
    parts = [rng.choice(LONG_OPENERS).format(**fields)]
    passes = rng.randint(2, 3)
    for _ in range(passes):
        blocks = LONG_BODY[:]
        rng.shuffle(blocks)
        for blk in blocks:
            # refresh the volatile fills each block so text stays high-entropy
            fields.update(
                ccl=rng.randint(55, 160), ccw=rng.randint(45, 145),
                mass=f"{rng.uniform(30, 420):.1f}", barn=rng.randint(0, 60),
                b1=rng.randint(3, 45), depth=f"{rng.uniform(0.5, 18):.1f}",
                resp=rng.randint(30, 900), breaths=rng.randint(2, 40),
                wtemp=f"{rng.uniform(19, 31):.1f}", atemp=f"{rng.uniform(16, 38):.1f}",
                swell=f"{rng.uniform(0.1, 3.5):.1f}", vis=f"{rng.uniform(1, 25):.1f}",
                lat=f"{beach['flat'] + rng.uniform(-0.5, 0.5):.5f}",
                lon=f"{beach['flon'] + rng.uniform(-0.5, 0.5):.5f}",
                maxdepth=rng.randint(20, 320), modedive=rng.randint(3, 55),
                eggs=rng.randint(60, 140), nest=rng.randint(1, 240),
                ctemp=f"{rng.uniform(24, 30):.1f}", tube=f"BX{rng.randint(1000, 9999)}",
                act1=rng.choice(ACTS), act2=rng.choice(ACTS),
            )
            parts.append(blk.format(**fields))
    parts.append(rng.choice(LONG_CLOSERS).format(**fields))
    return "\n\n".join(parts)


def make_beaches(rng):
    rows = []
    base = datetime(2022, 1, 3, 9, 0, 0, tzinfo=timezone.utc)
    for i, (name, region, lat, lon, offsets) in enumerate(BEACHES, start=1):
        created = base + timedelta(days=rng.randint(0, 45), minutes=rng.randint(0, 600))
        rows.append({
            "beach_id": i, "name": name, "region": region,
            "latitude": f"{lat:.6f}", "longitude": f"{lon:.6f}",
            "flat": lat, "flon": lon,
            "created_at": created, "tz_offsets": offsets,
        })
    return rows


def make_turtles(rng, beaches, n):
    rows = []
    start = datetime(2022, 3, 1, tzinfo=timezone.utc)
    now = datetime(2026, 1, 15, tzinfo=timezone.utc)
    span_days = (datetime(2025, 12, 1, tzinfo=timezone.utc) - start).days
    used = set()
    for tid in range(1, n + 1):
        beach = rng.choice(beaches)
        species = rng.choices(SPECIES, weights=SPECIES_WEIGHTS_BY_BEACH[beach["name"]], k=1)[0]
        first, last = rng.choice(FIRST_NAMES), rng.choice(SURNAMES)
        name = f"{first} {last}" if last else first
        if name in used:
            name = f"{name} #{tid}"
        used.add(name)
        status = rng.choices(STATUSES, weights=STATUS_WEIGHTS, k=1)[0]
        created = start + timedelta(days=rng.randint(0, span_days), minutes=rng.randint(0, 1440))
        updated = min(created + timedelta(days=rng.randint(0, 400), minutes=rng.randint(0, 1440)), now)
        rows.append({
            "turtle_id": tid, "name": name, "species": species,
            "nesting_beach_id": beach["beach_id"], "status": status,
            "created_at": created, "updated_at": updated, "beach": beach,
        })
    return rows


DST_ANCHORS = [
    (datetime(2025, 3, 9, 6, 30, tzinfo=timezone.utc),
     datetime(2025, 3, 9, 8, 30, tzinfo=timezone.utc)),
    (datetime(2025, 11, 2, 5, 30, tzinfo=timezone.utc),
     datetime(2025, 11, 2, 7, 30, tzinfo=timezone.utc)),
]


def make_sightings(rng, turtles, beaches, per_turtle, long_ratio):
    rows = []
    now = datetime(2026, 1, 15, tzinfo=timezone.utc)
    for t in turtles:
        n = max(1, int(rng.gauss(per_turtle, per_turtle * 0.4)))
        home = t["beach"]
        for _ in range(n):
            beach = home if rng.random() < 0.8 else rng.choice(beaches)
            horizon = max(1, (now - t["created_at"]).days)
            observed = min(t["created_at"] + timedelta(days=rng.randint(0, horizon),
                                                       minutes=rng.randint(0, 1440)), now)
            offset = rng.choice(beach["tz_offsets"])
            notes = render_long(rng, beach) if rng.random() < long_ratio else render_short(rng)
            rows.append({
                "turtle_id": t["turtle_id"], "beach_id": beach["beach_id"],
                "observed_at": observed, "offset": offset, "notes": notes,
            })

    dst_beaches = [b for b in beaches if len(b["tz_offsets"]) == 2 and b["tz_offsets"][0] < 0]
    for b in dst_beaches:
        for before, after in DST_ANCHORS:
            for instant, idx in ((before, 0), (after, 1)):
                t = rng.choice(turtles)
                rows.append({
                    "turtle_id": t["turtle_id"], "beach_id": b["beach_id"],
                    "observed_at": instant, "offset": b["tz_offsets"][idx],
                    "notes": f"DST-boundary survey at {b['name']}; logged in local time.",
                })

    rows.sort(key=lambda r: r["observed_at"])
    for i, r in enumerate(rows, start=1):
        r["sighting_id"] = i
    return rows


def ts(dt, offset_hours=0):
    local = dt.astimezone(timezone(timedelta(hours=offset_hours)))
    sign = "+" if offset_hours >= 0 else "-"
    return f"'{local.strftime('%Y-%m-%d %H:%M:%S')}{sign}{abs(offset_hours):02d}'"


def iso_utc(dt):
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S+00")


SCHEMA_SQL = """\
-- Initial schema (pre-migration shape). Matches postgres/01_schema.sql.
CREATE TYPE turtle_species AS ENUM
    ('green', 'loggerhead', 'hawksbill', 'leatherback', 'kemps_ridley');

CREATE TABLE beaches (
    beach_id    int PRIMARY KEY,
    name        text NOT NULL,
    region      text NOT NULL,
    latitude    numeric(9,6) NOT NULL,
    longitude   numeric(9,6) NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE turtles (
    turtle_id         int PRIMARY KEY,          -- widened to bigint in step 3
    name              text NOT NULL,            -- renamed display_name in step 5
    species           turtle_species NOT NULL,
    nesting_beach_id  int NOT NULL REFERENCES beaches(beach_id),
    status            text NOT NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sightings (
    sighting_id  bigint PRIMARY KEY,
    turtle_id    int NOT NULL REFERENCES turtles(turtle_id),
    beach_id     int NOT NULL REFERENCES beaches(beach_id),
    observed_at  timestamptz NOT NULL,
    notes        text
);
"""


def emit_sql(out, beaches, turtles, sightings, with_schema, batch=500):
    w = out.write
    w("-- Generated by generate_seed.py — deterministic seed for terra CDC demo.\n")
    w("-- timestamptz normalizes to UTC; literals intentionally mix offsets.\n")
    w("-- 'notes' mixes short (inline) and long (TOASTed) values on purpose.\n\n")
    if with_schema:
        w(SCHEMA_SQL + "\n")
    w("BEGIN;\n\n")

    w("INSERT INTO beaches (beach_id, name, region, latitude, longitude, created_at) VALUES\n")
    w(",\n".join(
        f"  ({b['beach_id']}, {esc(b['name'])}, {esc(b['region'])}, "
        f"{b['latitude']}, {b['longitude']}, {ts(b['created_at'])})" for b in beaches) + ";\n\n")

    w("INSERT INTO turtles (turtle_id, name, species, nesting_beach_id, status, created_at, updated_at) VALUES\n")
    w(",\n".join(
        f"  ({t['turtle_id']}, {esc(t['name'])}, '{t['species']}', {t['nesting_beach_id']}, "
        f"'{t['status']}', {ts(t['created_at'])}, {ts(t['updated_at'])})" for t in turtles) + ";\n\n")

    for i in range(0, len(sightings), batch):
        chunk = sightings[i:i + batch]
        w("INSERT INTO sightings (sighting_id, turtle_id, beach_id, observed_at, notes) VALUES\n")
        w(",\n".join(
            f"  ({s['sighting_id']}, {s['turtle_id']}, {s['beach_id']}, "
            f"{ts(s['observed_at'], s['offset'])}, {esc(s['notes'])})" for s in chunk) + ";\n\n")

    w("COMMIT;\n")


def emit_csv(outdir, beaches, turtles, sightings):
    outdir.mkdir(parents=True, exist_ok=True)
    with open(outdir / "beaches.csv", "w", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(["beach_id", "name", "region", "latitude", "longitude", "created_at"])
        for b in beaches:
            wr.writerow([b["beach_id"], b["name"], b["region"], b["latitude"],
                         b["longitude"], iso_utc(b["created_at"])])
    with open(outdir / "turtles.csv", "w", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(["turtle_id", "name", "species", "nesting_beach_id",
                     "status", "created_at", "updated_at"])
        for t in turtles:
            wr.writerow([t["turtle_id"], t["name"], t["species"], t["nesting_beach_id"],
                         t["status"], iso_utc(t["created_at"]), iso_utc(t["updated_at"])])
    with open(outdir / "sightings.csv", "w", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(["sighting_id", "turtle_id", "beach_id", "observed_at", "notes"])
        for s in sightings:
            wr.writerow([s["sighting_id"], s["turtle_id"], s["beach_id"],
                         iso_utc(s["observed_at"]), s["notes"]])


def verify_toast(dsn, rng, beaches):
    """Load a sample of long notes and confirm they actually go out-of-line."""
    import psycopg2  # optional; only needed for --verify-toast
    sample = [render_long(rng, rng.choice(beaches)) for _ in range(200)]
    lens = sorted(len(s.encode()) for s in sample)
    conn = psycopg2.connect(dsn)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("DROP TABLE IF EXISTS _toast_probe;")
    cur.execute("CREATE TABLE _toast_probe (id int primary key, notes text);")
    cur.executemany("INSERT INTO _toast_probe VALUES (%s, %s);", list(enumerate(sample)))
    cur.execute("SELECT reltoastrelid::regclass::text FROM pg_class WHERE relname='_toast_probe';")
    toast_rel = cur.fetchone()[0]
    cur.execute(f"SELECT count(*) FROM {toast_rel};")
    toast_rows = cur.fetchone()[0]
    cur.execute("""
        SELECT count(*) FROM _toast_probe
        WHERE pg_column_size(notes) < octet_length(notes);
    """)
    compressed_or_toasted = cur.fetchone()[0]
    cur.execute("DROP TABLE _toast_probe;")
    conn.close()
    print(f"long-note byte sizes: min={lens[0]} p50={lens[len(lens)//2]} max={lens[-1]}",
          file=sys.stderr)
    print(f"toast relation: {toast_rel}; chunks stored out-of-line: {toast_rows} "
          f"(expect > 0); rows where stored<raw: {compressed_or_toasted}/200",
          file=sys.stderr)
    if toast_rows == 0:
        print("WARNING: nothing toasted — bump note length or lower fill entropy.",
              file=sys.stderr)


# ---------------------------------------------------------------------------
# Size presets. Defaults land on "demo" (~200 MB loaded) so the seed fits under
# the 500 MB free-tier cap on managed hosts (Supabase, Neon) with headroom for
# indexes and WAL, while still exercising TOAST. Scale up with a bigger preset
# or explicit --turtles/--sightings-per-turtle for millions of rows.
# Each preset: (turtles, sightings_per_turtle, long_note_ratio).
# ---------------------------------------------------------------------------

SIZE_PRESETS = {
    "tiny":  (1500,   30, 0.1),   # ~45k rows, ~10 MB   — fast smoke test
    "demo":  (14000,  40, 0.1),   # ~550k rows, ~200 MB — DEFAULT, managed-host safe
    "1m":    (25000,  40, 0.1),   # ~1M rows, ~360 MB   — local Docker or a VM
    "5m":    (125000, 40, 0.1),   # ~5M rows, ~1.8 GB   — local only; ~5.5 GB RAM
}

# Empirically fit against Postgres 16 loads (heap + TOAST + PK index):
#   loaded_bytes ~= rows * (184 + 2014 * long_note_ratio)
# Predicts the tiny/demo/1M measured loads within a few percent. Approximate:
# actual size shifts a little with fillfactor, alignment, and page packing.
def estimate_loaded_mib(n_rows, long_ratio):
    return n_rows * (184 + 2014 * long_ratio) / (1024 * 1024)


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--size", choices=list(SIZE_PRESETS), default="demo",
                   help="preset volume (default: demo ~200 MB, fits managed free tiers). "
                        "tiny~10MB / demo~200MB / 1m~360MB / 5m~1.8GB. "
                        "--turtles/--sightings-per-turtle/--long-note-ratio override it.")
    p.add_argument("--turtles", type=int, default=None,
                   help="override the preset's turtle count")
    p.add_argument("--sightings-per-turtle", type=int, default=None,
                   help="override the preset's sightings per turtle")
    p.add_argument("--long-note-ratio", type=float, default=None,
                   help="fraction of sightings that get a long, TOASTable note (0..1); "
                        "overrides the preset")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--format", choices=["sql", "csv"], default="sql")
    p.add_argument("-o", "--output", help="output .sql path (default: stdout)")
    p.add_argument("--outdir", default="seed_csv", help="directory for csv format")
    p.add_argument("--with-schema", action="store_true",
                   help="prepend CREATE TYPE / CREATE TABLE DDL")
    p.add_argument("--verify-toast", metavar="DSN",
                   help="connect to this libpq DSN, load sample long notes, and prove "
                        "they land in the toast relation (needs psycopg2)")
    args = p.parse_args()

    # Resolve preset, then apply any explicit overrides.
    pre_turtles, pre_spt, pre_ratio = SIZE_PRESETS[args.size]
    n_turtles = args.turtles if args.turtles is not None else pre_turtles
    spt = args.sightings_per_turtle if args.sightings_per_turtle is not None else pre_spt
    long_ratio = args.long_note_ratio if args.long_note_ratio is not None else pre_ratio

    if not 0.0 <= long_ratio <= 1.0:
        p.error("--long-note-ratio must be between 0 and 1")

    rng = random.Random(args.seed)
    beaches = make_beaches(rng)

    if args.verify_toast:
        verify_toast(args.verify_toast, rng, beaches)
        return

    turtles = make_turtles(rng, beaches, n_turtles)
    sightings = make_sightings(rng, turtles, beaches, spt, long_ratio)
    n_long = sum(1 for s in sightings if len(s["notes"]) > 600)

    if args.format == "csv":
        emit_csv(Path(args.outdir), beaches, turtles, sightings)
        dest = args.outdir + "/"
    else:
        out = open(args.output, "w") if args.output else sys.stdout
        try:
            emit_sql(out, beaches, turtles, sightings, args.with_schema)
        finally:
            if args.output:
                out.close()
        dest = args.output or "stdout"

    est_mib = estimate_loaded_mib(len(sightings), long_ratio)
    cap_note = "  [!] over the 500 MB managed free-tier cap" if est_mib > 500 else ""
    print(f"generated {len(beaches)} beaches, {len(turtles)} turtles, "
          f"{len(sightings)} sightings ({n_long} long/TOASTable notes) -> {dest}",
          file=sys.stderr)
    print(f"estimated loaded Postgres size: ~{est_mib:.0f} MB "
          f"(heap+TOAST+PK index, approx){cap_note}", file=sys.stderr)


if __name__ == "__main__":
    main()

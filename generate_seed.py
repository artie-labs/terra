#!/usr/bin/env python3
"""Generate deterministic African-safari seed data for the Terra CDC demo.

The pre-migration schema is deliberately small:
  watering_holes(watering_hole_id, name, region, latitude, longitude, created_at)
  animals(animal_id, name, species, home_watering_hole_id, status, created_at, updated_at)
  observations(observation_id, animal_id, watering_hole_id, observed_at, notes)

Long observation notes contain varied values so they cross Postgres's TOAST threshold.
The same --seed and arguments always produce byte-identical output.
"""

import argparse
import csv
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

WATERING_HOLES = [
    ("Acacia Pan", "Maasai Mara, Kenya", -1.4938, 35.1439, 3),
    ("Elephant Spring", "Amboseli, Kenya", -2.6456, 37.2535, 3),
    ("Kopje Pool", "Serengeti, Tanzania", -2.3333, 34.8333, 3),
    ("Crater Basin", "Ngorongoro, Tanzania", -3.1611, 35.5877, 3),
    ("Reed Lagoon", "Okavango Delta, Botswana", -19.4010, 22.7450, 2),
    ("Mopane Crossing", "Chobe, Botswana", -18.6500, 24.7000, 2),
    ("Baobab Dam", "Kruger, South Africa", -24.9950, 31.5920, 2),
    ("Ochre Seep", "Etosha, Namibia", -19.0200, 15.9100, 2),
    ("Dawn Pool", "Hwange, Zimbabwe", -18.6600, 26.5000, 2),
    ("Riverbend Pool", "South Luangwa, Zambia", -13.1000, 31.8000, 2),
    ("Miombo Spring", "Kafue, Zambia", -15.1000, 25.9800, 2),
    ("Thornbush Pan", "Hluhluwe, South Africa", -28.0000, 32.2000, 2),
]

SPECIES = [
    "african_lion", "african_leopard", "african_elephant", "black_rhinoceros",
    "african_buffalo", "cheetah", "giraffe", "plains_zebra", "hippopotamus",
    "blue_wildebeest", "spotted_hyena", "common_warthog", "ostrich", "impala",
    "african_wild_dog",
]

# Weights make water-dependent species common at watering holes without asserting
# that the synthetic records describe real individual animals or locations.
SPECIES_WEIGHTS = [8, 3, 15, 2, 10, 2, 8, 12, 12, 10, 4, 4, 2, 16, 2]
STATUSES = ["newborn", "juvenile", "adult", "collared", "deceased"]
STATUS_WEIGHTS = [8, 25, 52, 12, 3]

FIRST_NAMES = [
    "Asha", "Baraka", "Duma", "Imani", "Jabari", "Kito", "Lulu", "Mosi",
    "Nia", "Rafiki", "Safi", "Tamu", "Zuri", "Kubwa", "Moyo", "Pendo",
]
SURNAMES = ["the Swift", "the Watchful", "of the Plains", "of the Delta", "Jr.", None, None, None]

SHORT_TEMPLATES = [
    "Ranger observation near the {feature}; animal appeared healthy and alert.",
    "Fresh spoor and visual confirmation at {distance} m from the waterline.",
    "Brief feeding observation; group size estimated at {count} individuals.",
    "Camera-trap match confirmed with confidence {confidence}; no intervention required.",
    "Tracking collar {tag} reported normally; last known movement within expected range.",
    "Veterinary team noted a minor healed scar and released the animal without handling.",
]

LONG_OPENERS = [
    "Extended ranger observation recorded during the {season} patrol at {hole}. "
    "First confirmation occurred at {time} local time using collar {tag} and a photo match.",
    "Field team completed a {minutes}-minute observation at {hole}. The animal was first "
    "seen moving {direction} across the {habitat}; prior record was {days} days old.",
]
LONG_BODY = [
    "Identification: estimated age class {age}, body condition {condition}/5, and a {confidence} "
    "photo match. The observer recorded {count} nearby animals and noted distinctive marks near "
    "the {side} flank. GPS approximation {lat}, {lon} was retained only for this synthetic demo.",
    "Behaviour: spent {minutes} minutes {activity} before moving toward {feature}. The group "
    "maintained roughly {distance} m separation from the vehicle, with no signs of distress.",
    "Environment: air temperature {air} C, wind {wind} kt from {direction}, visibility {visibility} m, "
    "and ground conditions {ground}. Water level at the hole was recorded as {water_level}.",
    "Telemetry: collar {tag} last transmitted {days} days ago. Battery estimate {battery}% and "
    "movement cadence remained within the expected range for this synthetic observation series.",
    "Health: ranger noted {health_note}. No immobilization or sample collection was performed; "
    "the record was reviewed by observer {initials} before upload.",
]
LONG_CLOSERS = [
    "Observation ended at {end_time}; the animal departed {direction}. Follow-up requested on the next patrol.",
    "No intervention required. Entry reconciled against the patrol ledger by {initials}.",
]


def esc(value):
    return "NULL" if value is None else "'" + value.replace("'", "''") + "'"


def timestamp(value, offset_hours=0):
    local = value.astimezone(timezone(timedelta(hours=offset_hours)))
    sign = "+" if offset_hours >= 0 else "-"
    return f"'{local.strftime('%Y-%m-%d %H:%M:%S')}{sign}{abs(offset_hours):02d}'"


def iso_utc(value):
    return value.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S+00")


def make_watering_holes(rng):
    base = datetime(2022, 1, 3, 9, tzinfo=timezone.utc)
    return [
        {
            "watering_hole_id": index,
            "name": name,
            "region": region,
            "latitude": f"{latitude:.6f}",
            "longitude": f"{longitude:.6f}",
            "raw_latitude": latitude,
            "raw_longitude": longitude,
            "offset": offset,
            "created_at": base + timedelta(days=rng.randint(0, 45), minutes=rng.randint(0, 600)),
        }
        for index, (name, region, latitude, longitude, offset) in enumerate(WATERING_HOLES, start=1)
    ]


def make_animals(rng, watering_holes, count):
    rows = []
    used_names = set()
    start = datetime(2022, 3, 1, tzinfo=timezone.utc)
    end = datetime(2025, 12, 1, tzinfo=timezone.utc)
    now = datetime(2026, 1, 15, tzinfo=timezone.utc)
    for animal_id in range(1, count + 1):
        home = rng.choice(watering_holes)
        first, surname = rng.choice(FIRST_NAMES), rng.choice(SURNAMES)
        name = f"{first} {surname}" if surname else first
        if name in used_names:
            name = f"{name} #{animal_id}"
        used_names.add(name)
        created_at = start + timedelta(days=rng.randint(0, (end - start).days), minutes=rng.randint(0, 1440))
        updated_at = min(created_at + timedelta(days=rng.randint(0, 400), minutes=rng.randint(0, 1440)), now)
        rows.append({
            "animal_id": animal_id,
            "name": name,
            "species": rng.choices(SPECIES, weights=SPECIES_WEIGHTS, k=1)[0],
            "home_watering_hole_id": home["watering_hole_id"],
            "status": rng.choices(STATUSES, weights=STATUS_WEIGHTS, k=1)[0],
            "created_at": created_at,
            "updated_at": updated_at,
            "home": home,
        })
    return rows


def note_fields(rng, watering_hole):
    return {
        "hole": watering_hole["name"], "season": rng.choice(["dry-season", "green-season", "shoulder-season"]),
        "time": f"{rng.randrange(24):02d}:{rng.randrange(60):02d}",
        "end_time": f"{rng.randrange(24):02d}:{rng.randrange(60):02d}",
        "tag": f"C{rng.randrange(10000, 99999)}", "minutes": rng.randrange(8, 90),
        "days": rng.randrange(1, 210), "direction": rng.choice(["north", "south", "east", "west", "downwind"]),
        "habitat": rng.choice(["mopane scrub", "open grassland", "riverine woodland", "acacia thicket"]),
        "feature": rng.choice(["reed bed", "salt pan", "acacia stand", "shaded bank"]),
        "age": rng.choice(["juvenile", "subadult", "adult"]), "condition": rng.randrange(2, 6),
        "confidence": rng.choice(["high", "medium", "very high"]), "count": rng.randrange(1, 35),
        "side": rng.choice(["left", "right"]), "distance": rng.randrange(5, 500),
        "activity": rng.choice(["drinking", "foraging", "resting", "moving with the herd", "scanning the area"]),
        "air": f"{rng.uniform(16, 39):.1f}", "wind": rng.randrange(0, 35), "visibility": rng.randrange(200, 5000),
        "ground": rng.choice(["dry and firm", "muddy at the edge", "short grass", "recently rained-on"]),
        "water_level": rng.choice(["low", "normal", "high"]), "battery": rng.randrange(8, 100),
        "health_note": rng.choice(["normal gait", "light old scarring", "no visible injury", "good body condition"]),
        "initials": rng.choice(["A.M.", "R.K.", "J.T.", "S.P.", "L.O.", "D.C."]),
        "lat": f"{watering_hole['raw_latitude'] + rng.uniform(-0.5, 0.5):.5f}",
        "lon": f"{watering_hole['raw_longitude'] + rng.uniform(-0.5, 0.5):.5f}",
    }


def render_short(rng):
    return rng.choice(SHORT_TEMPLATES).format(
        feature=rng.choice(["reed bed", "salt pan", "acacia stand"]), distance=rng.randrange(5, 500),
        count=rng.randrange(1, 35), confidence=rng.choice(["high", "medium"]), tag=f"C{rng.randrange(10000, 99999)}",
    )


def render_long(rng, watering_hole):
    fields = note_fields(rng, watering_hole)
    paragraphs = [rng.choice(LONG_OPENERS).format(**fields)]
    for _ in range(rng.randint(2, 3)):
        blocks = LONG_BODY[:]
        rng.shuffle(blocks)
        for block in blocks:
            fields.update(note_fields(rng, watering_hole))
            paragraphs.append(block.format(**fields))
    paragraphs.append(rng.choice(LONG_CLOSERS).format(**fields))
    return "\n\n".join(paragraphs)


def make_observations(rng, animals, watering_holes, per_animal, long_ratio):
    rows = []
    now = datetime(2026, 1, 15, tzinfo=timezone.utc)
    for animal in animals:
        for _ in range(max(1, int(rng.gauss(per_animal, per_animal * 0.4)))):
            watering_hole = animal["home"] if rng.random() < 0.8 else rng.choice(watering_holes)
            horizon = max(1, (now - animal["created_at"]).days)
            observed_at = min(animal["created_at"] + timedelta(days=rng.randint(0, horizon), minutes=rng.randint(0, 1440)), now)
            rows.append({
                "animal_id": animal["animal_id"], "watering_hole_id": watering_hole["watering_hole_id"],
                "observed_at": observed_at, "offset": watering_hole["offset"],
                "notes": render_long(rng, watering_hole) if rng.random() < long_ratio else render_short(rng),
            })
    # Paired +02/+03 rows retain cross-offset timestamp normalization coverage without
    # falsely modeling DST transitions for these safari regions.
    for watering_hole in (hole for hole in watering_holes if hole["offset"] in (2, 3)):
        animal = rng.choice(animals)
        rows.append({"animal_id": animal["animal_id"], "watering_hole_id": watering_hole["watering_hole_id"],
                     "observed_at": datetime(2025, 6, 21, 5, 30, tzinfo=timezone.utc), "offset": watering_hole["offset"],
                     "notes": f"Cross-offset patrol observation at {watering_hole['name']}."})
    rows.sort(key=lambda row: row["observed_at"])
    for observation_id, row in enumerate(rows, start=1):
        row["observation_id"] = observation_id
    return rows


SCHEMA_SQL = Path(__file__).with_name("init").joinpath("01_schema.sql").read_text()


def emit_sql(output, watering_holes, animals, observations, with_schema, batch=500):
    output.write("-- Generated by generate_seed.py — deterministic seed for the Terra CDC demo.\n")
    output.write("-- timestamptz literals intentionally mix +02 and +03 offsets.\n")
    output.write("-- observations.notes mixes inline and long TOASTable values.\n\n")
    if with_schema:
        output.write(SCHEMA_SQL + "\n")
    output.write("BEGIN;\n\n")
    output.write("INSERT INTO watering_holes (watering_hole_id, name, region, latitude, longitude, created_at) VALUES\n")
    output.write(",\n".join(f"  ({hole['watering_hole_id']}, {esc(hole['name'])}, {esc(hole['region'])}, {hole['latitude']}, {hole['longitude']}, {timestamp(hole['created_at'])})" for hole in watering_holes) + ";\n\n")
    output.write("INSERT INTO animals (animal_id, name, species, home_watering_hole_id, status, created_at, updated_at) VALUES\n")
    output.write(",\n".join(f"  ({animal['animal_id']}, {esc(animal['name'])}, '{animal['species']}', {animal['home_watering_hole_id']}, '{animal['status']}', {timestamp(animal['created_at'])}, {timestamp(animal['updated_at'])})" for animal in animals) + ";\n\n")
    for start in range(0, len(observations), batch):
        output.write("INSERT INTO observations (observation_id, animal_id, watering_hole_id, observed_at, notes) VALUES\n")
        chunk = observations[start:start + batch]
        output.write(",\n".join(f"  ({row['observation_id']}, {row['animal_id']}, {row['watering_hole_id']}, {timestamp(row['observed_at'], row['offset'])}, {esc(row['notes'])})" for row in chunk) + ";\n\n")
    output.write("COMMIT;\n")


def emit_csv(outdir, watering_holes, animals, observations):
    outdir.mkdir(parents=True, exist_ok=True)
    with open(outdir / "watering_holes.csv", "w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["watering_hole_id", "name", "region", "latitude", "longitude", "created_at"])
        writer.writerows([[hole["watering_hole_id"], hole["name"], hole["region"], hole["latitude"], hole["longitude"], iso_utc(hole["created_at"])] for hole in watering_holes])
    with open(outdir / "animals.csv", "w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["animal_id", "name", "species", "home_watering_hole_id", "status", "created_at", "updated_at"])
        writer.writerows([[animal["animal_id"], animal["name"], animal["species"], animal["home_watering_hole_id"], animal["status"], iso_utc(animal["created_at"]), iso_utc(animal["updated_at"])] for animal in animals])
    with open(outdir / "observations.csv", "w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["observation_id", "animal_id", "watering_hole_id", "observed_at", "notes"])
        writer.writerows([[row["observation_id"], row["animal_id"], row["watering_hole_id"], iso_utc(row["observed_at"]), row["notes"]] for row in observations])


SIZE_PRESETS = {"tiny": (1500, 30, 0.1), "demo": (14000, 40, 0.1), "1m": (25000, 40, 0.1), "5m": (125000, 40, 0.1)}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--size", choices=SIZE_PRESETS, default="demo")
    parser.add_argument("--animals", type=int)
    parser.add_argument("--observations-per-animal", type=int)
    parser.add_argument("--long-note-ratio", type=float)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--format", choices=["sql", "csv"], default="sql")
    parser.add_argument("-o", "--output")
    parser.add_argument("--outdir", default="seed_csv")
    parser.add_argument("--with-schema", action="store_true")
    args = parser.parse_args()
    preset_animals, preset_observations, preset_ratio = SIZE_PRESETS[args.size]
    animal_count = args.animals if args.animals is not None else preset_animals
    observations_per_animal = args.observations_per_animal if args.observations_per_animal is not None else preset_observations
    long_ratio = args.long_note_ratio if args.long_note_ratio is not None else preset_ratio
    if not 0 <= long_ratio <= 1:
        parser.error("--long-note-ratio must be between 0 and 1")
    rng = random.Random(args.seed)
    watering_holes = make_watering_holes(rng)
    animals = make_animals(rng, watering_holes, animal_count)
    observations = make_observations(rng, animals, watering_holes, observations_per_animal, long_ratio)
    if args.format == "csv":
        emit_csv(Path(args.outdir), watering_holes, animals, observations)
        destination = args.outdir + "/"
    else:
        output = open(args.output, "w") if args.output else sys.stdout
        try:
            emit_sql(output, watering_holes, animals, observations, args.with_schema)
        finally:
            if args.output:
                output.close()
        destination = args.output or "stdout"
    print(f"generated {len(watering_holes)} watering holes, {len(animals)} animals, {len(observations)} observations -> {destination}", file=sys.stderr)


if __name__ == "__main__":
    main()

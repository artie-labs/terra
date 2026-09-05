#!/usr/bin/env python3
"""Generate deterministic Extended JSON fixtures for the Terra MongoDB demo."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

PRESETS = {
    "tiny": {"animals": 12, "observations": 48, "telemetry": 96, "notes": 6, "wide": 4},
    "demo": {"animals": 120, "observations": 1_200, "telemetry": 2_400, "notes": 60, "wide": 24},
}
SPECIES = ["elephant", "lion", "giraffe", "plains_zebra", "cheetah", "impala"]
WATERING_HOLES = [
    ("Elephant Spring", "Amboseli, Kenya", [37.2535, -2.6456]),
    ("Lion's Rest", "Maasai Mara, Kenya", [35.1439, -1.4061]),
    ("Acacia Pool", "Serengeti, Tanzania", [34.8333, -2.3333]),
]
START = datetime(2026, 1, 1, tzinfo=timezone.utc)


def object_id(prefix: int, index: int) -> dict[str, str]:
    return {"$oid": f"{prefix:02x}{index:022x}"}


def date(value: datetime) -> dict[str, str]:
    return {"$date": value.isoformat(timespec="milliseconds").replace("+00:00", "Z")}


def integer(value: int) -> dict[str, str]:
    return {"$numberInt": str(value)}


def long(value: int) -> dict[str, str]:
    return {"$numberLong": str(value)}


def decimal(value: str) -> dict[str, str]:
    return {"$numberDecimal": value}


def seed_documents(size: str) -> dict[str, list[dict[str, Any]]]:
    counts = PRESETS[size]
    animals: list[dict[str, Any]] = []
    for index in range(counts["animals"]):
        hole_name, region, coordinates = WATERING_HOLES[index % len(WATERING_HOLES)]
        created_at = START + timedelta(minutes=index)
        animal: dict[str, Any] = {
            "_id": object_id(1, index + 1),
            "name": f"{SPECIES[index % len(SPECIES)].title()}-{index + 1:03d}",
            "species": SPECIES[index % len(SPECIES)],
            "status": "collared" if index % 3 else "observed",
            "active": index % 7 != 0,
            "weightKg": decimal(f"{900 + index * 17}.25"),
            "home": {
                "wateringHole": hole_name,
                "region": region,
                "coordinates": {"type": "Point", "coordinates": coordinates},
            },
            "tags": ["demo", SPECIES[index % len(SPECIES)]],
            "health": {"score": integer(1 + index % 5), "notes": None if index % 2 else "cleared"},
            "createdAt": date(created_at),
            "updatedAt": date(created_at),
            "seedId": f"animal-{index + 1:03d}",
        }
        if index % 2 == 0:
            animal["attributes"] = {"tuskLengthCm": integer(80 + index)}
        animals.append(animal)

    observations = [
        {
            "_id": object_id(2, index + 1),
            "animalId": animals[index % len(animals)]["_id"],
            "observedAt": date(START + timedelta(minutes=index * 5)),
            "ranger": f"ranger-{index % 4 + 1}",
            "conditions": {"temperatureC": 20.5 + index % 10, "windKph": integer(index % 20)},
            "attachments": [] if index % 3 else [{"kind": "photo", "uri": f"s3://terra/{index + 1}.jpg"}],
            "seedId": f"observation-{index + 1:04d}",
        }
        for index in range(counts["observations"])
    ]
    telemetry = [
        {
            "_id": object_id(3, index + 1),
            "animalId": animals[index % len(animals)]["_id"],
            "recordedAt": date(START + timedelta(seconds=index * 15)),
            "sequence": long(index + 1),
            "batteryVoltage": 3.5 + (index % 20) / 100,
            "location": {"type": "Point", "coordinates": WATERING_HOLES[index % len(WATERING_HOLES)][2]},
            "seedId": f"telemetry-{index + 1:04d}",
        }
        for index in range(counts["telemetry"])
    ]
    ranger_notes = [
        {
            "_id": object_id(4, index + 1),
            "animalId": animals[index % len(animals)]["_id"],
            "text": f"Routine note {index + 1}",
            "createdAt": date(START + timedelta(hours=index)),
            "seedId": f"note-{index + 1:03d}",
        }
        for index in range(counts["notes"])
    ]
    wide_attributes = []
    for index in range(counts["wide"]):
        attributes = {f"attribute_{column:03d}": f"value-{index + 1:03d}-{column:03d}" for column in range(1, 301)}
        wide_attributes.append({"_id": object_id(5, index + 1), "seedId": f"wide-{index + 1:03d}", **attributes})

    return {
        "animals": animals,
        "observations": observations,
        "telemetry": telemetry,
        "ranger_notes": ranger_notes,
        "wide_attributes": wide_attributes,
    }


def render_mongosh(documents: dict[str, list[dict[str, Any]]]) -> str:
    lines = [
        "const terra = db.getSiblingDB(\"terra\");",
        "const collections = " + json.dumps(documents, indent=2) + ";",
        "for (const [collectionName, documents] of Object.entries(collections)) {",
        "  const collection = terra.getCollection(collectionName);",
        "  for (const rawDocument of documents) {",
        "    const document = EJSON.deserialize(rawDocument);",
        "    collection.replaceOne({ _id: document._id }, document, { upsert: true });",
        "  }",
        "}",
        "terra.animals.createIndex({ species: 1, status: 1 });",
        "terra.observations.createIndex({ animalId: 1, observedAt: -1 });",
        "terra.telemetry.createIndex({ animalId: 1, recordedAt: -1 });",
        "terra.ranger_notes.createIndex({ animalId: 1, createdAt: -1 });",
    ]
    return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--size", choices=sorted(PRESETS), default="tiny")
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(render_mongosh(seed_documents(args.size)), encoding="utf-8")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Produce bounded, deterministic MongoDB workloads for Terra measurements."""

from __future__ import annotations

import argparse
import json
import subprocess
import time
from dataclasses import dataclass


@dataclass(frozen=True)
class Profile:
    events: int
    target_rate: int


PROFILES = {
    "smoke": Profile(events=100, target_rate=100),
    "steady": Profile(events=6_000, target_rate=100),
    "pressure": Profile(events=10_000, target_rate=20_000),
}


def build_documents(start: int, count: int, exercise_id: str) -> list[dict[str, object]]:
    documents = []
    for offset in range(count):
        sequence = start + offset
        document: dict[str, object] = {
            "_id": {"$oid": f"f1{sequence:022x}"},
            "exerciseId": exercise_id,
            "sequence": {"$numberLong": str(sequence)},
            "writtenAt": {"$date": "2026-02-01T00:00:00.000Z"},
        }
        document.update({f"attribute_{column:03d}": f"value-{sequence}-{column}" for column in range(1, 301)})
        documents.append(document)
    return documents


def run_batch(uri: str, documents: list[dict[str, object]]) -> None:
    script = """const terra = db.getSiblingDB(\"terra\");
const rawDocuments = %s;
const operations = rawDocuments.map((rawDocument) => {
  const document = EJSON.deserialize(rawDocument);
  return { replaceOne: { filter: { _id: document._id }, replacement: document, upsert: true } };
});
const result = terra.wide_attributes.bulkWrite(operations, { ordered: false });
if (result.matchedCount + result.upsertedCount !== rawDocuments.length) {
  throw new Error(`Expected ${rawDocuments.length} writes, got ${result.matchedCount + result.upsertedCount}`);
}
""" % json.dumps(documents, separators=(",", ":"))
    subprocess.run(["mongosh", uri, "--quiet", "--eval", script], check=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", choices=sorted(PROFILES), default="smoke")
    parser.add_argument("--uri", default="mongodb://localhost:27017/terra?replicaSet=rs0")
    parser.add_argument("--events", type=int)
    parser.add_argument("--target-rate", type=int, choices=(20_000, 35_000, 50_000))
    parser.add_argument("--batch-size", type=int, default=100)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    profile = PROFILES[args.profile]
    events = args.events or profile.events
    target_rate = args.target_rate or profile.target_rate
    if events <= 0 or args.batch_size <= 0:
        raise SystemExit("--events and --batch-size must be positive")

    exercise_id = f"workload-{args.profile}-v1"
    start = time.monotonic()
    attempted = successful = failed = 0
    try:
        for offset in range(0, events, args.batch_size):
            documents = build_documents(offset + 1, min(args.batch_size, events - offset), exercise_id)
            attempted += len(documents)
            try:
                run_batch(args.uri, documents)
                successful += len(documents)
            except subprocess.CalledProcessError:
                failed += len(documents)
                raise
            elapsed = time.monotonic() - start
            expected_elapsed = attempted / target_rate
            if expected_elapsed > elapsed:
                time.sleep(expected_elapsed - elapsed)
    finally:
        elapsed = time.monotonic() - start
        report = {
            "profile": args.profile,
            "exerciseId": exercise_id,
            "targetRate": target_rate,
            "attempted": attempted,
            "successful": successful,
            "failed": failed,
            "elapsedSeconds": round(elapsed, 3),
            "achievedRate": round(successful / elapsed, 2) if elapsed else 0,
        }
        print(json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    main()

const terra = db.getSiblingDB("terra");
const exerciseId = "ordinary-cdc-v1";

function assertCount(expected, filter, collection) {
  const actual = collection.countDocuments(filter);
  if (actual !== expected) {
    throw new Error(`Expected ${expected} matching documents, found ${actual}`);
  }
}

function runExercise(name, operation) {
  print(`\n== ${name} ==`);
  operation();
}

runExercise("insert", () => {
  terra.animals.replaceOne(
    { exerciseId, seedId: "exercise-insert" },
    {
      _id: ObjectId("ee00000000000000000000001"),
      exerciseId,
      seedId: "exercise-insert",
      name: "Exercise Elephant",
      species: "elephant",
      status: "collared",
      active: true,
      tags: ["exercise", "insert"],
      home: { wateringHole: "Elephant Spring", region: "Amboseli, Kenya" },
      attributes: { tuskLengthCm: 155 },
      createdAt: new Date("2026-02-01T00:00:00Z"),
      updatedAt: new Date("2026-02-01T00:00:00Z"),
    },
    { upsert: true },
  );
  assertCount(1, { exerciseId, seedId: "exercise-insert" }, terra.animals);
});

runExercise("update and array mutation", () => {
  const result = terra.animals.updateOne(
    { exerciseId, seedId: "exercise-insert" },
    {
      $set: { "health.score": 5, updatedAt: new Date("2026-02-01T00:01:00Z") },
      $addToSet: { tags: "updated" },
    },
  );
  if (result.modifiedCount !== 1) throw new Error("Expected one updated animal");
  const observation = terra.observations.findOne({ seedId: "observation-0001" });
  terra.observations.updateOne(
    { _id: observation._id },
    {
      $set: { exerciseId, "attachments.0.kind": "verified-photo" },
      $push: { attachments: { kind: "field-note", uri: "s3://terra/exercise-note.txt" } },
    },
  );
  assertCount(1, { _id: observation._id, exerciseId, "attachments.0.kind": "verified-photo" }, terra.observations);
});

runExercise("additive schema evolution", () => {
  terra.animals.updateOne(
    { exerciseId, seedId: "exercise-insert" },
    {
      $set: {
        "attributes.migration_route": "north",
        lastHealthCheck: new Date("2026-02-01T00:02:00Z"),
      },
    },
  );
  terra.observations.updateOne(
    { seedId: "observation-0002" },
    { $set: { exerciseId, habitatCondition: "dry-season" } },
  );
  assertCount(1, { exerciseId, "attributes.migration_route": "north", lastHealthCheck: { $exists: true } }, terra.animals);
  assertCount(1, { exerciseId, habitatCondition: "dry-season" }, terra.observations);
});

runExercise("replacement", () => {
  const note = terra.ranger_notes.findOne({ seedId: "note-001" });
  terra.ranger_notes.replaceOne(
    { _id: note._id },
    {
      _id: note._id,
      exerciseId,
      seedId: note.seedId,
      animalId: note.animalId,
      text: "Replacement document for ordinary CDC coverage",
      createdAt: new Date("2026-02-01T00:03:00Z"),
      replaced: true,
    },
  );
  assertCount(1, { _id: note._id, exerciseId, replaced: true }, terra.ranger_notes);
});

runExercise("delete", () => {
  const note = terra.ranger_notes.findOne({ seedId: "note-002" });
  const result = terra.ranger_notes.deleteOne({ _id: note._id });
  if (result.deletedCount !== 1) throw new Error("Expected one deleted ranger note");
  assertCount(0, { _id: note._id }, terra.ranger_notes);
});

printjson({
  exerciseId,
  insertedAnimal: terra.animals.findOne({ exerciseId, seedId: "exercise-insert" }),
  exerciseObservations: terra.observations.countDocuments({ exerciseId }),
  replacementNotes: terra.ranger_notes.countDocuments({ exerciseId }),
});

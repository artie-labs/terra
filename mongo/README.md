# MongoDB dataset

Terra's MongoDB dataset is a single-node replica set with a document-oriented safari fixture. It is designed to exercise an Artie backfill, a database-level Change Stream, ordinary CRUD updates, additive schema evolution, and optional source workloads.

## Contents

```text
mongo/
├── compose.yml
├── generate_seed.py
├── init/
│   ├── 01_replica_set.sh
│   ├── 02_seed.js
│   └── 03_artie_user.js
├── exercises.js
└── workload.py
```

Collections:

- `animals` — nested documents, optional attributes, arrays, `ObjectId`, dates, decimals, and nulls.
- `observations` — nested values and arrays of subdocuments.
- `telemetry` — append-style collar readings.
- `ranger_notes` — mutable documents used for replacement and deletion exercises.
- `wide_attributes` — isolated documents with 300 scalar attributes for workload measurements; it is deliberately separate from the normal safari collections.

All data is illustrative and deterministic; it is not real animal-tracking data.

## Prerequisites

- Docker with Compose v2
- Python 3.9+ to regenerate seed files or run workloads
- `mongosh` on the host only for direct host-side checks and workload runs

## Start MongoDB

Set `MONGO_ROOT_PASSWORD` and `MONGO_ARTIE_PASSWORD` before exposing this source outside local development. The Artie password is used for the Artie source configuration; the root password is only for the local initializer. Before the **first** start, set `MONGO_REPLICA_HOST` to the hostname and port Artie can reach (for example, `MONGO_REPLICA_HOST=mongo.example.com:27017`). It defaults to `localhost:27017` for a local-only demo and is persisted in the replica-set configuration.

```bash
cd mongo
docker compose -p terra-mongo up -d
docker compose -p terra-mongo logs -f mongo
```

MongoDB’s first-volume initialization runs the ordered scripts: initialize `rs0`, upsert the tiny seed, then create or update the restricted `artie` account. Verify the replica set and seed:

```bash
docker compose -p terra-mongo exec mongo \
  mongosh --quiet -u root -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin --eval 'rs.status().ok'
docker compose -p terra-mongo exec mongo \
  mongosh --quiet -u root -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin terra \
  --eval 'db.animals.countDocuments()'
```

The Artie account has only `find` and `changeStream` privileges for all non-system collections in `terra`. MongoDB requires both permissions for a database-level Change Stream. It cannot write fixture data.

```bash
docker compose -p terra-mongo exec mongo \
  mongosh --quiet -u artie -p '<password>' --authenticationDatabase admin terra \
  --eval 'db.animals.countDocuments()'
```

## Connect Artie

Use the normal MongoDB source settings:

- Database: `terra`
- Username: `artie`
- Password: `MONGO_ARTIE_PASSWORD`
- Local URI: `mongodb://<host>:27017/terra?replicaSet=rs0`

For a local container source, replace `<host>` with the Docker host or tunnel/VM address reachable by Artie. Preserve `replicaSet=rs0` for a directly reachable local deployment.

### Self-hosted MongoDB

Use the reachable hostname, authenticate against `admin`, and grant an equivalent database-scoped custom role with `find` and `changeStream`. This fixture does not configure TLS or firewall rules; remote deployments must use TLS and restrict network access.

### MongoDB Atlas

Use the Atlas-provided `mongodb+srv://` URI with TLS enabled, create an equivalent least-privilege database user, and allow Artie's egress network in Atlas. Atlas manages its own replica set, so do not copy the local `rs0` Compose operation to Atlas.

### Not supported by this fixture

Standalone MongoDB and Amazon DocumentDB are excluded. This demo exercises the MongoDB replica-set and Change Stream contract.

## Generate seed data

The Mongo seed generator uses the same contract as PostgreSQL: a checked-in, smoke-sized generated fixture (`init/02_seed.js`) plus a generator for deliberate larger runs. Mongo emits executable `mongosh` JavaScript rather than SQL, but it follows the same source-directory convention. Regenerate either deterministic preset with Python's standard library only:

```bash
python3 generate_seed.py --size tiny --output init/02_seed.js
python3 generate_seed.py --size demo --output /tmp/terra-mongo-demo.js
```

To load the larger demo fixture after setup, run:

```bash
docker compose -p terra-mongo exec -T mongo \
  mongosh --quiet --host localhost < /tmp/terra-mongo-demo.js
```

## CDC and schema-evolution exercise

After the Artie pipeline has completed its initial backfill, run the deterministic exercise sequence:

```bash
docker compose -p terra-mongo exec -T mongo \
  mongosh --quiet --host localhost < exercises.js
```

It performs an insert, update, nested array mutation, additive fields, document replacement, and a delete. Each retained exercise document carries `exerciseId: "ordinary-cdc-v1"`; use that identifier to find it in the selected destination. Delete behavior remains destination and pipeline-mode specific.

## Workload profiles

`wide_attributes` supports *source* workloads only; it does not promise an end-to-end Artie latency or throughput result.

```bash
python3 workload.py --profile smoke
python3 workload.py --profile steady
python3 workload.py --profile pressure --target-rate 20000
python3 workload.py --profile pressure --target-rate 35000
python3 workload.py --profile pressure --target-rate 50000
```

The script reports requested and achieved rate, attempted/successful/failed events, and elapsed time. `pressure` is deliberately bounded and opt-in. To measure an end-to-end result, record the profile, target and achieved source rate, Artie version/configuration, destination, and source-write-to-destination-arrival timing. Do not treat the requested rate as an achieved rate or a product SLO.

## Tear down

```bash
docker compose -p terra-mongo down -v
```

Delete the Artie pipeline before tearing down a source it is still reading.

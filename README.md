# Terra

Terra provides self-contained source datasets for exercising Artie backfills, CDC streaming, and schema evolution. Choose one dataset; each folder owns its own Docker configuration, seed data, source-specific exercises, and connection instructions.

## Datasets

- [PostgreSQL](pg/README.md) — relational safari dataset with logical replication, deterministic seed generation, and `ALTER TABLE` schema-evolution exercises.
- [MongoDB](mongo/README.md) — replica-set-backed document dataset with Change Stream exercises and optional bounded source workloads.

## Shared scenarios

Each dataset is designed to support the same Artie workflow:

1. Start the selected source and follow its README to create the least-privilege Artie service account.
2. Create an Artie source using the connection details from that dataset's README.
3. Start a pipeline and verify the initial backfill in the selected destination.
4. Run the source-specific change exercises and verify that inserts, updates, and additive schema changes stream downstream.

The expected destination schema and behavior for destructive changes are destination-specific. Terra validates source fixtures only; use the relevant Artie pipeline and destination documentation when validating destination mapping.

## Repository layout

```text
terra/
├── README.md
├── pg/
│   ├── README.md
│   ├── docker-compose.yml
│   ├── generate_seed.py
│   └── init/
│       ├── 01_schema.sql
│       ├── 02_seed.sql
│       └── 03_artie.sql
└── mongo/
    ├── README.md
    ├── compose.yml
    ├── generate_seed.py
    ├── exercises.js
    ├── workload.py
    ├── init/
    └── seed/
```

Run Compose and seed commands from the dataset directory, for example:

```bash
cd pg
docker compose up -d
```

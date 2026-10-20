# Terra

Terra is a set of self-contained source databases for exercising change data capture: a seeded database, a writer that keeps changing it, and schema changes you apply on purpose to see what a replication consumer does with them. Each dataset is one source database and one capability. The Postgres dataset is the one that is finished: it ships a subscriber stand-in, a verifier, measured run time, and a published page at artie.world.

## Datasets

- [PostgreSQL](pg/README.md): safari animals, logical replication, eight schema events, a Postgres subscriber as an offline consumer, `verify.py`.
- [MongoDB](mongo/README.md): replica-set document dataset with Change Stream exercises. Not part of the v0.1 release.

## License

Code is Apache-2.0 ([LICENSE](LICENSE)). The generated data is synthetic and released under CC0.

## Cite

See [CITATION.cff](CITATION.cff). Short form: Artie Technologies, Inc. (2026). Terra: live CDC source datasets, v0.1.0. https://github.com/artie-labs/terra

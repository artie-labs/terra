# Terra turtles demo — a Postgres source Artie can replicate from

This gets the turtle dataset running in Postgres with logical replication turned on, then exposes it to the internet so an Artie pipeline can connect to it as a source. You need to be comfortable in a terminal. You do **not** need to know Kubernetes, and you only need as much Postgres as this document spells out.

By the end you'll have four things to paste into Artie:

| Field | Where it comes from |
| --- | --- |
| **Host name** | your tunnel address or your VM's IP (Step 3) |
| **Port** | `5432` on a VM, or the port your tunnel assigns |
| **Service account** | user `artie`, password you set in `init/03_artie.sql` |
| **Database** | `terra` |

---

## What's in this folder

```
terra/
├── docker-compose.yml      # runs Postgres 16 with wal_level=logical
├── generate_seed.py        # data generator (deterministic, stdlib only)
└── init/
    ├── 01_schema.sql       # tables + enum (pre-migration shape)
    ├── 02_seed.sql         # generated data — you create this in Step 1
    └── 03_artie.sql        # 'artie' role, grants, publication
```

Anything in `init/` runs automatically the first time Postgres starts, in filename order.

---

## Prerequisites

- **Docker** with Compose v2 (`docker compose version` should print something). Docker Desktop on Mac/Windows or Docker Engine on Linux both work.
- **Python 3.9+** to generate the data (`python3 --version`).
- For exposing to the internet, either a free **ngrok** account (quickest) or a cheap **cloud VM** (steadier). Both covered in Step 3.

---

## Step 1 — Generate the data

The generator writes SQL. Point it at `init/02_seed.sql` so Compose picks it up. Don't pass `--with-schema` here; `01_schema.sql` already creates the tables.

```bash
cd terra
python3 generate_seed.py -o init/02_seed.sql
```

The default is the **demo** preset: ~550k sightings, roughly **200 MB** once loaded. That's deliberately sized to fit under the 500 MB cap on managed free tiers (Supabase, Neon) with headroom for indexes and WAL, while still being large enough to push long notes into TOAST storage. The generator prints its estimated loaded size and warns if you cross the 500 MB line.

Pick a different volume with `--size`:

| Preset | Rows | Loaded size | Use for |
| --- | --- | --- | --- |
| `tiny` | ~45k | ~10 MB | fast smoke test |
| `demo` (default) | ~550k | ~200 MB | managed free tiers |
| `1m` | ~1M | ~360 MB | local Docker or a VM |
| `5m` | ~5M | ~1.8 GB | local only (~5.5 GB RAM to generate) |

```bash
python3 generate_seed.py --size tiny -o init/02_seed.sql     # quick test
python3 generate_seed.py --size 1m   -o init/02_seed.sql     # bigger, self-hosted
```

For anything past a few million rows, or to hit an exact shape, override directly: `--turtles`, `--sightings-per-turtle`, and `--long-note-ratio` (the fraction of observations long enough to land in TOAST) each take precedence over the preset. The generation is deterministic — same inputs, byte-identical output — so re-running gives you the same database every time.

> **Managed free tiers cap at ~500 MB.** Stick to `demo` (or smaller) on Supabase/Neon; save `1m` and up for the local Docker or VM setup, where the only real limit is disk and the ~1.1 GB of RAM per million rows the generator needs while running.

---

## Step 2 — Set your passwords, then start Postgres

> Prefer not to run Docker or a tunnel? Skip Steps 2–3 and use a managed host instead — see **"Managed Postgres"** below. It gives you a public endpoint directly.

Open two files and change the placeholder passwords:

- `docker-compose.yml` → `POSTGRES_PASSWORD` (your admin password)
- `init/03_artie.sql` → the password in the `CREATE ROLE artie ... PASSWORD '...'` line. **This is the one you give Artie.** Make it long and random.

Then bring it up:

```bash
docker compose up -d
docker compose logs -f postgres   # watch it initialize; Ctrl-C to stop watching
```

Confirm it worked:

```bash
docker compose exec postgres psql -U postgres -d terra -c "SELECT count(*) FROM sightings;"
docker compose exec postgres psql -U postgres -d terra -c "SELECT pubname FROM pg_publication;"
```

You should see your row count and a publication named `dbz_publication`.

> **The init scripts only run on a fresh volume.** If you change a password or the seed *after* the first `up`, run `docker compose down -v` (the `-v` wipes the data volume) and `docker compose up -d` again. Without `-v`, your edits to `init/` are ignored.

At this point the database is correct and reachable from your own machine. It is **not** yet reachable from Artie. That's Step 3.

---

## Step 3 — Expose it to the internet

Artie runs in the cloud and connects *inward* to your database, so the database needs a public address. Two paths, cheapest-effort first.

### Option A — ngrok tunnel (fastest to try)

Postgres speaks raw TCP, so you need a **TCP** tunnel, not an HTTP one.

1. Make a free account at ngrok.com and install the agent.
2. Add your authtoken (shown in the ngrok dashboard): `ngrok config add-authtoken <TOKEN>`.
3. With Postgres already running from Step 2:

   ```bash
   ngrok tcp 5432
   ```

4. ngrok prints a line like `Forwarding tcp://4.tcp.ngrok.io:18452 -> localhost:5432`. That gives Artie:
   - **Host name:** `4.tcp.ngrok.io`
   - **Port:** `18452`

**Know the tradeoffs before you rely on this.** ngrok tightened its free tier in early 2026: roughly a 1 GB/month transfer cap and limited monthly TCP connections. Artie's first backfill reads the whole table, so a large seed can eat into that 1 GB fast — keep the seed small for a free-tier tunnel, or size up your plan. The free TCP address is also **ephemeral**: it changes every time you restart `ngrok`, and you'd have to update the host/port in Artie each time. Fine for a first connection test; not what you want for a demo you leave running.

Comparable low-lift TCP tunnels if ngrok's limits pinch: **Pinggy**, **playit.gg**, and **tunnelto.me** all forward raw TCP on a free or near-free tier. The setup shape is the same: start Postgres, start a TCP tunnel to port 5432, hand Artie the host/port it prints.

### Option B — cheap cloud VM (steadier, recommended for a real demo)

A small always-on VM gives you a stable IP, no bandwidth cap, and a firewall you control. Any of these work: a $4–6/month DigitalOcean droplet, AWS Lightsail, a Hetzner instance, or a GCP `e2-micro` (often free-tier eligible).

1. Create the smallest Ubuntu VM the provider offers. Note its **public IP**.
2. Install Docker on it, copy this `terra/` folder over (`scp -r terra user@<IP>:~/`), and run Steps 1–2 there instead of on your laptop.
3. Open port `5432` **only to Artie**, not to the whole world. Get Artie's egress IP ranges from the Artie dashboard or support, then allow just those. On Ubuntu with `ufw`:

   ```bash
   sudo ufw allow from <ARTIE_IP_1> to any port 5432 proto tcp
   sudo ufw allow from <ARTIE_IP_2> to any port 5432 proto tcp
   sudo ufw enable
   ```

   If your provider has its own firewall/security-group UI (AWS, GCP do), use that instead of or in addition to `ufw`.

That gives Artie **Host name:** `<your VM's public IP>` and **Port:** `5432`.

> Don't leave `5432` open to `0.0.0.0/0` with a weak password. Allowlist Artie's IPs, and keep the strong `artie` password from Step 2.

---

## Managed Postgres (alternative to Steps 2–3)

A managed host hands you a public, TLS-secured endpoint directly, so you skip both Docker and the tunnel/VM. The tradeoff is the ~500 MB free-tier storage cap: generate with the default `demo` preset or `tiny`, not `1m`+.

Both providers load the same three SQL files. Run them with `psql` from your machine using the provider's connection string — the browser SQL editors choke on a 200 MB seed:

```bash
psql "<CONNECTION_STRING>" -f init/01_schema.sql
psql "<CONNECTION_STRING>" -f init/02_seed.sql
psql "<CONNECTION_STRING>" -f init/03_artie.sql
```

Two edits to `init/03_artie.sql` before you run it:

- Managed hosts use their own default database (`postgres` on Supabase, `neondb` on Neon), not `terra`. Either create a `terra` database first, or change the `GRANT CONNECT ON DATABASE terra` line to match — and give Artie that database name in Step 4.
- The `CREATE ROLE artie ... REPLICATION` line may need adjusting. Some managed hosts don't let you set the `REPLICATION` attribute directly and grant replication capability through the platform instead. Follow the provider notes below (and Artie's provider-specific guide) for the exact role; the schema and seed load unchanged, and `CREATE PUBLICATION dbz_publication FOR ALL TABLES` is the piece Artie needs either way.

Whichever you pick, use the provider's **direct** connection string, not a pooled/transaction-pooler one — logical replication needs a persistent connection and doesn't work through a pooler.

### Supabase

1. Create a project (free tier: 2 projects, 500 MB database). Set a strong database password.
2. Logical replication is available on standard Supabase Postgres — Realtime is built on it — and Artie ships a dedicated Supabase source guide. Follow that guide for the exact role and publication setup.
3. Load the three SQL files with the **direct** connection string from Project Settings → Database (not the Supavisor pooler).
4. In Artie, use that host, port, user, password, and database `postgres`. Continue to Step 4.

Supabase compute is always-on — it doesn't scale to zero — so Artie's long-lived connection just works. The one catch: free projects pause after 7 days of inactivity, which drops the connection and the replication slot. Keep the demo active, or expect to un-pause it before reconnecting.

### Neon

1. Create a project (free tier: 0.5 GB storage, scale-to-zero).
2. Enable logical replication in the Neon Console under Settings → Logical Replication → Enable. This flips `wal_level` to `logical` for the whole project. It's irreversible and restarts your computes, so active connections drop and reconnect once.
3. Load the three SQL files using the **direct** connection string (to your compute endpoint), not the pooled one. Neon rejects unencrypted connections; Artie connects over SSL fine. Neon supports the `pgoutput` plugin Artie uses.
4. In Artie, use that host, port `5432`, user, password, and database (`neondb` or the name you chose). Continue to Step 4.

Two Neon behaviors to plan around for CDC:

- While Artie stays connected, the compute never scales to zero — it runs continuously and burns through the 100 free compute-hours/month quickly. Fine for a short demo, not for something you leave running.
- Neon drops inactive replication slots after about 40 hours. If Artie disconnects for a couple of days, the slot is gone and the pipeline needs a fresh backfill.

---

## Step 4 — Connect the pipeline in Artie

In Artie, add a **PostgreSQL source** and fill in the four fields from Step 3 plus:

- **Database:** `terra`
- **Publication:** `dbz_publication` (already created by `03_artie.sql`)

Leave publication mode on the default "all tables" setting — it matches the publication you created. Artie provisions its own replication slot when the pipeline starts, so there's nothing to pre-create.

Verify the connection in the Artie UI. Once it validates, Artie backfills the three tables and then streams changes.

---

## Running the migration steps

The demo's whole point is changing the live schema (add columns, promote `turtle_id` to `bigint`, rename `name`, delete a turtle) and watching each change land downstream. Apply those against the running database as the `artie` admin or `postgres` user, e.g.:

```bash
docker compose exec postgres psql -U postgres -d terra \
  -c "ALTER TABLE turtles ADD COLUMN weight_kg numeric(6,2);"
```

One Artie-specific behavior to expect, because it surprises people: **a bare `ADD COLUMN` may not show up downstream immediately.** DDL isn't a WAL event Artie can react to on its own; Artie applies the schema change lazily, when the *next* insert/update/delete arrives on that table. On a quiet table the new column appears only after you touch a row. If you want it to show up right away, write a row:

```bash
docker compose exec postgres psql -U postgres -d terra \
  -c "UPDATE turtles SET updated_at = now() WHERE turtle_id = 1;"
```

Deletes and updates carry the primary key over the wire (that's why every table has a PK), so the delete in the cleanup step propagates correctly rather than silently going missing.

---

## Keeping the slot healthy

An idle source database can let the replication slot grow and pin WAL. If this demo will sit untouched for long stretches, enable heartbeats: turn on "Enable heartbeats" in Artie's source advanced settings, then uncomment the heartbeat block at the bottom of `init/03_artie.sql` (and re-init per the note in Step 2). Artie periodically updates that one row so the slot keeps advancing.

---

## Tearing it down

```bash
docker compose down -v     # stops Postgres and deletes the data volume
```

Stop the ngrok process with Ctrl-C, or delete the cloud VM. If you connected Artie, delete the pipeline there too so it stops trying to reach a host that's gone, which otherwise leaves an orphaned replication slot behind.

---

## Quick troubleshooting

- **Artie can't connect.** Check the tunnel is still up (ngrok addresses change on restart) or that the VM firewall allows Artie's IPs on `5432`. Test from another machine with `psql "host=<HOST> port=<PORT> user=artie dbname=terra"`.
- **"publication does not exist."** The init scripts didn't run — almost always because the volume already existed. `docker compose down -v` then `up -d`.
- **New column didn't appear downstream.** Expected on a quiet table; write any row to that table (see "Running the migration steps").
- **Password change didn't take.** Same fix as the publication issue: init scripts only run on a fresh volume.

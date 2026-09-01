# DevForge

A private, single-user development cockpit for Ideas, Projects, roadmaps, Journal Entries, Decisions, and Momentum.

## Self-host with Docker Compose

Requirements: Docker Engine with the Compose plugin.

1. Copy the environment template and set a long, unique password:

   ```sh
   cp .env.example .env
   ```

2. Start DevForge:

   ```sh
   docker compose up -d --build
   ```

3. Open `http://localhost:3000` and sign in with `DEVFORGE_PASSWORD`.

Database migrations run automatically whenever the app container starts. Postgres data persists in the `postgres-data` Docker volume. No seed or demo records are created by the product.

### Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DEVFORGE_PASSWORD` | Yes | — | Password used to create the private session cookie. Use a long random value. |
| `PORT` | No | `3000` | Host port published by Docker Compose. |
| `DATABASE_URL` | Container-managed | `postgresql://devforge:devforge@database:5432/devforge` | Postgres connection string. Override it only when running the app outside the supplied Compose stack. |

Keep `.env` private. Put DevForge behind a TLS-terminating reverse proxy before exposing it outside a trusted network.

### Backup

Write a portable Postgres dump to the current directory:

```sh
docker compose exec -T database pg_dump -U devforge -d devforge -Fc > devforge-$(date +%Y-%m-%d).dump
```

Restore into an empty DevForge database with `pg_restore`:

```sh
docker compose exec -T database pg_restore -U devforge -d devforge --clean --if-exists < devforge-YYYY-MM-DD.dump
```

Stop the app before a destructive restore. Keep backups outside the Docker host as well as on it.

## Local development

Install Node.js 22 or newer and dependencies:

```sh
npm ci
```

Start Postgres and the containerized app with `docker compose up -d`, or provide `DATABASE_URL` and `DEVFORGE_PASSWORD` when running `npm run dev` directly.

### Optional development data

The product never creates sample records. For a disposable local instance, run the separate idempotent development seed script against the Compose database:

```sh
docker compose exec app node scripts/dev-seed.mjs
```

The script inserts or refreshes records with fixed development-only IDs. Do not run it against an instance containing data you care about.

Useful checks:

```sh
npm run typecheck
npm test
npm run build
```

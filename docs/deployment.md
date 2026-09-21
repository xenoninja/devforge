# Running Devforge

[Back to the README](../README.md)

## Run with Docker

Requires Docker Engine and Docker Compose.

```sh
mkdir -p data
docker compose up --build -d
```

Open <http://localhost:3000>. The application listens on `0.0.0.0:3000` inside the
container; Compose publishes port 3000 on the host. From a phone or another
computer on the same LAN, open `http://<host-LAN-IP>:3000`. Allow incoming TCP 3000
in the host firewall if needed. No login or GitHub credentials are required.
Anyone who can reach the application can access its data; use a trusted LAN.

All durable application data is in `./data`, mounted at `/data` in the container.
Keep this directory when upgrading or replacing containers:

```sh
docker compose restart
docker compose up --build --force-recreate -d
```

To choose another host port or directory, set `PORT` and `DATA_DIR`, for example
`PORT=3100 DATA_DIR=/absolute/path/to/ideas docker compose up --build -d`.
Use the same values for subsequent Compose commands. The directory must be
writable by the container. Run only one application container per data directory.

## Manual backup and restore

Stop the container before copying **the whole data directory**. For the default
Compose configuration, use a fresh backup destination each time:

```sh
docker compose stop
mkdir -p backups
cp -R data backups/ideas-2026-09-20
docker compose start
```

Restore to a separate, previously nonexistent directory; do not copy over a live
database or merge into an existing directory. This starts a separate container
on port 3001, leaving the original mount intact:

```sh
cp -R backups/ideas-2026-09-20 restored-data
DATA_DIR=./restored-data PORT=3001 docker compose -p devforge-restored up --build -d
```

Open <http://localhost:3001> and check the saved ideas, projects, and their features. Stop this restored instance
with `DATA_DIR=./restored-data PORT=3001 docker compose -p devforge-restored down`.
If using a custom directory, substitute that directory for `data` in the backup
command and pass its `DATA_DIR` when stopping and starting the original instance.


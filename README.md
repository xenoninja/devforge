# Devforge

A local, single-owner dashboard for ideas and projects. Capture a required title and optional
plain-text description, then find new ideas on home, most recently updated first.
Creation and last-update times are recorded automatically and displayed in UTC.
Edit ideas, abandon them while retaining their contents, and restore them to new.
Browse all ideas to combine status filters with title search. Create projects directly with an optional description and repository URL, defaulting
to experimenting or selecting developing. Edit project details and clear optional
values. Home groups projects by stage, most recently updated first. Repository links
are manual references; the app never contacts GitHub. Move projects between experimenting, developing, and abandoned; restore them to either
active stage. Browse all projects to combine status filters with title search, including
abandoned projects. Metadata remains editable in every status. Features follow in later tickets. Records have no permanent deletion action.

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

Open <http://localhost:3001> and check the saved ideas and projects. Stop this restored instance
with `DATA_DIR=./restored-data PORT=3001 docker compose -p devforge-restored down`.
If using a custom directory, substitute that directory for `data` in the backup
command and pass its `DATA_DIR` when stopping and starting the original instance.

## Development

Use Node.js 24 or newer and npm. The server uses Node's built-in HTTP and SQLite
modules, server-rendered HTML, and a static stylesheet, with no runtime npm
dependencies. SQLite stores records in `DATA_DIR/devforge.sqlite`. The container
uses Node.js 24. No external service is involved in application operation.

```sh
npm ci
npm run dev
```

Open <http://localhost:3000>. Local development also defaults to `./data`; set
`DATA_DIR` and `PORT` to use a separate dataset or port. Do not run development
and Docker against the same directory concurrently.

`npm run dev` builds once and restarts the server when compiled code changes.
Run `npm run build:watch` in a second terminal to compile TypeScript edits as you
work. Restart `npm run dev` after stylesheet changes.

## Acceptance tests

The shared test boundary is the running application's browser interface with
real isolated storage, as agreed in [issue #1](https://github.com/xenoninja/devforge/issues/1).
Tests never use your development data. Each browser test starts its own server
with a fresh temporary directory and an automatically assigned port. Desktop and
phone projects both run in Chromium; the phone project emulates the viewport and
touch input, rather than a physical phone or Safari.

```sh
npm ci
npx playwright install chromium
npm run typecheck
npm run test:browser             # capture, editing, lifecycle, discovery, layouts
npm run test:docker              # Docker daemon required
npm test                        # full suite, including Docker
```

On Linux, use `npx playwright install --with-deps chromium` if browser OS libraries
are missing. Run a single file or case with:

```sh
npm run test:browser -- --project=desktop -g 'missing and whitespace'
```

The Docker test builds the image, publishes an isolated host port, captures an
idea through the browser, edits and abandons it, reloads, restarts, replaces the container with the same
mount, then stops it, copies the directory to a backup, restores that backup to
a separate mount, and verifies the idea and abandoned and restored projects, including their repository links, statuses, and timestamps through the browser.
Temporary containers, images, and directories are removed afterward. Failed
tests retain Playwright traces in `test-results/`.

LAN acceptance requires another physical device on the host's LAN; the automated
suite checks the published host port but cannot establish physical-device LAN
reachability. To verify manually, open the host LAN URL on a phone, add an idea,
reload, and confirm that the same idea is visible on the host browser.

Verification on 20 September 2026: desktop and phone browser checks, container
restart and replacement, and stopped-directory backup/restore passed on macOS
with OrbStack Docker. Rendered desktop and phone layouts were also inspected.
Physical-device LAN access was not verified because a second device on the host
LAN was unavailable in the implementation environment.

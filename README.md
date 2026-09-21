# Devforge

**A home for your next idea, side project, and planned feature.**

Devforge is a self-hosted dashboard for solo developers. Capture ideas before
there’s a repository, turn the promising ones into projects, and track the
features you want to build—all in one place.

It runs locally, keeps your data in SQLite, and needs no account or external
service.

## What you can do

- **Capture ideas** with a title and optional notes, then find them with search
  and status filters.
- **Turn ideas into projects** while keeping the original idea linked and
  available. You can also create projects directly.
- **Organize your projects** into experimenting and developing stages, with an
  optional repository link for each.
- **Track features** from new to developing to completed, with optional issue
  links when you need them.
- **Set work aside and return later.** Abandon ideas, projects, or features
  without losing their contents, and restore them when you’re ready.
- **Browse from your desktop or phone** on your local network.

Repository and issue links are manual references. Devforge works independently
of GitHub and doesn’t require GitHub credentials or sync changes to it.

## Quick start

With Docker Engine and Docker Compose installed:

```sh
git clone https://github.com/xenoninja/devforge.git
cd devforge
mkdir -p data
docker compose up --build -d
```

Open **<http://localhost:3000>** to capture your first idea.

Your data lives in `./data` and persists when containers are replaced. Keep this
directory when upgrading.

Devforge is designed for one owner on a trusted local network. There is no login;
anyone who can reach the app can view and edit its data.

For custom ports, phone access, upgrades, and backups, see the
[deployment guide](docs/deployment.md).

## Local development

Requires **Node.js 24 or newer** and npm.

```sh
npm ci
npm run dev
```

Open <http://localhost:3000>. To compile TypeScript edits as you work, run
`npm run build:watch` in a second terminal. Restart `npm run dev` after stylesheet
changes.

Local development also uses `./data` by default. Set `DATA_DIR` to use a separate
directory if Docker is running at the same time.

Devforge uses TypeScript, Node’s built-in HTTP and SQLite modules,
server-rendered HTML, and CSS, with no runtime npm dependencies. See the
[development guide](docs/development.md) for test setup and commands.

## Contributing

Bug reports and feature suggestions belong in
[GitHub Issues](https://github.com/xenoninja/devforge/issues). For a bug, include
steps to reproduce it and what you expected to happen. For a larger change, open
an issue to discuss the approach first.

To work on the code, follow the [development guide](docs/development.md).
The [domain glossary](CONTEXT.md) and [architecture decisions](docs/adr/) explain
the project’s terminology and design choices.

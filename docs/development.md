# Developing Devforge

[Back to the README](../README.md)

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
a separate mount, and verifies the idea, a promoted idea and its linked project with independently edited contents, and abandoned and restored projects, including their repository links, statuses, and timestamps through the browser. It also verifies project-feature relationships, edited or cleared feature fields, and all four feature statuses under an abandoned project. After each restart, replacement, and restore, it checks that adding features and changing feature statuses remain blocked.
Temporary containers, images, and directories are removed afterward. Failed
tests retain Playwright traces in `test-results/`.

LAN acceptance requires another physical device on the host's LAN; the automated
suite checks the published host port but cannot establish physical-device LAN
reachability. To verify manually, open the host LAN URL on a phone, add an idea,
reload, and confirm that the same idea is visible on the host browser.

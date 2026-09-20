import { test as base, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';

export const test = base.extend<{ appURL: string; captureOnlyData: boolean; activeProjectsData: boolean }>({
  captureOnlyData: [false, { option: true }],
  activeProjectsData: [false, { option: true }],
  appURL: async ({ captureOnlyData, activeProjectsData }, use) => {
    const directory = await mkdtemp(join(tmpdir(), 'devforge-browser-'));
    if (captureOnlyData) {
      // The released capture-only schema is input to the upgrade; assertions remain in the browser.
      const database = new DatabaseSync(join(directory, 'devforge.sqlite'));
      database.exec(`
        CREATE TABLE ideas (
          id INTEGER PRIMARY KEY,
          title TEXT NOT NULL CHECK(length(trim(title)) > 0),
          description TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'new' CHECK(status = 'new'),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        ) STRICT;
        INSERT INTO ideas VALUES (7, 'Existing idea', 'Original notes', 'new',
          '2026-09-01T00:00:00.000Z', '2026-09-02T00:00:00.000Z');
      `);
      database.close();
    }
    if (activeProjectsData) {
      // Released project schema is upgrade input; verify preservation through the browser.
      const database = new DatabaseSync(join(directory, 'devforge.sqlite'));
      database.exec(`
        CREATE TABLE projects (
          id INTEGER PRIMARY KEY,
          title TEXT NOT NULL CHECK(length(trim(title)) > 0),
          description TEXT NOT NULL DEFAULT '',
          repository_url TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'experimenting' CHECK(status IN ('experimenting', 'developing')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        ) STRICT;
        INSERT INTO projects VALUES (12, 'Existing project', 'Original project notes',
          'https://github.com/example/legacy', 'developing',
          '2026-09-01T00:00:00.000Z', '2026-09-02T00:00:00.000Z');
      `);
      database.close();
    }
    const child = spawn(process.execPath, ['dist/server.js'], {
      env: { ...process.env, DATA_DIR: directory, PORT: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const exited = once(child, 'exit');
    let logs = '';
    child.stderr.on('data', chunk => { logs += chunk; });
    try {
      const url = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`App startup timed out: ${logs}`)), 10_000);
        child.on('error', error => { clearTimeout(timer); reject(error); });
        child.on('exit', () => { clearTimeout(timer); reject(new Error(`App exited: ${logs}`)); });
        child.stdout.on('data', chunk => {
          logs += chunk;
          const match = logs.match(/Listening on http:\/\/0\.0\.0\.0:(\d+)/);
          if (match) { clearTimeout(timer); resolve(`http://127.0.0.1:${match[1]}`); }
        });
      });
      await use(url);
    } finally {
      if (child.exitCode === null) child.kill('SIGTERM');
      await exited;
      await rm(directory, { recursive: true, force: true });
    }
  },
});

export { expect };

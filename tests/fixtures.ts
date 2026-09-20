import { test as base, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';

export const test = base.extend<{ appURL: string }>({
  appURL: async ({}, use) => {
    const directory = await mkdtemp(join(tmpdir(), 'devforge-browser-'));
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

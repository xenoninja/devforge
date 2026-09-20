import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const exec = promisify(execFile);
const docker = (...args: string[]) => exec('docker', args, { timeout: 180_000, maxBuffer: 4 * 1024 * 1024 });

test('ideas survive container restart, replacement, and a stopped-directory backup restored to a separate mount', async ({ page }) => {
  test.setTimeout(240_000);
  const id = randomUUID();
  const image = `devforge-test:${id}`;
  const container = `devforge-test-${id}`;
  const directory = await mkdtemp(join(tmpdir(), 'devforge-docker-'));
  const data = join(directory, 'data');
  const backup = join(directory, 'backup');
  const restored = join(directory, 'restored');
  await mkdir(data);
  let url = '';

  async function start(mount: string) {
    await docker('run', '-d', '--name', container, '-p', '127.0.0.1::3000', '--mount', `type=bind,source=${mount},target=/data`, image);
    await ready();
  }

  async function ready() {
    // Docker may assign a different ephemeral host port after a restart.
    const { stdout } = await docker('port', container, '3000/tcp');
    url = `http://${stdout.trim()}`;
    await expect.poll(async () => {
      try { return (await page.goto(url))?.status(); } catch { return 0; }
    }, { timeout: 15_000 }).toBe(200);
  }

  async function verifyIdea() {
    await page.goto(url);
    await page.getByRole('link', { name: 'Keep this idea' }).click();
    await expect(page.getByRole('heading', { name: 'Keep this idea' })).toBeVisible();
    await expect(page.getByText('Saved across container replacement.')).toBeVisible();
    await expect(page.getByText('New', { exact: true })).toBeVisible();
    return page.locator('time').evaluateAll(elements => elements.map(el => el.getAttribute('datetime')));
  }

  try {
    await docker('build', '-t', image, '.');
    await start(data);
    await expect(page.getByText('No ideas yet')).toBeVisible();
    await page.getByRole('link', { name: 'Add idea', exact: true }).click();
    await page.getByLabel('Title', { exact: true }).fill('Keep this idea');
    await page.getByLabel('Description').fill('Saved across container replacement.');
    await page.getByRole('button', { name: 'Save idea' }).click();
    await expect(page.getByRole('heading', { name: 'Keep this idea' })).toBeVisible();
    await page.reload();
    const times = await verifyIdea();

    await docker('restart', container);
    await ready();
    expect(await verifyIdea()).toEqual(times);

    await docker('stop', container);
    await docker('rm', container);
    await start(data);
    expect(await verifyIdea()).toEqual(times);

    await docker('stop', container);
    await cp(data, backup, { recursive: true });
    await cp(backup, restored, { recursive: true });
    await docker('rm', container);
    await start(restored);
    expect(await verifyIdea()).toEqual(times);
  } finally {
    await docker('rm', '-f', container).catch(() => {});
    await docker('image', 'rm', image).catch(() => {});
    await rm(directory, { recursive: true, force: true });
  }
});

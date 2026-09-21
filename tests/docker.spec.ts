import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const exec = promisify(execFile);
const docker = (...args: string[]) => exec('docker', args, { timeout: 180_000, maxBuffer: 4 * 1024 * 1024 });

test('ideas, projects and features survive container restart, replacement, and a stopped-directory backup restored to a separate mount', async ({ page }) => {
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
    await page.goto(`${url}/ideas`);
    await page.getByRole('link', { name: 'Keep this refined idea' }).click();
    await expect(page.getByRole('heading', { name: 'Keep this refined idea' })).toBeVisible();
    await expect(page.getByText('Edited notes survive container replacement.')).toBeVisible();
    await expect(page.getByText('Abandoned', { exact: true })).toBeVisible();
    return page.locator('time').evaluateAll(elements => elements.map(el => el.getAttribute('datetime')));
  }

  async function verifyProject() {
    await page.goto(url);
    await page.getByRole('link', { name: 'Maintained project', exact: true }).click();
    await expect(page.getByText('Developing', { exact: true })).toBeVisible();
    await expect(page.getByText('Edited project notes.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'https://github.com/example/retained' })).toHaveAttribute('href', 'https://github.com/example/retained');
    return page.locator('time').evaluateAll(elements => elements.map(el => el.getAttribute('datetime')));
  }

  async function verifyAbandonedProject() {
    await page.goto(`${url}/projects?status=abandoned&search=Archived`);
    await page.getByRole('link', { name: 'Archived project', exact: true }).click();
    await expect(page.locator('.badge').first()).toHaveText('Abandoned');
    await expect(page.getByText('Archived notes.', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'https://github.com/example/deleted' })).toBeVisible();
    return page.locator('time').evaluateAll(elements => elements.map(el => el.getAttribute('datetime')));
  }

  async function verifyFeatures() {
    await page.goto(`${url}/projects?status=abandoned&search=Archived`);
    await page.getByRole('link', { name: 'Archived project', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Features' }).locator('li a')).toHaveText(['Refined feature', 'Cleared feature']);
    await expect(page.getByRole('link', { name: 'Add feature' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Refined feature', exact: true }).click();
    await expect(page.getByText('New', { exact: true })).toBeVisible();
    await expect(page.getByText('Edited feature notes.', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'https://github.com/example/deleted/issues/7' })).toHaveAttribute('href', 'https://github.com/example/deleted/issues/7');
    const times = await page.locator('time').evaluateAll(elements => elements.map(el => el.getAttribute('datetime')));
    await page.getByRole('link', { name: 'Back to project' }).click();
    await page.getByRole('link', { name: 'Cleared feature', exact: true }).click();
    await expect(page.getByText('No description yet.')).toBeVisible();
    await expect(page.getByText('No issue link yet.')).toBeVisible();
    await page.goto(`${url}/projects?search=Maintained`);
    await page.getByRole('link', { name: 'Maintained project', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Features' })).toContainText('No matching features.');
    return times;
  }

  async function verifyPromotion() {
    await page.goto(`${url}/ideas?status=promoted&search=Promoted`);
    await page.getByRole('link', { name: 'Promoted origin', exact: true }).click();
    await expect(page.getByText('Promoted', { exact: true })).toBeVisible();
    await expect(page.getByText('Idea notes after promotion.')).toBeVisible();
    await page.getByRole('link', { name: 'Promoted project' }).click();
    await expect(page.getByRole('heading', { name: 'Promoted project' })).toBeVisible();
    await expect(page.getByText('Developing', { exact: true })).toBeVisible();
    await expect(page.getByText('Project notes after promotion.')).toBeVisible();
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
    await page.getByRole('link', { name: 'Edit idea' }).click();
    await page.getByLabel('Title', { exact: true }).fill('Keep this refined idea');
    await page.getByLabel('Description').fill('Edited notes survive container replacement.');
    await page.getByRole('button', { name: 'Save idea' }).click();
    await page.getByRole('button', { name: 'Abandon idea' }).click();
    await page.reload();
    const times = await verifyIdea();
    await page.goto(`${url}/projects/new`);
    await page.getByLabel('Title', { exact: true }).fill('Original project');
    await page.getByLabel('Status', { exact: true }).selectOption('developing');
    await page.getByRole('button', { name: 'Save project' }).click();
    await page.getByRole('link', { name: 'Edit project' }).click();
    await page.getByLabel('Title', { exact: true }).fill('Maintained project');
    await page.getByLabel('Description').fill('Edited project notes.');
    await page.getByLabel('Repository URL').fill('https://github.com/example/retained');
    await page.getByRole('button', { name: 'Save project' }).click();
    await page.getByLabel('Change status').selectOption('abandoned');
    await page.getByRole('button', { name: 'Save status' }).click();
    await page.getByLabel('Change status').selectOption('developing');
    await page.getByRole('button', { name: 'Save status' }).click();
    const projectTimes = await verifyProject();
    await page.goto(`${url}/projects/new`);
    await page.getByLabel('Title', { exact: true }).fill('Archived project');
    await page.getByLabel('Description').fill('Archived notes.');
    await page.getByLabel('Repository URL').fill('https://github.com/example/deleted');
    await page.getByRole('button', { name: 'Save project' }).click();
    const archivedProject = page.url();
    for (const title of ['Cleared feature', 'Original feature']) {
      await page.getByRole('link', { name: 'Add feature' }).click();
      await page.getByLabel('Title', { exact: true }).fill(title);
      await page.getByLabel('Description').fill('Original feature notes.');
      await page.getByLabel('Issue URL').fill('https://github.com/example/original/issues/1');
      await page.getByRole('button', { name: 'Save feature' }).click();
      await page.getByRole('link', { name: 'Edit feature' }).click();
      await page.getByLabel('Title', { exact: true }).fill(title === 'Original feature' ? 'Refined feature' : title);
      await page.getByLabel('Description').fill(title === 'Original feature' ? 'Edited feature notes.' : '');
      await page.getByLabel('Issue URL').fill(title === 'Original feature' ? 'https://github.com/example/deleted/issues/7' : '');
      await page.getByRole('button', { name: 'Save feature' }).click();
      await page.getByRole('link', { name: 'Back to project' }).click();
      await expect(page).toHaveURL(archivedProject);
    }
    await page.getByLabel('Change status').selectOption('abandoned');
    await page.getByRole('button', { name: 'Save status' }).click();
    const abandonedTimes = await verifyAbandonedProject();
    const featureTimes = await verifyFeatures();
    await page.goto(`${url}/ideas/new`);
    await page.getByLabel('Title', { exact: true }).fill('Origin idea');
    await page.getByLabel('Description').fill('Original idea notes.');
    await page.getByRole('button', { name: 'Save idea' }).click();
    await page.getByRole('link', { name: 'Promote idea' }).click();
    await page.getByLabel('Status', { exact: true }).selectOption('developing');
    await page.getByRole('button', { name: 'Save project' }).click();
    await page.getByRole('link', { name: 'Edit project' }).click();
    await page.getByLabel('Title', { exact: true }).fill('Promoted project');
    await page.getByLabel('Description').fill('Project notes after promotion.');
    await page.getByRole('button', { name: 'Save project' }).click();
    await page.goto(`${url}/ideas?status=promoted`);
    await page.getByRole('link', { name: 'Origin idea' }).click();
    await page.getByRole('link', { name: 'Edit idea' }).click();
    await page.getByLabel('Title', { exact: true }).fill('Promoted origin');
    await page.getByLabel('Description').fill('Idea notes after promotion.');
    await page.getByRole('button', { name: 'Save idea' }).click();
    const promotionTimes = await verifyPromotion();

    await docker('restart', container);
    await ready();
    expect(await verifyIdea()).toEqual(times);
    expect(await verifyProject()).toEqual(projectTimes);
    expect(await verifyAbandonedProject()).toEqual(abandonedTimes);
    expect(await verifyPromotion()).toEqual(promotionTimes);
    expect(await verifyFeatures()).toEqual(featureTimes);

    await docker('stop', container);
    await docker('rm', container);
    await start(data);
    expect(await verifyIdea()).toEqual(times);
    expect(await verifyProject()).toEqual(projectTimes);
    expect(await verifyAbandonedProject()).toEqual(abandonedTimes);
    expect(await verifyPromotion()).toEqual(promotionTimes);
    expect(await verifyFeatures()).toEqual(featureTimes);

    await docker('stop', container);
    await cp(data, backup, { recursive: true });
    await cp(backup, restored, { recursive: true });
    await docker('rm', container);
    await start(restored);
    expect(await verifyIdea()).toEqual(times);
    expect(await verifyProject()).toEqual(projectTimes);
    expect(await verifyAbandonedProject()).toEqual(abandonedTimes);
    expect(await verifyPromotion()).toEqual(promotionTimes);
    expect(await verifyFeatures()).toEqual(featureTimes);
  } finally {
    await docker('rm', '-f', container).catch(() => {});
    await docker('image', 'rm', image).catch(() => {});
    await rm(directory, { recursive: true, force: true });
  }
});

import { test, expect } from './fixtures.js';
import type { Page } from '@playwright/test';

async function createProject(page: Page, appURL: string, title: string, status = 'experimenting') {
  await page.goto(`${appURL}/projects/new`);
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Status', { exact: true }).selectOption(status);
  await page.getByRole('button', { name: 'Save project' }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  return page.url();
}

async function capture(page: Page, title: string) {
  await page.getByRole('link', { name: 'Add feature', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByRole('button', { name: 'Save feature' }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  return page.url();
}

for (const status of ['experimenting', 'developing']) {
  test(`capture title-only features within an ${status} project`, async ({ page, appURL }) => {
    const project = await createProject(page, appURL, 'Garden', status);
    await expect(page.getByRole('region', { name: 'Features' })).toContainText('No matching features.');
    const before = Date.now();
    const feature = await capture(page, 'Seed calendar');
    await expect(page.getByText('New', { exact: true })).toBeVisible();
    await expect(page.getByText('No description yet.')).toBeVisible();
    await expect(page.getByText('No issue link yet.')).toBeVisible();
    const times = await page.locator('time').evaluateAll(els => els.map(el => el.getAttribute('datetime')!));
    expect(times).toHaveLength(2);
    expect(Date.parse(times[0]!)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(times[0]!)).toBeLessThanOrEqual(Date.now());
    expect(times[1]).toBe(times[0]);
    await page.reload();
    await page.getByRole('link', { name: 'Back to project' }).click();
    await expect(page).toHaveURL(project);
    await expect(page.getByRole('region', { name: 'Features' }).getByRole('link', { name: 'Seed calendar' })).toHaveAttribute('href', new URL(feature).pathname);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await createProject(page, appURL, 'Another project');
    await expect(page.getByRole('link', { name: 'Seed calendar' })).toHaveCount(0);
  });
}

test('validate, edit and clear feature metadata without contacting GitHub', async ({ page, appURL }) => {
  const external: string[] = [];
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin !== appURL) {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  const project = await createProject(page, appURL, 'Garden');
  await page.getByRole('link', { name: 'Add feature' }).click();
  const description = '\n<script>plain text</script>\n**notes**';
  await page.getByLabel('Description').fill(description);
  await page.getByLabel('Issue URL').fill('https://github.com/example/unavailable/issues/7');
  for (const title of ['', '   ']) {
    await page.locator('form').evaluate(form => form.setAttribute('novalidate', ''));
    await page.getByLabel('Title', { exact: true }).fill(title);
    await page.getByRole('button', { name: 'Save feature' }).click();
    await expect(page.getByRole('alert')).toHaveText('Give your feature a title.');
    await expect(page.getByLabel('Description')).toHaveValue(description);
    await expect(page.getByLabel('Issue URL')).toHaveValue('https://github.com/example/unavailable/issues/7');
  }
  await page.getByLabel('Title', { exact: true }).fill('Seed calendar');
  for (const url of ['not a URL', 'javascript:alert(1)']) {
    await page.locator('form').evaluate(form => form.setAttribute('novalidate', ''));
    await page.getByLabel('Issue URL').fill(url);
    await page.getByRole('button', { name: 'Save feature' }).click();
    await expect(page.getByRole('alert')).toHaveText('Enter an HTTP or HTTPS issue URL.');
    await expect(page.getByLabel('Issue URL')).toHaveValue(url);
  }
  await page.getByRole('link', { name: 'Cancel' }).click();
  await expect(page.getByRole('region', { name: 'Features' })).toContainText('No matching features.');
  await page.getByRole('link', { name: 'Add feature' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Seed calendar');
  await page.getByLabel('Description').fill(description);
  await page.getByLabel('Issue URL').fill('https://github.com/example/unavailable/issues/7');
  await page.getByRole('button', { name: 'Save feature' }).click();
  await expect(page.getByRole('heading', { name: 'Seed calendar' })).toBeVisible();
  const feature = page.url();
  const created = await page.locator('time').first().getAttribute('datetime');
  await page.getByRole('link', { name: 'Edit feature' }).click();
  await expect(page.getByLabel('Description')).toHaveValue(description);
  await page.getByLabel('Title', { exact: true }).fill('   ');
  await page.getByRole('button', { name: 'Save feature' }).click();
  await expect(page.getByRole('alert')).toHaveText('Give your feature a title.');
  await page.getByLabel('Title', { exact: true }).fill('Refined <feature>');
  await page.getByLabel('Issue URL').fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Save feature' }).click();
  await expect(page.getByRole('alert')).toHaveText('Enter an HTTP or HTTPS issue URL.');
  const issue = `https://github.com/example/${'long-reference-'.repeat(12)}/issues/8`;
  await page.getByLabel('Issue URL').fill(issue);
  await page.getByRole('button', { name: 'Save feature' }).click();
  await page.reload();
  await expect(page).toHaveURL(feature);
  await expect(page.getByRole('heading', { name: 'Refined <feature>' })).toBeVisible();
  await expect(page.getByText(description, { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: issue })).toHaveAttribute('href', issue);
  await expect(page.locator('time').first()).toHaveAttribute('datetime', created!);
  expect(Date.parse((await page.locator('time').last().getAttribute('datetime'))!)).toBeGreaterThan(Date.parse(created!));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Edit feature' }).click();
  await page.getByLabel('Description').fill('');
  await page.getByLabel('Issue URL').fill('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Save feature' }).click();
  await page.reload();
  await expect(page.getByText('No description yet.')).toBeVisible();
  await expect(page.getByText('No issue link yet.')).toBeVisible();
  await page.goto(project);
  await expect(page.getByRole('region', { name: 'Features' }).getByRole('listitem')).toHaveCount(1);
  expect(external).toEqual([]);
});

test('find features by title and status together in most recently updated order', async ({ page, appURL }) => {
  const project = await createProject(page, appURL, 'Garden');
  const first = await capture(page, 'Seed calendar');
  await page.goto(project);
  await capture(page, 'Weather forecast');
  await page.goto(project);
  await capture(page, 'Seed inventory');
  await page.goto(project);
  const region = page.getByRole('region', { name: 'Features' });
  await expect(region.locator('li a')).toHaveText(['Seed inventory', 'Weather forecast', 'Seed calendar']);
  await page.goto(`${first}/edit`);
  await page.getByLabel('Description').fill('Seed descriptions are not titles.');
  await page.getByRole('button', { name: 'Save feature' }).click();
  await page.getByRole('link', { name: 'Back to project' }).click();
  await expect(region.locator('li a')).toHaveText(['Seed calendar', 'Seed inventory', 'Weather forecast']);
  await page.getByLabel('Feature status').selectOption('new');
  await page.getByLabel('Search feature titles').fill('sEeD');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await page.reload();
  await expect(region.locator('li a')).toHaveText(['Seed calendar', 'Seed inventory']);
  await expect(page.getByLabel('Feature status')).toHaveValue('new');
  await expect(page.getByLabel('Search feature titles')).toHaveValue('sEeD');
  await page.getByLabel('Search feature titles').fill('descriptions');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(region).toContainText('No matching features.');
  await page.getByRole('link', { name: 'Clear filters' }).click();
  await expect(region.locator('li a')).toHaveText(['Seed calendar', 'Seed inventory', 'Weather forecast']);
  await expect(page.getByLabel('Feature status')).toHaveValue('all');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('abandonment blocks stale capture forms while preserving editable features; restoration enables capture', async ({ page, appURL, context }) => {
  const project = await createProject(page, appURL, 'Garden');
  const feature = await capture(page, 'Seed calendar');
  const times = await page.locator('time').evaluateAll(els => els.map(el => el.getAttribute('datetime')));
  const stale = await context.newPage();
  await stale.goto(`${project}/features/new`);
  await stale.getByLabel('Title', { exact: true }).fill('Stale capture');
  await page.goto(project);
  await page.getByLabel('Change status').selectOption('abandoned');
  await page.getByRole('button', { name: 'Save status' }).click();
  await expect(page.getByRole('link', { name: 'Add feature' })).toHaveCount(0);
  await expect(page.getByText('Restore this project before adding features.')).toBeVisible();
  await stale.getByRole('button', { name: 'Save feature' }).click();
  await expect(stale.getByRole('heading', { name: 'Restore this project before adding features.' })).toBeVisible();
  expect((await stale.goto(`${project}/features/new`))?.status()).toBe(409);
  await stale.close();
  await page.goto(feature);
  await expect(page.getByText('New', { exact: true })).toBeVisible();
  expect(await page.locator('time').evaluateAll(els => els.map(el => el.getAttribute('datetime')))).toEqual(times);
  await page.getByRole('link', { name: 'Edit feature' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Retained calendar');
  await page.getByLabel('Description').fill('Edited while abandoned.');
  await page.getByLabel('Issue URL').fill('https://github.com/example/garden/issues/3');
  await page.getByRole('button', { name: 'Save feature' }).click();
  await page.reload();
  await expect(page.getByText('Edited while abandoned.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'https://github.com/example/garden/issues/3' })).toBeVisible();
  await page.getByRole('link', { name: 'Edit feature' }).click();
  await page.getByLabel('Description').fill('');
  await page.getByLabel('Issue URL').fill('');
  await page.getByRole('button', { name: 'Save feature' }).click();
  await expect(page.getByText('No description yet.')).toBeVisible();
  await expect(page.getByText('No issue link yet.')).toBeVisible();
  await page.getByRole('link', { name: 'Back to project' }).click();
  await expect(page.getByRole('region', { name: 'Features' }).locator('li a')).toHaveText(['Retained calendar']);
  for (const status of ['experimenting', 'developing']) {
    await page.getByLabel('Change status').selectOption(status);
    await page.getByRole('button', { name: 'Save status' }).click();
    await capture(page, `Restored ${status}`);
    await page.goto(project);
    await page.getByLabel('Change status').selectOption('abandoned');
    await page.getByRole('button', { name: 'Save status' }).click();
  }
  await expect(page.getByRole('region', { name: 'Features' }).locator('li a')).toHaveText(['Restored developing', 'Restored experimenting', 'Retained calendar']);
});

test('ownership is fixed and invalid targets cannot edit, move or delete a feature', async ({ page, appURL }) => {
  const project = await createProject(page, appURL, 'Garden');
  const feature = await capture(page, 'Seed calendar');
  const other = await createProject(page, appURL, 'Other');
  const wrong = `${other}/features/${feature.split('/').at(-1)}`;
  for (const target of [wrong, `${wrong}/edit`, `${appURL}/projects/99999/features/new`]) {
    expect((await page.goto(target))?.status()).toBe(404);
  }
  await page.goto(`${feature}/edit`);
  await page.locator('form').evaluate((form, otherId) => {
    for (const [name, value] of [['project_id', otherId], ['status', 'completed']]) {
      const input = document.createElement('input');
      input.name = name!; input.value = value!; form.append(input);
    }
  }, other.split('/').at(-1)!);
  await page.getByRole('button', { name: 'Save feature' }).click();
  await expect(page).toHaveURL(feature);
  await expect(page.getByText('New', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /delete|move/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /delete|move/i })).toHaveCount(0);
  for (const target of [`${wrong}/edit`, `${feature}/delete`, `${feature}/move`, `${feature}/status`]) {
    await page.goto(`${feature}/edit`);
    await page.locator('form').evaluate((form, action) => { form.setAttribute('action', action); }, target);
    await page.getByRole('button', { name: 'Save feature' }).click();
    await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible();
  }
  await page.goto(other);
  await expect(page.getByRole('region', { name: 'Features' })).toContainText('No matching features.');
  await page.goto(project);
  await page.getByRole('link', { name: 'Seed calendar' }).click();
  await expect(page).toHaveURL(feature);
  await expect(page.getByText('New', { exact: true })).toBeVisible();
});

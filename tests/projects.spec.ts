import { test, expect } from './fixtures.js';

test('create a title-only project from home with experimenting defaults and automatic times', async ({ page, appURL }) => {
  await page.goto(appURL);
  await page.getByRole('link', { name: 'Add project', exact: true }).click();
  await expect(page.getByLabel('Status', { exact: true })).toHaveValue('experimenting');
  await page.getByLabel('Title', { exact: true }).fill('Garden journal');
  const before = Date.now();
  await page.getByRole('button', { name: 'Save project' }).click();
  await expect(page.getByRole('heading', { name: 'Garden journal' })).toBeVisible();
  await expect(page.getByText('Experimenting', { exact: true })).toBeVisible();
  const times = await page.locator('time').evaluateAll(elements => elements.map(el => el.getAttribute('datetime')!));
  expect(times).toHaveLength(2);
  expect(Date.parse(times[0]!)).toBeGreaterThanOrEqual(before);
  expect(Date.parse(times[0]!)).toBeLessThanOrEqual(Date.now());
  expect(times[1]).toBe(times[0]);
  await page.reload();
  await expect(page.getByText('No description yet.')).toBeVisible();
  await expect(page.getByText('No repository link yet.')).toBeVisible();
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('region', { name: /Experimenting projects/ }).getByRole('link', { name: 'Garden journal' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('edit a developing project, retain plain text and repository references, and clear optional values', async ({ page, appURL }) => {
  const external: string[] = [];
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin !== appURL) {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await page.goto(`${appURL}/projects/new`);
  await page.getByLabel('Title', { exact: true }).fill('Existing project');
  await page.getByLabel('Status', { exact: true }).selectOption('developing');
  await page.getByLabel('Repository URL').fill('https://github.com/example/unavailable');
  await page.getByRole('button', { name: 'Save project' }).click();
  const created = await page.locator('time').first().getAttribute('datetime');
  await expect(page.locator('.badge').first()).toHaveText('Developing');
  await page.getByRole('link', { name: 'Edit project' }).click();
  await page.locator('form').evaluate(form => form.setAttribute('novalidate', ''));
  await page.getByLabel('Title', { exact: true }).fill('   ');
  const description = '\n<script>plain text</script>\n**notes**';
  await page.getByLabel('Description').fill(description);
  await page.getByRole('button', { name: 'Save project' }).click();
  await expect(page.getByRole('alert')).toHaveText('Give your project a title.');
  await expect(page.getByLabel('Description')).toHaveValue(description);
  await expect(page.getByLabel('Repository URL')).toHaveValue('https://github.com/example/unavailable');
  await page.getByLabel('Title', { exact: true }).fill('Refined <project>');
  await page.getByLabel('Repository URL').fill('https://github.com/example/changed');
  await page.getByRole('button', { name: 'Save project' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Refined <project>' })).toBeVisible();
  await expect(page.getByText(description, { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'https://github.com/example/changed' })).toHaveAttribute('href', 'https://github.com/example/changed');
  await expect(page.locator('time').first()).toHaveAttribute('datetime', created!);
  expect(Date.parse((await page.locator('time').last().getAttribute('datetime'))!)).toBeGreaterThan(Date.parse(created!));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Edit project' }).click();
  await page.getByLabel('Description').fill('');
  await page.getByLabel('Repository URL').fill('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Save project' }).click();
  await page.reload();
  await expect(page.getByText('No description yet.')).toBeVisible();
  await expect(page.getByText('No repository link yet.')).toBeVisible();
  await expect(page.locator('.badge').first()).toHaveText('Developing');
  expect(external).toEqual([]);
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('region', { name: /Developing projects/ }).getByRole('link', { name: 'Refined <project>' })).toBeVisible();
});

test('reject missing titles and invalid repository URLs without creating records, preserving entered values', async ({ page, appURL }) => {
  await page.goto(`${appURL}/projects/new`);
  await page.locator('form').evaluate(form => form.setAttribute('novalidate', ''));
  await page.getByLabel('Status', { exact: true }).selectOption('developing');
  await page.getByLabel('Description').fill('\nKeep my notes');
  for (const title of ['', '   ']) {
    await page.locator('form').evaluate(form => form.setAttribute('novalidate', ''));
    await page.getByLabel('Title', { exact: true }).fill(title);
    await page.getByRole('button', { name: 'Save project' }).click();
    await expect(page.getByRole('alert')).toHaveText('Give your project a title.');
    await expect(page.getByLabel('Status', { exact: true })).toHaveValue('developing');
    await expect(page.getByLabel('Description')).toHaveValue('\nKeep my notes');
  }
  await page.getByLabel('Title', { exact: true }).fill('Valid title');
  for (const url of ['not a URL', 'javascript:alert(1)']) {
    await page.locator('form').evaluate(form => form.setAttribute('novalidate', ''));
    await page.getByLabel('Repository URL').fill(url);
    await page.getByRole('button', { name: 'Save project' }).click();
    await expect(page.getByRole('alert')).toHaveText('Enter an HTTP or HTTPS repository URL.');
    await expect(page.getByLabel('Repository URL')).toHaveValue(url);
  }
  await page.getByRole('link', { name: 'Cancel' }).click();
  await expect(page.getByText('No developing projects yet.')).toBeVisible();
  await expect(page.getByText('No experimenting projects yet.')).toBeVisible();
});

test('home keeps ideas and each project stage in most recently updated order', async ({ page, appURL }) => {
  await page.goto(`${appURL}/ideas/new`);
  await page.getByLabel('Title', { exact: true }).fill('An idea alongside projects');
  await page.getByRole('button', { name: 'Save idea' }).click();
  for (const status of ['experimenting', 'developing']) {
    for (const title of ['Older', 'Newer']) {
      await page.goto(`${appURL}/projects/new`);
      await page.getByLabel('Title', { exact: true }).fill(`${title} ${status}`);
      await page.getByLabel('Status', { exact: true }).selectOption(status);
      await page.getByRole('button', { name: 'Save project' }).click();
    }
  }
  await page.goto(appURL);
  await expect(page.getByRole('region', { name: /New ideas/ }).getByRole('link')).toHaveText(['An idea alongside projects']);
  for (const status of ['experimenting', 'developing']) {
    const region = page.getByRole('region', { name: new RegExp(`${status} projects`, 'i') });
    await expect(region.getByRole('link')).toHaveText([`Newer ${status}`, `Older ${status}`]);
    await region.getByRole('link', { name: `Older ${status}` }).click();
    await page.getByRole('link', { name: 'Edit project' }).click();
    await page.getByLabel('Title', { exact: true }).fill(`Updated ${status}`);
    await page.getByRole('button', { name: 'Save project' }).click();
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await expect(region.getByRole('link')).toHaveText([`Updated ${status}`, `Newer ${status}`]);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('all six project transitions preserve metadata and move the project between home categories', async ({ page, appURL }) => {
  await page.goto(`${appURL}/projects/new`);
  await page.getByLabel('Title', { exact: true }).fill('Retained project');
  await page.getByLabel('Description').fill('Original notes');
  await page.getByLabel('Repository URL').fill('https://github.com/example/deleted');
  await page.getByRole('button', { name: 'Save project' }).click();
  const detail = page.url();
  const created = await page.locator('time').first().getAttribute('datetime');
  let updated = created!;
  for (const status of ['developing', 'experimenting', 'abandoned', 'developing', 'abandoned', 'experimenting']) {
    await page.getByLabel('Change status').selectOption(status);
    await page.getByRole('button', { name: 'Save status' }).click();
    await page.reload();
    await expect(page.locator('.badge')).toHaveText(status[0]!.toUpperCase() + status.slice(1));
    await expect(page.getByText('Original notes', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'https://github.com/example/deleted' })).toBeVisible();
    await expect(page.locator('time').first()).toHaveAttribute('datetime', created!);
    const next = (await page.locator('time').last().getAttribute('datetime'))!;
    expect(Date.parse(next)).toBeGreaterThan(Date.parse(updated));
    updated = next;
    await expect(page.getByRole('button', { name: /delete/i })).toHaveCount(0);
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    if (status === 'abandoned') await expect(page.getByRole('link', { name: 'Retained project' })).toHaveCount(0);
    else await expect(page.getByRole('region', { name: new RegExp(`${status} projects`, 'i') }).getByRole('link', { name: 'Retained project' })).toBeVisible();
    await page.goto(detail);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('abandoned projects remain editable and discoverable with combined title and status filters', async ({ page, appURL }) => {
  const external: string[] = [];
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin !== appURL) {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  for (const title of ['Garden archive', 'Garden active', 'Other archive']) {
    await page.goto(`${appURL}/projects/new`);
    await page.getByLabel('Title', { exact: true }).fill(title);
    await page.getByRole('button', { name: 'Save project' }).click();
    if (title !== 'Garden active') {
      await page.getByLabel('Change status').selectOption('abandoned');
      await page.getByRole('button', { name: 'Save status' }).click();
    }
  }
  await page.goto(appURL);
  await page.getByRole('link', { name: 'Browse all projects' }).click();
  await page.getByLabel('Status', { exact: true }).selectOption('abandoned');
  await page.getByLabel('Search titles').fill('GARDEN');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.locator('.ideas a')).toHaveText(['Garden archive']);
  await page.getByRole('link', { name: 'Garden archive', exact: true }).click();
  await page.getByRole('link', { name: 'Edit project' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Garden restored');
  await page.getByLabel('Description').fill('Retained <notes>');
  await page.getByLabel('Repository URL').fill('https://github.com/example/deleted');
  await page.getByRole('button', { name: 'Save project' }).click();
  await expect(page.locator('.badge')).toHaveText('Abandoned');
  await expect(page.getByText('Retained <notes>', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'https://github.com/example/deleted' })).toBeVisible();
  await page.getByRole('link', { name: 'All projects', exact: true }).click();
  await expect(page.locator('.ideas a')).toHaveText(['Garden restored', 'Other archive', 'Garden active']);
  await page.getByRole('link', { name: 'Garden restored', exact: true }).click();
  await page.getByLabel('Change status').selectOption('experimenting');
  await page.getByRole('button', { name: 'Save status' }).click();
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('region', { name: /Experimenting projects/ }).getByRole('link')).toHaveText(['Garden restored', 'Garden active']);
  await page.getByRole('link', { name: 'Browse all projects' }).click();
  for (const [status, titles] of [['experimenting', ['Garden restored', 'Garden active']], ['developing', []], ['abandoned', ['Other archive']]] as const) {
    await page.getByLabel('Status', { exact: true }).selectOption(status);
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await expect(page.locator('.ideas a')).toHaveText([...titles]);
  }
  await page.getByLabel('Search titles').fill('No such title');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByText('No matching projects.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Clear filters' }).click();
  await expect(page.getByLabel('Search titles')).toHaveValue('');
  await expect(page.locator('.ideas a')).toHaveText(['Garden restored', 'Other archive', 'Garden active']);
  expect(external).toEqual([]);
});

test('invalid and repeated status submissions leave each project unchanged', async ({ page, appURL }) => {
  await page.goto(`${appURL}/projects/new`);
  await page.getByLabel('Title', { exact: true }).fill('Protected project');
  await page.getByRole('button', { name: 'Save project' }).click();
  const detail = page.url();
  for (const current of ['experimenting', 'developing', 'abandoned']) {
    if (current !== 'experimenting') {
      await page.getByLabel('Change status').selectOption(current);
      await page.getByRole('button', { name: 'Save status' }).click();
    }
    const updated = await page.locator('time').last().getAttribute('datetime');
    for (const invalid of ['completed', 'new', '', current]) {
      await page.getByLabel('Change status').evaluate((select, value) => {
        select.append(new Option(value, value, true, true));
      }, invalid);
      const response = page.waitForResponse(response => response.url() === `${detail}/status` && response.request().method() === 'POST');
      await page.getByRole('button', { name: 'Save status' }).click();
      expect((await response).status()).toBe(invalid === current ? 409 : 422);
      await page.goto(detail);
      await expect(page.locator('.badge')).toHaveText(current[0]!.toUpperCase() + current.slice(1));
      await expect(page.locator('time').last()).toHaveAttribute('datetime', updated!);
    }
  }
});

test.describe('upgrade existing projects', () => {
  test.use({ activeProjectsData: true });
  test('retain identity, metadata and times while enabling abandonment and restoration', async ({ page, appURL }) => {
    await page.goto(`${appURL}/projects/12`);
    await expect(page.getByRole('heading', { name: 'Existing project' })).toBeVisible();
    await expect(page.getByText('Original project notes', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'https://github.com/example/legacy' })).toBeVisible();
    await expect(page.locator('time').first()).toHaveAttribute('datetime', '2026-09-01T00:00:00.000Z');
    await expect(page.locator('time').last()).toHaveAttribute('datetime', '2026-09-02T00:00:00.000Z');
    for (const status of ['abandoned', 'experimenting']) {
      await page.getByLabel('Change status').selectOption(status);
      await page.getByRole('button', { name: 'Save status' }).click();
      await page.reload();
      await expect(page.locator('.badge')).toHaveText(status === 'abandoned' ? 'Abandoned' : 'Experimenting');
      await expect(page.getByText('Original project notes', { exact: true })).toBeVisible();
      await expect(page.locator('time').first()).toHaveAttribute('datetime', '2026-09-01T00:00:00.000Z');
    }
  });
});

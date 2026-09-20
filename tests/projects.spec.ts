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
  await expect(page.getByText('Developing', { exact: true })).toBeVisible();
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
  await expect(page.getByText('Developing', { exact: true })).toBeVisible();
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

import { test, expect } from './fixtures.js';
import type { Page } from '@playwright/test';

async function expectFitsViewport(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test('capture a title-only idea from an empty dashboard and retain it on reload', async ({ page, appURL }) => {
  await page.goto(appURL);
  await expect(page.getByText('No ideas yet')).toBeVisible();
  await expectFitsViewport(page);
  await page.getByRole('link', { name: 'Add idea', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('A garden journal');
  await expectFitsViewport(page);
  const before = Date.now();
  await page.getByRole('button', { name: 'Save idea' }).click();
  await expect(page.getByRole('heading', { name: 'A garden journal' })).toBeVisible();
  await expect(page.getByText('New', { exact: true })).toBeVisible();
  await expectFitsViewport(page);
  const times = await page.locator('time').evaluateAll(elements => elements.map(el => el.getAttribute('datetime')!));
  expect(times).toHaveLength(2);
  expect(Date.parse(times[0]!)).toBeGreaterThanOrEqual(before);
  expect(Date.parse(times[0]!)).toBeLessThanOrEqual(Date.now());
  expect(times[1]).toBe(times[0]);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'A garden journal' })).toBeVisible();
  await page.getByRole('link', { name: 'All ideas' }).click();
  await expect(page.getByRole('link', { name: 'A garden journal' })).toBeVisible();
});

test('missing and whitespace-only titles are rejected without creating an idea', async ({ page, appURL }) => {
  await page.goto(`${appURL}/ideas/new`);
  // Disable native validation to exercise server validation through the real form.
  await page.locator('form').evaluate(form => { form.setAttribute('novalidate', ''); });
  await page.getByLabel('Description').fill('\nKeep my notes when validation fails.');
  await page.getByRole('button', { name: 'Save idea' }).click();
  await expect(page.getByRole('alert')).toHaveText('Give your idea a title.');
  await expect(page.getByLabel('Description')).toHaveValue('\nKeep my notes when validation fails.');
  await page.getByLabel('Title', { exact: true }).fill('   ');
  await page.getByRole('button', { name: 'Save idea' }).click();
  await expect(page.getByRole('alert')).toHaveText('Give your idea a title.');
  await page.getByRole('link', { name: 'Cancel' }).click();
  await expect(page.getByText('No ideas yet')).toBeVisible();
});

test('descriptions stay plain text and home lists the most recently updated ideas first', async ({ page, appURL }) => {
  const title = 'A <small> idea & a "big" possibility';
  const description = '<script>document.body.textContent = "oops"</script>\n**Not markdown**\nA second line 🌱';
  await page.goto(`${appURL}/ideas/new`);
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Description').fill(description);
  await page.getByRole('button', { name: 'Save idea' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText(description, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(description, { exact: true })).toBeVisible();
  await expectFitsViewport(page);
  await page.getByRole('link', { name: 'All ideas' }).click();
  await page.getByRole('link', { name: 'Add idea', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('A more recent idea');
  await page.getByRole('button', { name: 'Save idea' }).click();
  await page.getByRole('link', { name: 'All ideas' }).click();
  await expect(page.getByRole('list').getByRole('link')).toHaveText(['A more recent idea', title]);
  await page.getByRole('link', { name: title, exact: true }).click();
  await expect(page.getByText(description, { exact: true })).toBeVisible();
});

test('edit an idea, reject empty titles, clear its description, and preserve creation time', async ({ page, appURL }) => {
  await page.goto(`${appURL}/ideas/new`);
  await page.getByLabel('Title', { exact: true }).fill('Original idea');
  await page.getByRole('button', { name: 'Save idea' }).click();
  const original = await page.locator('time').evaluateAll(elements => elements.map(el => el.getAttribute('datetime')!));
  await page.getByRole('link', { name: 'Edit idea' }).click();
  await page.locator('form').evaluate(form => form.setAttribute('novalidate', ''));
  await page.getByLabel('Title', { exact: true }).fill('   ');
  await page.getByLabel('Description').fill('\n<script>plain text</script>');
  await page.getByRole('button', { name: 'Save idea' }).click();
  await expect(page.getByRole('alert')).toHaveText('Give your idea a title.');
  await expect(page.getByLabel('Description')).toHaveValue('\n<script>plain text</script>');
  await page.getByLabel('Title', { exact: true }).fill('Refined idea');
  await page.getByRole('button', { name: 'Save idea' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Refined idea' })).toBeVisible();
  await expect(page.getByText('<script>plain text</script>', { exact: true })).toBeVisible();
  const updated = await page.locator('time').evaluateAll(elements => elements.map(el => el.getAttribute('datetime')!));
  expect(updated[0]).toBe(original[0]);
  expect(Date.parse(updated[1]!)).toBeGreaterThan(Date.parse(original[1]!));
  await expectFitsViewport(page);
  await page.getByRole('link', { name: 'Edit idea' }).click();
  await page.getByLabel('Description').fill('');
  await expectFitsViewport(page);
  await page.getByRole('button', { name: 'Save idea' }).click();
  await page.reload();
  await expect(page.getByText('No description yet.')).toBeVisible();
});

test('abandon, find and edit retained ideas, then restore them to home in update order', async ({ page, appURL }) => {
  for (const title of ['Garden plans', 'Garden journal', 'Other idea']) {
    await page.goto(`${appURL}/ideas/new`);
    await page.getByLabel('Title', { exact: true }).fill(title);
    await page.getByRole('button', { name: 'Save idea' }).click();
  }
  await page.goto(appURL);
  await page.getByRole('link', { name: 'Garden plans', exact: true }).click();
  const created = await page.locator('time').first().getAttribute('datetime');
  await page.getByRole('button', { name: 'Abandon idea', exact: true }).click();
  await page.reload();
  await expect(page.getByText('Abandoned', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /delete/i })).toHaveCount(0);
  await page.goto(appURL);
  await expect(page.getByRole('list').getByRole('link')).toHaveText(['Other idea', 'Garden journal']);
  await page.getByRole('link', { name: 'Browse all ideas' }).click();
  await page.getByLabel('Status', { exact: true }).selectOption('abandoned');
  await page.getByLabel('Search titles').fill('GARDEN');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await page.reload();
  await expect(page.getByRole('list').getByRole('link')).toHaveText(['Garden plans']);
  await expectFitsViewport(page);
  await page.getByRole('link', { name: 'Garden plans', exact: true }).click();
  await page.getByRole('link', { name: 'Edit idea' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Garden sketch');
  await page.getByLabel('Description').fill('Keep these abandoned notes.');
  await page.getByRole('button', { name: 'Save idea' }).click();
  await expect(page.getByText('Abandoned', { exact: true })).toBeVisible();
  await expectFitsViewport(page);
  await page.getByRole('button', { name: 'Restore idea' }).click();
  await page.reload();
  await expect(page.getByText('New', { exact: true })).toBeVisible();
  await expect(page.getByText('Keep these abandoned notes.')).toBeVisible();
  await expect(page.locator('time').first()).toHaveAttribute('datetime', created!);
  await page.goto(appURL);
  await expect(page.getByRole('list').getByRole('link')).toHaveText(['Garden sketch', 'Other idea', 'Garden journal']);
  await page.getByRole('link', { name: 'Browse all ideas' }).click();
  await page.getByLabel('Status', { exact: true }).selectOption('new');
  await page.getByLabel('Search titles').fill('garden');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByRole('list').getByRole('link')).toHaveText(['Garden sketch', 'Garden journal']);
  await page.getByLabel('Status', { exact: true }).selectOption('abandoned');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByText('No matching ideas.')).toBeVisible();
});

test.describe('capture-only database upgrade', () => {
  test.use({ captureOnlyData: true });

  test('retain existing ideas and timestamps, allow edits and reject repeated abandonment', async ({ page, appURL }) => {
    await page.goto(appURL);
    await page.getByRole('link', { name: 'Existing idea', exact: true }).click();
    await expect(page).toHaveURL(`${appURL}/ideas/7`);
    await expect(page.getByText('Original notes')).toBeVisible();
    await expect(page.locator('time').first()).toHaveAttribute('datetime', '2026-09-01T00:00:00.000Z');
    await expect(page.locator('time').last()).toHaveAttribute('datetime', '2026-09-02T00:00:00.000Z');
    await page.getByRole('link', { name: 'Edit idea' }).click();
    await page.getByLabel('Title', { exact: true }).fill('Existing refined idea');
    await page.getByRole('button', { name: 'Save idea' }).click();
    const edited = await page.locator('time').last().getAttribute('datetime');
    // Keep a stale form open to submit the same transition twice through the browser.
    const stale = await page.context().newPage();
    await stale.goto(page.url());
    await page.getByRole('button', { name: 'Abandon idea' }).click();
    const abandoned = await page.locator('time').last().getAttribute('datetime');
    expect(Date.parse(abandoned!)).toBeGreaterThan(Date.parse(edited!));
    await stale.getByRole('button', { name: 'Abandon idea' }).click();
    await expect(stale.getByRole('heading', { name: 'Status already changed' })).toBeVisible();
    await page.reload();
    await expect(page.locator('time').last()).toHaveAttribute('datetime', abandoned!);
    await page.getByRole('button', { name: 'Restore idea' }).click();
    await expect(page.getByText('New', { exact: true })).toBeVisible();
    expect(Date.parse((await page.locator('time').last().getAttribute('datetime'))!)).toBeGreaterThan(Date.parse(abandoned!));
    await expect(page.locator('time').first()).toHaveAttribute('datetime', '2026-09-01T00:00:00.000Z');
    await expect(page.getByText('Original notes')).toBeVisible();
    await stale.close();
  });
});

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

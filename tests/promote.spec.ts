import { test, expect } from './fixtures.js';
import type { Page } from '@playwright/test';

async function expectFitsViewport(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function captureIdea(page: Page, appURL: string, title: string, description = '') {
  await page.goto(`${appURL}/ideas/new`);
  await page.getByLabel('Title', { exact: true }).fill(title);
  if (description) await page.getByLabel('Description').fill(description);
  await page.getByRole('button', { name: 'Save idea' }).click();
}

test('offer promotion only for new ideas, prefill the project form, and cancel without creating a project', async ({ page, appURL }) => {
  await captureIdea(page, appURL, 'Garden journal', 'Water in the morning.');
  const idea = page.url();
  await expect(page.getByRole('link', { name: 'Promote idea' })).toBeVisible();
  await expectFitsViewport(page);
  await page.getByRole('button', { name: 'Abandon idea' }).click();
  await expect(page.getByRole('link', { name: 'Promote idea' })).toHaveCount(0);
  await page.goto(`${idea}/promote`);
  await expect(page.getByRole('heading', { name: 'Only new ideas can be promoted' })).toBeVisible();
  await page.goto(idea);
  await page.getByRole('button', { name: 'Restore idea' }).click();
  await page.getByRole('link', { name: 'Promote idea' }).click();
  await expect(page.getByRole('heading', { name: 'Promote to a project' })).toBeVisible();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Garden journal');
  await expect(page.getByLabel('Description')).toHaveValue('Water in the morning.');
  await expect(page.getByLabel('Status', { exact: true })).toHaveValue('experimenting');
  await expect(page.getByLabel('Repository URL')).toHaveValue('');
  await expectFitsViewport(page);
  await page.getByLabel('Title', { exact: true }).fill('Should not be saved');
  await page.getByLabel('Status', { exact: true }).selectOption('developing');
  await page.getByRole('link', { name: 'Cancel' }).click();
  await expect(page.getByRole('heading', { name: 'Garden journal' })).toBeVisible();
  await expect(page.getByText('New', { exact: true })).toBeVisible();
  await expect(page.getByText('Water in the morning.')).toBeVisible();
  await page.goto(appURL);
  await expect(page.getByRole('region', { name: /New ideas/ }).getByRole('link', { name: 'Garden journal' })).toBeVisible();
  await expect(page.getByText('No experimenting projects yet.')).toBeVisible();
  await expect(page.getByText('No developing projects yet.')).toBeVisible();
});

test('confirming promotion creates one linked project and keeps the idea findable', async ({ page, appURL }) => {
  const external: string[] = [];
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin !== appURL) {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await captureIdea(page, appURL, 'Garden journal', 'Original idea notes.');
  const idea = page.url();
  await page.getByRole('link', { name: 'Promote idea' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Garden app');
  await page.getByLabel('Description').fill('Project notes.');
  await page.getByLabel('Status', { exact: true }).selectOption('developing');
  await page.getByRole('button', { name: 'Save project' }).click();
  await expect(page.getByRole('heading', { name: 'Garden app' })).toBeVisible();
  await expect(page.locator('.badge').first()).toHaveText('Developing');
  await expect(page.getByText('Project notes.', { exact: true })).toBeVisible();
  await expect(page.getByText('No repository link yet.')).toBeVisible();
  await page.goto(appURL);
  await expect(page.getByRole('region', { name: /New ideas/ }).getByRole('link', { name: 'Garden journal' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: /Developing projects/ }).getByRole('link', { name: 'Garden app' })).toBeVisible();
  await page.goto(idea);
  await expect(page.getByText('Promoted', { exact: true })).toBeVisible();
  await expect(page.getByText('Original idea notes.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Promote idea' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Abandon idea' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Restore idea' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /delete/i })).toHaveCount(0);
  await page.getByRole('link', { name: 'Garden app' }).click();
  await expect(page.getByRole('heading', { name: 'Garden app' })).toBeVisible();
  await page.goto(`${appURL}/ideas`);
  await expect(page.getByRole('list').getByRole('link', { name: 'Garden journal' })).toBeVisible();
  await page.getByLabel('Status', { exact: true }).selectOption('new');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByRole('link', { name: 'Garden journal' })).toHaveCount(0);
  await page.getByLabel('Status', { exact: true }).selectOption('promoted');
  await page.getByLabel('Search titles').fill('GARDEN');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByRole('list').getByRole('link')).toHaveText(['Garden journal']);
  await expectFitsViewport(page);
  expect(external).toEqual([]);
});

test('repeated promotion and invalid source statuses leave no extra project or partial state', async ({ page, appURL }) => {
  await captureIdea(page, appURL, 'Unique spark');
  const idea = page.url();
  const stale = await page.context().newPage();
  await stale.goto(idea);
  await stale.getByRole('link', { name: 'Promote idea' }).click();
  await page.getByRole('link', { name: 'Promote idea' }).click();
  await page.getByRole('button', { name: 'Save project' }).click();
  await expect(page.getByRole('heading', { name: 'Unique spark' })).toBeVisible();
  await expect(page.getByText('Experimenting', { exact: true })).toBeVisible();
  await stale.getByRole('button', { name: 'Save project' }).click();
  await expect(stale.getByRole('heading', { name: 'Status already changed' })).toBeVisible();
  await stale.close();
  await page.goto(`${appURL}/projects`);
  await expect(page.getByRole('list').getByRole('link', { name: 'Unique spark' })).toHaveCount(1);
  await page.goto(idea);
  await expect(page.getByText('Promoted', { exact: true })).toBeVisible();
  await page.goto(`${idea}/promote`);
  await expect(page.getByRole('heading', { name: 'Only new ideas can be promoted' })).toBeVisible();

  await captureIdea(page, appURL, 'Hold back', 'Keep me new.');
  const held = page.url();
  await page.getByRole('link', { name: 'Promote idea' }).click();
  await page.locator('form').evaluate(form => form.setAttribute('novalidate', ''));
  await page.getByLabel('Title', { exact: true }).fill('   ');
  await page.getByRole('button', { name: 'Save project' }).click();
  await expect(page.getByRole('alert')).toHaveText('Give your project a title.');
  await page.locator('form').evaluate(form => form.setAttribute('novalidate', ''));
  await page.getByLabel('Title', { exact: true }).fill('Hold back');
  await page.getByLabel('Status', { exact: true }).evaluate((select: HTMLSelectElement) => {
    select.append(new Option('completed', 'completed', true, true));
  });
  await page.getByRole('button', { name: 'Save project' }).click();
  await expect(page.getByRole('alert')).toHaveText('Choose experimenting or developing.');
  await page.goto(held);
  await expect(page.getByText('New', { exact: true })).toBeVisible();
  await expect(page.getByText('Keep me new.')).toBeVisible();
  await page.goto(`${appURL}/projects`);
  await expect(page.getByRole('link', { name: 'Hold back' })).toHaveCount(0);

  await page.goto(held);
  const abandoned = await page.context().newPage();
  await abandoned.goto(held);
  await abandoned.getByRole('link', { name: 'Promote idea' }).click();
  await page.getByRole('button', { name: 'Abandon idea' }).click();
  await abandoned.getByRole('button', { name: 'Save project' }).click();
  await expect(abandoned.getByRole('heading', { name: 'Only new ideas can be promoted' })).toBeVisible();
  await abandoned.close();
  await page.reload();
  await expect(page.getByText('Abandoned', { exact: true })).toBeVisible();
  await expect(page.getByText('Keep me new.')).toBeVisible();
  await page.goto(`${appURL}/projects`);
  await expect(page.getByRole('link', { name: 'Hold back' })).toHaveCount(0);
  await expect(page.getByRole('list').getByRole('link', { name: 'Unique spark' })).toHaveCount(1);
});

test('promoted idea and project stay independently editable with a fixed link', async ({ page, appURL }) => {
  await captureIdea(page, appURL, 'Origin idea', 'Idea notes.');
  const idea = page.url();
  const stale = await page.context().newPage();
  await stale.goto(idea);
  await page.getByRole('link', { name: 'Promote idea' }).click();
  await page.getByRole('button', { name: 'Save project' }).click();
  await expect(page.getByRole('heading', { name: 'Origin idea' })).toBeVisible();
  await stale.getByRole('button', { name: 'Abandon idea' }).click();
  await expect(stale.getByRole('heading', { name: 'Status already changed' })).toBeVisible();
  await stale.close();
  await page.goto(idea);
  await expect(page.getByText('Promoted', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Origin idea' }).click();
  await expect(page.getByRole('heading', { name: 'Origin idea' })).toBeVisible();
  await page.getByRole('link', { name: 'Edit project' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Independent project');
  await page.getByLabel('Description').fill('Project-only notes.');
  await page.getByRole('button', { name: 'Save project' }).click();
  await expect(page.getByRole('heading', { name: 'Independent project' })).toBeVisible();
  await expect(page.getByText('Project-only notes.', { exact: true })).toBeVisible();
  await page.goto(idea);
  await expect(page.getByRole('heading', { name: 'Origin idea' })).toBeVisible();
  await expect(page.getByText('Idea notes.')).toBeVisible();
  await expect(page.getByText('Promoted', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Edit idea' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Independent idea');
  await page.getByLabel('Description').fill('Idea-only notes.');
  await expectFitsViewport(page);
  await page.getByRole('button', { name: 'Save idea' }).click();
  await expect(page.getByRole('heading', { name: 'Independent idea' })).toBeVisible();
  await expect(page.getByText('Idea-only notes.')).toBeVisible();
  await expect(page.getByText('Promoted', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Promote idea' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Independent project' }).click();
  await expect(page.getByRole('heading', { name: 'Independent project' })).toBeVisible();
  await expect(page.getByText('Project-only notes.', { exact: true })).toBeVisible();
  await page.goto(`${appURL}/projects/new`);
  await page.getByLabel('Title', { exact: true }).fill('Direct project');
  await page.getByRole('button', { name: 'Save project' }).click();
  await expect(page.getByRole('heading', { name: 'Direct project' })).toBeVisible();
  await expect(page.getByText('Experimenting', { exact: true })).toBeVisible();
  await page.goto(appURL);
  await expect(page.getByRole('region', { name: /New ideas/ }).getByRole('link', { name: 'Independent idea' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: /Experimenting projects/ }).getByRole('link', { name: 'Independent project' })).toBeVisible();
  await expect(page.getByRole('region', { name: /Experimenting projects/ }).getByRole('link', { name: 'Direct project' })).toBeVisible();
  await expectFitsViewport(page);
});

test.describe('upgrade ideas for promotion', () => {
  test.use({ prePromotionData: true });

  test('retain existing records and allow promotion after schema upgrade', async ({ page, appURL }) => {
    await page.goto(`${appURL}/projects/9`);
    await expect(page.getByRole('heading', { name: 'Already underway' })).toBeVisible();
    await expect(page.getByText('Existing project notes.', { exact: true })).toBeVisible();
    await page.goto(`${appURL}/ideas/3`);
    await expect(page.getByRole('heading', { name: 'Ready to grow' })).toBeVisible();
    await expect(page.getByText('Keep these notes.')).toBeVisible();
    await expect(page.getByText('New', { exact: true })).toBeVisible();
    await expect(page.locator('time').first()).toHaveAttribute('datetime', '2026-09-01T00:00:00.000Z');
    await expect(page.locator('time').last()).toHaveAttribute('datetime', '2026-09-02T00:00:00.000Z');
    await page.getByRole('link', { name: 'Promote idea' }).click();
    await page.getByRole('button', { name: 'Save project' }).click();
    await expect(page.getByRole('heading', { name: 'Ready to grow' })).toBeVisible();
    await expect(page.getByText('Experimenting', { exact: true })).toBeVisible();
    await page.goto(`${appURL}/ideas/3`);
    await expect(page.getByText('Promoted', { exact: true })).toBeVisible();
    await expect(page.getByText('Keep these notes.')).toBeVisible();
    await expect(page.locator('time').first()).toHaveAttribute('datetime', '2026-09-01T00:00:00.000Z');
    await page.getByRole('link', { name: 'Ready to grow' }).click();
    await expect(page.getByRole('heading', { name: 'Ready to grow' })).toBeVisible();
    await page.goto(`${appURL}/projects/9`);
    await expect(page.getByRole('heading', { name: 'Already underway' })).toBeVisible();
    await expect(page.locator('time').first()).toHaveAttribute('datetime', '2026-09-01T00:00:00.000Z');
  });
});

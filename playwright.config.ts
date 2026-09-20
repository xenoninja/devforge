import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: { trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', testIgnore: '**/docker.spec.ts', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
});

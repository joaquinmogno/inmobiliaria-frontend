import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-integration',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4180',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'production-desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'production-mobile', use: { ...devices['Pixel 5'] }, testMatch: /mobile\.spec\.ts/ }
  ]
});

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-chaos',
  timeout: 20_000,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5176', ...devices['Desktop Chrome'] },
  webServer: {
    command: 'VITE_GOOGLE_CLIENT_ID=test.apps.googleusercontent.com npm run dev -- --host 127.0.0.1 --port 5176',
    url: 'http://127.0.0.1:5176',
    reuseExistingServer: false
  }
});

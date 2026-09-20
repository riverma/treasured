import { defineConfig, devices } from '@playwright/test';

// The e2e suite runs against the real build, because the service worker only exists there.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4175',
    ...devices['Pixel 7'],
    // System Chrome: no vendored browser download, and the same engine a phone runs.
    channel: 'chrome'
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
    timeout: 120_000
  }
});

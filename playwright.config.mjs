import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:8765',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    serviceWorkers: 'block'
  },
  webServer: {
    command: 'python -m http.server 8765',
    url: 'http://127.0.0.1:8765/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'], browserName: 'chromium' }
    },
    {
      name: 'mobile-webkit',
      use: { ...devices['iPhone 13'], browserName: 'webkit' }
    },
    {
      name: 'mobile-firefox',
      use: {
        ...devices['Pixel 5'],
        browserName: 'firefox',
        isMobile: false,
        hasTouch: true
      }
    }
  ]
});

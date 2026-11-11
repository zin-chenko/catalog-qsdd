import { defineConfig } from '@playwright/test';

const port = process.env['E2E_PORT'] || '4200';
if (!/^\d+$/.test(port)) throw new Error('E2E_PORT must be a port number');
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  testIgnore: '**/*.repository.spec.ts',
  fullyParallel: true,
  workers: 2,
  timeout: 30000,
  use: {
    baseURL,
    channel: process.env['PLAYWRIGHT_CHANNEL'] || (process.platform === 'win32' ? 'chrome' : undefined),
    viewport: { width: 1440, height: 1000 },
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm exec ng serve catalog-qsdd --host=127.0.0.1 --port=${port} --live-reload=false`,
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    timeout: 60000,
  },
  reporter: [['list']],
});

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.repository.spec.ts',
  workers: 1,
  reporter: 'list',
});

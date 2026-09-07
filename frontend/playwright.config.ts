import { defineConfig } from '@playwright/test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4328',
    browserName: 'chromium',
    channel: 'chrome',
    viewport: { width: 1440, height: 1050 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    cwd: join(import.meta.dirname, '..'),
    url: 'http://127.0.0.1:4328/health',
    reuseExistingServer: false,
    env: {
      PORT: '4328',
      FLUX_DB_PATH: join(tmpdir(), `flux-e2e-${Date.now()}.sqlite`),
      FLUX_SEED: 'false',
    },
    timeout: 30_000,
  },
});

import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import express from 'express';
import { loadEnvFile } from 'node:process';
import { Store } from './store.js';
import { FundingService } from './service.js';
import { createApp } from './app.js';
import { WebhookDispatcher } from './webhooks.js';

if (existsSync('.env')) loadEnvFile('.env');
if (process.env.FLUX_MODE && process.env.FLUX_MODE !== 'sandbox')
  throw new Error('Only sandbox mode is implemented. Live transfers are not enabled.');
const port = Number(process.env.PORT || 4337);
const store = new Store(process.env.FLUX_DB_PATH || 'data/flux.sqlite');
function secret(key: string, configured?: string) {
  if (configured && configured.length < 32)
    throw new Error(`${key} must contain at least 32 characters.`);
  const value = configured || store.get<string>(key) || randomBytes(32).toString('hex');
  store.set(key, value);
  return value;
}
const token = secret('api_token', process.env.FLUX_API_TOKEN);
const sessionToken = randomBytes(32).toString('hex');
const webhookSecret = secret('webhook_secret', process.env.FLUX_WEBHOOK_SECRET);
const service = new FundingService(store);
service.tick();
if (process.env.FLUX_SEED !== 'false') service.seed();
const app = createApp(service, {
  token,
  sessionToken,
  webhookConfigured: Boolean(process.env.FLUX_WEBHOOK_URL),
});
let vite: Awaited<ReturnType<(typeof import('vite'))['createServer']>> | undefined;
if (process.env.NODE_ENV !== 'production') {
  const { createServer } = await import('vite');
  vite = await createServer({
    server: { middlewareMode: true, ws: { host: '127.0.0.1', port: port + 1 } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const root = resolve('dist/client');
  if (!existsSync(root)) throw new Error('Run npm run build before npm start.');
  app.use(express.static(root));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve(root, 'index.html')));
}
const webhooks = new WebhookDispatcher(store, webhookSecret, process.env.FLUX_WEBHOOK_URL);
const timer = setInterval(() => {
  try {
    service.tick();
    void webhooks.tick().catch((error) => console.error('Webhook worker:', error.message));
  } catch (error) {
    console.error('Observer:', error instanceof Error ? error.message : 'Unknown failure');
  }
}, 1000);
const server = app.listen(port, '127.0.0.1', (error?: Error) => {
  if (error) {
    console.error(`Flux failed to start on port ${port}: ${error.message}`);
    void shutdown(1);
    return;
  }
  console.log(`Flux sandbox is running at http://127.0.0.1:${port}`);
});
async function shutdown(exitCode = 0) {
  clearInterval(timer);
  if (server.listening) server.close();
  await vite?.close();
  store.close();
  process.exit(exitCode);
}
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

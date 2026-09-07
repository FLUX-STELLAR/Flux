import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('occupied port exits with an error and never reports a running workspace', async (t) => {
  const occupied = createServer().listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => occupied.once('listening', resolve));
  const dir = mkdtempSync(join(tmpdir(), 'flux-port-test-'));
  t.after(() => {
    occupied.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/server/index.ts'], {
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String((occupied.address() as AddressInfo).port),
      FLUX_MODE: 'sandbox',
      FLUX_SEED: 'false',
      FLUX_DB_PATH: join(dir, 'state.sqlite'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });
  const timer = setTimeout(() => child.kill('SIGKILL'), 15_000);
  const code = await new Promise<number | null>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  clearTimeout(timer);
  assert.equal(code, 1);
  assert.match(output, /Flux failed to start/);
  assert.doesNotMatch(output, /Flux sandbox is running/);
});

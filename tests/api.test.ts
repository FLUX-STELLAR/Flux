import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server/app.js';
import { Store } from '../src/server/store.js';
import { FundingService } from '../src/server/service.js';
import { signWebhook, verifyWebhook } from '../src/sdk/webhooks.js';
import { FluxClient } from '../src/sdk/client.js';
import type { AddressInfo } from 'node:net';
import { request as httpRequest } from 'node:http';

test('API blocks anonymous, foreign origin and partner approvals; SDK ingests idempotently', async (t) => {
  const store = new Store(':memory:'),
    service = new FundingService(store);
  const token = 'test-secret-token-with-32-characters',
    sessionToken = 'operator-session-token';
  const server = createApp(service, { token, sessionToken }).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  t.after(async () => {
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
    store.close();
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  assert.equal((await fetch(`${base}/api/v1/overview`)).status, 401);
  assert.equal(
    (
      await fetch(`${base}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
        body: '{}',
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(`${base}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: '{}',
      })
    ).status,
    415,
  );
  const reboundStatus = await new Promise<number | undefined>((resolve, reject) => {
    const req = httpRequest(`${base}/health`, { headers: { Host: 'attacker.example' } }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.end();
  });
  assert.equal(reboundStatus, 403);
  const session = await fetch(`${base}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const cookie = session.headers.get('set-cookie')!.split(';')[0];
  assert.match(session.headers.get('set-cookie')!, /HttpOnly/);
  assert.equal(session.headers.get('cache-control'), 'no-store');
  assert.equal(session.headers.get('x-frame-options'), null);
  assert.match(session.headers.get('content-security-policy')!, /frame-ancestors 'self'/);
  const localSession = (await session.json()).session_token;
  assert.equal(
    (await fetch(`${base}/api/v1/overview`, { headers: { 'X-Flux-Session': localSession } }))
      .status,
    200,
  );
  assert.equal(
    (await fetch(`${base}/api/v1/overview`, { headers: { 'X-Flux-Session': 'invalid' } })).status,
    401,
  );
  const client = new FluxClient({ baseUrl: base, token });
  const input = {
    partner_batch_id: 'api-batch-1',
    label: 'API payroll',
    required_liquidity: '18430',
    scheduled_at: new Date(Date.now() + 3600000).toISOString(),
    settlement_account_id: 'stellar_ops_01',
    source_treasury_id: 'evm_treasury_01',
    asset: 'USDT0',
    idempotency_key: 'api-batch-1-key',
  };
  const r = await client.createFundingRequest(input);
  assert.equal((await client.createFundingRequest(input)).id, r.id);
  const denied = await fetch(`${base}/api/v1/funding-requests/${r.id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ intent_hash: r.intent_hash }),
  });
  assert.equal(denied.status, 403);
  const approved = await fetch(`${base}/api/v1/funding-requests/${r.id}/approve`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ intent_hash: r.intent_hash }),
  });
  assert.equal(approved.status, 200);
  const bad = await fetch(`${base}/api/v1/funding-requests`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, asset: 'FAKE' }),
  });
  assert.equal(bad.status, 422);
  assert.equal((await client.getFundingRequest(r.id)).status, 'APPROVED');
});
test('webhook authentication binds raw payload and timestamp; rejects tampering and stale replay', () => {
  const now = Date.now(),
    timestamp = Math.floor(now / 1000).toString(),
    secret = 'private-test-secret',
    body = '{"event_id":"one"}';
  const sig = signWebhook(body, timestamp, secret);
  assert.equal(verifyWebhook(body, timestamp, sig, secret, now), true);
  assert.equal(verifyWebhook(body + ' ', timestamp, sig, secret, now), false);
  assert.equal(verifyWebhook(body, timestamp, sig, secret, now + 301000), false);
  assert.equal(verifyWebhook(body, timestamp, 'wrong', secret, now), false);
});

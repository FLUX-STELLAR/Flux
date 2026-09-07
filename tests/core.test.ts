import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { units, decimal, shortfall, formatAmount } from '../src/shared/money.js';
import { Store, digest } from '../src/server/store.js';
import { AppError, FundingService } from '../src/server/service.js';
import type { Account, CreateFunding, FundingRequest } from '../src/shared/types.js';

function setup(path = ':memory:') {
  let ms = Date.parse('2026-09-06T12:00:00Z');
  const store = new Store(path),
    service = new FundingService(store, () => new Date(ms));
  let n = 0;
  const input = (extra: Partial<CreateFunding> = {}): CreateFunding => ({
    partner_batch_id: `batch-${++n}`,
    label: 'September payroll',
    required_liquidity: '18430',
    scheduled_at: new Date(ms + 3_600_000).toISOString(),
    settlement_account_id: 'stellar_ops_01',
    source_treasury_id: 'evm_treasury_01',
    asset: 'USDT0',
    idempotency_key: `test-idempotency-${n}`,
    ...extra,
  });
  const advance = (seconds: number, tick = true) => {
    ms += seconds * 1000;
    if (tick) service.tick();
  };
  const start = (extra: Partial<CreateFunding> = {}) => {
    const r = service.create(input(extra));
    service.approve(r.id, r.intent_hash);
    return service.submit(r.id);
  };
  return { store, service, input, advance, start, clock: () => new Date(ms) };
}
const fails = (code: string) => (error: unknown) =>
  error instanceof AppError && error.code === code;

test('exact monetary arithmetic, PRD example, OFT round-up and invalid values', () => {
  assert.equal(shortfall('18430', '5000', '5200'), '18230.0000000');
  assert.equal(formatAmount('0.0000010'), '0.000001');
  assert.equal(formatAmount('999999999999.1234567'), '999,999,999,999.1234567');
  assert.equal(shortfall('0.0000001', '0', '0'), '0.0000010');
  assert.equal(decimal(units('999999999999.1234567')), '999999999999.1234567');
  assert.equal(shortfall('200', '5000', '5200'), '0.0000000');
  for (const value of ['NaN', '-1', '1e6', '1.00000001', 'Infinity', '01', ''])
    assert.throws(() => units(value));
});
test('duplicate batch/API replay creates one immutable request and one outbox event', (t) => {
  const { store, service, input } = setup();
  t.after(() => store.close());
  const data = input(),
    a = service.create(data),
    b = service.create(data);
  assert.equal(a.id, b.id);
  assert.equal(store.requests().length, 1);
  assert.equal(store.outbox().length, 1);
  assert.throws(
    () => service.create({ ...data, required_liquidity: '100' }),
    fails('IDEMPOTENCY_CONFLICT'),
  );
  assert.throws(
    () => service.create({ ...data, partner_batch_id: 'another' }),
    fails('IDEMPOTENCY_CONFLICT'),
  );
});
test('every positive transfer requires exact approval; submit replay cannot move value twice', (t) => {
  const { store, service, input, advance } = setup();
  t.after(() => store.close());
  const r = service.create(input());
  assert.throws(() => service.submit(r.id), fails('APPROVAL_REQUIRED'));
  assert.throws(() => service.approve(r.id, 'wrong'), fails('APPROVAL_MISMATCH'));
  service.approve(r.id, r.intent_hash);
  service.submit(r.id);
  service.submit(r.id);
  assert.equal(service.treasury().balance, '106770.0000000');
  assert.equal(
    (store.db.prepare('SELECT COUNT(*) AS n FROM transfers').get() as { n: number }).n,
    1,
  );
  advance(8);
  assert.equal(service.require(r.id).status, 'RECONCILED');
  assert.equal(service.account().balance, '23430.0000000');
  service.tick();
  service.retryObservation(r.id);
  assert.equal(service.account().balance, '23430.0000000');
  assert.equal(store.outbox().filter((e) => e.event_type === 'funding.reconciled').length, 1);
});
test('shortfall includes other batch allocations and zero-funding reserves usable balance', (t) => {
  const { store, service, input } = setup();
  t.after(() => store.close());
  const a = service.create(input({ required_liquidity: '150' }));
  assert.equal(a.status, 'NO_FUNDING_REQUIRED');
  assert.equal(a.payout_status, 'READY');
  const b = service.create(input({ required_liquidity: '100' }));
  assert.equal(b.calculation.required_top_up, '50.0000000');
  assert.equal(service.overview().metrics.allocated_balance, '200.0000000');
  service.cancel(a.id);
  assert.equal(service.allocated(), units('50'));
});
test('daily cap includes concurrent reservations and cancelled reservations are released', (t) => {
  const { store, service, input } = setup();
  t.after(() => store.close());
  service.updatePolicy({
    minimum_reserve: '5000',
    max_single_funding: '25000',
    daily_funding_cap: '30000',
    request_expiry_minutes: 60,
    minimum_lead_time_minutes: 10,
    delivery_timeout_seconds: 20,
  });
  const a = service.create(input());
  assert.throws(() => service.create(input()), fails('DAILY_CAP'));
  assert.equal(store.requests().length, 1);
  service.cancel(a.id);
  assert.equal(service.create(input()).status, 'AWAITING_APPROVAL');
});
test('hard transfer cap, stale observations and short funding windows fail closed', (t) => {
  const { store, service, input, advance } = setup();
  t.after(() => store.close());
  assert.throws(
    () => service.create(input({ required_liquidity: '30000' })),
    fails('TRANSFER_LIMIT'),
  );
  assert.throws(
    () => service.create(input({ scheduled_at: '2026-09-06T12:01:00Z' })),
    fails('INSUFFICIENT_LEAD_TIME'),
  );
  advance(16, false);
  assert.throws(() => service.create(input()), fails('STALE_BALANCE'));
  assert.equal(store.requests().length, 0);
});
test('expired approvals release allocations and cannot be submitted', (t) => {
  const { store, service, input, advance } = setup();
  t.after(() => store.close());
  const r = service.create(input());
  service.approve(r.id, r.intent_hash);
  advance(3601);
  assert.equal(service.require(r.id).status, 'EXPIRED');
  assert.equal(service.allocated(), 0n);
  assert.equal(service.dailyCommitted(), 0n);
  assert.throws(() => service.submit(r.id), fails('APPROVAL_REQUIRED'));
});
test('pause stops new value movement while already submitted transfers reconcile', (t) => {
  const { store, service, input, start, advance } = setup();
  t.after(() => store.close());
  const r = start();
  service.pause(true);
  assert.throws(() => service.create(input()), fails('FUNDING_PAUSED'));
  advance(8);
  assert.equal(service.require(r.id).status, 'RECONCILED');
});
test('delayed delivery never re-sends; observation and late delivery recover original intent', (t) => {
  const { store, service, start, advance } = setup();
  t.after(() => store.close());
  const r = start({ scenario: 'delayed' });
  advance(25);
  assert.equal(service.require(r.id).status, 'ATTENTION_REQUIRED');
  service.retryObservation(r.id);
  service.retryObservation(r.id);
  assert.equal(service.require(r.id).status, 'ATTENTION_REQUIRED');
  assert.throws(() => service.cancel(r.id), fails('TRANSFER_ACTIVE'));
  assert.throws(() => service.payout(r.id), fails('FUNDING_NOT_READY'));
  service.resolveSandboxDelay(r.id);
  assert.equal(service.require(r.id).status, 'RECONCILED');
  assert.equal(service.treasury().balance, '106770.0000000');
  assert.equal(
    (store.db.prepare('SELECT COUNT(*) AS n FROM transfers').get() as { n: number }).n,
    1,
  );
});
test('partial receipt remains held and quarantined; re-observation cannot double-credit', (t) => {
  const { store, service, start, advance } = setup();
  t.after(() => store.close());
  const r = start({ scenario: 'mismatch' });
  advance(8);
  const held = service.require(r.id);
  assert.equal(held.status, 'ATTENTION_REQUIRED');
  assert.equal(held.payout_status, 'HELD');
  assert.equal(held.allocation, '9315.0000000');
  assert.throws(() => service.payout(r.id), fails('FUNDING_NOT_READY'));
  const balance = service.account().balance;
  service.retryObservation(r.id);
  service.tick();
  assert.equal(service.account().balance, balance);
  assert.equal(store.outbox().filter((e) => e.event_type === 'funding.reconciled').length, 0);
});
test('payout spends only reconciled allocation, preserves reserve and is idempotent', (t) => {
  const { store, service, start, advance } = setup();
  t.after(() => store.close());
  const r = start();
  advance(8);
  service.payout(r.id);
  service.payout(r.id);
  assert.equal(service.account().balance, '5000.0000000');
  assert.equal(service.require(r.id).payout_status, 'PAID');
});
test('pre-submit recheck rejects increased shortfall without silently changing intent', (t) => {
  const { store, service, input } = setup();
  t.after(() => store.close());
  const r = service.create(input());
  service.approve(r.id, r.intent_hash);
  const account = service.account();
  account.balance = '4000.0000000';
  store.set('account', account);
  assert.throws(() => service.submit(r.id), fails('RECALCULATION_REQUIRED'));
  assert.equal(service.require(r.id).intent_hash, r.intent_hash);
  assert.equal(service.treasury().balance, '125000.0000000');
});
test('configured destination change blocks approved transfer', (t) => {
  const { store, service, input } = setup();
  t.after(() => store.close());
  const r = service.create(input());
  service.approve(r.id, r.intent_hash);
  store.set('account', {
    ...service.account(),
    address: 'sandbox:wrong-destination',
  } satisfies Account);
  assert.throws(() => service.submit(r.id), fails('DESTINATION_CHANGED'));
});
test('audit and outbox roll back atomically with request; audit chain is immutable', (t) => {
  const { store, service, input } = setup();
  t.after(() => store.close());
  const r = service.create(input());
  const before = store.events().length;
  assert.throws(() =>
    store.transaction(() => {
      store.audit(r.id, 'test', 'test.rollback', {}, service.now());
      store.emit(r, 'test.rollback', service.now());
      throw new Error('crash');
    }),
  );
  assert.equal(store.events().length, before);
  assert.equal(store.outbox().filter((e) => e.event_type === 'test.rollback').length, 0);
  const events = store.events().reverse();
  for (let i = 0; i < events.length; i++) {
    const { hash, ...record } = events[i];
    assert.equal(hash, digest(record));
    if (i) assert.equal(record.previous_hash, events[i - 1].hash);
  }
  assert.throws(() => store.db.prepare('DELETE FROM audit_events').run(), /immutable/);
});
test('source submission survives process restart, then reconciles exactly once', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'flux-test-'));
  const path = join(dir, 'state.sqlite');
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const s = setup(path);
  const r = s.start();
  s.store.close();
  s.advance(8, false);
  const store = new Store(path);
  t.after(() => store.close());
  const restored = new FundingService(store, s.clock);
  assert.equal(restored.require(r.id).status, 'SOURCE_SUBMITTED');
  restored.tick();
  restored.submit(r.id);
  restored.tick();
  assert.equal(restored.require(r.id).status, 'RECONCILED');
  assert.equal(restored.account().balance, '23430.0000000');
  assert.equal(restored.treasury().balance, '106770.0000000');
  assert.equal(store.outbox().filter((e) => e.event_type === 'funding.reconciled').length, 1);
});

test('wrong destination receipt cannot release payout or consume a receipt', (t) => {
  const { store, service, start } = setup();
  t.after(() => store.close());
  const r = start();
  const transfer = service.rail.get(r.id)!;
  const evidence = {
    ...service.rail.receipt(r, transfer, service.now()),
    destination_account: 'sandbox:attacker',
  };
  store.transaction(() => service.reconcile(r, evidence));
  assert.equal(service.require(r.id).status, 'ATTENTION_REQUIRED');
  assert.equal(service.require(r.id).payout_status, 'HELD');
  assert.equal(
    (store.db.prepare('SELECT COUNT(*) AS n FROM consumed_receipts').get() as { n: number }).n,
    0,
  );
});

test('unsubmitted cap reservations carry over a UTC date boundary', (t) => {
  const s = setup();
  t.after(() => s.store.close());
  s.advance(11 * 3600 + 59 * 60); // 23:59 UTC
  const r = s.service.create(s.input());
  s.advance(120);
  assert.equal(s.service.dailyCommitted(), units(r.calculation.required_top_up));
  s.service.cancel(r.id);
  assert.equal(s.service.dailyCommitted(), 0n);
});

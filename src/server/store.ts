import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import type { AuditEvent, BalancePoint, FundingRequest, OutboxEvent } from '../shared/types.js';

export const digest = (data: unknown) =>
  createHash('sha256').update(JSON.stringify(data)).digest('hex');
export class Store {
  readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    if (path !== ':memory:') chmodSync(path, 0o600);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS funding_requests (
        id TEXT PRIMARY KEY, batch_id TEXT UNIQUE NOT NULL, idempotency_key TEXT UNIQUE NOT NULL,
        payload_hash TEXT NOT NULL, body TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audit_events (sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, body TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit_events BEGIN SELECT RAISE(ABORT, 'Audit events are immutable'); END;
      CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit_events BEGIN SELECT RAISE(ABORT, 'Audit events are immutable'); END;
      CREATE TABLE IF NOT EXISTS transfers (request_id TEXT PRIMARY KEY REFERENCES funding_requests(id), body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS consumed_receipts (receipt_id TEXT PRIMARY KEY, request_id TEXT UNIQUE NOT NULL REFERENCES funding_requests(id));
      CREATE TABLE IF NOT EXISTS outbox (id TEXT PRIMARY KEY, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS balance_history (id INTEGER PRIMARY KEY AUTOINCREMENT, body TEXT NOT NULL);
    `);
  }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  get<T>(key: string): T | undefined {
    const row = this.db.prepare('SELECT value FROM config WHERE key = ?').get(key) as
      { value: string } | undefined;
    return row ? (JSON.parse(row.value) as T) : undefined;
  }
  set(key: string, value: unknown) {
    this.db
      .prepare(
        'INSERT INTO config VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      )
      .run(key, JSON.stringify(value));
  }
  requests(): FundingRequest[] {
    return (
      this.db.prepare('SELECT body FROM funding_requests ORDER BY rowid DESC').all() as {
        body: string;
      }[]
    ).map((r) => JSON.parse(r.body));
  }
  request(id: string): FundingRequest | undefined {
    const row = this.db.prepare('SELECT body FROM funding_requests WHERE id = ?').get(id) as
      { body: string } | undefined;
    return row ? JSON.parse(row.body) : undefined;
  }
  duplicate(batch: string, key: string) {
    return this.db
      .prepare(
        'SELECT id, payload_hash, batch_id, idempotency_key FROM funding_requests WHERE batch_id = ? OR idempotency_key = ?',
      )
      .all(batch, key) as {
      id: string;
      payload_hash: string;
      batch_id: string;
      idempotency_key: string;
    }[];
  }
  insert(request: FundingRequest, hash: string) {
    this.db
      .prepare('INSERT INTO funding_requests VALUES (?, ?, ?, ?, ?)')
      .run(
        request.id,
        request.partner_batch_id,
        request.idempotency_key,
        hash,
        JSON.stringify(request),
      );
  }
  save(request: FundingRequest) {
    this.db
      .prepare('UPDATE funding_requests SET body = ? WHERE id = ?')
      .run(JSON.stringify(request), request.id);
  }
  audit(
    requestId: string | null,
    actor: string,
    action: string,
    details: Record<string, unknown>,
    timestamp: string,
  ) {
    const last = this.db
      .prepare('SELECT body FROM audit_events ORDER BY sequence DESC LIMIT 1')
      .get() as { body: string } | undefined;
    const event = {
      id: `evt_${randomUUID()}`,
      request_id: requestId,
      actor,
      action,
      details,
      timestamp,
      previous_hash: last ? (JSON.parse(last.body) as AuditEvent).hash : 'GENESIS',
    };
    const record: AuditEvent = { ...event, hash: digest(event) };
    this.db
      .prepare('INSERT INTO audit_events(id, body) VALUES (?, ?)')
      .run(record.id, JSON.stringify(record));
    return record;
  }
  events(limit = 100): AuditEvent[] {
    return (
      this.db
        .prepare('SELECT body FROM audit_events ORDER BY sequence DESC LIMIT ?')
        .all(limit) as { body: string }[]
    ).map((r) => JSON.parse(r.body));
  }
  requestEvents(id: string) {
    return (
      this.db.prepare('SELECT body FROM audit_events ORDER BY sequence').all() as { body: string }[]
    )
      .map((r) => JSON.parse(r.body) as AuditEvent)
      .filter((e) => e.request_id === id);
  }
  emit(request: FundingRequest, eventType: string, now: string) {
    const id = `wh_${randomUUID()}`;
    const event: OutboxEvent = {
      id,
      event_type: eventType,
      request_id: request.id,
      payload: {
        event_id: id,
        event_type: eventType,
        funding_request_id: request.id,
        partner_batch_id: request.partner_batch_id,
        state: request.status,
        payout_status: request.payout_status,
        mode: request.mode,
        evidence: request.evidence ?? null,
        timestamp: now,
      },
      created_at: now,
      attempts: 0,
      delivered_at: null,
      next_attempt_at: now,
      last_error: null,
    };
    this.db.prepare('INSERT INTO outbox VALUES (?, ?)').run(id, JSON.stringify(event));
  }
  outbox(): OutboxEvent[] {
    return (
      this.db.prepare('SELECT body FROM outbox ORDER BY rowid DESC').all() as { body: string }[]
    ).map((r) => JSON.parse(r.body));
  }
  saveOutbox(event: OutboxEvent) {
    this.db.prepare('UPDATE outbox SET body = ? WHERE id = ?').run(JSON.stringify(event), event.id);
  }
  balance(point: BalancePoint) {
    this.db.prepare('INSERT INTO balance_history(body) VALUES (?)').run(JSON.stringify(point));
  }
  history(): BalancePoint[] {
    return (
      this.db
        .prepare(
          'SELECT body FROM (SELECT id, body FROM balance_history ORDER BY id DESC LIMIT 80) ORDER BY id',
        )
        .all() as { body: string }[]
    ).map((r) => JSON.parse(r.body));
  }
  close() {
    this.db.close();
  }
}

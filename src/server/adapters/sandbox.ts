import type { Store } from '../store.js';
import type { FundingRequest, TransferEvidence } from '../../shared/types.js';
import { decimal, units } from '../../shared/money.js';
export interface SandboxTransfer {
  request_id: string;
  created_at: string;
  recovered: boolean;
  credited: boolean;
  evidence: TransferEvidence;
}

// A persistent simulator, deliberately incapable of signing or broadcasting on a chain.
// Inserts share the orchestrator's transaction; request_id is unique across restarts.
export class SandboxRail {
  constructor(private store: Store) {}
  get(id: string): SandboxTransfer | undefined {
    const row = this.store.db.prepare('SELECT body FROM transfers WHERE request_id = ?').get(id) as
      { body: string } | undefined;
    return row ? JSON.parse(row.body) : undefined;
  }
  submit(request: FundingRequest, now: string) {
    const existing = this.get(request.id);
    if (existing) return existing;
    const transfer: SandboxTransfer = {
      request_id: request.id,
      created_at: now,
      recovered: false,
      credited: false,
      evidence: {
        source_tx_hash: `sim:source:${request.id}`,
        message_id: `sim:message:${request.id}`,
        simulated: true,
      },
    };
    this.store.db
      .prepare('INSERT INTO transfers VALUES (?, ?)')
      .run(request.id, JSON.stringify(transfer));
    return transfer;
  }
  save(transfer: SandboxTransfer) {
    this.store.db
      .prepare('UPDATE transfers SET body = ? WHERE request_id = ?')
      .run(JSON.stringify(transfer), transfer.request_id);
  }
  receipt(request: FundingRequest, transfer: SandboxTransfer, now: string): TransferEvidence {
    const expected = units(request.calculation.required_top_up);
    return {
      ...transfer.evidence,
      destination_tx_hash: `sim:stellar:${request.id}`,
      receipt_id: `sim:receipt:${request.id}`,
      destination_account: request.destination.address,
      destination_asset: request.destination.asset,
      destination_issuer: request.destination.issuer,
      observed_amount: decimal(request.scenario === 'mismatch' ? expected / 2n : expected),
      received_at: now,
    };
  }
}

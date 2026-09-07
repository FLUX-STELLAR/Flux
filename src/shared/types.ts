export type FundingStatus =
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'SOURCE_SUBMITTED'
  | 'SOURCE_CONFIRMED'
  | 'IN_TRANSIT'
  | 'STELLAR_RECEIVED'
  | 'RECONCILED'
  | 'ATTENTION_REQUIRED'
  | 'NO_FUNDING_REQUIRED'
  | 'CANCELLED'
  | 'EXPIRED';
export type Scenario = 'success' | 'delayed' | 'mismatch';
export interface Policy {
  version: number;
  minimum_reserve: string;
  max_single_funding: string;
  daily_funding_cap: string;
  request_expiry_minutes: number;
  minimum_lead_time_minutes: number;
  delivery_timeout_seconds: number;
  paused: boolean;
}
export interface Account {
  id: string;
  name: string;
  address: string;
  asset: string;
  issuer: string;
  balance: string;
  observed_at: string;
}
export interface Treasury {
  id: string;
  name: string;
  address: string;
  chain: string;
  asset: string;
  balance: string;
}
export interface CreateFunding {
  partner_batch_id: string;
  label: string;
  required_liquidity: string;
  scheduled_at: string;
  settlement_account_id: string;
  source_treasury_id: string;
  asset: string;
  idempotency_key: string;
  scenario?: Scenario;
}
export interface TransferEvidence {
  source_tx_hash: string;
  message_id: string;
  destination_tx_hash?: string;
  receipt_id?: string;
  destination_account?: string;
  destination_asset?: string;
  destination_issuer?: string;
  observed_amount?: string;
  received_at?: string;
  simulated: true;
}
export interface FundingRequest extends CreateFunding {
  id: string;
  status: FundingStatus;
  created_at: string;
  updated_at: string;
  expires_at: string;
  intent_hash: string;
  policy_snapshot: Policy;
  calculation: {
    available_balance: string;
    allocated_to_other_batches: string;
    minimum_reserve: string;
    batch_need: string;
    required_top_up: string;
  };
  source: Treasury;
  destination: Pick<Account, 'id' | 'address' | 'asset' | 'issuer'>;
  allocation: string;
  approval?: { actor: string; timestamp: string; intent_hash: string };
  submitted_at?: string;
  reconciled_at?: string;
  payout_status: 'HELD' | 'READY' | 'PAID' | 'CANCELLED';
  evidence?: TransferEvidence;
  issue?: string;
  mode: 'sandbox';
}
export interface AuditEvent {
  id: string;
  request_id: string | null;
  actor: string;
  action: string;
  timestamp: string;
  details: Record<string, unknown>;
  previous_hash: string;
  hash: string;
}
export interface OutboxEvent {
  id: string;
  event_type: string;
  request_id: string;
  payload: Record<string, unknown>;
  created_at: string;
  attempts: number;
  delivered_at: string | null;
  next_attempt_at: string;
  last_error: string | null;
}
export interface BalancePoint {
  timestamp: string;
  balance: string;
  reason: string;
}
export interface Overview {
  mode: 'sandbox';
  operator: string;
  account: Account;
  treasury: Treasury;
  policy: Policy;
  requests: FundingRequest[];
  events: AuditEvent[];
  history: BalancePoint[];
  metrics: {
    routed_volume: string;
    reconciled_count: number;
    pending_amount: string;
    approval_count: number;
    attention_count: number;
    allocated_balance: string;
    daily_committed: string;
    ready_batches: number;
    average_lead_time_seconds: number | null;
  };
}

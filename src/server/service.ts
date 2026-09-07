import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type {
  Account,
  CreateFunding,
  FundingRequest,
  FundingStatus,
  Overview,
  Policy,
  TransferEvidence,
  Treasury,
} from '../shared/types.js';
import { decimal, max, min, shortfall, units } from '../shared/money.js';
import { Store, digest } from './store.js';
import { SandboxRail } from './adapters/sandbox.js';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}
const amount = z.string().refine((v) => {
  try {
    return units(v) >= 0n;
  } catch {
    return false;
  }
}, 'Use a decimal amount with up to 7 places.');
export const createSchema = z
  .object({
    partner_batch_id: z.string().trim().min(1).max(100),
    label: z.string().trim().min(1).max(100),
    required_liquidity: amount.refine(
      (v) => units(v) > 0n,
      'Batch amount must be greater than zero.',
    ),
    scheduled_at: z.string().datetime({ offset: true }),
    settlement_account_id: z.literal('stellar_ops_01'),
    source_treasury_id: z.literal('evm_treasury_01'),
    asset: z.literal('USDT0'),
    idempotency_key: z.string().min(8).max(150),
    scenario: z.enum(['success', 'delayed', 'mismatch']).default('success'),
  })
  .strict();
export const policySchema = z
  .object({
    minimum_reserve: amount,
    max_single_funding: amount.refine((v) => units(v) > 0n),
    daily_funding_cap: amount.refine((v) => units(v) > 0n),
    request_expiry_minutes: z.number().int().min(1).max(1440),
    minimum_lead_time_minutes: z.number().int().min(0).max(1440),
    delivery_timeout_seconds: z.number().int().min(10).max(3600),
  })
  .strict()
  .refine(
    (p) => units(p.daily_funding_cap) >= units(p.max_single_funding),
    'Daily cap must be at least the single funding limit.',
  );
const released = new Set<FundingStatus>(['CANCELLED', 'EXPIRED']);
const pending = new Set<FundingStatus>([
  'AWAITING_APPROVAL',
  'APPROVED',
  'SOURCE_SUBMITTED',
  'SOURCE_CONFIRMED',
  'IN_TRANSIT',
  'STELLAR_RECEIVED',
  'ATTENTION_REQUIRED',
]);

export class FundingService {
  readonly rail: SandboxRail;
  constructor(
    readonly store: Store,
    readonly clock: () => Date = () => new Date(),
  ) {
    this.rail = new SandboxRail(store);
    if (!store.get('policy'))
      this.store.transaction(() => {
        const now = this.now();
        store.set('policy', {
          version: 1,
          minimum_reserve: '5000.0000000',
          max_single_funding: '25000.0000000',
          daily_funding_cap: '100000.0000000',
          request_expiry_minutes: 60,
          minimum_lead_time_minutes: 10,
          delivery_timeout_seconds: 20,
          paused: false,
        } satisfies Policy);
        store.set('account', {
          id: 'stellar_ops_01',
          name: 'Stellar settlement',
          address: 'sandbox:stellar:operator-01',
          asset: 'USDT0',
          issuer: 'sandbox:issuer:usdt0',
          balance: '5200.0000000',
          observed_at: now,
        } satisfies Account);
        store.set('treasury', {
          id: 'evm_treasury_01',
          name: 'EVM treasury',
          address: 'sandbox:evm:treasury-01',
          chain: 'EVM sandbox',
          asset: 'USDT0',
          balance: '125000.0000000',
        } satisfies Treasury);
        store.balance({
          timestamp: now,
          balance: '5200.0000000',
          reason: 'Sandbox opening balance',
        });
        store.audit(null, 'system', 'workspace.created', { mode: 'sandbox' }, now);
      });
  }
  now() {
    return this.clock().toISOString();
  }
  policy() {
    return this.store.get<Policy>('policy')!;
  }
  account() {
    return this.store.get<Account>('account')!;
  }
  treasury() {
    return this.store.get<Treasury>('treasury')!;
  }
  require(id: string) {
    const r = this.store.request(id);
    if (!r) throw new AppError('NOT_FOUND', 'Funding request not found.', 404);
    return r;
  }
  allocated(except?: string) {
    return this.store
      .requests()
      .filter(
        (r) =>
          r.id !== except &&
          !released.has(r.status) &&
          r.payout_status !== 'PAID' &&
          r.payout_status !== 'CANCELLED',
      )
      .reduce((sum, r) => sum + units(r.allocation), 0n);
  }
  dailyCommitted() {
    const today = this.now().slice(0, 10);
    // Unsubmitted reservations remain committed across UTC day boundaries.
    return this.store
      .requests()
      .filter(
        (r) =>
          !released.has(r.status) && (!r.submitted_at || r.submitted_at.slice(0, 10) === today),
      )
      .reduce((sum, r) => sum + units(r.calculation.required_top_up), 0n);
  }
  fresh() {
    const age = this.clock().getTime() - new Date(this.account().observed_at).getTime();
    if (age > 15_000 || age < -1000)
      throw new AppError(
        'STALE_BALANCE',
        'Settlement balance is stale. Wait for a fresh observation.',
        503,
      );
  }
  active() {
    if (this.policy().paused)
      throw new AppError(
        'FUNDING_PAUSED',
        'New funding is paused. Existing transfers continue to be observed.',
      );
  }
  record(r: FundingRequest, actor: string, action: string, details: Record<string, unknown> = {}) {
    r.updated_at = this.now();
    this.store.save(r);
    this.store.audit(r.id, actor, action, { status: r.status, ...details }, r.updated_at);
    this.store.emit(r, action, r.updated_at);
    return r;
  }
  create(input: CreateFunding, actor = 'operator:local'): FundingRequest {
    const data = createSchema.parse(input);
    data.required_liquidity = decimal(units(data.required_liquidity));
    data.scheduled_at = new Date(data.scheduled_at).toISOString();
    const payloadHash = digest(data);
    return this.store.transaction(() => {
      const duplicates = this.store.duplicate(data.partner_batch_id, data.idempotency_key);
      if (duplicates.length) {
        if (duplicates.length === 1 && duplicates[0].payload_hash === payloadHash)
          return this.require(duplicates[0].id);
        throw new AppError(
          'IDEMPOTENCY_CONFLICT',
          'This batch or idempotency key already exists with different parameters.',
        );
      }
      this.active();
      this.fresh();
      const policy = this.policy(),
        account = this.account(),
        now = this.now();
      if (
        Date.parse(data.scheduled_at) - this.clock().getTime() <
        policy.minimum_lead_time_minutes * 60_000
      )
        throw new AppError(
          'INSUFFICIENT_LEAD_TIME',
          `Schedule the payout at least ${policy.minimum_lead_time_minutes} minutes ahead.`,
          422,
        );
      const allocated = this.allocated();
      const topUp = shortfall(
        data.required_liquidity,
        policy.minimum_reserve,
        account.balance,
        decimal(allocated),
      );
      if (units(topUp) > units(policy.max_single_funding))
        throw new AppError(
          'TRANSFER_LIMIT',
          'Required funding exceeds the maximum single transfer.',
          422,
        );
      if (this.dailyCommitted() + units(topUp) > units(policy.daily_funding_cap))
        throw new AppError('DAILY_CAP', 'This request would exceed the daily funding cap.', 422);
      const outstanding = this.store
        .requests()
        .filter((r) => !r.submitted_at && !released.has(r.status))
        .reduce((n, r) => n + units(r.calculation.required_top_up), 0n);
      if (outstanding + units(topUp) > units(this.treasury().balance))
        throw new AppError(
          'SOURCE_BALANCE',
          'Source treasury cannot cover this request and existing reservations.',
          422,
        );
      const r: FundingRequest = {
        ...data,
        id: `fr_${randomUUID()}`,
        status: units(topUp) === 0n ? 'NO_FUNDING_REQUIRED' : 'AWAITING_APPROVAL',
        created_at: now,
        updated_at: now,
        expires_at: new Date(
          this.clock().getTime() + policy.request_expiry_minutes * 60_000,
        ).toISOString(),
        intent_hash: '',
        policy_snapshot: policy,
        calculation: {
          available_balance: account.balance,
          allocated_to_other_batches: decimal(allocated),
          minimum_reserve: policy.minimum_reserve,
          batch_need: data.required_liquidity,
          required_top_up: topUp,
        },
        source: this.treasury(),
        destination: {
          id: account.id,
          address: account.address,
          asset: account.asset,
          issuer: account.issuer,
        },
        allocation: decimal(
          min(
            units(data.required_liquidity),
            max(0n, units(account.balance) - units(policy.minimum_reserve) - allocated),
          ),
        ),
        payout_status: units(topUp) === 0n ? 'READY' : 'HELD',
        mode: 'sandbox',
      };
      r.intent_hash = digest({
        id: r.id,
        batch: r.partner_batch_id,
        need: r.required_liquidity,
        amount: topUp,
        source: r.source.address,
        destination: r.destination,
        expires_at: r.expires_at,
        policy,
      });
      this.store.insert(r, payloadHash);
      return this.record(
        r,
        actor,
        r.status === 'NO_FUNDING_REQUIRED' ? 'funding.not_required' : 'funding.created',
        { required_top_up: topUp, intent_hash: r.intent_hash },
      );
    });
  }
  approve(id: string, intentHash: string, actor = 'operator:local') {
    return this.store.transaction(() => {
      this.active();
      this.fresh();
      const r = this.require(id);
      if (r.intent_hash !== intentHash)
        throw new AppError('APPROVAL_MISMATCH', 'Approval must match the exact funding intent.');
      if (r.status === 'APPROVED') return r;
      if (r.status !== 'AWAITING_APPROVAL')
        throw new AppError('INVALID_STATE', 'Only requests awaiting approval can be approved.');
      if (Date.parse(r.expires_at) <= this.clock().getTime())
        throw new AppError('REQUEST_EXPIRED', 'This funding request has expired.');
      r.approval = { actor, timestamp: this.now(), intent_hash: intentHash };
      r.status = 'APPROVED';
      return this.record(r, actor, 'funding.approved', { intent_hash: intentHash });
    });
  }
  submit(id: string, actor = 'operator:local') {
    return this.store.transaction(() => {
      const r = this.require(id);
      if (r.submitted_at) return r; // Safe replay: never produces another economic transfer.
      this.active();
      this.fresh();
      if (r.status !== 'APPROVED' || r.approval?.intent_hash !== r.intent_hash)
        throw new AppError('APPROVAL_REQUIRED', 'Approve the exact intent before submitting.');
      if (Date.parse(r.expires_at) <= this.clock().getTime())
        throw new AppError('REQUEST_EXPIRED', 'This request has expired.');
      const account = this.account(),
        policy = this.policy(),
        treasury = this.treasury();
      if (
        account.address !== r.destination.address ||
        account.asset !== r.destination.asset ||
        account.issuer !== r.destination.issuer ||
        treasury.address !== r.source.address
      )
        throw new AppError(
          'DESTINATION_CHANGED',
          'Account configuration no longer matches the approved intent.',
        );
      const needed = shortfall(
        r.required_liquidity,
        policy.minimum_reserve,
        account.balance,
        decimal(this.allocated(r.id)),
      );
      if (units(needed) > units(r.calculation.required_top_up))
        throw new AppError(
          'RECALCULATION_REQUIRED',
          'Available liquidity changed. Cancel and create a new request for approval.',
        );
      if (
        units(r.calculation.required_top_up) > units(policy.max_single_funding) ||
        this.dailyCommitted() > units(policy.daily_funding_cap)
      )
        throw new AppError('POLICY_CHANGED', 'The current policy does not permit this transfer.');
      if (units(treasury.balance) < units(r.calculation.required_top_up))
        throw new AppError('SOURCE_BALANCE', 'Insufficient source treasury balance.');
      const transfer = this.rail.submit(r, this.now());
      treasury.balance = decimal(units(treasury.balance) - units(r.calculation.required_top_up));
      this.store.set('treasury', treasury);
      r.status = 'SOURCE_SUBMITTED';
      r.submitted_at = transfer.created_at;
      r.evidence = transfer.evidence;
      return this.record(r, actor, 'funding.source_submitted', {
        simulated: true,
        source_tx_hash: transfer.evidence.source_tx_hash,
      });
    });
  }
  cancel(id: string, actor = 'operator:local') {
    return this.store.transaction(() => {
      const r = this.require(id);
      if (r.status === 'CANCELLED') return r;
      if (r.submitted_at || r.payout_status === 'PAID' || r.status === 'EXPIRED')
        throw new AppError(
          'TRANSFER_ACTIVE',
          'A submitted transfer cannot be cancelled. Continue observation and reconciliation.',
        );
      r.status = 'CANCELLED';
      r.payout_status = 'CANCELLED';
      r.allocation = '0.0000000';
      return this.record(r, actor, 'funding.cancelled');
    });
  }
  attention(r: FundingRequest, issue: string) {
    if (r.status === 'ATTENTION_REQUIRED' && r.issue === issue) return;
    r.status = 'ATTENTION_REQUIRED';
    r.issue = issue;
    this.record(r, 'observer', 'funding.attention_required', { issue });
  }
  reconcile(r: FundingRequest, evidence: TransferEvidence) {
    if (
      evidence.source_tx_hash !== r.evidence?.source_tx_hash ||
      evidence.message_id !== r.evidence?.message_id ||
      evidence.receipt_id !== `sim:receipt:${r.id}` ||
      evidence.destination_account !== r.destination.address ||
      evidence.destination_asset !== r.destination.asset ||
      evidence.destination_issuer !== r.destination.issuer ||
      evidence.observed_amount !== r.calculation.required_top_up
    ) {
      this.attention(
        r,
        'Destination evidence does not match the approved asset, account, message and amount. No new transfer has been sent.',
      );
      return;
    }
    const consumed = this.store.db
      .prepare('SELECT request_id FROM consumed_receipts WHERE receipt_id = ?')
      .get(evidence.receipt_id) as { request_id: string } | undefined;
    if (consumed && consumed.request_id !== r.id)
      throw new AppError('RECEIPT_REUSED', 'Receipt already belongs to another request.');
    this.store.db
      .prepare('INSERT OR IGNORE INTO consumed_receipts VALUES (?, ?)')
      .run(evidence.receipt_id, r.id);
    r.evidence = evidence;
    r.status = 'RECONCILED';
    r.reconciled_at = this.now();
    r.payout_status = 'READY';
    r.allocation = r.required_liquidity;
    delete r.issue;
    this.record(r, 'observer', 'funding.reconciled', {
      receipt_id: evidence.receipt_id,
      observed_amount: evidence.observed_amount,
    });
  }
  observe(id: string) {
    return this.store.transaction(() => {
      const r = this.require(id),
        transfer = this.rail.get(id);
      if (!transfer || r.status === 'RECONCILED') return r;
      const elapsed = (this.clock().getTime() - Date.parse(transfer.created_at)) / 1000;
      if (r.status === 'SOURCE_SUBMITTED' && elapsed >= 2) {
        r.status = 'SOURCE_CONFIRMED';
        this.record(r, 'observer', 'funding.source_confirmed');
      }
      if (r.status === 'SOURCE_CONFIRMED' && elapsed >= 4) {
        r.status = 'IN_TRANSIT';
        this.record(r, 'observer', 'funding.in_transit');
      }
      const canDeliver = r.scenario !== 'delayed' || transfer.recovered;
      if (!canDeliver && elapsed >= r.policy_snapshot.delivery_timeout_seconds)
        this.attention(
          r,
          'Delivery is taking longer than expected. Source transfer exists; observation continues without resending funds.',
        );
      if (canDeliver && elapsed >= 7) {
        const receipt = transfer.evidence.receipt_id
          ? transfer.evidence
          : this.rail.receipt(r, transfer, this.now());
        if (!transfer.credited) {
          const account = this.account();
          account.balance = decimal(units(account.balance) + units(receipt.observed_amount!));
          account.observed_at = this.now();
          this.store.set('account', account);
          this.store.balance({ timestamp: this.now(), balance: account.balance, reason: r.label });
          // Quarantine an unreconciled receipt against this batch so another batch
          // cannot spend ambiguous incoming value. Successful reconciliation replaces it.
          r.allocation = decimal(units(r.allocation) + units(receipt.observed_amount!));
          transfer.credited = true;
          transfer.evidence = receipt;
          this.rail.save(transfer);
          r.evidence = receipt;
          r.status = 'STELLAR_RECEIVED';
          this.record(r, 'observer', 'funding.stellar_received');
        }
        this.reconcile(r, receipt);
      }
      return this.require(id);
    });
  }
  retryObservation(id: string, actor = 'operator:local') {
    this.store.transaction(() => {
      const r = this.require(id);
      if (!r.submitted_at)
        throw new AppError('NO_TRANSFER', 'No source transfer exists to observe.');
      this.store.audit(
        id,
        actor,
        'funding.observation_requested',
        { economic_retry: false },
        this.now(),
      );
    });
    return this.observe(id);
  }
  resolveSandboxDelay(id: string, actor = 'operator:local') {
    this.store.transaction(() => {
      const r = this.require(id),
        transfer = this.rail.get(id);
      if (r.scenario !== 'delayed' || !transfer || r.status !== 'ATTENTION_REQUIRED')
        throw new AppError(
          'INVALID_STATE',
          'Only a delayed sandbox transfer awaiting attention can be released.',
        );
      transfer.recovered = true;
      this.rail.save(transfer);
      this.store.audit(id, actor, 'sandbox.delivery_released', { new_transfer: false }, this.now());
    });
    return this.observe(id);
  }
  payout(id: string, actor = 'partner:sandbox') {
    return this.store.transaction(() => {
      const r = this.require(id);
      if (r.payout_status === 'PAID') return r;
      if (r.payout_status !== 'READY')
        throw new AppError(
          'FUNDING_NOT_READY',
          'Payout remains held until liquidity is reconciled.',
        );
      this.fresh();
      const account = this.account();
      if (
        units(account.balance) - units(r.required_liquidity) <
        units(this.policy().minimum_reserve) + this.allocated(r.id)
      )
        throw new AppError(
          'INSUFFICIENT_BALANCE',
          'Payout would consume another batch allocation or the operating reserve.',
        );
      account.balance = decimal(units(account.balance) - units(r.required_liquidity));
      account.observed_at = this.now();
      this.store.set('account', account);
      this.store.balance({
        timestamp: this.now(),
        balance: account.balance,
        reason: `Payout: ${r.label}`,
      });
      r.payout_status = 'PAID';
      r.allocation = '0.0000000';
      return this.record(r, actor, 'payout.completed', { simulated: true });
    });
  }
  tick() {
    this.store.transaction(() => {
      const account = this.account();
      account.observed_at = this.now();
      this.store.set('account', account);
      for (const r of this.store.requests())
        if (
          !r.submitted_at &&
          ['AWAITING_APPROVAL', 'APPROVED'].includes(r.status) &&
          Date.parse(r.expires_at) <= this.clock().getTime()
        ) {
          r.status = 'EXPIRED';
          r.payout_status = 'CANCELLED';
          r.allocation = '0.0000000';
          this.record(r, 'system', 'funding.expired');
        }
    });
    for (const r of this.store.requests())
      if (r.submitted_at && pending.has(r.status)) this.observe(r.id);
  }
  updatePolicy(input: unknown, actor = 'operator:local') {
    const data = policySchema.parse(input);
    return this.store.transaction(() => {
      if (units(data.daily_funding_cap) < this.dailyCommitted())
        throw new AppError(
          'ACTIVE_RESERVATIONS',
          'Daily cap cannot be lower than committed funding.',
        );
      const previous = this.policy();
      const next: Policy = { ...data, version: previous.version + 1, paused: previous.paused };
      this.store.set('policy', next);
      this.store.audit(null, actor, 'policy.updated', { previous, next }, this.now());
      return next;
    });
  }
  pause(paused: boolean, actor = 'operator:local') {
    return this.store.transaction(() => {
      const policy = this.policy();
      policy.paused = paused;
      this.store.set('policy', policy);
      this.store.audit(null, actor, paused ? 'funding.paused' : 'funding.resumed', {}, this.now());
      return policy;
    });
  }
  overview(): Overview {
    const requests = this.store.requests();
    const reconciled = requests.filter((r) => r.reconciled_at);
    return {
      mode: 'sandbox',
      operator: 'Acme Payments',
      account: this.account(),
      treasury: this.treasury(),
      policy: this.policy(),
      requests,
      events: this.store.events(30),
      history: this.store.history(),
      metrics: {
        routed_volume: decimal(
          reconciled.reduce((n, r) => n + units(r.calculation.required_top_up), 0n),
        ),
        reconciled_count: reconciled.length,
        pending_amount: decimal(
          requests
            .filter((r) => pending.has(r.status))
            .reduce((n, r) => n + units(r.calculation.required_top_up), 0n),
        ),
        approval_count: requests.filter((r) => r.status === 'AWAITING_APPROVAL').length,
        attention_count: requests.filter((r) => r.status === 'ATTENTION_REQUIRED').length,
        allocated_balance: decimal(this.allocated()),
        daily_committed: decimal(this.dailyCommitted()),
        ready_batches: requests.filter((r) => r.payout_status === 'READY').length,
        average_lead_time_seconds: reconciled.length
          ? reconciled.reduce(
              (n, r) => n + (Date.parse(r.reconciled_at!) - Date.parse(r.created_at)) / 1000,
              0,
            ) / reconciled.length
          : null,
      },
    };
  }
  seed() {
    if (this.store.get('seeded')) return;
    const samples = [
      ['Contractor payroll', 'payroll-sep-001', '18430'],
      ['Supplier disbursement', 'supplier-sep-001', '8450'],
      ['Marketplace payouts', 'marketplace-sep-001', '6200'],
    ];
    for (const [label, batch, value] of samples) {
      if (this.store.requests().some((r) => r.partner_batch_id === batch)) continue;
      this.create(
        {
          label,
          partner_batch_id: batch,
          required_liquidity: value,
          scheduled_at: new Date(this.clock().getTime() + 86_400_000).toISOString(),
          settlement_account_id: 'stellar_ops_01',
          source_treasury_id: 'evm_treasury_01',
          asset: 'USDT0',
          idempotency_key: `seed-${batch}`,
        },
        'sandbox:sample',
      );
    }
    this.store.set('seeded', true);
  }
}

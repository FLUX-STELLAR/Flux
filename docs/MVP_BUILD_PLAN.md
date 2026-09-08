# Flux MVP — Build plan

Source: PRD v1.3 (6 September 2026) and the PRD review report (`FLUX_PRD_INCELEME_RAPORU.md`).

This document records the delivered v1.3 sandbox work and the first read-only slice of the [v1.4 Liquidity Planner](PRODUCT_DIRECTION.md). The planner is a local preview over mock obligations and current sandbox balances; it does not create funding intents or submit transfers. Multiple live routes and autonomous submission are outside this increment's scope.

## First working delivery

A working application in which one operator creates a payout batch, calculates the shortfall, approves the amount, tracks funding status and exports reconciliation evidence. The first delivery uses a clearly labeled local sandbox: it produces no external network transactions or real fund movements. Network, wallet and operator decisions required for the live pilot are not presented as completed within the delivered product.

## Code structure

- `shared`: API contracts, monetary precision and status types. Shared by the frontend and backend.
- `backend/src`: HTTP API, SQLite persistence, funding/policy service, worker, adapters and webhook outbox.
- `backend/src/sdk`: limited partner client and webhook verification.
- `frontend/src`: React/TypeScript operator application.
- `backend/tests` and `frontend/tests`: monetary safety, API access, resilience and user journeys.
- `docs`: architecture decisions, API/recovery and live pilot gates.

React + Vite, Node 24 + Express + TypeScript. SQLite WAL/FULL for a single local process; amounts are transported as decimal strings and calculated with BigInt. The worker and API share the same database; critical operations use `BEGIN IMMEDIATE`. PostgreSQL/migrations and an operator identity provider will be evaluated separately for a live service running multiple instances.

## Implementation order

1. Project tooling, types, documentation and run commands.
2. Exact monetary arithmetic; minimum reserve, per-transfer/daily limits, timing and freshness rules.
3. Persistent requests, idempotency, payout balance allocations, approval, cancellation and hash-linked audit records.
4. A sandbox adapter that guarantees a single economic submission; persistent transfer/observation records; delays, partial receipts and recovery.
5. Authorized API, transactional webhook outbox and a limited TypeScript client.
6. Operator panel: overview, funding queue, new payout batch, details/approval/evidence, policy, audit and integration.
7. Critical failure tests, API tests, browser end-to-end checks and a production build.
8. Operations/recovery documentation and an up-to-date acceptance criteria matrix.

## Initial implementation decisions

- All positive funding amounts require manual approval. Approval is bound to the request's immutable hash.
- Hard limits cannot be overridden through additional approval; a policy change is a separate, recorded operation.
- Amounts are stored with seven decimal places for Stellar; sandbox USDT0 transfer amounts are rounded up to six decimal places. Actual route fees/quotes must be applied separately.
- Allocations for pending payout batches in the same account are included. Pending incoming funds are not added to another batch's available balance.
- Reusing a batch ID or idempotency key with different content returns 409.
- Balance is reassessed before signing/submission. If additional funding is needed, the existing approval is not silently changed.
- Source submission and external observation are separate. Only observation is retried after a delay.
- Zero funding is `NO_FUNDING_REQUIRED`; rejected/expired requests have separate terminal outcomes.
- Reconciliation requires matching the source/message/receipt/asset/account/amount and unique receipt consumption.
- The liquidity-ready signal and payout success are separate; the existing payout engine owns payout status.
- API, audit and webhook events are written in the same database transaction; delivery is at least once.
- Local access is restricted to loopback, with a clear sandbox label. Remote deployment and mainnet are not enabled by default.

## Outstanding live pilot gates

- A real operator, asset issuer/SAC, source network/token address, destination account and evidence of a supported route.
- An operator-controlled source wallet / multisig; independent verification of transaction details in the wallet.
- Real Stellar observation, source finality and LayerZero GUID or CCTP attestation verification.
- RPC/fees/quotes, trustlines, XLM reserve, precision and receipt discrepancy policy.
- Production identity provider, MFA, role separation, key management and independent security review.
- Real SDP/partner access; a contract for starting payouts when funding is ready.
- Pilot baseline, SLA, risk limit, permission to publish data and SCF evidence.

These gates do not block building the local application. They must be passed before real funds move.

## Initial delivery status — 7 September 2026

Local sandbox tasks 1–8 are implemented, together with the read-only Liquidity Planner preview. The API, persistent database, exact-amount calculations, manual approval, limits, allocations, recovery, audit/outbox, partner client, planner preview, operator panel and tests are present. Real network/wallet/SDP integrations remain outstanding gates; test results and scope are tracked in `docs/ACCEPTANCE.md`.

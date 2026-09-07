# API and operations

Base: `http://127.0.0.1:4337/api/v1`. JSON bodies. Partner calls require `Authorization: Bearer <FLUX_API_TOKEN>`. Operator-only routes require the local browser session. No user-supplied actor identity is trusted for approvals.

| Method    | Endpoint                                      | Access / behavior                                      |
| --------- | --------------------------------------------- | ------------------------------------------------------ |
| GET       | `/overview`                                   | Balances, requests, history and actual sandbox metrics |
| POST      | `/funding-requests`                           | Idempotent batch ingestion                             |
| GET       | `/funding-requests`                           | Local workspace requests                               |
| GET       | `/funding-requests/:id`                       | Current persisted state                                |
| POST      | `/funding-requests/:id/approve`               | Operator; `{ "intent_hash": "..." }`                   |
| POST      | `/funding-requests/:id/submit`                | Operator; approved sandbox transfer only               |
| POST      | `/funding-requests/:id/cancel`                | Operator; no active economic transfer                  |
| POST      | `/funding-requests/:id/retry-observation`     | Observe original transfer, never resend                |
| GET       | `/funding-requests/:id/evidence`              | Download request, evidence and audit JSON              |
| GET       | `/funding-requests/:id/events`                | Full per-request audit                                 |
| POST      | `/integrations/:partner/events`               | Same batch-ingestion contract                          |
| GET       | `/settlement-accounts/stellar_ops_01/balance` | Balance with observation timestamp                     |
| GET       | `/operators/operator_01/metrics`              | Sandbox metrics                                        |
| GET / PUT | `/policy`                                     | Read / operator policy update                          |
| POST      | `/pause`                                      | Operator; `{ "paused": true }`                         |
| GET       | `/audit-events`                               | Most recent 500 events                                 |
| GET       | `/integrations`                               | Outbox and callback configuration status               |
| POST      | `/sandbox/:id/release-delay`                  | Operator; release original delayed simulation          |
| POST      | `/sandbox/:id/payout`                         | Operator; simulate partner payout, only if ready       |

Create body:

```json
{
  "partner_batch_id": "payroll-sep-002",
  "label": "September payroll",
  "required_liquidity": "18430.00",
  "scheduled_at": "2026-09-10T14:00:00Z",
  "settlement_account_id": "stellar_ops_01",
  "source_treasury_id": "evm_treasury_01",
  "asset": "USDT0",
  "idempotency_key": "payroll-sep-002-v1",
  "scenario": "success"
}
```

Use a future scheduled time. Optional scenario: `success`, `delayed`, `mismatch`. A retry with the same normalized payload returns the same request. Reusing a batch ID or key with changed content returns 409. Creating new batch IDs to retry ambiguous transfers is not an allowed operational recovery method.

Errors: `{ "error": { "code": "DAILY_CAP", "message": "..." } }`. HTTP 401 authentication, 403 permission/origin/host, 404 missing entity, 409 state/idempotency conflict, 422 invalid input/policy, 503 stale observation.

## Webhooks

Set HTTPS `FLUX_WEBHOOK_URL` and a shared `FLUX_WEBHOOK_SECRET` in `.env`, then restart. Keep the endpoint operator-controlled; it is server configuration, not a public callback input. No remote delivery occurs unless a URL is configured. Unconfigured events remain in the outbox.

Headers:

- `X-Flux-Event-Id`: stable event ID across retries.
- `X-Flux-Timestamp`: Unix seconds for this delivery attempt.
- `X-Flux-Signature`: hex HMAC-SHA256 of `${timestamp}.${rawBody}`.

Use `backend/src/sdk/webhooks.ts` to verify the exact raw payload and a five-minute timestamp window, then persist deduplication of event IDs. Timestamp verification alone does not deduplicate deliveries. Retries use exponential backoff capped at one hour; any 2xx response acknowledges delivery. Redirects are refused. Permanent endpoint errors remain visible and retryable; this first slice has no dead-letter UI.

## Recovery

**Delayed transfer:** inspect source evidence and ATTENTION_REQUIRED. Retry observation. In sandbox only, use Release sandbox delay to deliver the existing simulated message. Do not create another funding request for the same batch.

**Partial/mismatched receipt:** payout remains held; observed incoming amount is quarantined in the request allocation. Export evidence and investigate. There is intentionally no manual “success” toggle. A real protocol recovery/evidence-resolution workflow remains a live-pilot deliverable.

**Expired request:** no submitted transaction exists; reservations release automatically. A new business attempt should use a distinct batch revision/identifier after the previous attempt's cancellation/expiry is confirmed. The original record remains immutable and auditable.

**Balance/policy changed before submission:** cancel the unsubmitted request and create a new explicitly versioned business attempt. Never modify an approved amount in place.

**Worker/server restart:** use the same DB path. Startup resumes observation from persisted source transfers. The simulator's unique transfer key prevents additional debits. Browser session is renewed on reload; funding state remains intact.

**Emergency pause:** blocks create/approve/submit. It does not stop observation or cancel already submitted value. An operator may still simulate a previously funded payout; pause applies to funding, not partner business execution.

**Backup:** stop the local server, copy the SQLite file together with any remaining WAL/SHM files to a private backup directory, then restart. Never copy only a live SQLite main file while ignoring WAL. A production online backup/restore drill is still required.

**Fresh empty sandbox:** stop the server, choose a new `FLUX_DB_PATH` and set `FLUX_SEED=false`. Preserve the previous database for evidence instead of deleting it.

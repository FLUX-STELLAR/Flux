# Flux

Policy-controlled settlement liquidity for Stellar payment operators.

**Current delivery: a working local sandbox MVP.** Create payout batches, calculate shortfalls, approve exact intents, run simulated funding, reconcile receipts, recover delayed deliveries and export an audit trail. The application has a real API and persistent database. The transport and payout adapters are explicitly simulated; no private key, live bridge transfer or real payout is used.

## Run

Requires Node.js 24+ and npm.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:4337**. The development server also serves the React application. On first launch it creates `data/flux.sqlite` and three clearly sandboxed sample funding requests. State persists across restarts. To start an empty separate workspace, set `FLUX_SEED=false` and a new `FLUX_DB_PATH`.

Production asset build, still in local sandbox mode:

```sh
npm run build
npm start
```

`npm start` and `npm run dev` use the same port by default; stop one before starting the other. The build does not enable real transfers. `FLUX_MODE` values other than `sandbox` are rejected.

## Try the workflow

1. Open **Contractor payroll**, review the $18,230 funding need and select the approval checkbox.
2. **Approve funding**, then **Run sandbox transfer**. Approval and submission are separate recorded actions.
3. Observe source submission, confirmation, transport and Stellar receipt. Reconciliation normally completes in about 7–9 seconds in this simulator.
4. **Export evidence** to get the request, policy snapshot, source/message/receipt and audit records.
5. **Simulate payout** to exercise the partner-side payout and retained reserve.
6. Create a request with **Delayed delivery** to test attention handling. After the timeout, **Retry observation** never resends funds; **Release sandbox delay** delivers the original simulated transfer.
7. Create **Amount mismatch** to observe a held payout and quarantined partial receipt. The simulator intentionally does not offer an unsafe “mark successful” override.

Sample requests expire after their approval window. If a sample is already expired, use **New funding request** with a fresh batch ID; old records are preserved for audit.

Treasury policy changes and the emergency pause work from the UI. Search/status filters, activity history, JSON reports and webhook outbox are connected to persisted state. All volume and balance metrics describe this workspace's simulated activity; no pilot traction or capital-efficiency percentage is fabricated.

## Structure

```text
backend/src/          Express API, SQLite store, funding service and worker
backend/src/adapters/ Persistent sandbox transfer adapter
backend/src/shared/   Shared API types and exact monetary arithmetic
backend/src/sdk/      Partner API client and webhook verifier
backend/tests/        Core, API and runtime safety tests
frontend/src/         React operations workspace
frontend/tests/       Browser journeys
frontend/index.html   Vite entry point and app shell
docs/                 Build plan, decisions, API and pilot-readiness matrix
```

## Checks

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Browser tests use locally installed Google Chrome (`channel: chrome`) and an isolated temporary SQLite database on port 4328. `test-results/` contains desktop/mobile screenshots and failure traces. The core/API suite covers exact arithmetic, hard caps, stale balances, idempotency, approvals, expiry, concurrent allocation, pause, delayed/partial delivery, audit rollback and restart recovery.

## Configuration

Optional `.env` is loaded at startup; copy the shape from `.env.example`. Environment variables take precedence. Do not commit secrets.

| Variable              | Default / purpose                                         |
| --------------------- | --------------------------------------------------------- |
| `PORT`                | `4337` — API and UI, loopback only                        |
| `FLUX_DB_PATH`        | `data/flux.sqlite`                                        |
| `FLUX_MODE`           | `sandbox`; all other modes are rejected                   |
| `FLUX_SEED`           | Set `false` to omit initial sample requests               |
| `FLUX_API_TOKEN`      | Optional 32+ character partner bearer token               |
| `FLUX_WEBHOOK_SECRET` | Optional 32+ character HMAC secret shared with receiver   |
| `FLUX_WEBHOOK_URL`    | Optional operator-configured HTTPS callback; no redirects |

Without explicit secrets, local API/webhook secrets are randomly generated and persisted in the database. They are not printed in logs or exposed through the UI. For integration testing, set known secrets in `.env` and restart. Browser operator sessions use a separate HttpOnly/SameSite cookie and an in-memory session header for embedded editor previews that block cookies; the partner API token cannot approve, submit, cancel, edit policy or operate sandbox payout controls.

The local session bootstrap trusts local access. It is **not** a production login/MFA system. Host/origin checks and loopback binding intentionally prevent this delivery from being used as an unauthenticated remote treasury service.

## Documentation

- [MVP build plan](docs/MVP_BUILD_PLAN.md)
- [Implementation decisions](docs/ARCHITECTURE.md)
- [API and recovery runbook](docs/API_AND_OPERATIONS.md)
- [Acceptance and live pilot gates](docs/ACCEPTANCE.md)
- [PRD review in Turkish](FLUX_PRD_INCELEME_RAPORU.md)

The original PRD remains unchanged. Live operator onboarding, actual wallet signing, verified LayerZero/USDT0 or CCTP transport, real Stellar observation and SDP integration are outstanding pilot milestones; the sandbox does not claim those integrations are complete.

# MVP delivery status

This matrix distinguishes the implemented local sandbox from live-pilot readiness. A successful simulation is not a public transaction proof.

## Validation — 7 September 2026

- `npm test`: 20/20 passing core, API and runtime safety tests.
- `npm run test:e2e`: 5/5 passing Chrome journeys: editor iframe with cookies unavailable, exact sub-cent approval, complete funding/payout, delayed recovery and mobile operations.
- `npm run build`: TypeScript validation and Vite asset build pass.
- `npm run format:check`: passes.
- `npm audit --omit=dev`: no known production dependency vulnerabilities at verification time.
- Desktop/mobile screenshots: `test-results/flux-desktop.png` and `test-results/flux-mobile.png`.
- Local default port is 4337, chosen to avoid another service already using 4317. Startup now fails explicitly if the selected port is occupied.

| PRD requirement                           | Current evidence                                                                                            | Live gap                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| AC-01 at most one active economic request | Unique batch/idempotency constraints, payload conflict handling, persisted unique simulated transfer, tests | External wallet nonce/broadcast recovery                    |
| AC-02 fresh balance / immutable policy    | 15s freshness, BigInt arithmetic, policy snapshot, allocations, tests                                       | Live account/indexer observations                           |
| AC-03 approval and policy                 | Mandatory exact-intent operator approval, hard cap rejection, pre-submit recheck                            | Actual operator identity/MFA and independent signing policy |
| AC-04 no treasury private key storage     | No key ingestion, custody, signer or live transaction code                                                  | Review chosen wallet/multisig integration                   |
| AC-05 end-to-end evidence                 | Simulated request→source→message→receipt correlation                                                        | Official supported route, chain proofs                      |
| AC-06 account/asset/amount reconciliation | Exact simulated identity/amount binding, receipt uniqueness, quarantine                                     | Protocol-specific onchain evidence and fee/variance policy  |
| AC-07 safe ambiguous delivery             | Attention state, no economic retry, original delayed delivery recovery, tests                               | Real protocol-safe recovery procedures                      |
| AC-08 audit                               | Hash-linked append-only audit, transaction rollback tests                                                   | External durability, admin controls and retention policy    |
| AC-09 hold/release payout                 | READY only after reconciliation/zero need, simulated payout guard, outbox                                   | Actual SDP/partner lifecycle integration                    |
| AC-10 metrics/dashboard                   | Persisted sandbox volume, balance history, funding duration, request status                                 | Real baseline and comparable pilot savings/SLA measurements |
| AC-11 directly usable settlement asset    | Candidate USDT0 labels only                                                                                 | Operator asset selection and complete receivability proof   |
| AC-12 SCF outcome definition              | PRD and build plan identify required gates                                                                  | Real threshold, addresses, permissions, measurement window  |

## Implemented screens

Overview; searchable/status-filtered funding requests; request creation with live shortfall preview; exact-intent approval; persisted lifecycle and evidence export; policy editing; emergency pause; audit export; API integration example; webhook outbox; responsive mobile navigation; empty/error/loading states.

## Intentionally outstanding

- Real EVM token/allowance/gas/quote handling and operator-controlled wallet/multisig signing.
- LayerZero/USDT0 or CCTP source→Stellar adapter and reliable identifier/receipt verification.
- Real Stellar trustline, issuer, account capability and balance freshness checks.
- Production authentication/MFA, multi-operator isolation, deploy hardening and independent review.
- Actual SDP or pilot partner access; authenticated payout lifecycle acknowledgement.
- Hosted deployment, production SLA/RPO/RTO validation, backup drills and monitoring integrations.
- Historical operator data, shadow/assisted pilot, pricing and measured capital-efficiency outcome.

The next implementation milestone is the operator-selected live testnet route and wallet integration. It must preserve the core's idempotency, manual approval, immutable amount, conservative allocations and receipt correlation invariants.

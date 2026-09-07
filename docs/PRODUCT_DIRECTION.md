# Flux — Product direction and v1.4 proposal

Date: 7 September 2026. Status: a working proposal in response to the product critique shared by the user. This is not a final PRD replacing the separately maintained PRD v1.3. The planning capabilities below are not yet implemented; the current product runs as a local sandbox.

## 1. Proposed product decision

**Flux should be developed as a treasury control layer for Stellar payment operators, turning upcoming payout obligations into scheduled, policy-controlled funding plans and reconciling funding back to the batches it serves.**

Proposed one-sentence description for external communication:

> Flux is building the treasury control plane for Stellar payment operators, turning upcoming payout obligations into policy-controlled liquidity plans and reconciling funding back to the batches it serves.

The initial differentiator is **evaluating payout timing and shared liquidity allocations across multiple batches together**. The first live pilot remains limited to one operator, one source treasury, one payout asset, one validated route and one Stellar settlement account. A second route is added after the operator need is demonstrated.

This positioning is a product hypothesis. A broader architecture or more integrations alone does not prove that customers need a separate product.

## 2. What we accept and revise from the critique

| Topic                                                                        | Assessment and product decision                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Automatic top-ups alone provide weak differentiation                         | Agreed. The value proposition to validate is explaining the operator's next funding decision, showing deadline risk and closing the batch accounting loop.                                                                                                             |
| A simple shortfall formula makes the product worthless                       | Disagreed. A simple, auditable calculation is an appropriate primitive. The missing capability is planning multiple obligations over time; making the formula more complex is not the goal.                                                                            |
| Unified supply eliminates treasury needs                                     | An asset on the source network is not usable balance in the destination settlement account. Treasury decisions and transport remain separate responsibilities.                                                                                                         |
| Multiple rails are needed immediately                                        | Not yet demonstrated. Preserve the adapter boundary; the first planner should demonstrate value with one validated route.                                                                                                                                              |
| USDT0/LayerZero and USDC/CCTP are automatically interchangeable alternatives | The payout asset's identity is decisive. Receiving USDT0 cannot make a USDC obligation ready. Asset conversion introduces separate pricing, liquidity, authorization and reconciliation problems; it is outside the initial scope.                                     |
| We can guarantee exactly-once settlement                                     | This will not be used as a general end-to-end guarantee. Preventing a new economic transfer when a submission is ambiguous, durable transaction identity and receipt deduplication are concrete control requirements. The payout partner's operation remains separate. |
| A broader scope justifies a USD 75,000 grant                                 | Budget and eligibility must be justified by the work scope and evidence of usage. Adding features is not evidence supporting funding.                                                                                                                                  |

Current Stellar documentation describes programmatic OFT transfers for USDT0, destination asset identity and transfer timing that depends on source finality and DVN verification. The “30 seconds–3 minutes” range in the shared critique will not become a Flux SLA or a planner constant. [Stellar USDT0 documentation](https://developers.stellar.org/docs/tokens/usdt0-layerzero)

CCTP provides a transport path for native USDC on Stellar. This does not mean it delivers the same payout asset as USDT0. Route eligibility is evaluated first by asset and account compatibility. [Stellar CCTP documentation](https://developers.stellar.org/docs/tokens/cross-chain-transfers)

## 3. What is added to the existing foundation?

The existing `FundingRequest` carries the batch identity and `scheduled_at` time; `FundingService` accounts for other batch allocations, the minimum reserve and the minimum lead time. Exact-intent approval, idempotency, observation-only recovery after delays, receipt checks and audit/outbox records are implemented. Their external financial operations are simulated.

The missing component is a planner that considers future batches together before a funding request is created, produces a balance projection over time and stores versioned decision rationale.

```mermaid
flowchart LR
    O[Upcoming obligations] --> P[Liquidity horizon and allocations]
    P --> L[Versioned funding plan]
    L --> A[Policy and exact-intent approval]
    A --> F[Existing funding lifecycle]
    F --> R[Verified receipt and reconciliation]
    R --> B[Batch liquidity readiness]
```

The planning proposal, approval and actual execution are separate records. Creating a plan does not automatically send funds.

## 4. Initial target customer and validation

Target: an operator making recurring batch payments from the same Stellar account, holding at least part of its treasury on another supported network and coordinating funding decisions manually. The first use case will be selected from payroll, remittance or merchant payouts based on actual access; all three segments will not be targeted at once.

This document does not claim a validated operator, a committed pilot or access to SDP data.

Proposed initial research output: three operator interviews, with at least one providing a week of anonymized batch schedules, balances and funding records. This is a working target, not market evidence.

The interviews should answer:

- Which exact asset must be available, in which account, and by what time for the payout?
- When is the batch amount finalized, and how are changes, cancellations and partial payouts reported?
- How long do approvals take, how often is funding needed, what reserve is held and how much manual reconciliation is required?
- What caused the most recent delay: funding, approval, transport, recipient readiness or the payout system?
- Which decision cannot be made by the current script or operating process? Is there willingness to pay for or pilot Flux's proposal?

**Decision to proceed:** demonstrate a recurring decision, allocation or evidence problem using sample records, together with an operator willing to try the product. If the problem is only an occasional manual transfer, reassess the product as a narrower integration tool rather than expanding it.

## 5. Next deliverable: Liquidity Planner sandbox

The existing application pages and funding flow are preserved. The proposed new `Liquidity plan` screen is added as a separate navigation item; it does not yet exist in the current UI or API.

| Component              | Initial delivery scope                                                                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Obligation ingestion   | Manual entry or validated file/API input; partner ID, revision, full asset identity, account, remaining payout amount, deadline and status. SDP integration is not presented as complete. |
| Time view              | A 1/6/24-hour view of batches in the same account. Deterministic projections from known obligations; no ML demand forecasting.                                                            |
| Balance and allocation | Observation time, protected reserve, existing batch allocations, expected incoming funds and usable funds are shown separately.                                                           |
| Planning               | Deadline order; eligibility of the fixed route; funding need; suggested submission time; latest start time; explanation of an infeasible plan.                                            |
| Explainability         | Data versions, calculation, route assumption, policy and human-readable rationale for each decision.                                                                                      |
| Plan versions          | A new plan version when the amount, timing, policy or balance changes; the previous proposal is retained. Old approval is not transferred to a new economic intent.                       |
| Execution              | Initially a recommendation/preview only. A later stage connects the approved plan to the existing sandbox funding flow.                                                                   |
| Status                 | Proposed labels: covered, funding needed, at risk, blocked. These are distinct from existing `FundingStatus` values.                                                                      |

The initial plan may cover multiple batches; **each funding intent remains linked to one batch**. Allocating one transfer across many batches, splitting one batch across multiple routes and solving for the cheapest combination are deferred. This allows controlled progress on the existing one-to-one relationship.

### Time and money model

Calculations are separated by full asset identity and settlement account. An example projection for each deadline:

```text
projected_balance(t)
  = confirmed_balance_at_snapshot
  + modeled_future_net_receipts_due_by(t)
  - remaining_obligation_payouts_due_by(t)
  - other_committed_outflows_due_by(t)

constraint: projected_balance(t) >= minimum_reserve(t)

latest_start
  = liquidity_ready_deadline
  - approval_and_signing_budget
  - route_delivery_budget
  - reconciliation_budget
  - safety_buffer
```

`modeled_future_net_receipts` is a scenario assumption covering proposed/pending funding; it is not realized balance. If source submission is ambiguous, that assumption is removed from the normal scenario and tracked in the risk view. Funds not yet received are never added to the payout-ready calculation. If a received receipt is already included in the snapshot balance, it is not counted again as an inflow.

Existing batch allocations are linked to the corresponding obligation. The same obligation is not counted twice as both a remaining payout and an additional reserve deduction. Existing commitments outside the horizon constrain available funds; if a batch mapping is unknown, the plan cannot be executed.

The route budget is explicitly a scenario parameter in the initial sandbox. In live operation, it is determined by the measured distribution for the selected path and the operator's risk preference; a measure such as p95 is not a delivery guarantee. If `latest_start` has passed, the system does not invent a successful plan; it shows deadline risk and blocks execution according to policy.

### Demonstration example

Assumptions: the same account and asset, an opening balance of 35,000, a minimum reserve of 10,000, and no other allocations, inflows or fees. Each top-up arrives on time. These are synthetic demo data.

| Batch time |  Payout | Additional net funding needed beforehand | Balance after payout |
| ---------- | ------: | ---------------------------------------: | -------------------: |
| 09:00      |  80,000 |                                   55,000 |               10,000 |
| 11:30      |  40,000 |                                   40,000 |               10,000 |
| 15:00      | 100,000 |                                  100,000 |               10,000 |

Total additional funding is 195,000. The 185,000 in the shared critique is correct if the reserve is assumed to be zero. The new capability is showing when funds are needed for each batch and whether that timing can be met, rather than changing the total.

In the second demo step, assume the first transfer is delayed: the affected batch appears at risk; no automatic alternative submission is created while the original transfer remains ambiguous. In the third step, change the amount of a batch whose funding has not yet been submitted: the plan is revised and the corresponding old approval is invalidated.

## 6. Proposed records and safety boundaries

These are proposed models, not existing migrations or API contracts.

| Record              | Responsibility                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `PaymentObligation` | A batch identity unique within the operator/partner scope, revision, remaining amount, deadline, asset/account and cancellation/payout status. |
| `LiquidityPlan`     | Snapshot/checkpoint, horizon, policy version, input revisions, time projection, rationale and plan revision.                                   |
| `PlanAllocation`    | The obligation to which existing or planned funds are allocated; confirmed/projected distinction; reservation version.                         |
| `FundingIntent`     | Initially maps to the existing funding request; adds links to obligation revision and plan revision.                                           |
| `RouteAssessment`   | Eligibility for one route, full source/destination asset identity, net receipt amount, fee/quote expiry, time budget and rejection reason.     |

When a plan is applied, input revisions and balance/policy versions are checked again within a transaction. Two open plans cannot silently reserve the same existing funds or the same obligation. A material change to the intent requires new approval.

A durable transaction identity must be created before economic movement for signing/submission; crash recovery must follow the same identity. Rebroadcasting the same signed transaction and creating a new economic submission are different operations. If the source outcome is unknown, no new transfer or route failover is performed; the operator is shown that review is required.

Receipt credit and consumption are deduplicated. Webhooks use at-least-once delivery; the partner deduplicates by event identity. **Liquidity-ready is not payout-executed.** Live payout success comes from the partner's verified status record. Funds for a batch cancelled after funding are not automatically transferred back.

## 7. Delivery order and acceptance gates

| Order | Output                                               | Acceptance evidence                                                                                                                                 |
| ----- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Operator problem and sample data                     | Existing workflow, asset, deadline and baseline; without data, claims are limited to a synthetic demo.                                              |
| 2     | Pure deterministic planner + separate preview screen | Three-batch example, time/reserve chart and calculation explanation; no transfers or changes to existing allocations.                               |
| 3     | Plan revisions and sandbox execution connection      | No double allocation of funds; rejection of stale approval; no new submission on delay; restart and repeated-call tests.                            |
| 4     | One partner adapter + one real route                 | Access to real obligations, source signing/recovery, destination receivability and correlated receipt evidence.                                     |
| 5     | Controlled pilot                                     | Results against the existing approach, repeated real batches and operator feedback.                                                                 |
| 6     | Second route / additional treasury                   | An operator-validated need the first path cannot address, and eligibility for the same destination asset or a separately approved conversion scope. |

Planner acceptance scenarios: batches competing at the same deadline; horizon boundaries and UTC normalization; stale balance; insufficient source funds/gas; delayed or ambiguous receipts; incorrect asset/issuer; batch revision/cancellation; policy changes; source/daily caps; quote expiry; restart and repeated input. The initial delivery produces no approval/submission side effects.

Success is measured using the same operator records: time-weighted average Stellar inventory, funding-related readiness delays, total fees, manual intervention count and reconciliation time. The comparison covers at least the current operation, a simple threshold approach and the proposed planner. Lower inventory accompanied by more delays or operational burden is not automatically a success.

## 8. SCF and external communication

Positioning centers on treasury decisions and reconciliation; protocol count is not a substitute for product value. The current Integration Track requires existing traction and measures focused on real usage; adding multiple integrations does not satisfy those conditions. Flux's eligibility is not yet confirmed. [SCF Integration Track](https://stellar.gitbook.io/scf-handbook/scf-awards/build-award/integration-track)

The landing page may show the existing sandbox. Because the planner is not yet implemented, its screens or multi-route selection will not be advertised as working features. Once the first planner demo is ready, the product narrative will be updated with concrete screens.

The first engineering step is a **read-only, three-batch Liquidity Planner sandbox**. This document does not change backend behavior, existing application screens or mainnet transaction permissions.

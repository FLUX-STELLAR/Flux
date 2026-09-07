# Flux — SCF interest preparation

Prepared: 7 September 2026. Status: internal working draft; not submitted.

Product direction update: the [v1.4 proposal](PRODUCT_DIRECTION.md) defines time-based liquidity planning for upcoming batch obligations as the next deliverable. The planner and multi-route selection will not be presented as existing traction or completed integrations. The first live pilot remains limited to one route.

The initial goal is to explain Flux's current stage with evidence and obtain guidance from SCF on eligibility and next steps. A full Build application and a controlled mainnet pilot are separate stages.

## Current source review

- [SCF homepage](https://communityfund.stellar.org/): the entry point is “Indicate Your Interest”.
- [Integration Track](https://stellar.gitbook.io/scf-handbook/scf-awards/build-award/integration-track): eligible teams are invited to submit a Build application after expressing interest. The track expects existing traction; new applications without traction are directed toward Instawards. Flux's eligibility is not yet confirmed.
- [Current Integration List](https://stellar.gitbook.io/scf-handbook/scf-awards/build-award/integration-track/integration-list): LayerZero, CCTP and SDP are listed. Inclusion does not establish that the selected network/asset route is technically ready.
- Fields and limits were read from the [Build Interest Form client code](https://communityfund.stellar.org/_next/static/chunks/9442-a7b7f550d924e119.js) served by the site on this date. The form was not filled out in the browser; the active flow and conditional fields must be checked on screen before submission. The JavaScript file URL may change when the site is updated.

## Working adjustments to the PRD

The PRD is retained as the product target. According to the user's explanation, development is carried out by the user with AI assistance. The five-person staffing plan in the PRD will not be presented as the current team. AI will not be counted as a human team member or an accountable applicant. Actual founder experience will be added separately.

The PRD's USD 75,000 working budget will not become an application commitment until contributor-week and role assumptions have been recalculated. The reviewed interest form definition has no budget field; a detailed grant budget is not the priority at this stage.

The PRD's pilot/mainnet gates apply to later deliveries. They are not all presented as prerequisites for the interest form. This does not imply that the Integration Track's traction expectation has been met.

## Form fields and drafts

The drafts are plain text in English. Limits are the maximum character counts observed in client-side validation; rich-text formatting may add characters.

### Project Title

Flux

### Project Description — maximum 1,100 characters

Flux is building a treasury control layer for Stellar payment operators, connecting upcoming payout obligations to policy-controlled funding and batch-level reconciliation. Its local sandbox calculates funding shortfalls, preserves reserves and allocations, requires exact-intent approval, and reconciles simulated transfers before signaling liquidity readiness. The proposed next increment is a time-based planner that evaluates multiple scheduled batches, explains when funding is needed, and flags deadline risk. Live execution will initially use one operator-controlled EVM treasury, one supported asset route and one Stellar settlement account. Intended benefits are lower prefunded inventory and less manual coordination while preserving payout readiness; neither is yet measured. The planner, live transport and payout integration remain to be implemented.

### Current Traction — maximum 1,000 characters

Flux is at the local sandbox prototype stage. The repository implements a React operator interface, a persistent SQLite-backed API, exact shortfall calculations, manual intent approvals, transfer limits, idempotency, simulated funding and reconciliation, delayed-delivery recovery, audit exports and a signed webhook outbox. Transfer and payout adapters are simulated. No production users, partner commitments, mainnet volume or measured capital-efficiency improvements are claimed. The next validation step is to test the workflow with a Stellar payout operator and prove one supported EVM-to-Stellar funding route. Demo and repository evidence will be attached once prepared for review.

The final sentence should be replaced with actual demo/repository links before submission. Passing test results should be added only after rerunning and verifying them. In the previous review, `npm run check` could not start because `tsc` was missing; this file does not claim a new test validation.

### Planned Stellar Integration — maximum 1,100 characters

Flux plans to connect an existing batch payout workflow to an EVM-to-Stellar settlement funding service. LayerZero/USDT0 is the primary candidate; CCTP/native USDC is the alternative if it better matches the pilot operator's settlement asset. The MVP will select one supported route. An operator-controlled wallet or multisig will authorize source transactions. A Stellar observer will check balance freshness and asset receivability, then bind destination account, asset identity and received amount to the approved funding intent and source/rail evidence. Reconciled funding will trigger a signed readiness webhook to the payout engine. SDP is the proposed reference integration. These live integrations are not yet implemented. Intended Stellar outcomes are externally funded settlement volume and repeated funding cycles linked to real payout batches; thresholds will follow operator validation.

### Build Track

Preference: Integration Track; eligibility confirmation is pending. A functional prototype must be described separately from evidence of real usage. If there is no existing operator relationship, “existing operator integration” must not be described as complete.

A question that could be used in an eligibility discussion:

> Flux currently has a local sandbox prototype and is seeking its first payout-operator validation. We plan a narrow integration using a listed cross-chain building block and SDP as a reference workflow. What evidence would you require before inviting Flux to the Integration Track, and would you recommend Instawards first at this stage?

This question has not been verified as a separate form field; it may be used in an appropriate discussion or free-text field. It has not been sent to anyone.

### Team Description — maximum 2,000 characters

Draft that must not be submitted until the missing information is completed:

Flux is led by [FULL NAME], responsible for product decisions, implementation ownership and operator validation. Development uses AI-assisted engineering tools. Relevant experience includes [VERIFIABLE PROJECTS, RESPONSIBILITIES AND RESULTS]. Public work: [GITHUB / PORTFOLIO]. LinkedIn: [LINK]. Specialist protocol and security support needs will be scoped against the selected integration before any controlled mainnet pilot.

### Fields requiring user information or further preparation

| Field                          | Preparation                                                                                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project Category               | Select a category matching a B2B operator application from the actual options; do not claim development of a new protocol.                          |
| Website                        | Required URL. A public page with a product explanation and demo video is recommended. The current localhost address is not accessible to reviewers. |
| Submitter type                 | The user's actual individual/corporate applicant status.                                                                                            |
| Email                          | The user's application contact address.                                                                                                             |
| Team Description               | Name, verifiable experience and profile links.                                                                                                      |
| Target jurisdictions           | Complete based on the initial target operator/market; do not automatically select “Global”.                                                         |
| Team jurisdictions             | Location/incorporation information confirmed by the user; do not infer it from the device time zone.                                                |
| Local financial infrastructure | Answer based on the actual integration scope. Clearly separate Flux funding from the partner's fiat/local payment activities.                       |
| Referral                       | Use the provided code if there is a real referral relationship; otherwise do not imply one exists.                                                  |

Additional fields depend on country and other answers. The table above prepares the fixed fields; conditional questions can only be completed once the actual answers are known.

## Proposed readiness threshold for expressing interest

This list is our working target, not a mandatory document checklist published by SCF.

1. **Reproducible demo:** Show a new request, shortfall calculation, approval, reconciliation and safe recovery after a delay in an isolated sandbox. Rerun the relevant checks and prepare a 2–3-minute video.
2. **Shareable product page:** Clearly present the problem, target operator, demo, architecture and implemented/planned scope. An initial review can use a static page/video without exposing the management API.
3. **Narrow technical plan:** Research and document the source network, asset, destination account model, signing method and receipt verification approach for one route. Present live chain evidence only if it has actually been obtained.
4. **Founder and demand evidence:** Add founder background. If an operator interview has taken place, record the date, need, asset used and accepted funding time; otherwise retain it as a validation target.
5. **Final form:** Complete the drafts with actual URLs and user information. Ask about track eligibility based on the current stage.

Proposed next engineering step: a read-only Liquidity Planner sandbox using the three-batch scenario in the product direction document. The existing demo and funding flow are preserved; the planner scope is validated separately once implemented. Research into the real operator problem and sample data proceeds alongside this delivery. Multiple live networks and autonomous mainnet transactions are outside scope.

# Flux — SCF interest preparation

Updated: 9 September 2026. Status: internal working draft; not submitted. The user supplied the Project Information screenshot on 9 September 2026. Project Title, Project Description and the three category options are confirmed from the screenshot; character limits remain historical working references until verified in the current form.

Product direction update: the [v1.4 proposal](PRODUCT_DIRECTION.md) adds time-based liquidity planning for upcoming batch obligations. A read-only planner preview is now implemented, with known calculation gaps; it is not a validated planning engine or usage evidence. The user confirmed USDT0 over LayerZero as the selected integration direction. The first live pilot remains limited to one route; source-chain configuration and live receipt evidence are still outstanding.

The initial goal is to explain Flux's current stage with evidence and obtain guidance from SCF on eligibility and next steps. A full Build application and a controlled mainnet pilot are separate stages.

## Current source review

- [SCF homepage](https://communityfund.stellar.org/): the entry point is “Indicate Your Interest”.
- [Integration Track](https://stellar.gitbook.io/scf-handbook/scf-awards/build-award/integration-track): eligible teams are invited to submit a Build application after expressing interest. The track expects existing traction; new applications without traction are directed toward Instawards. Flux's eligibility is not yet confirmed.
- [Current Integration List](https://stellar.gitbook.io/scf-handbook/scf-awards/build-award/integration-track/integration-list): LayerZero, CCTP and SDP are listed. Inclusion does not establish that the selected network/asset route is technically ready.
- Fields and limits were read from the [Build Interest Form client code](https://communityfund.stellar.org/_next/static/chunks/9442-a7b7f550d924e119.js) served by the site on this date. The form was not filled out in the browser; the active flow and conditional fields must be checked on screen before submission. The JavaScript file URL may change when the site is updated.

Rechecked on 8 September 2026: the [Official Rules](https://stellar.gitbook.io/scf-handbook/scf-awards/official-rules-for-submissions), Integration Track requirements, official Integration List and [award page](https://communityfund.stellar.org/awards). LayerZero and SDP are listed. Interest precedes an invitation to a full Build application. Existing traction remains an Integration Track requirement; a sandbox alone does not establish eligibility. For a later Build application, most budget must support integration work and the final 40% tranche requires an agreed, measurable onchain outcome. Self-generated activity is not acceptable usage evidence. SCF #46 is shown with a Build submission deadline of 8 November 2026; this is not a separately published Interest Form deadline.

The Official Rules allow eligible teams and require an authorized representative. Applicant details, team jurisdictions, relevant experience and profile links must come from the team. Eligibility is subject to SCF review.

## Working adjustments to the PRD

The PRD is retained as the product target. On 8 September 2026, the user confirmed a five-person team. This supersedes the earlier single-developer assumption. Confirmed role assignments are:

| Member | User-confirmed role              |
| ------ | -------------------------------- |
| Emir   | Frontend and backend engineering |
| Ege    | Backend and contract engineering |
| Caner  | Lead Engineer                    |
| Emin   | Product Manager                  |
| Cem    | Role to be provided by the user  |

Do not infer experience, seniority, full-time availability or ownership percentages from these roles. Full names, relevant prior work and public profiles remain to be supplied. A contract engineering role does not add a custom custody vault to the MVP scope.

The PRD's USD 75,000 working budget will not become an application commitment until contributor-week and role assumptions have been recalculated. The reviewed interest form definition has no budget field; a detailed grant budget is not the priority at this stage.

The PRD's pilot/mainnet gates apply to later deliveries. They are not all presented as prerequisites for the interest form. This does not imply that the Integration Track's traction expectation has been met.

## Form fields and drafts

The drafts are plain text in English. Limits are the maximum character counts observed in client-side validation; rich-text formatting may add characters.

### Project Title

Flux

### Project Description — maximum 1,100 characters

Flux is building a treasury platform for Stellar payment operators, using USDT0 and LayerZero's omnichain infrastructure to fund scheduled payouts from their EVM treasuries. It connects payment batches to liquidity planning, operator approvals and settlement reconciliation, with the goal of reducing prefunded Stellar balances while keeping payments on schedule.

The platform calculates funding needs against available balances and protected reserves. Its planned USDT0 integration will track each approved transfer from the source transaction through LayerZero delivery to the verified Stellar receipt, then notify the payment system that funds are ready. Operators retain control of their treasury keys, and delayed transfers trigger review rather than duplicate funding.

Our working sandbox demonstrates the funding lifecycle and an initial liquidity planner. The next milestone is live USDT0 integration and validation with a payment operator.

### Project Category

End User Application (the middle option in the supplied screenshot). Flux is an application used by treasury and payment operations teams; its API and integration client support that application. It does not introduce a new financial protocol.

Category reassessment, 9 September 2026: retain End User Application as the recommended category based on the PRD's business user, full funding workflow and limited integration client. This is our classification judgment, not an SCF determination. The choice follows the intended product, rather than the presence of a dashboard or its current sandbox stage. A business can be the end user. The SDK is a means of connecting a payout engine to the Flux service; a general developer platform is outside the first release.

Official precedents support this interpretation: [Wellspring](https://communityfund.stellar.org/project/wellspring-rdo), a treasury management and payments platform, and [CashAbroad Smart Treasury](https://communityfund.stellar.org/project/cashabroad-smart-treasury-wla), a programmable business payments platform, are both listed as End User Application. These are category examples, not evidence of Flux partnerships or demand. The [official directory](https://communityfund.stellar.org/projects) also lists MPCVault Stellar Integration under Financial Protocols, so financial infrastructure is not separated by an absolute lending/pool requirement. The earlier explanation of Financial Protocols as mainly lending, exchange and liquidity pools was too narrow to serve as an SCF rule.

USDT0/OFT, LayerZero, contracts, APIs and SDKs do not individually determine the category. Financial Protocols would be more compelling if Flux's central deliverable were a reusable onchain financial mechanism with its own settlement or liquidity rules. Developer Tooling would be more compelling if the main product were a developer library or framework enabling others to build their own services. Neither is the current PRD's primary deliverable. Project category and Build track are separate fields; Integration Track remains a separate eligibility question under the [track requirements](https://stellar.gitbook.io/scf-handbook/scf-awards/build-award/integration-track).

### Current Traction — maximum 1,000 characters

Flux is at the local sandbox prototype stage. The repository implements a React operator interface, a persistent SQLite-backed API, exact shortfall calculations, manual intent approvals, transfer limits, idempotency, simulated funding and reconciliation, delayed-delivery recovery, audit exports and a signed webhook outbox. Transfer and payout adapters are simulated. No production users, partner commitments, mainnet volume or measured capital-efficiency improvements are claimed. The next validation step is to test the workflow with a Stellar payout operator and prove one supported EVM-to-Stellar funding route. Demo and repository evidence will be attached once prepared for review.

Public repository: https://github.com/FLUX-STELLAR/Flux. A public demo URL or recording remains to be provided. Verification on 8 September 2026 at commit `b1af624`: 20/20 backend tests, 10/10 browser tests, typecheck, build and formatting passed. These validate sandbox behavior, not live chain integration or planner calculation correctness. The review reproduced paid-batch inclusion, a three-row limit/demo-data mixing and sub-cent rounding in the planner; its existing browser test does not cover those calculations.

### Planned Stellar Integration — maximum 1,100 characters

Flux plans to integrate USDT0 over LayerZero for payout-triggered funding from one operator-controlled EVM treasury to one Stellar settlement account. The operator's wallet or multisig will sign the approved funding intent. Flux will check destination receivability and balance freshness, track the source transaction and LayerZero message, and reconcile the Stellar receipt against the approved account, asset identity and amount. A signed readiness webhook will connect reconciled funding to the partner's payout workflow; SDP is the proposed reference adapter. The funding lifecycle currently runs in a local simulator; live signing, transport, observation and the partner adapter remain to be implemented. Intended Stellar outcomes are externally sourced USDT0 funding and repeated cycles linked to real payout batches. Numeric pilot targets will follow operator validation.

### Build Track

Preference: Integration Track; eligibility confirmation is pending. A functional prototype must be described separately from evidence of real usage. If there is no existing operator relationship, “existing operator integration” must not be described as complete.

A question that could be used in an eligibility discussion:

> Flux currently has a local sandbox prototype and is seeking its first payout-operator validation. We plan a narrow integration using a listed cross-chain building block and SDP as a reference workflow. What evidence would you require before inviting Flux to the Integration Track, and would you recommend Instawards first at this stage?

This question has not been verified as a separate form field; it may be used in an appropriate discussion or free-text field. It has not been sent to anyone.

### Team Description — maximum 2,000 characters

Draft that must not be submitted until the missing information is completed:

Flux is being developed by a five-person team: Emir — frontend and backend engineering; Ege — backend and contract engineering; Caner — Lead Engineer; Emin — Product Manager; and Cem — [ROLE TO BE PROVIDED]. Before submission, add each member's full name, one relevant experience statement and a GitHub, LinkedIn or portfolio link. Do not submit placeholders or claim unprovided credentials.

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

Proposed next engineering step: validate and correct the read-only planner's monetary, allocation, payout-status and horizon behavior, then establish the selected USDT0/LayerZero route and signing/receipt evidence. Research into the real operator problem and sample data proceeds alongside engineering. Multiple live networks and autonomous mainnet transactions are outside scope.

## Drafting support

Installed 21 relevant Codex skills from the sources used by [stellar-build](https://github.com/kaankacar/stellar-build): 10 SCF lifecycle skills from `lumenloop/awesome-stellar-community-fund`, 8 technical modules from `stellar/stellar-dev-skill`, and the PRD, architecture and SCF round watcher skills from `kaankacar/stellar-build`. The `scf-interest-form-drafter` guidance informs concise positioning and team presentation. Official SCF rules and the actual form govern where a skill's generic examples differ. Form answers will be finalized against the questions supplied by the user.

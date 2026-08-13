# FamilyPilot #85 — A16 R1 Model / Depth Authority Correction

CORRECTION_ID: FP85-P4D3B-R3B-R4-R1-A1-R1-A16-R1-MODEL-DEPTH-AUTHORITY-CORRECTION
BASE_PACKET: `task-packets/FamilyPilot/85/FP85-P4D3B-R3B-R4-R1-A1-R1-A16-FULL-RUNTIME-READONLY-CLOSURE-SCAN.md`
BASE_PACKET_COMMIT: `95fb9be0f58595f078eaff11ec29e2ae02fe3323`
ERROR_LEDGER: `maloma/decisionos-portfolio-governance#414`
TYPE: TASK-CONTRACT CORRECTION ONLY / ZERO PRODUCT EDITS / ZERO TEST EDITS

This correction MUST be read before executing A16. It supersedes only the missing/incorrect execution-profile and model/reasoning/speed authority for A16. All diagnostic-only scope, no-write boundaries, entry state, scan requirements and terminal contract of the base A16 packet remain unchanged.

## 1. Governance

At correction publication, current published governance is:
`maloma/decisionos-portfolio-docs@26bc2fc3f850c7ed76ec9df5c8e8633b88a1d96f`
Registry `5.23`.

Before the actual Codex request, re-check published `main`. If it changed, Registry-first re-bootstrap and re-resolve these controls before execution.

Applicable owners:
- Rule 91 v1.4 — Work execution profile and minimum sufficient actual-request depth;
- Rule 93 v1.7 — explicit sufficient model + reasoning depth before every Codex request, `REASONING_SPEED=NORMAL`, no silent fallback/substitution/escalation;
- Rule 94 v1.4 — minimum sufficient executor/depth/request count;
- Rule 95 v1.8 — evidence/error correction and Founder-facing reporting.

## 2. Correct execution profile

`EXECUTION_PROFILE = BOUNDED_DIRECT`

Why this is minimum sufficient:
- one coherent objective: produce one complete read-only closure inventory and one final recommended correction allowlist;
- zero product/test/repository-content edits in the worktree;
- no commit/push/PR/workflow/deploy/live action;
- no irreversible side effect;
- no cross-invocation recovery is required;
- one authorized Codex run is sufficient;
- deterministic evidence and one durable terminal result are possible.

The loaded runtime dependency graph is the object being diagnosed. Its complexity does not by itself require synthetic Execution Batch machinery when the diagnostic action remains one coherent zero-write run.

If A16 execution discovers that completion genuinely requires several independently meaningful execution stages with cross-invocation recovery or materially expanded authority, STOP and return `STATUS=BLOCKED`; do not silently convert profiles.

## 3. Correct model / reasoning / speed contract

`MODEL = GPT-5.6 Sol`
`REASONING_DEPTH = HIGH`
`REASONING_SPEED = NORMAL`

### Why GPT-5.6 Sol is required for this request

The A16 objective is not routine code search. It requires a complete causal closure across the actually loaded runtime, including:
- interaction of multiple mutation owners and listeners;
- nested adopted-state writes that prior shallow validation missed;
- exact guard/reentrancy cause for `canonical_ui_mutation_in_progress` while controller status is `ready`;
- separation of active product blockers, validation blockers, mutator libraries and dormant incompatibilities;
- a finite final correction allowlist after a repeated multi-day underscan chain.

The required quality prioritizes completeness/correctness and reduction of another rework cycle over cost minimization. Current OpenAI model guidance classifies GPT-5.6 Sol as the flagship choice for complex professional reasoning/coding and GPT-5.6 Terra as a cost/intelligence balance option. For this exact closure task, Coordination therefore resolves Sol as the minimum sufficient model with a material expected quality/risk advantage.

`GPT-5.6 Terra` from the prior Founder-facing Next Action is WITHDRAWN and MUST NOT be used as the A16 authority.

### Why HIGH is required

A16 has concrete Rule91 HIGH triggers:
- complex failure analysis with several plausible interacting causes;
- architecture/runtime reasoning across multiple interacting constraints;
- high rework cost if the closure inventory is incomplete again.

LOW and MEDIUM are therefore insufficient for the required quality of this exact request.

Depth above HIGH is NOT authorized and is not currently required. Do not request xhigh/max/extra-high/ULTRA or equivalent without a separate exact Founder decision gate.

`REASONING_SPEED=NORMAL` is mandatory. No fast/boosted/accelerated/priority equivalent.

## 4. Effective identity verification

Before substantive A16 analysis, verify through the actual Codex execution surface that the request is running with the authorized selectable configuration:
- model: GPT-5.6 Sol;
- reasoning: HIGH;
- speed: NORMAL where the surface exposes speed.

Do not infer this from the previous task, UI default, prior chat configuration, packet text, or model recommendation alone.

If the actual route cannot select/verify GPT-5.6 Sol + HIGH sufficiently for the contract:

`STATUS=BLOCKED`
`BLOCKER_CLASS=MODEL_REASONING_ROUTE_AUTHORITY`
`REQUESTED_MODEL=GPT-5.6 Sol`
`REQUESTED_DEPTH=HIGH`
`REQUESTED_SPEED=NORMAL`
`SILENT_FALLBACK_PERFORMED=NO`
`PRODUCT_OR_TEST_EDIT_PERFORMED=NO`
`NEXT_STATUS=REQUIRES_COORDINATION_ROUTE_RESOLUTION`

No automatic substitution to Terra/Luna/another model, no downgrade to MEDIUM, and no escalation above HIGH.

## 5. Loop-risk / request-count check

Before the one actual Codex request, confirm:
- this instruction does not automatically create a successor Codex request;
- no polling/retry chain exists;
- no commit/push/workflow loop exists because A16 forbids those writes;
- terminal `PASS/BLOCKED` does not self-reactivate execution.

`PLANNED_CODEX_REQUEST_COUNT = 1`

`MAX_CODEX_REQUESTS_PER_TASK = 25` remains only the emergency ceiling from Rule93, not a budget or permission for retries. A16 authorizes one request. Any successor request requires a new Coordination decision after reading the terminal result.

## 6. Corrected activation rule

Execute A16 only when BOTH are loaded:
1. base A16 packet @ `95fb9be0f58595f078eaff11ec29e2ae02fe3323`;
2. this A16-R1 correction at its exact published commit.

The same existing Codex chat and same accumulated uncommitted 29-path worktree remain mandatory.

No product/test changes, commit, push, PR, workflow, deployment, live provider action or authority cutover are authorized by this correction.

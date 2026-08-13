# FamilyPilot #85 — A16 R2 Model / Depth Separation Correction

CORRECTION_ID: FP85-P4D3B-R3B-R4-R1-A1-R1-A16-R2-MODEL-DEPTH-SEPARATION-CORRECTION
BASE_PACKET: `task-packets/FamilyPilot/85/FP85-P4D3B-R3B-R4-R1-A1-R1-A16-FULL-RUNTIME-READONLY-CLOSURE-SCAN.md`
BASE_PACKET_COMMIT: `95fb9be0f58595f078eaff11ec29e2ae02fe3323`
SUPERSEDES_MODEL_SELECTION_IN: `FP85-P4D3B-R3B-R4-R1-A1-R1-A16-R1-MODEL-DEPTH-AUTHORITY-CORRECTION.md`
ERROR_LEDGER: `maloma/decisionos-portfolio-governance#414`
TYPE: TASK-CONTRACT CORRECTION ONLY / ZERO PRODUCT EDITS / ZERO TEST EDITS

This correction supersedes ONLY the A16 model selection from R1. All A16 diagnostic scope, zero-write boundaries, BOUNDED_DIRECT profile, HIGH reasoning depth, NORMAL reasoning speed, entry state, scan requirements and terminal contract remain unchanged.

## 1. Governance

Current published governance at publication:
`maloma/decisionos-portfolio-docs@26bc2fc3f850c7ed76ec9df5c8e8633b88a1d96f`
Registry `5.23`.

Before the actual Codex request, re-check published `main`. If it changed, Registry-first re-bootstrap and re-resolve controls.

## 2. Correct separation of model and reasoning depth

The prior R1 reasoning incorrectly treated A16's legitimate `HIGH` reasoning requirement as sufficient justification for selecting the stronger `GPT-5.6 Sol` model.

Governance requires these dimensions to be resolved independently:
- sufficient model for the exact task;
- minimum sufficient reasoning depth;
- reasoning speed.

A HIGH reasoning requirement does NOT imply a Sol requirement.

## 3. Correct A16 execution contract

`EXECUTION_PROFILE = BOUNDED_DIRECT`
`MODEL = GPT-5.6 Terra`
`REASONING_DEPTH = HIGH`
`REASONING_SPEED = NORMAL`

### Why Terra is minimum sufficient

A16 is a fully specified diagnostic-only scan with:
- no product/test edits;
- no architecture implementation decision;
- no commit/push/PR/workflow/deploy/live action;
- an explicit runtime inventory checklist;
- exact classifications and evidence fields;
- deterministic read-only inspection as the principal work;
- one finite terminal deliverable: a complete closure inventory and one recommended correction allowlist.

The task is analytically difficult, but that difficulty is addressed by `HIGH` reasoning depth. There is currently no evidence that Terra is insufficient for the required diagnostic quality. Under Rules 91/93/94, a stronger model must not be selected merely because it is available or because HIGH depth is required.

Therefore `GPT-5.6 Sol` from R1 is WITHDRAWN for A16.

## 4. Why HIGH remains required

A16 still has concrete HIGH triggers:
- multi-causal failure analysis;
- interacting runtime/architecture constraints;
- repeated prior underscan means high rework cost if the inventory is incomplete;
- exact guard/reentrancy ownership resolution across multiple listeners/modules.

LOW/MEDIUM are not sufficient for this exact diagnostic request.

## 5. No silent substitution or escalation

The authorized A16 configuration is exactly:
`GPT-5.6 Terra / HIGH / NORMAL`.

Do not silently:
- substitute Sol/Luna/another model;
- downgrade reasoning to MEDIUM/LOW;
- escalate above HIGH;
- use fast/boosted/accelerated/priority speed.

If the current Codex route cannot select/verify Terra + HIGH sufficiently for the task contract, return:

`STATUS=BLOCKED`
`BLOCKER_CLASS=MODEL_REASONING_ROUTE_AUTHORITY`
`REQUESTED_MODEL=GPT-5.6 Terra`
`REQUESTED_DEPTH=HIGH`
`REQUESTED_SPEED=NORMAL`
`SILENT_SUBSTITUTION_PERFORMED=NO`
`PRODUCT_OR_TEST_EDIT_PERFORMED=NO`
`NEXT_STATUS=REQUIRES_COORDINATION_ROUTE_RESOLUTION`

Do not auto-escalate to Sol. Any later Sol use requires a new exact Coordination decision based on evidence that Terra is insufficient.

## 6. Activation rule

Execute A16 only after reading:
1. base A16 packet @ `95fb9be0f58595f078eaff11ec29e2ae02fe3323`;
2. this A16-R2 correction at its exact published commit.

R1 remains historical provenance but its Sol model selection is superseded by this R2.

Continue in the SAME Codex chat and SAME existing uncommitted 29-path worktree.

No product/test edits, staging, commit, push, PR, workflow, deployment, live provider action or authority cutover are authorized.
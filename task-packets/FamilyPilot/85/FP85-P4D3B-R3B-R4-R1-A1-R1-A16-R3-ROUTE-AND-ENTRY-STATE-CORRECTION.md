# FamilyPilot #85 — A16 R3 Route Gate + Entry-State Correction

CORRECTION_ID: FP85-P4D3B-R3B-R4-R1-A1-R1-A16-R3-ROUTE-AND-ENTRY-STATE-CORRECTION
BASE_PACKET: `task-packets/FamilyPilot/85/FP85-P4D3B-R3B-R4-R1-A1-R1-A16-FULL-RUNTIME-READONLY-CLOSURE-SCAN.md`
BASE_PACKET_COMMIT: `95fb9be0f58595f078eaff11ec29e2ae02fe3323`
SUPERSEDES_ROUTE_GATE_IN: `FP85-P4D3B-R3B-R4-R1-A1-R1-A16-R2-MODEL-DEPTH-SEPARATION-CORRECTION.md`
ERROR_LEDGER_MODEL_ROUTE: `maloma/decisionos-portfolio-governance#414`
ERROR_LEDGER_ENTRY_INVENTORY: `maloma/decisionos-portfolio-governance#422`
ERROR_LEDGER_READONLY_VALIDATION: `maloma/decisionos-portfolio-governance#412`
TYPE: TASK-CONTRACT CORRECTION ONLY / ZERO PRODUCT EDITS / ZERO TEST EDITS

This correction fixes exactly two A16 control defects:
1. R2 incorrectly made unavailable effective model/depth introspection a blocker for a zero-write diagnostic task;
2. base A16 reconstructed a stale exact changed-path inventory.

All other A16 requirements remain unchanged: same chat, same worktree, diagnostic-only, no product/test edits, no staging/commit/push/PR/workflow/deploy/live action, complete runtime closure inventory, one finite correction allowlist.

## 1. Governance

Current published governance at publication:
`maloma/decisionos-portfolio-docs@26bc2fc3f850c7ed76ec9df5c8e8633b88a1d96f`
Registry `5.23`.

Before substantive A16 work, check current published `main`. If it changed, perform Registry-first re-bootstrap and apply the newer rules before continuing.

## 2. Execution profile and requested model contract

Preserved:

`EXECUTION_PROFILE = BOUNDED_DIRECT`
`REQUESTED_MODEL = GPT-5.6 Terra`
`REQUESTED_REASONING_DEPTH = HIGH`
`REQUESTED_REASONING_SPEED = NORMAL`

Why unchanged:
- Terra remains the minimum-sufficient model resolved for this fully specified read-only diagnostic task;
- HIGH remains justified by multi-causal failure analysis, interacting runtime/event ownership and high rework cost if the closure inventory is incomplete;
- NORMAL remains mandatory;
- no depth above HIGH is authorized.

## 3. Effective identity evidence — corrected interpretation

R2 incorrectly required the Codex agent to prove the exact effective model/depth before it could perform A16.

For this exact A16 task, **lack of route introspection is not an execution blocker** because:
- A16 is zero-write diagnostic work;
- exact model identity is not itself a safety, mutation, publication or acceptance property;
- the returned diagnostic evidence is independently inspectable and remains subject to Coordination/independent review;
- Rule 93 does not permit guessing effective identity, so unavailable evidence must be reported as unavailable rather than converted into PASS or BLOCK solely for that reason.

Required behavior:

### If reliable route evidence positively reports the requested configuration
Continue and record:
`EFFECTIVE_IDENTITY_EVIDENCE=AVAILABLE_MATCH`

### If reliable route evidence positively reports a conflicting model, reasoning depth or non-NORMAL speed
STOP before substantive A16 work and return:
`STATUS=BLOCKED`
`BLOCKER_CLASS=POSITIVE_MODEL_REASONING_CONFIGURATION_MISMATCH`
`EFFECTIVE_IDENTITY_EVIDENCE=AVAILABLE_MISMATCH`

### If the execution surface simply does not expose reliable effective identity to the agent
Do NOT guess and do NOT block solely for absence of introspection. Continue A16 and record:
`EFFECTIVE_IDENTITY_EVIDENCE=UNAVAILABLE_NOT_REQUIRED_FOR_ZERO_WRITE_DIAGNOSTIC`

No intentional model/depth/speed substitution is authorized. If substitution is not observable, do not claim `SILENT_SUBSTITUTION_PERFORMED=NO`; report only the evidence actually available.

Historical routing evidence that FamilyPilot's local Codex path has used `gpt-5.6-terra` is capability evidence only and is not claimed as proof of this exact invocation.

## 4. Codex request count

The prior A16-R2 invocation that returned `MODEL_REASONING_ROUTE_AUTHORITY` is an actual Codex request for this same unfinished A16 goal.

Therefore:
`A16_CODEX_REQUESTS_ALREADY_USED = 1`
`R3_AUTHORIZES_ONE_SUCCESSOR_REQUEST = YES`
`EXPECTED_TOTAL_A16_CODEX_REQUEST_COUNT_AFTER_R3 = 2`

`MAX_CODEX_REQUESTS_PER_TASK=25` remains an emergency ceiling, not a budget. R3 authorizes exactly one successor request, not an automatic retry chain.

Before the successor request, confirm no recursion/polling/workflow/self-reactivation loop exists. A16 still has no Git/product/workflow write path.

## 5. Correct current 29-path worktree inventory

The A16-R2 executor reported:
- `HEAD=fea49751c850c1f62cc184843d5c19510d5ddbbf`;
- published governance matched;
- changed-path count = exactly `29`;
- staged paths = `0`;
- generated artifacts = absent;
- `git diff --check` = PASS;
- no product/test edit, commit or push performed;
- exact difference from base A16 expected inventory:
  - ACTUAL ADDITION relative to stale packet list: `tools/pf08a-m4-01-planned-income-browser-smoke.mjs`;
  - STALE EXPECTATION not currently changed from product base: `tools/pf08a-m3-07b-r04-browser-smoke.mjs`.

Durable history confirms the actual state is legitimate:
- A12 exact packet commit `876b8015c9b8eb0f633ddbf33d420f7cef999c3c` explicitly authorized `tools/pf08a-m4-01-planned-income-browser-smoke.mjs` as the possible 26th changed path;
- A2's broad allowlist included R04, but its newly authorized async edits were R01/R02/R03/R05; an allowlist is not proof that R04 must remain materially different from base forever.

Therefore the **correct exact current changed-path set for A16 entry** is:

1. `familypilot-linked-obligation-operation-lifecycle.js`
2. `index.html`
3. `src/familypilot.html`
4. `tools/fp85-p4d3b-authoritative-ui-mutation-gateway-domain-smoke.cjs`
5. `tools/pf08a-m4-01-planned-income-browser-smoke.mjs`
6. `tools/pf08a-m3-07b-r01-browser-smoke.mjs`
7. `tools/pf08a-m3-07b-r02-browser-smoke.mjs`
8. `tools/pf08a-m3-07b-r03-browser-smoke.mjs`
9. `tools/pf08a-m3-07b-r05-browser-smoke.mjs`
10. `familypilot-partial-payments.js`
11. `familypilot-payment-attention.js`
12. `familypilot-scope.js`
13. `src/familypilot-scope.js`
14. `tools/pf08a-m3-07b-browser-smoke.mjs`
15. `familypilot-partial-payment-removal-v2.js`
16. `familypilot-partial-payment-entry-ui.js`
17. `familypilot-overpayment-resolution.js`
18. `familypilot-m4-03-savings-accounts.js`
19. `familypilot-m4-03-savings-accounts-ui.js`
20. `familypilot-wallet-transfers.js`
21. `familypilot-wallet-transfers-ui.js`
22. `familypilot-wallet-management.js`
23. `familypilot-savings-goals.js`
24. `familypilot-debts.js`
25. `familypilot-planned-income.js`
26. `familypilot-planned-income-ui.js`
27. `familypilot-obligation-state-ui.js`
28. `tools/pf08a-m3-04-browser-smoke.mjs`
29. `familypilot-mobile-payment-tap.js`

Required entry gate after loading R3:
`CURRENT_CHANGED_PATH_COUNT=29`
`CURRENT_CHANGED_PATH_SET_MATCH_R3=PASS`
`STAGED_PATH_COUNT=0`
`GENERATED_REPO_ARTIFACTS=NONE`
`GIT_DIFF_CHECK=PASS`

If the actual set differs from THIS R3 list, return `STATUS=BLOCKED` with the exact delta. Do not modify anything.

`tools/pf08a-m3-07b-r04-browser-smoke.mjs` remains an unchanged historical validation file and may/must still be inspected by A16 wherever relevant to closure analysis; it is simply not a current changed path.

## 6. Resume the original A16 diagnostic objective

If sections 1–5 pass (or effective identity evidence is merely unavailable as allowed in §3), perform the COMPLETE original A16 read-only scan. Do not stop after the first product blocker.

Required original outputs remain, including:
- complete actual loaded runtime graph;
- classification of every loaded module;
- root + nested adopted-state mutation inventory;
- legacy `save()` inventory;
- mutating boot/read/render helper inventory;
- stale adopted-reference inventory;
- exact A15 `canonical_ui_mutation_in_progress` call/event root cause;
- event/action mutation-owner matrix;
- validation-owner / historical-test direct-write and async mismatch inventory;
- test-sensitivity requirements;
- active vs dormant incompatibility classification;
- ONE finite final recommended product + validation correction allowlist;
- exact predicted `FINAL_RECOMMENDED_CHANGED_PATH_COUNT`.

No implementation corrections are authorized by R3.

## 7. Terminal additions

A successful A16 diagnostic terminal must include the original A16 fields plus:

```text
STATUS=DIAGNOSTIC_COMPLETE
A16_CORRECTION_USED=R3
A16_CODEX_REQUEST_COUNT_TOTAL=2
REQUESTED_MODEL=GPT-5.6 Terra
REQUESTED_DEPTH=HIGH
REQUESTED_SPEED=NORMAL
EFFECTIVE_IDENTITY_EVIDENCE=AVAILABLE_MATCH|UNAVAILABLE_NOT_REQUIRED_FOR_ZERO_WRITE_DIAGNOSTIC
CURRENT_CHANGED_PATH_COUNT=29
CURRENT_CHANGED_PATH_SET_MATCH_R3=PASS
STALE_A16_R04_EXPECTATION_CORRECTED=YES
A12_PLANNED_INCOME_SMOKE_PRESENT=YES
PRODUCT_OR_TEST_EDIT_PERFORMED=NO
COMMIT_CREATED=NO
PUSH_PERFORMED=NO
```

If a genuine blocker remains, return `STATUS=BLOCKED` with exact evidence. A lack of effective model/depth introspection alone is no longer a valid A16 blocker.

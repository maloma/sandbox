# FamilyPilot #85 — P4D3B A13 R02/R03 Obligation-State Historical Contract Closure

TASK_ID: FP85-P4D3B-R3B-R4-R1-A1-R1-A13-R02-R03-OBLIGATION-STATE-HISTORICAL-CONTRACT-CLOSURE
AMENDS_VALIDATION_CONTINUATION: FP85-P4D3B-R3B-R4-R1-A1-R1-A12-PLANNED-INCOME-ASYNC-HISTORICAL-CALLER-CONTRACT
PRIOR_ASYNC_PRECEDENT: FP85-P4D3B-R3B-R4-R1-A1-R1-A2-HISTORICAL-BROWSER-ASYNC-AMENDMENT
PARENT: maloma/FamilyPilot#85
ERROR_LEDGER_PRODUCT: maloma/decisionos-portfolio-governance#340
ERROR_LEDGER_PROCESS: maloma/decisionos-portfolio-governance#392
ERROR_LEDGER_VALIDATION: maloma/decisionos-portfolio-governance#398
EXECUTION_PROFILE: BOUNDED_DIRECT / HISTORICAL_TEST_CONTRACT_CLOSURE
PRODUCT_SOURCE_EDIT_AUTHORITY: NONE
CANDIDATE_STATUS_AFTER_CREATOR_PASS: SELF_VERIFIED / PENDING_INDEPENDENT_REVIEW
P4D3B_FINAL_STATUS: NOT_ACCEPTED

## 1. Exact continuation state

Product repo: `maloma/sandbox`
Product branch: `fp85-p4d3b-authoritative-ui-mutation-gateway`
Published product base and required local HEAD before candidate commit: `fea49751c850c1f62cc184843d5c19510d5ddbbf`
Governance: `c886102d0350166ae429ea755963a92285367cd6`
A12 packet: `maloma/sandbox@876b8015c9b8eb0f633ddbf33d420f7cef999c3c`

Continue the SAME Codex chat and SAME existing uncommitted worktree. Preserve all valid accumulated A1-R1+A2+A3+A4+A5+A6+A8+A9+A11+A12 changes.

Producer-reported state entering A13:
- local HEAD remains exact published base;
- no stage, product commit or push occurred;
- final/current changed-path count = 26;
- `git diff --check` PASS;
- A12 targeted validation PASS;
- planned-income historical smoke PASS through `CHROME_PATH`;
- R01 browser smoke PASS;
- full accumulated validation then stopped in R02 at `a.obligationState.render()` with `TypeError: Cannot read properties of undefined (reading 'render')`;
- generated harnesses are cleaned.

Before editing, verify local HEAD and exact changed-path set. If HEAD differs from the exact base, or changed-path count is not 26, return `STATUS=BLOCKED` before editing.

## 2. Why A13 exists

R02 is already one of the four historical M3-07B harnesses covered by A2's accepted async compatibility rule. R03 contains the same direct legacy call sequence.

Exact-base inspection confirms both historical harnesses contain:

```text
a.obligations.openList();
a.obligationState.render();
a.renderAll();
```

A2 already established the required historical migration pattern:
- await Promise-based canonical helpers;
- wait deterministically for committed/adopted UI state;
- refresh state after whole-state adoption;
- preserve scenario assertions and markers;
- do not restore writable `runtime.state` or `runtime.save`.

The current R02 failure therefore does NOT by itself prove a new product path is required. First close the already-authorized historical caller contract coherently across R02 and R03.

Important diagnostic signal: exact-base `familypilot-obligation-state-ui.js` itself captures `runtime.state`, references `runtime.save`, and has helpers that can materialize/configure state. If the real R02/R03 UI behavior genuinely depends on that module and it cannot boot or render under the read-only runtime, that is a PRODUCT blocker and A13 MUST STOP. A13 may not hide such a blocker by manufacturing equivalent DOM or a fake `obligationState` API in the harness.

## 3. Scope — zero changed-path growth

A13 authorizes NEW material edits only to these two already-changed historical test paths:

1. `tools/pf08a-m3-07b-r02-browser-smoke.mjs`
2. `tools/pf08a-m3-07b-r03-browser-smoke.mjs`

No product source edit is authorized.
No new tracked path is authorized.
Final changed-path count must remain exactly 26.

All other current changed files are frozen, including:
- `index.html` and `src/familypilot.html`;
- all partial-payment product files;
- all planned-income product/test files;
- `familypilot-obligation-state-ui.js`;
- R01/R04/R05 and umbrella historical smokes.

`familypilot-obligation-state-ui.js` is READ-ONLY DIAGNOSTIC INPUT ONLY under A13.

If product code must change, return `STATUS=BLOCKED` with exact evidence. Do not create a 27th changed path.

## 4. Single objective

Make R02 and R03 faithfully exercise their existing product scenarios under the accepted asynchronous canonical/adoption contract, without requiring a stale direct call to an optional/late-installed test-only `a.obligationState.render()` helper and without concealing a real obligation-state product-module failure.

Required invariant:

```text
historical test -> real canonical product paths -> adopted state -> real DOM assertions
no fake DOM/test authority
no writable runtime.state
```

## 5. A13-1 — classify the `obligationState.render()` dependency

For R02 and R03 separately, inspect the CURRENT local harness after A2-era edits, not only the base version.

Classify `a.obligationState.render()` as one of:

### A. Redundant legacy test-helper call

This classification is allowed only if the same real product DOM required by the existing assertions is produced by the normal current render chain after awaited canonical calls, for example through awaited obligations opening plus `a.renderAll()` / current product render flow.

If so:
- remove the direct dependency on `a.obligationState.render()`;
- use bounded deterministic `waitFor(...)` for the actual required DOM, including `[data-state-payment-toggle]`;
- do not replace the helper with fake markup or direct invocation of internal render implementation;
- preserve all existing product assertions.

### B. Required product-module dependency

If the required payment-state DOM does NOT appear through the real render chain, and the obligation-state module/test API is required but fails to install/boot/render under the read-only runtime:
- do not emulate it;
- do not add a fake `a.obligationState` object;
- do not mutate runtime state to make it boot;
- return `STATUS=BLOCKED`;
- report `OBLIGATION_STATE_PRODUCT_PATH_REQUIRED=YES`;
- report exact failure evidence, readiness/boot marker/error if available, and `BLOCKER_PATH=familypilot-obligation-state-ui.js` when proven.

A13 is intentionally the gate that distinguishes a stale harness call from a new product compatibility path.

## 6. A13-2 — finish the already-established A2 async contract in R02/R03

Within the two editable harnesses only, reconcile any remaining stale caller behavior needed to run the existing scenarios correctly:

- await `a.setActiveWallet(...)` when Promise-based;
- await `a.obligations.createRule(...)` and other Promise-based canonical helpers before dereferencing results;
- after authoritative adoption, use `a.getState()` / stable IDs rather than stale captured state or entity objects;
- use bounded deterministic waits for UI transitions rather than fixed sleeps where correctness depends on canonical completion;
- do not directly mutate `__FP_RUNTIME__.state`;
- do not weaken product assertions;
- do not invent a test-only mutation route.

Do not broaden this into R01/R04/R05 editing. Those files are frozen in A13.

## 7. Assertion preservation

Preserve R02 marker:
`PF08A_M3_07B_R02_BROWSER_PASS`

Preserve R02 scenario/coverage including at least:
- partial and full payment-removal flows;
- linked-group summary;
- obsolete keep option absent;
- all linked operations removed from accounting;
- technical removal remains outside user Trash;
- remembered partial group;
- single full-payment removal;
- user Trash remains clean.

Preserve R03 marker:
`PF08A_M3_07B_R03_BROWSER_PASS`

Preserve R03 scenario/coverage including at least:
- remembered partial group;
- ordinary empty short-tap full payment;
- remembered group retained;
- restore action availability;
- confirmed replacement of later full payment;
- later full operation voided;
- partial group restored;
- empty restoration;
- no restore action without remembered group.

Required gates:
- `R02_ASSERTION_INVENTORY_PRESERVED=PASS`
- `R03_ASSERTION_INVENTORY_PRESERVED=PASS`

## 8. Targeted validation after LAST A13 edit

Run at least:

1. `node --check tools/pf08a-m3-07b-r02-browser-smoke.mjs`
2. `node --check tools/pf08a-m3-07b-r03-browser-smoke.mjs`
3. `git diff --check`
4. exact changed-path gate: final count exactly 26, no new path
5. R02 browser smoke
6. R03 browser smoke

Use the already-working browser execution method in the current worktree/environment. Do not install software or alter product/test semantics merely for launcher portability.

Required targeted success:
- `R02_BROWSER=PASS`
- `R03_BROWSER=PASS`
- both assertion inventories preserved;
- `OBLIGATION_STATE_TEST_BYPASS_CREATED=NO`;
- `OBLIGATION_STATE_PRODUCT_PATH_REQUIRED=NO`.

If normal real rendering does not produce the required payment-state UI, or the obligation-state module is demonstrably required and incompatible, STOP at the product boundary instead of continuing.

## 9. Complete accumulated final creator validation

Only after targeted A13 PASS, rerun the COMPLETE accumulated final creator validation required by the full A1-R1+A2+A3+A4+A5+A6+A8+A9+A11+A12 chain after the LAST A13 edit.

All prior required checks remain mandatory, including:
- all required domain stages;
- R01-R05 and umbrella browser regressions as required by the packet chain;
- planned-income historical regression;
- M4-03 regression;
- A8 closure preservation;
- final post-commit read-only Proxy characterization;
- root/mirror identity/equality gates;
- held-commit/authoritative mutation checks;
- node checks;
- `git diff --check`;
- exact changed-path gate = 26.

No historical assertion may be weakened to obtain PASS.

## 10. Candidate publication authority

ONLY after COMPLETE final creator validation PASS:
- re-check remote product branch still equals exact base `fea49751c850c1f62cc184843d5c19510d5ddbbf`;
- create at most ONE coherent candidate commit containing the accumulated validated work;
- perform at most ONE normal fast-forward push to `fp85-p4d3b-authoritative-ui-mutation-gateway`;
- exact remote readback required and must equal candidate SHA;
- no force push.

After exact push/readback status is only:
`SELF_VERIFIED / PENDING_INDEPENDENT_REVIEW`

No PR, merge, deploy, workflow dispatch, live Supabase or authority cutover.

## 11. Stop conditions

Return `STATUS=BLOCKED` and STOP if:
- local HEAD is not the exact base before publication;
- current/final changed-path count differs from 26;
- any new tracked path is required;
- any product source change is required;
- `familypilot-obligation-state-ui.js` must change;
- a fake obligation-state API/DOM/test authority would be needed;
- any assertion must be removed/weakened;
- R02 or R03 exposes a genuine product failure after historical caller reconciliation;
- software installation/live provider action is required;
- complete final validation cannot pass in scope;
- remote branch moves before publication.

## 12. Successful producer return

```text
STATUS=SELF_VERIFIED_PENDING_INDEPENDENT_REVIEW
AMENDMENT_ID=FP85-P4D3B-R3B-R4-R1-A1-R1-A13-R02-R03-OBLIGATION-STATE-HISTORICAL-CONTRACT-CLOSURE
GOVERNANCE_COMMIT=c886102d0350166ae429ea755963a92285367cd6
PRODUCT_BASE=fea49751c850c1f62cc184843d5c19510d5ddbbf
A13_PRODUCT_SOURCE_EDITS=0
A13_EDITABLE_TEST_PATHS=tools/pf08a-m3-07b-r02-browser-smoke.mjs,tools/pf08a-m3-07b-r03-browser-smoke.mjs
FINAL_CHANGED_PATH_COUNT=26
CHANGED_PATH_GATE=PASS
R02_ASSERTION_INVENTORY_PRESERVED=PASS
R03_ASSERTION_INVENTORY_PRESERVED=PASS
R02_BROWSER=PASS
R03_BROWSER=PASS
OBLIGATION_STATE_TEST_BYPASS_CREATED=NO
OBLIGATION_STATE_PRODUCT_PATH_REQUIRED=NO
A12_TARGETED_CLOSURE_PRESERVED=PASS
COMPLETE_FINAL_CREATOR_VALIDATION=PASS
PRODUCT_CANDIDATE_COMMIT=<sha>
PRODUCT_PUSH_PERFORMED=YES
REMOTE_READBACK_SHA=<same sha>
REMOTE_READBACK_MATCH=YES
PR_CREATED=NO
MERGE_PERFORMED=NO
DEPLOY_PERFORMED=NO
WORKFLOW_DISPATCH_PERFORMED=NO
LIVE_SUPABASE_ACTION=NO
AUTHORITY_CUTOVER=NO
NEXT_STATUS=PENDING_NEW_CLEAN_CONTEXT_INDEPENDENT_REVIEW
```

If A13 proves a product module is required instead, return at least:

```text
STATUS=BLOCKED
AMENDMENT_ID=FP85-P4D3B-R3B-R4-R1-A1-R1-A13-R02-R03-OBLIGATION-STATE-HISTORICAL-CONTRACT-CLOSURE
A13_PRODUCT_SOURCE_EDITS=0
FINAL_CHANGED_PATH_COUNT=26
OBLIGATION_STATE_TEST_BYPASS_CREATED=NO
OBLIGATION_STATE_PRODUCT_PATH_REQUIRED=YES
BLOCKER_PATH=<exact proven product path>
BLOCKER_EVIDENCE=<exact readiness/boot/render error>
PRODUCT_COMMIT_CREATED=NO
PRODUCT_PUSH_PERFORMED=NO
NEXT_STATUS=REQUIRES_COORDINATION_PRODUCT_REPLAN
```

Then STOP.
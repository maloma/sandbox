# FamilyPilot #85 — P4D3B A12 Planned-Income Async Historical Caller Contract

TASK_ID: FP85-P4D3B-R3B-R4-R1-A1-R1-A12-PLANNED-INCOME-ASYNC-HISTORICAL-CALLER-CONTRACT
AMENDS: FP85-P4D3B-R3B-R4-R1-A1-R1-A11-PLANNED-INCOME-WRITABLE-MUTATION-INITIALIZATION-CLOSURE
PRIOR_ASYNC_PRECEDENT: FP85-P4D3B-R3B-R4-R1-A1-R1-A2-HISTORICAL-BROWSER-ASYNC-AMENDMENT
PARENT: maloma/FamilyPilot#85
ERROR_LEDGER_PRODUCT: maloma/decisionos-portfolio-governance#340
ERROR_LEDGER_PROCESS: maloma/decisionos-portfolio-governance#392
ERROR_LEDGER_VALIDATION: maloma/decisionos-portfolio-governance#398
EXECUTION_PROFILE: BOUNDED_DIRECT
CANDIDATE_STATUS_AFTER_CREATOR_PASS: SELF_VERIFIED / PENDING_INDEPENDENT_REVIEW
P4D3B_FINAL_STATUS: NOT_ACCEPTED

## 1. Exact baselines and continuation

Product repo: `maloma/sandbox`
Product branch: `fp85-p4d3b-authoritative-ui-mutation-gateway`
Published product base and required local HEAD before candidate commit: `fea49751c850c1f62cc184843d5c19510d5ddbbf`
Governance: `c886102d0350166ae429ea755963a92285367cd6`
A11 packet: `maloma/sandbox@2a48a397e7f4f343cc90553819533dcccfd8c19f`

Continue the SAME Codex chat and SAME existing uncommitted worktree. Preserve all valid A1-R1+A2+A3+A4+A5+A6+A8+A9+A11 work.

Producer-reported state entering A12:
- local HEAD remains exact published base;
- no stage, product commit or push occurred;
- current changed-path count remains exactly 25;
- no new repo paths exist;
- `git diff --check` PASS;
- A11 changed-path gate PASS;
- A11 planned-income read-only Proxy characterization PASS;
- A11 writable first-use initialization characterization PASS;
- A10/A11 Windows launcher adapter was cleaned;
- historical planned-income smoke remains base blob `5ecb287edc945abcb4fb944c55ebfe9155d1867b` before A12.

## 2. Exact demonstrated blocker

The unchanged historical planned-income smoke now reaches:

```text
TypeError: 'set' on proxy: trap returned falsish for property 'plannedIncomeRules'
at prepareWritableState (familypilot-planned-income.js:19:146)
at Object.createRule (familypilot-planned-income.js:29:110)
at Object.createRule (familypilot-planned-income-ui.js:81:86)
```

The cause is not a failure of A11 writable preparation. The smoke calls planned-income mutation synchronously using `__FP_RUNTIME__.state`, which is intentionally a shallow read-only Proxy. The permitted canonical mutation boundary is asynchronous and operates on a writable draft.

Independent base inspection confirms:
- `__FP_RUNTIME__.state` rejects root writes;
- `performCanonicalUiMutation(...)` is async and commits a synchronous draft mutator before adoption;
- the historical planned-income smoke synchronously consumes `a.plannedIncome.createRule(...)` and several other mutation calls and retains object/array references across mutations;
- the same repository already established the correct migration rule in A2 for R01/R02/R03/R05: await Promise-based canonical helpers and refresh state after whole-state adoption instead of restoring writable runtime state.

Therefore A12 is a caller/test-contract reconciliation under an already-established P4D3B rule. Do NOT restore synchronous writable runtime behavior.

## 3. Path boundary and changed-path ceiling

Before the first A12 edit, snapshot the exact current changed-path set relative to `fea49751c850c1f62cc184843d5c19510d5ddbbf` as `PRE_A12_CHANGED_PATHS`.

It must contain exactly 25 paths. If it does not, STOP `STATUS=BLOCKED` before editing.

A12 authorizes NEW material edits only to:

1. `familypilot-planned-income-ui.js` — already in the current changed set;
2. `tools/pf08a-m4-01-planned-income-browser-smoke.mjs` — may become the 26th changed path.

`familypilot-planned-income.js` A11 core is frozen during A12 unless a directly demonstrated defect remains after caller migration; if such a defect appears, STOP and return to Coordination rather than editing it under A12.

All other existing changed files are frozen.

Final changed-path set must be exactly `PRE_A12_CHANGED_PATHS` plus, if materially changed, `tools/pf08a-m4-01-planned-income-browser-smoke.mjs`.

Maximum final changed-path count: 26. No 27th changed path.

## 4. Single objective

Migrate the planned-income historical/test caller contract from legacy synchronous live-state mutation to the existing asynchronous authoritative writable-draft contract, while preserving every product assertion and preserving A9/A11 read-only and first-use semantics.

Required invariant:

```text
runtime/adopted state -> read only
mutation caller -> await authoritative draft commit -> re-read adopted state
historical coverage -> preserved, not weakened
```

## 5. Planned-income test API contract

In `familypilot-planned-income-ui.js`, test-mode mutation helpers must use the same authoritative mutation boundary as real product mutation flows.

For every mutating planned-income test helper used by the historical smoke:
- do not pass `runtime.state` directly to a mutating core API;
- call the core mutation on the writable draft supplied by `runtime.performCanonicalUiMutation(...)` or the already-established equivalent authoritative helper;
- await commit completion before reporting success;
- render/read only after successful adoption;
- return enough semantic result for the historical assertions without exposing a writable canonical object or requiring the caller to hold draft references;
- expected negative/no-op product results must remain distinguishable from authoritative commit failure.

At minimum inspect/reconcile the helpers for:
- create rule;
- create receipt/operation;
- link receipt;
- skip/not-received attempt;
- hide/show;
- enable/disable;
- any detach/removal path exercised by the historical smoke.

Do not add a test-only bypass that mutates adopted `runtime.state`.

## 6. Historical smoke async migration — preserve assertions

The planned-income historical smoke is now authorized for compatibility editing because the old synchronous caller contract is independently demonstrated invalid under P4D3B.

Preserve the same marker and the same behavioral assertions. Do not delete, weaken, narrow or replace assertions merely to obtain PASS.

Required caller adaptation:

1. await Promise-based canonical/test helpers before consuming results;
2. after every authoritative commit/adoption, re-read current state through `w.__FP_RUNTIME__.state` and re-resolve entities by stable IDs; do not retain occurrence/operation object references across commits and assume they remain canonical;
3. use stable IDs such as `ruleId`, `occurrenceId`, `operationId` across commits;
4. any fixture mutation currently performed directly against runtime state or nested objects must be moved through `w.__FP_RUNTIME__.performCanonicalUiMutation(...)` (or an equivalent already-authorized canonical test helper) so it mutates a writable draft and is awaited;
5. direct core calls such as planned-income create/detach against `runtime.state` are forbidden; if the smoke intentionally exercises core semantics, invoke the core against the authoritative draft inside the canonical mutation boundary and then re-read adopted state;
6. no fake local state, shadow state, write-through Proxy, runtime setter, local-first retry, queue or synchronous compatibility shim.

Known mutation-facing sites in the base smoke that MUST be audited rather than fixing only `createRule`:
- `a.setActiveWallet(...)` if Promise-based in the current worktree;
- `a.plannedIncome.createRule(...)`;
- direct `FamilyPilotPlannedIncome.createOperation(state, ...)`;
- `a.plannedIncome.createReceipt(...)`;
- direct `state.operations.push(manual)` fixture creation;
- `a.plannedIncome.linkReceipt(...)`;
- direct occurrence due-date writes used to create the aged-unreceived fixture;
- `a.plannedIncome.skip(...)`;
- `a.plannedIncome.hide(...)`;
- `a.plannedIncome.disable(...)`;
- direct `FamilyPilotPlannedIncome.detach(state, ...)`.

The aged-unreceived fixture and manual-income-link scenario must remain semantically equivalent after migration.

## 7. Assertion preservation gate

Before and after editing the historical smoke, inventory its existing product assertions and PASS payload fields.

Required preservation includes at least:
- separate planned-income module;
- recurring occurrence count;
- no leakage into obligations;
- amount-derived partial/received behavior;
- planned date versus actual receipt date;
- multiple partial receipts;
- linking an existing income without creating a duplicate;
- aged unpaid/history behavior;
- hidden state;
- disabled rules;
- operation marker;
- removal/void semantics without user Trash pollution;
- zero runtime errors;
- existing PASS marker `PF08A_M4_01_PLANNED_INCOME_BROWSER_PASS`.

`ASSERTION_INVENTORY_PRESERVED=PASS` is mandatory.

## 8. Browser portability while this smoke is legitimately changing

A10 already proved the historical runner's Linux-only Chrome discovery is a separate portability defect (#398). Because A12 now legitimately changes this exact smoke for async compatibility, A12 may also make the runner portable without changing product assertions.

Allowed portability change only:
- accept an explicit `CHROME_PATH` environment variable when it points to an existing Google Chrome/Chromium executable;
- otherwise retain the existing Linux path discovery behavior;
- preserve the exact Chrome argv, timeout behavior, HTTP harness behavior and PASS/failure semantics;
- do not substitute Edge or another browser family;
- do not install software.

On the current Windows executor, run the smoke with `CHROME_PATH` set to the already-installed Chrome discovered during A10/A11. No temporary preload should be needed after this change.

If portability cannot be achieved within this exact test file without weakening the oracle, STOP `STATUS=BLOCKED`.

## 9. Targeted validation after LAST material edit

Run at least:

1. `node --check familypilot-planned-income-ui.js`
2. `node --check tools/pf08a-m4-01-planned-income-browser-smoke.mjs`
3. `git diff --check`
4. exact A12 changed-path gate: pre-A12 25 + historical smoke only, maximum 26
5. A11 planned-income read-only Proxy characterization — PASS
6. A11 writable first-use initialization characterization — PASS
7. source/behavior check proving planned-income test mutations go through awaited authoritative draft flow
8. historical planned-income smoke using already-installed Chrome via `CHROME_PATH`, with no preload
9. `node tools/pf08a-m3-07b-r01-browser-smoke.mjs`

Required targeted result:
- `ASSERTION_INVENTORY_PRESERVED=PASS`
- `PLANNED_INCOME_TEST_API_ASYNC_AUTHORITATIVE=PASS`
- `HISTORICAL_SMOKE_NO_DIRECT_RUNTIME_MUTATION_BYPASS=PASS`
- `PLANNED_INCOME_HISTORICAL_SMOKE=PASS`
- `PLANNED_INCOME_RENDER_READONLY_COMPATIBLE=PASS`
- `WRITABLE_FIRST_USE_INITIALIZATION=PASS`
- `R01_POST_COMMIT_RENDER=PASS`

If the migrated smoke reaches a new genuine product assertion failure, STOP and report exact evidence. Do not weaken it.

## 10. Complete accumulated final creator validation

Only after targeted A12 PASS, rerun the COMPLETE final creator validation required by the A1-R1+A2+A3+A4+A5+A6+A8+A9+A11 chain after the LAST A12 material edit.

All prior required checks remain mandatory, including all required domain stages/browser regressions, root/mirror identity gates, held-commit/authoritative checks, node checks, diff checks, final read-only Proxy characterization, A8 closure preservation, M4-03 regression, planned-income historical regression and exact changed-path gate.

Do not weaken any historical regression to get PASS.

## 11. Candidate publication authority

ONLY after complete final creator validation PASS:
- re-check remote product branch still equals exact base `fea49751c850c1f62cc184843d5c19510d5ddbbf`;
- create at most ONE coherent candidate commit containing accumulated product/test compatibility work;
- perform at most ONE normal fast-forward push to `fp85-p4d3b-authoritative-ui-mutation-gateway`;
- exact remote readback required and must equal candidate SHA;
- no force push.

After push/readback candidate status is only:

`SELF_VERIFIED / PENDING_INDEPENDENT_REVIEW`

No PR, merge, deploy, workflow dispatch, live Supabase or authority cutover.

## 12. Stop conditions

Return `STATUS=BLOCKED` and STOP if:
- pre-A12 changed set is not exactly 25;
- any new changed path other than the planned-income historical smoke is required;
- `familypilot-planned-income.js` needs another material correction;
- assertions must be removed/weakened;
- runtime state would need to become writable;
- a test-only local-first/shadow-authority bypass would be required;
- a new genuine product failure appears after async migration;
- software installation/live action is required;
- complete final validation cannot pass in scope;
- remote product branch moves before publication.

## 13. Successful producer return

```text
STATUS=SELF_VERIFIED_PENDING_INDEPENDENT_REVIEW
AMENDMENT_ID=FP85-P4D3B-R3B-R4-R1-A1-R1-A12-PLANNED-INCOME-ASYNC-HISTORICAL-CALLER-CONTRACT
GOVERNANCE_COMMIT=c886102d0350166ae429ea755963a92285367cd6
PRODUCT_BASE=fea49751c850c1f62cc184843d5c19510d5ddbbf
PRE_A12_CHANGED_PATH_COUNT=25
FINAL_CHANGED_PATH_COUNT=26
CHANGED_PATH_GATE=PASS
A12_NEW_CHANGED_PATH=tools/pf08a-m4-01-planned-income-browser-smoke.mjs
PLANNED_INCOME_CORE_A11_FROZEN=YES
ASSERTION_INVENTORY_PRESERVED=PASS
PLANNED_INCOME_TEST_API_ASYNC_AUTHORITATIVE=PASS
HISTORICAL_SMOKE_NO_DIRECT_RUNTIME_MUTATION_BYPASS=PASS
WRITABLE_FIRST_USE_INITIALIZATION=PASS
PLANNED_INCOME_RENDER_READONLY_COMPATIBLE=PASS
PLANNED_INCOME_HISTORICAL_SMOKE=PASS
WINDOWS_CHROME_VIA_CHROME_PATH=PASS
TEMP_PRELOAD_USED=NO
R01_POST_COMMIT_RENDER=PASS
A8_CLOSURE_PRESERVED=PASS
M4_03_CLOSURE_PRESERVED=PASS
FINAL_READONLY_PROXY_CHARACTERIZATION=PASS
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

If not fully successful, return `STATUS=BLOCKED` with exact caller/assertion/path evidence and STOP.
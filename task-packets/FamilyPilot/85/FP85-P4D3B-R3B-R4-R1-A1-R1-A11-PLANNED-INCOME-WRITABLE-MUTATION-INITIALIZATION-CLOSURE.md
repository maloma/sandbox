# FamilyPilot #85 — P4D3B A11 Planned-Income Writable Mutation Initialization Closure

TASK_ID: FP85-P4D3B-R3B-R4-R1-A1-R1-A11-PLANNED-INCOME-WRITABLE-MUTATION-INITIALIZATION-CLOSURE
AMENDS: FP85-P4D3B-R3B-R4-R1-A1-R1-A9-PLANNED-INCOME-READONLY-CLOSURE-FINAL-CANDIDATE
VALIDATION_RECOVERY_PREDECESSOR: FP85-P4D3B-R3B-R4-R1-A1-R1-A10-WINDOWS-SMOKE-VALIDATION-RECOVERY
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
A9 packet: `maloma/sandbox@bfddc5aaef07637128f2830864993efcaf98d2f5`
A10 packet: `maloma/sandbox@afa3aa6fae39c79be91ea00d84efd11362530c81`

Continue the SAME Codex chat and SAME existing uncommitted worktree. Preserve all valid A1-R1+A2+A3+A4+A5+A6+A8+A9 changes.

Producer-reported state entering A11:
- local HEAD remains exact published base;
- no product commit/push/stage occurred;
- current changed paths = 25, all inside the existing A9 26-path allowlist;
- `git diff --check` PASS;
- A9 planned-income read-only Proxy characterization PASS;
- A10 temporary preload successfully ran the exact unchanged planned-income historical smoke through an already-installed Chrome;
- temporary preload was deleted and no new repo path remains;
- historical smoke remains exact unchanged blob `5ecb287edc945abcb4fb944c55ebfe9155d1867b`;
- the smoke then reached a real product assertion and failed at planned-income rule creation.

## 2. Exact demonstrated blocker

The exact runtime failure is:

```text
TypeError: Cannot read properties of undefined (reading 'push')
at Object.createRule (familypilot-planned-income.js:28:255)
at Object.createRule (familypilot-planned-income-ui.js:81:86)
```

Observed state: `plannedIncomeRules` is absent in runtime state when the historical smoke exercises `createRule`.

Independent exact-base inspection confirms the legacy hidden precondition:
- `normalizeState(state)` materializes `plannedIncomeRules`, `plannedIncomeOccurrences`, and `operations` before calling `ensureWindow()` / `sync()`;
- `createRule()` directly calls `state.plannedIncomeRules.push(rule)` and then `ensureWindow(...)`;
- `createOccurrence()` directly pushes into `state.plannedIncomeOccurrences`;
- `createOperation()` directly pushes into `state.operations`;
- other mutation entry points assume these module collections already exist.

Before A9, writable initialization was effectively supplied by mutating normalization during UI lifecycle. A9 correctly removed write-on-render/read behavior, exposing this mutation-side initialization dependency.

The required correction is therefore NOT to restore render normalization. It is to make explicit writable mutation preparation own collection initialization.

## 3. Scope — NO path expansion

The complete A11 allowlist remains the exact A9 maximum of 26 tracked paths. No 27th path.

During A11, NEW source edits are authorized only in these two already-allowed planned-income files:

- `familypilot-planned-income.js`
- `familypilot-planned-income-ui.js`

All existing A1–A9 hunks in other paths are frozen except for validation-generated temporary artifacts outside the repository.

The historical oracle is NOT editable:

- `tools/pf08a-m4-01-planned-income-browser-smoke.mjs`
- required blob: `5ecb287edc945abcb4fb944c55ebfe9155d1867b`

If any other product/test path requires a source change, return `STATUS=BLOCKED` with exact evidence and STOP.

## 4. Single objective

Restore complete planned-income writable mutation semantics when module collections are absent, without reintroducing any canonical write from post-commit render/read paths.

Required invariants:

```text
post_commit_render/read -> zero canonical writes
explicit writable mutation draft -> required module collections may be initialized and materialized
```

Do not restore boot/render `normalizeState(state)` against adopted canonical state.
Do not add a writable runtime compatibility layer, write-through Proxy, local-first fallback, shadow authority, hidden retry, queue, or authority cutover.

## 5. Required correction design

### A11-1 — explicit writable preparation

Implement the minimum coherent writable preparation needed by planned-income mutation APIs.

Acceptable shape: a clearly mutation-side helper such as `prepareWritableState(state, at)` / equivalent that initializes only required writable structures and normalizes mutation prerequisites.

At minimum, correctly handle absent/non-array:
- `plannedIncomeRules`;
- `plannedIncomeOccurrences`;
- `operations`.

Where mutation semantics require operation links to be objects, initialize them only in writable mutation context.

Do not persist derived occurrence state merely for reads.

### A11-2 — mutation entry-point coverage

Do not patch only the single failing `.push` if sibling mutation entry points retain the same hidden initialization precondition.

Inspect the planned-income mutation surface in the two files and ensure the coherent writable preparation is applied wherever required, including at least the paths used by:
- create rule;
- update/enable/disable rule when collections may initially be absent;
- create/link/detach receipt/operation;
- hide/unhide and other supported occurrence mutations where applicable.

The goal is not to over-normalize every call. The goal is to ensure explicit mutations are robust on a canonical state that legitimately lacks optional planned-income collections before the first planned-income mutation.

### A11-3 — preserve A9 pure reads

Preserve the A9 read-only closure:
- render/read/summary paths use non-mutating derived views;
- no UI render callback writes `status`, `linkedOperationIds`, `receivedAmount`, `receivedAt`, collections, schema, or other canonical fields;
- a missing planned-income collection during read is interpreted as an empty read view, not materialized into adopted state.

### A11-4 — UI authoritative mutation boundary

If `familypilot-planned-income-ui.js` participates in mutation preparation, it must do so only through the existing authoritative writable-draft mutation flow.

Do not mutate the adopted `runtime.state` merely to initialize the module before entering the authoritative mutation boundary.

Historical test-mode APIs must exercise the same product mutation semantics sufficiently to remain a valid regression oracle; do not special-case PASS solely for the test.

## 6. Targeted validation after LAST material edit

Run, in this order or an equivalent dependency-safe order:

1. `node --check familypilot-planned-income.js`
2. `node --check familypilot-planned-income-ui.js`
3. `git diff --check`
4. exact changed-path gate against the unchanged A9 26-path allowlist
5. planned-income read-only Proxy characterization — must remain PASS
6. a focused writable-state characterization starting from state where `plannedIncomeRules` and `plannedIncomeOccurrences` are absent, proving first create-rule mutation succeeds and materializes required structures only on writable input
7. exact unchanged planned-income historical smoke through the same constrained A10 Windows preload adapter outside the repository
8. `node tools/pf08a-m3-07b-r01-browser-smoke.mjs`

For the Windows adapter, all A10 constraints remain:
- use only already-installed Chrome/Chromium;
- adapter outside repo;
- do not install anything;
- preserve target smoke and argv;
- delete adapter after run;
- no new repo paths;
- smoke blob remains exact `5ecb287edc945abcb4fb944c55ebfe9155d1867b`.

Required targeted result:
- historical planned-income smoke PASS;
- read-only characterization PASS;
- first-use mutation initialization PASS;
- R01 PASS with no post-commit canonical write.

If the historical smoke reaches a different product assertion failure, STOP and report exact evidence. Do not weaken the oracle.

## 7. Complete accumulated final creator validation

Only after targeted A11 PASS, rerun the COMPLETE final creator validation required by A9/A10 after the LAST A11 material edit.

All prior required checks remain mandatory, including:
- all domain stages required by A1-R1+A2+A3+A4+A5+A6+A8+A9;
- all required browser regressions;
- R01 post-commit render;
- A8 transfer/base-render closure;
- M4-03 savings/forecast regression where required by A6;
- planned-income historical regression through the constrained Windows adapter;
- final post-commit read-only Proxy characterization;
- root/mirror identity/equality gates;
- node checks;
- `git diff --check`;
- exact changed-path set relative to `fea49751c850c1f62cc184843d5c19510d5ddbbf` as a subset of the unchanged 26-path allowlist;
- held-commit / authoritative mutation checks required by prior packets.

No historical test may be weakened or edited.

## 8. Candidate publication authority

ONLY after COMPLETE final creator validation PASS:

- create at most ONE coherent product candidate commit containing accumulated A1-R1+A2+A3+A4+A5+A6+A8+A9+A11 source work;
- perform at most ONE normal fast-forward push to `fp85-p4d3b-authoritative-ui-mutation-gateway`;
- no force push;
- exact remote branch readback mandatory;
- remote readback SHA must exactly equal candidate SHA.

Before commit/push, re-check remote branch still equals exact base `fea49751c850c1f62cc184843d5c19510d5ddbbf`.

After exact push/readback the status is only:

`SELF_VERIFIED / PENDING_INDEPENDENT_REVIEW`

No PR, merge, deploy, workflow dispatch, live Supabase or authority cutover.

## 9. Stop conditions

Return `STATUS=BLOCKED` and STOP before expansion if:
- any 27th tracked path or any non-planned-income source edit is required;
- historical smoke would need editing;
- A9 read-only closure regresses;
- a new product assertion failure appears outside the two-file planned-income correction boundary;
- tests would need weakening;
- software installation/live provider action is required;
- complete final validation cannot pass inside this scope;
- remote product branch moves before candidate publication.

## 10. Successful producer return

```text
STATUS=SELF_VERIFIED_PENDING_INDEPENDENT_REVIEW
AMENDMENT_ID=FP85-P4D3B-R3B-R4-R1-A1-R1-A11-PLANNED-INCOME-WRITABLE-MUTATION-INITIALIZATION-CLOSURE
GOVERNANCE_COMMIT=c886102d0350166ae429ea755963a92285367cd6
PRODUCT_BASE=fea49751c850c1f62cc184843d5c19510d5ddbbf
A11_NEW_SOURCE_PATHS=0
A11_EDITABLE_SOURCE_PATHS=familypilot-planned-income.js,familypilot-planned-income-ui.js
A9_ALLOWED_PATHS=26
FINAL_CHANGED_PATH_COUNT=<n>
CHANGED_PATH_GATE=PASS
WRITABLE_FIRST_USE_INITIALIZATION=PASS
PLANNED_INCOME_RENDER_READONLY_COMPATIBLE=PASS
PLANNED_INCOME_HISTORICAL_SMOKE=PASS
HISTORICAL_SMOKE_SOURCE_UNCHANGED=YES
HISTORICAL_SMOKE_BLOB_SHA=5ecb287edc945abcb4fb944c55ebfe9155d1867b
TEMP_PRELOAD_OUTSIDE_REPO=YES
TEMP_PRELOAD_CLEANED=YES
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

If not fully successful, return `STATUS=BLOCKED` with exact path/caller/assertion evidence and STOP.
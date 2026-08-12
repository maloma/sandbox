# FamilyPilot #85 — P4D3B A1-R1 A5 Partial-Payment Caller Closure

TASK_ID: FP85-P4D3B-R3B-R4-R1-A1-R1-A5-PARTIAL-PAYMENT-CALLER-CLOSURE
AMENDS: FP85-P4D3B-R3B-R4-R1-A1-R1-A4-GOVERNANCE-DELTA-INDEPENDENT-REVIEW
PARENT: maloma/FamilyPilot#85
ERROR_LEDGER_PRODUCT: maloma/decisionos-portfolio-governance#340
EXECUTION_PROFILE: BOUNDED_DIRECT
CANDIDATE_STATUS_AFTER_CREATOR_PASS: SELF_VERIFIED / PENDING_INDEPENDENT_REVIEW
P4D3B_FINAL_STATUS: NOT_ACCEPTED

## 1. Exact baselines

Product repository: `maloma/sandbox`

Product branch: `fp85-p4d3b-authoritative-ui-mutation-gateway`

Exact published product base remains:

`fea49751c850c1f62cc184843d5c19510d5ddbbf`

Current governance exact commit:

`c886102d0350166ae429ea755963a92285367cd6`

Current task-packet chain is A1-R1 + A2 + A3 + A4 + this A5.

A5 does not replace earlier requirements except where it explicitly expands the caller allowlist below.

## 2. Why A5 exists

A4 STEP-A4-1 correctly stopped before scope expansion.

Independent base inspection confirms that the canonical/async conversion of `familypilot-partial-payments.js` has three direct product callers outside the A3 14-path ceiling:

- `familypilot-partial-payment-removal-v2.js`
- `familypilot-partial-payment-entry-ui.js`
- `familypilot-overpayment-resolution.js`

At exact base these callers retain legacy assumptions that are directly coupled to the partial-payment mutation API:

- synchronous use of `createOperation`, `attachOperation`, and/or `restoreRemembered`;
- long-lived `runtime.state` reads;
- direct canonical mutation and/or `runtime.save` in removal/overpayment paths;
- success UI/render that assumes mutation has already committed;
- `familypilot-overpayment-resolution.js` can generate an occurrence through `ensureOccurrencesWindow(state, ...)` from a read/preview path.

Leaving these callers unchanged would either break preserved partial-payment behavior or force the core API back to legacy write-through. Both are forbidden.

## 3. Continue SAME Codex chat and SAME worktree

Continue the SAME Codex chat and SAME existing uncommitted worktree.

Before any new edit verify:

1. `HEAD` is exact `fea49751c850c1f62cc184843d5c19510d5ddbbf`;
2. no product commit has been created;
3. no product push has occurred;
4. current changed paths are a subset of the A5 allowlist below;
5. no unrelated tracked/untracked product changes exist.

Preserve all valid existing A1-R1+A2+A3+A4 work.

Do not restart implementation or repeat already completed reconciliation unless the relevant changed hunks materially changed.

## 4. Complete A5 allowlist — maximum 17 tracked paths

The complete ceiling is exactly these SEVENTEEN paths:

1. `familypilot-linked-obligation-operation-lifecycle.js`
2. `index.html`
3. `src/familypilot.html`
4. `tools/fp85-p4d3b-authoritative-ui-mutation-gateway-domain-smoke.cjs`
5. `tools/pf08a-m3-07b-r04-browser-smoke.mjs`
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

No eighteenth path.

The three newly authorized files are allowed only for direct partial-payment canonical/async compatibility and preserved historical behavior.

If any additional product caller or implementation file is required, return `STATUS=BLOCKED` with the exact path and reason. Do not expand scope automatically.

## 5. A5 small-step plan

Use one bounded dependent review pool for the coherent partial-payment canonical boundary.

### STEP-A5-1 — partial-payment core mutation contract

SINGLE_OBJECTIVE: finish `familypilot-partial-payments.js` canonical mutation contract.

Required result:

- no long-lived mutable `runtime.state` authority capture;
- no `runtime.save` as canonical writer;
- read-only functions such as `summary` remain read-only and preferably synchronous when semantically safe;
- mutation functions use current-state reads and the existing canonical draft bridge;
- mutation functions may become Promise-based where required;
- no local-first write, hidden retry, queue, second authority, or writable runtime-state compatibility layer;
- preserved partial-payment calculations, link identity, memory semantics, revisions and UI-visible outcomes.

Creator self-check after this step. Status only `SELF_VERIFIED / PENDING_INDEPENDENT_REVIEW`.

### STEP-A5-2 — removal / remembered-group caller

SINGLE_OBJECTIVE: adapt `familypilot-partial-payment-removal-v2.js` to the canonical async partial-payment contract.

Required result:

- replace long-lived `runtime.state` with current-state reads;
- remove `runtime.save` canonical dependency;
- `completeRemoval` performs removal/skip/recalculation inside authoritative draft mutation;
- remembered partial-group restore awaits the canonical partial-payment API;
- replace-current + restore semantics remain coherent and do not announce success before commit;
- `suppressAutomaticPartialRestore` must not perform direct canonical delete/restore through an unawaited `queueMicrotask(...save...)` path;
- user cancel/reject behavior remains no-op;
- R02/R03 historical behavior remains intact.

Creator self-check after this step.

### STEP-A5-3 — entry UI caller

SINGLE_OBJECTIVE: adapt `familypilot-partial-payment-entry-ui.js` to Promise-based mutation APIs without changing UX semantics.

Required result:

- no stale captured canonical state for post-commit reads;
- read-only matching/summary remains read-only;
- `attachOperation`, overpayment `resolve`, new-operation creation and linked actions are awaited when they mutate;
- modal close, render and success toast happen only after successful canonical commit;
- failure preserves input/context and last verified UI state;
- reconciliation still links an existing exact match without duplication;
- no-match still creates exactly one operation;
- overpayment choices and entered date semantics remain unchanged.

Creator self-check after this step.

### STEP-A5-4 — overpayment resolution caller/domain adapter

SINGLE_OBJECTIVE: make `familypilot-overpayment-resolution.js` draft-only and remove write-on-preview behavior.

Required result:

- no long-lived `runtime.state` authority capture;
- no `runtime.save` canonical dependency;
- `preview` / read helpers do not mutate canonical state;
- `nextOccurrence` must not call `ensureOccurrencesWindow(state, ...)` from a read/preview path;
- carry eligibility may be computed from recurring-rule schedule without materializing canonical state;
- actual carry resolution may materialize the required next occurrence only inside the same authoritative draft mutation;
- source-operation voiding, current-part creation, next-part creation, revisions and payment-link recalculation are one coherent canonical mutation;
- failure discards the draft instead of manually rolling back live state;
- no success render before commit;
- R05 overpayment semantics remain unchanged.

Creator self-check after this step.

### STEP-A5-5 — existing payment-attention compatibility

SINGLE_OBJECTIVE: finish the already-started `familypilot-payment-attention.js` demo/test canonical compatibility from A4.

No attention product-semantic redesign.

Creator self-check after this step.

### STEP-A5-6 — coherent final creator validation

SINGLE_OBJECTIVE: run the complete A1-R1+A2+A3+A4+A5 regression set after the LAST material edit.

No candidate publication before this step is PASS.

## 6. API compatibility rule

Do not preserve synchronous mutation APIs by reintroducing legacy authority.

Preferred compatibility:

- pure/read-only APIs remain synchronous when safe;
- canonical mutation APIs return Promises and callers explicitly `await` them;
- UI event handlers become async as needed;
- tests/harnesses await the same real APIs;
- callers refresh state after commit through current runtime reads rather than stale captured objects.

Do not use a writable `runtime.state` setter, public `runtime.save`, write-through Proxy, local-first staging, hidden queue, or silent retry.

## 7. Historical regression preservation

A5 does not permit shrinking historical M3-07B coverage.

R01–R05 and generic M3-07B scenarios must retain their historical assertions while adapting to async canonical behavior.

At minimum preserve:

- reconciliation/link-existing/no-duplicate behavior;
- partial/full payment removal behavior;
- remembered partial-group restore behavior;
- linked edit/delete/restore recalculation behavior;
- overpayment correct/leave/carry behavior;
- rejected/cancelled user actions remain no-op;
- operation/occurrence link identity and paid/partial/planned amounts/statuses.

## 8. P4D3B stage/evidence contract remains unchanged

Required creator-side stage contracts remain:

- `--stage=r3a` → exact marker `FP85_P4D3B_R3A_CORE_UI_MUTATION_PASS`
- `--stage=r3b` → exact marker `FP85_P4D3B_R3B_OBLIGATIONS_PASS`
- `--stage=a1-r1` diagnostic stage if retained
- no-stage/full → deterministic expected incomplete result
- final P4D3B PASS marker must NOT be emitted.

Strengthen/retain executable evidence for the new three caller paths so R3B fails if a caller still mutates live canonical state, calls `runtime.save`, performs success UI before commit, or calls a now-async mutation synchronously.

## 9. VirtualAlloc handling remains unchanged

A single `VirtualAlloc failed` without product assertion failure is an environment interruption.

After final edits:

1. clear only stale child browser/Node processes created by this task;
2. retry the exact failed command once without code changes;
3. if it recurs, return `STATUS=BLOCKED` and `ENVIRONMENT_BLOCKER=VIRTUALALLOC_FAILURE`;
4. do not commit/push in that blocked state.

Do not change product/test semantics to work around VirtualAlloc.

## 10. Required final validation

Run the complete A1-R1+A2+A3+A4 validation after the LAST material edit, including at minimum:

```text
node --check tools/fp85-p4d3b-authoritative-ui-mutation-gateway-domain-smoke.cjs
node tools/fp85-p4d3b-authoritative-ui-mutation-gateway-domain-smoke.cjs --stage=r3a
node tools/fp85-p4d3b-authoritative-ui-mutation-gateway-domain-smoke.cjs --stage=r3b
node tools/fp85-p4d3b-authoritative-ui-mutation-gateway-domain-smoke.cjs --stage=a1-r1
node tools/fp85-p4d3b-authoritative-ui-mutation-gateway-domain-smoke.cjs
node tools/pf08a-m3-01-verify-plan-obligations.mjs
node tools/fp85-p3b-safe-trash-ui-domain-smoke.cjs
node tools/fp85-p4d3a-authoritative-mutation-gateway-domain-smoke.cjs
git diff --check
```

Run all existing applicable partial-payment/removal/overpayment/link-lifecycle Node smokes.

When an already-installed supported browser is available, run:

```text
node tools/pf08a-m3-07b-browser-smoke.mjs
node tools/pf08a-m3-07b-r01-browser-smoke.mjs
node tools/pf08a-m3-07b-r02-browser-smoke.mjs
node tools/pf08a-m3-07b-r03-browser-smoke.mjs
node tools/pf08a-m3-07b-r04-browser-smoke.mjs
node tools/pf08a-m3-07b-r05-browser-smoke.mjs
```

Do not install browsers/packages.

Root/mirror byte identity and canonical characterization remain mandatory.

## 11. Changed-path gate

Before candidate commit, exact changed paths relative to `fea49751c850c1f62cc184843d5c19510d5ddbbf` must be a subset of the exact 17-path A5 allowlist.

No eighteenth path.

A path being allowed does not require it to be changed.

## 12. Candidate publication authority

After full creator-side validation PASS only:

- create at most one coherent candidate commit;
- one normal fast-forward push to `fp85-p4d3b-authoritative-ui-mutation-gateway` is allowed under the existing Founder authorization;
- exact remote readback required;
- no force push.

The pushed result is only:

`SELF_VERIFIED / PENDING_INDEPENDENT_REVIEW`

It is NOT R3B Governance Acceptance, P4D3B final acceptance, merge readiness, release readiness, or cutover authority.

No PR, merge, deploy, workflow dispatch or live Supabase action.

## 13. Independent review boundary

After exact candidate push/readback, implementation stops.

A separate NEW CLEAN CONTEXT reviewer must independently review the exact candidate under current governance before Coordination may accept R3B.

Reviewer must not modify the candidate or manufacture missing producer evidence.

## 14. Stop conditions

Return `STATUS=BLOCKED` before scope expansion if:

- HEAD/base changed;
- any 18th tracked path is required;
- obligations domain / controller / P4D3A / unrelated product module must change;
- preserved partial-payment semantics cannot be maintained within the 17 paths;
- a hidden caller requires architectural redesign rather than async adaptation;
- live provider action is required;
- recurring VirtualAlloc prevents final validation.

Do not weaken tests to obtain COMPLETE.

## 15. Final producer return additions

Return the A4 report plus:

```text
AMENDMENT_ID=FP85-P4D3B-R3B-R4-R1-A1-R1-A5-PARTIAL-PAYMENT-CALLER-CLOSURE
GOVERNANCE_COMMIT=c886102d0350166ae429ea755963a92285367cd6
A5_ALLOWED_PATHS=17
CHANGED_PATH_GATE=PASS|FAIL

PARTIAL_PAYMENT_CORE_CANONICAL=PASS|FAIL|NA
REMOVAL_V2_ASYNC_CANONICAL=PASS|FAIL|NA
ENTRY_UI_ASYNC_CANONICAL=PASS|FAIL|NA
OVERPAYMENT_RESOLUTION_CANONICAL=PASS|FAIL|NA
OVERPAYMENT_PREVIEW_PURE_READ=PASS|FAIL|NA
PAYMENT_ATTENTION_COMPATIBILITY=PASS|FAIL|NA

R01_BROWSER=PASS|FAIL|NA
R02_BROWSER=PASS|FAIL|NA
R03_BROWSER=PASS|FAIL|NA
R04_BROWSER=PASS|FAIL|NA
R05_BROWSER=PASS|FAIL|NA
GENERIC_M3_07B_BROWSER=PASS|FAIL|NA

STEP_A5_1_SELF_CHECK=PASS|FAIL|NA
STEP_A5_2_SELF_CHECK=PASS|FAIL|NA
STEP_A5_3_SELF_CHECK=PASS|FAIL|NA
STEP_A5_4_SELF_CHECK=PASS|FAIL|NA
STEP_A5_5_SELF_CHECK=PASS|FAIL|NA
STEP_A5_6_FINAL_CREATOR_VALIDATION=PASS|FAIL|BLOCKED|NA

STATUS=SELF_VERIFIED_PENDING_INDEPENDENT_REVIEW|BLOCKED|FAILED
INDEPENDENT_REVIEW_STATUS=PENDING|NA
R3B_FINAL_ACCEPTED=NO
P4D3B_FINAL_ACCEPTED=NO
ERROR_LEDGER_340_CLOSE_ALLOWED=NO
LIVE_CUTOVER_ALLOWED=NO
```

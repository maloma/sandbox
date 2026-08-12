# FamilyPilot #85 — P4D3B A9 Planned-Income Read-Only Closure + Final Candidate

TASK_ID: FP85-P4D3B-R3B-R4-R1-A1-R1-A9-PLANNED-INCOME-READONLY-CLOSURE-FINAL-CANDIDATE
AMENDS: FP85-P4D3B-R3B-R4-R1-A1-R1-A8-BASE-RENDER-NORMALIZATION-CLOSURE
DERIVED_FROM_SCAN: FP85-P4D3B-R3B-R4-R1-A1-R1-A7-POST-COMMIT-READONLY-DEPENDENCY-CLOSURE-SCAN
PARENT: maloma/FamilyPilot#85
ERROR_LEDGER_PRODUCT: maloma/decisionos-portfolio-governance#340
ERROR_LEDGER_PROCESS: maloma/decisionos-portfolio-governance#392
EXECUTION_PROFILE: BOUNDED_DIRECT
CANDIDATE_STATUS_AFTER_CREATOR_PASS: SELF_VERIFIED / PENDING_INDEPENDENT_REVIEW
P4D3B_FINAL_STATUS: NOT_ACCEPTED

## 1. Exact baselines

Product repo: `maloma/sandbox`
Product branch: `fp85-p4d3b-authoritative-ui-mutation-gateway`
Published product base and required local HEAD before candidate commit: `fea49751c850c1f62cc184843d5c19510d5ddbbf`
Governance: `c886102d0350166ae429ea755963a92285367cd6`
A8 packet: `maloma/sandbox@9d2f6c9acd2444b680c5955bc3d09712bbf7fcd4`

Continue the SAME Codex chat and SAME existing uncommitted worktree. Preserve all valid A1-R1+A2+A3+A4+A5+A6+A8 work. A7 made no product edits.

Before editing verify:
1. local HEAD is exact product base;
2. no product commit/push exists after that base;
3. current changed paths remain the reported A8 set (23 paths) and contain no unrelated changes;
4. no A8 hunk is reverted merely to simplify A9.

## 2. Why A9 exists

A8 completed the A7 Groups 1–2 closure and reports PASS for transfer, wallet-management, savings-goals, debts, M4-03 preservation, domain smoke and checks. R01 advanced to the exact A7-predicted remaining blocker: planned-income.

The remaining demonstrated class is:

`familypilot-planned-income-ui.js -> api.sync(state) / normalizeState(state) -> familypilot-planned-income.js`

Core `sync(state)` derives and writes planned-income occurrence state (`status`, `linkedOperationIds`, `receivedAmount`, `receivedAt`) from linked canonical income operations. That is legitimate when materializing on a writable draft, but must not be executed as a write against post-commit read-only adopted canonical state merely to render/read.

A9 closes this final known A7 dependency group and then runs the complete creator validation for the entire accumulated P4D3B candidate.

## 3. Complete A9 allowlist — maximum 26 tracked paths

The complete allowed set is the prior A8 twenty-four paths plus exactly TWO planned-income product paths:

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
18. `familypilot-m4-03-savings-accounts.js`
19. `familypilot-m4-03-savings-accounts-ui.js`
20. `familypilot-wallet-transfers.js`
21. `familypilot-wallet-transfers-ui.js`
22. `familypilot-wallet-management.js`
23. `familypilot-savings-goals.js`
24. `familypilot-debts.js`
25. `familypilot-planned-income.js`
26. `familypilot-planned-income-ui.js`

No 27th tracked path.

A path being allowed does not require it to change.

The existing planned-income regression `tools/pf08a-m4-01-planned-income-browser-smoke.mjs` is a validation oracle and is NOT authorized for modification.

If any 27th path or historical test edit is genuinely required, return `STATUS=BLOCKED` with exact evidence. Do not widen scope.

## 4. Single objective

Make planned-income post-commit render/read behavior compatible with the read-only adopted canonical-state contract while preserving the exact existing planned-income product semantics, then prove the entire accumulated P4D3B candidate with the complete creator-side validation.

Required invariant:

`post_commit_render/read -> zero canonical writes`

Writable planned-income mutations and derived-state materialization may occur only in explicitly writable draft/state contexts before authoritative commit/adoption.

Do not introduce:
- writable runtime compatibility setters;
- write-through proxies;
- hidden mutable shadow state as a second authority;
- local-first fallback;
- offline authoritative queue;
- silent retry that changes authority semantics;
- automatic authority activation/cutover.

## 5. Planned-income closure requirements

### A9-1 Classify planned-income callers

Within the two new files, distinguish:
- pure read/render/summary callers;
- explicit writable mutation/materialization callers;
- initialization/migration-only callers.

Do not globally neuter `sync()` if real mutation APIs rely on it to produce canonical derived fields on writable drafts.

### A9-2 Pure read view

Provide a non-mutating way for render/read code to obtain the same derived planned-income information currently produced by `sync(state)`.

Required read semantics include at least:
- occurrence status derived from linked active income operations;
- linked operation IDs;
- received amount;
- received timestamp;
- remaining/shortfall/excess and display status behavior;
- hidden/disabled/history behavior already covered by the historical regression.

A pure read must not persist derived values merely because the UI is rendered.

### A9-3 Writable mutation semantics

Existing mutation flows (create/update rule, link/create/detach receipt, disable/enable/hide and other currently supported planned-income mutations) must continue to produce the same user-visible and canonical semantics when operating on writable draft/state.

Do not convert a genuine mutation into a discarded private clone.

### A9-4 UI read-only compatibility

`familypilot-planned-income-ui.js` must not call mutating normalization/sync against adopted post-commit state from render/read paths.

Long-lived captured `runtime.state` must not be used as an excuse to mutate after commit. Read helpers may use current adopted state only through non-mutating semantics.

## 6. Historical semantics to preserve

Run and preserve without editing:

`node tools/pf08a-m4-01-planned-income-browser-smoke.mjs`

The regression covers, among other things:
- separate planned-income module;
- recurring occurrences;
- amount-derived partial/received semantics;
- planned vs actual dates;
- multiple receipts;
- linking an existing income operation without duplication;
- history/aged-unreceived behavior;
- hidden state;
- disabled rules;
- operation markers;
- removal without polluting user Trash;
- zero runtime errors.

## 7. Targeted A9 validation

After the LAST A9 material edit, before the expensive whole-candidate gate, run at least:

1. `node --check familypilot-planned-income.js`
2. `node --check familypilot-planned-income-ui.js`
3. `git diff --check`
4. exact changed-path gate against the 26-path allowlist
5. planned-income read-only Proxy characterization proving render/read causes no canonical writes
6. `node tools/pf08a-m4-01-planned-income-browser-smoke.mjs`
7. `node tools/pf08a-m3-07b-r01-browser-smoke.mjs`

Required targeted result: R01 has no remaining post-commit read-only write blocker and planned-income historical behavior remains intact.

If R01 exposes any NEW unrelated product write outside the A7 closure after A9, return `STATUS=BLOCKED` with exact path/caller/stack. Do not add a 27th path.

## 8. Complete final creator validation

Only after targeted A9 PASS, rerun the COMPLETE accumulated final validation required by the A1-R1+A2+A3+A4+A5+A6+A8 chain after the LAST material edit.

This includes all existing required domain stages, browser regressions, root/mirror identity checks, node checks, diff checks, changed-path gates, held-commit / authoritative mutation checks and historical regressions required by the prior packets.

In addition explicitly include:
- R01 browser smoke;
- A8 transfer/base render compatibility checks;
- M4-03 historical savings/forecast smoke when browser is available as required by A6;
- planned-income historical smoke;
- final read-only Proxy characterization over the post-commit render path;
- exact root/mirror equality/identity gate required by the earlier packet chain;
- exact changed-path set relative to `fea49751c850c1f62cc184843d5c19510d5ddbbf` as a subset of this A9 26-path allowlist.

Do not weaken or edit historical tests to obtain PASS.

## 9. Candidate publication authority

ONLY after the complete creator validation is PASS:

- create at most ONE coherent product candidate commit containing the accumulated A1-R1+A2+A3+A4+A5+A6+A8+A9 work;
- perform at most ONE normal fast-forward push to `fp85-p4d3b-authoritative-ui-mutation-gateway` under the existing Founder authorization;
- no force push;
- exact remote branch readback is mandatory;
- remote readback SHA must exactly equal the locally created candidate SHA.

After push/readback the candidate status is only:

`SELF_VERIFIED / PENDING_INDEPENDENT_REVIEW`

It is NOT R3B Governance Acceptance, P4D3B final acceptance, merge readiness, release readiness or authority cutover.

No PR, merge, deploy, workflow dispatch, live Supabase or cutover.

## 10. Independent review boundary

After exact candidate push/readback, implementation stops.

A NEW CLEAN CONTEXT reviewer must independently review the exact candidate under current governance. Reviewer must not modify the candidate or manufacture missing creator evidence.

Coordination may perform R3B Governance Acceptance only after that independent review returns an acceptable terminal verdict.

## 11. Stop conditions

Return `STATUS=BLOCKED` before scope expansion if:
- local HEAD/base changed before candidate creation;
- any 27th tracked path is required;
- planned-income historical smoke itself would need editing;
- a new unrelated post-commit write outside the A7 closure appears;
- product semantics require redesign rather than read-only compatibility closure;
- any required prior regression fails and cannot be resolved inside the 26-path scope;
- tests would need weakening;
- live provider action is required;
- recurring environment failure prevents complete final validation.

## 12. Successful producer return

On full success return at least:

```text
STATUS=SELF_VERIFIED_PENDING_INDEPENDENT_REVIEW
AMENDMENT_ID=FP85-P4D3B-R3B-R4-R1-A1-R1-A9-PLANNED-INCOME-READONLY-CLOSURE-FINAL-CANDIDATE
GOVERNANCE_COMMIT=c886102d0350166ae429ea755963a92285367cd6
PRODUCT_BASE=fea49751c850c1f62cc184843d5c19510d5ddbbf
A9_ALLOWED_PATHS=26
FINAL_CHANGED_PATH_COUNT=<n>
CHANGED_PATH_GATE=PASS
PLANNED_INCOME_RENDER_READONLY_COMPATIBLE=PASS
PLANNED_INCOME_HISTORICAL_SMOKE=PASS
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

If not fully successful, return `STATUS=BLOCKED` with exact evidence and STOP.
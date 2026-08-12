# FamilyPilot #85 — P4D3B A8 Base Render Normalization Closure

TASK_ID: FP85-P4D3B-R3B-R4-R1-A1-R1-A8-BASE-RENDER-NORMALIZATION-CLOSURE
AMENDS: FP85-P4D3B-R3B-R4-R1-A1-R1-A6-M4-03-READONLY-ADOPTED-STATE-CLOSURE
DERIVED_FROM_SCAN: FP85-P4D3B-R3B-R4-R1-A1-R1-A7-POST-COMMIT-READONLY-DEPENDENCY-CLOSURE-SCAN
PARENT: maloma/FamilyPilot#85
ERROR_LEDGER_PRODUCT: maloma/decisionos-portfolio-governance#340
ERROR_LEDGER_PROCESS: maloma/decisionos-portfolio-governance#392
EXECUTION_PROFILE: BOUNDED_DIRECT
CANDIDATE_PUBLICATION_AUTHORITY: NONE
P4D3B_FINAL_STATUS: NOT_ACCEPTED

## 1. Exact baselines

Product repo: `maloma/sandbox`
Product branch: `fp85-p4d3b-authoritative-ui-mutation-gateway`
Published product base and required local HEAD: `fea49751c850c1f62cc184843d5c19510d5ddbbf`
Governance: `c886102d0350166ae429ea755963a92285367cd6`
A7 packet: `maloma/sandbox@e3ff784a3aafecdc021e3c8ea53c99155b844cd1`

Continue the SAME Codex chat and SAME existing uncommitted worktree. Preserve all valid A1-R1+A2+A3+A4+A5+A6 changes. A7 made no product edits.

Before editing verify: HEAD remains exact base; no product commit/push exists; current changed paths remain the reported 18-path subset; no unrelated tracked/untracked product changes exist.

## 2. Why A8 exists

A7 completed a repository-wide read-only dependency closure scan of the actual R01-loaded runtime surface.

The scan confirmed two coherent implementation groups before the separate planned-income sync problem:

1. wallet transfer render normalization;
2. inline base render normalizers for wallet management, savings goals, and debts.

A7 separately classified planned-income `api.sync(state)` as its own derived-state write group. That group is deliberately NOT part of A8 and must be handled by a later A9 packet.

A8 therefore closes only Groups 1–2 and is an intermediate implementation tranche. It must not publish a candidate commit.

## 3. Complete A8 allowlist — maximum 24 tracked paths

The complete allowed set is the prior A6 nineteen paths plus exactly FIVE new product paths:

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

No 25th tracked path.

A path being allowed does not require it to change.

Explicitly NOT authorized in A8: `familypilot-planned-income.js`, `familypilot-planned-income-ui.js`, standalone wallet-management/savings/debts UI files, obligations standalone UI, historical test sources other than already-allowed regression owners.

If any 25th path is genuinely required, return `STATUS=BLOCKED` with exact evidence. Do not widen scope.

## 4. Single objective

Make the actual R01 post-commit render chain for transfer + inline wallet-management + inline savings-goals + inline debts compatible with read-only adopted canonical state, while preserving existing product semantics and mutation behavior on writable drafts.

Required invariant:

`post_commit_render/read -> zero canonical writes`

A8 must not introduce a writable compatibility layer, setter/write-through Proxy, hidden local copy as second authority, retry queue, local-first fallback, or automatic authority cutover.

## 5. Required closure by group

### A8-1 Wallet transfers

Known exact-base defect:

`familypilot-wallet-transfers-ui.js` calls `transferApi.normalizeState(state, now())` from `runtime.setRenderAll(...)`; `familypilot-wallet-transfers.js::normalizeState()` writes `schemaVersion`, `household`, `transfers`, `walletMovements`, and `operations`.

Required result:
- render/open-detail/read helpers do not require mutating canonical normalization;
- transfer projections/movements remain semantically identical;
- mutation APIs may normalize only writable draft/state contexts;
- historical WF-02 behavior remains intact.

### A8-2 Inline wallet management

Actual R01 loader uses the inline implementation in `index.html` / mirrored `src/familypilot.html`, not the standalone UI file.

Required result:
- render path does not call a mutating normalizer on adopted state;
- selector refresh does not mutate `activeWalletId` during pure post-commit render;
- wallet visibility, inclusion, labels, default-wallet semantics and user mutation flows remain unchanged.

`familypilot-wallet-management.js` may be changed only as needed to provide safe read semantics while preserving writable mutation APIs.

### A8-3 Inline savings goals

Required result:
- inline render path no longer writes `schemaVersion` / `savingsGoals` merely to display;
- active/archive/progress/summary behavior unchanged;
- create/update/archive mutation behavior remains on writable draft/state only.

### A8-4 Inline debts

Required result:
- inline render path no longer invokes mutating normalization/recalculation on adopted state;
- debt summaries, chain planning, derived display state and history remain correct;
- genuine debt mutation/recalculation stays limited to writable mutation contexts.

Do not redesign debt semantics.

## 6. Root/mirror rule

Any material inline change in `index.html` must be mirrored coherently in `src/familypilot.html` according to the existing root/mirror contract. Preserve the prior identity/check rules from A5/A6.

## 7. Small-step execution

### STEP-A8-1 — classify each affected call site

Before edits, map for the five new files plus existing inline root/mirror:
- pure render/read caller;
- writable mutation preparation;
- initialization/migration only.

Do not treat mutation-only normalizers as forbidden merely because they mutate writable draft state.

### STEP-A8-2 — transfer closure

Implement the minimal transfer read/render fix. Self-check with read-only Proxy characterization and relevant existing regression.

### STEP-A8-3 — inline base normalizer closure

Implement wallet-management, savings-goals and debts read/render compatibility. Preserve all existing business semantics.

### STEP-A8-4 — targeted validation

After the LAST A8 material edit run at least:

- `node --check` for every changed JS file;
- `git diff --check`;
- exact changed-path gate against this 24-path allowlist;
- `node tools/fp85-p4d3b-authoritative-ui-mutation-gateway-domain-smoke.cjs` using the stage/arguments required by the existing A5/A6 chain;
- `node tools/pf08a-m3-07b-r01-browser-smoke.mjs`;
- relevant existing historical WF-02 / debt / savings / wallet regressions when already available and required by existing packet chain.

Do not modify historical regression sources merely to obtain PASS.

## 8. Expected A8 boundary

A7 already proved a separate remaining write group:

`familypilot-planned-income-ui.js -> api.sync(state) -> familypilot-planned-income.js`

Those files are not authorized in A8.

Therefore A8 completion does NOT require full final creator validation or a green entire R01 if R01 advances to the exact known planned-income read-only blocker.

A8 is successful when:

1. no remaining post-commit write from Groups 1–2 is observed;
2. R01 either reaches the exact planned-income blocker or passes beyond Groups 1–2 with planned-income still independently reproducible by targeted characterization;
3. no new unrelated blocker inside the A8 closure exists;
4. changed paths remain within the 24-path allowlist.

If R01 fails on any different path outside the known planned-income pair, return `STATUS=BLOCKED` with the exact new evidence.

## 9. No publication in A8

Even after A8 success:

- DO NOT stage for publication;
- DO NOT create a product commit;
- DO NOT push;
- DO NOT open PR;
- DO NOT merge/deploy/dispatch workflows;
- DO NOT use live Supabase;
- DO NOT perform authority cutover.

Keep the coherent work uncommitted in the SAME worktree for A9.

Final candidate publication remains deferred until planned-income closure and the complete final A1-R1+A2+A3+A4+A5+A6+A8+A9 validation pass.

## 10. Stop conditions

Return `STATUS=BLOCKED` before expansion if:
- HEAD/base changed;
- any 25th tracked path is required;
- planned-income files must be edited to finish A8;
- standalone legacy UI files not in the allowlist must change;
- product semantics would need redesign;
- tests would need weakening;
- live provider action is required;
- environment failure prevents required targeted validation.

## 11. Producer return

On successful A8 completion return:

```text
STATUS=A8_IMPLEMENTATION_COMPLETE_PENDING_A9
AMENDMENT_ID=FP85-P4D3B-R3B-R4-R1-A1-R1-A8-BASE-RENDER-NORMALIZATION-CLOSURE
GOVERNANCE_COMMIT=c886102d0350166ae429ea755963a92285367cd6
PRODUCT_BASE=fea49751c850c1f62cc184843d5c19510d5ddbbf
PRODUCT_HEAD_UNCHANGED=YES|NO
PRODUCT_COMMIT_CREATED=NO
PRODUCT_PUSH_PERFORMED=NO
A8_ALLOWED_PATHS=24
CURRENT_CHANGED_PATH_COUNT=<n>
CHANGED_PATH_GATE=PASS|FAIL
TRANSFER_RENDER_READONLY_COMPATIBLE=PASS|FAIL
WALLET_MANAGEMENT_RENDER_READONLY_COMPATIBLE=PASS|FAIL
SAVINGS_GOALS_RENDER_READONLY_COMPATIBLE=PASS|FAIL
DEBTS_RENDER_READONLY_COMPATIBLE=PASS|FAIL
M4_03_CLOSURE_PRESERVED=PASS|FAIL
R01_GROUPS_1_2=PASS|FAIL
R01_NEXT_BLOCKER=PLANNED_INCOME|NONE|<exact other>
DOMAIN_SMOKE=PASS|FAIL
NODE_CHECKS=PASS|FAIL
DIFF_CHECK=PASS|FAIL
STEP_A8_FINAL_CREATOR_VALIDATION=NA_PENDING_A9
ENVIRONMENT_BLOCKER=NONE|<exact blocker>
NEXT_STATUS=READY_FOR_A9_COORDINATION
```

If not successful, return `STATUS=BLOCKED` with exact path/caller/evidence and STOP.
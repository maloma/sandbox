# Batch Manifest — PF-08A-M3-02-OBLIGATION-SCHEDULE-CALENDAR

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Ready for Final Exact-Head Gate  
**Version:** 1.1  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `4891ea40ff8e73dfb6c0fc3a9ab1a237a31131b8`  
**Working Branch:** `agent/pf08a-m3-02-obligation-schedule-calendar`  
**Pull Request:** `#38`  
**Authority:** `maloma/FamilyPilot@5b96881312f8cb9702117a2867d754547611d991`, documents 31, 60, 65 and 66  
**Depth Policy:** `SINGLE_DEPTH_HIGH`  
**Created:** 2026-07-22

## Objective

Complete the accepted current M3 boundary without changing Option A navigation or duplicating financial facts.

## Completed Implementation Scope

- removed the visible `Сегодня / Просрочено / Впереди` summary cards;
- supported arbitrary day, week, month and year intervals;
- supported unlimited, exact-count and until-date endings;
- generated deterministic idempotent occurrence sequences;
- preserved overdue and later occurrences simultaneously;
- added month navigation and per-date grouping with native-currency totals;
- added quick payment from an occurrence row;
- corrected actual amount/date through the same linked Expense operation;
- moved one occurrence without rewriting adjacent occurrences or the rule;
- implemented `only this`, `this and following` and `starting with next` expected-amount scopes;
- archived/restored rules while preserving history and linked operations;
- normalized M3-01 state additively to schema v4;
- preserved M1, A3, hidden Capital, personal scope and Option A;
- inlined the M3-02 UI completion module deterministically inside the canonical app IIFE;
- preserved byte-identical `src/familypilot.html` and `index.html`.

## Excluded Scope Preserved

- M2 Debts and M4 Savings;
- external push notifications;
- automatic bank execution;
- production authentication, authorization or personal-data controls;
- real-data migration;
- paid dependencies;
- Safe-to-Spend, plan-vs-actual and M5.

## Verification Strategy

No new GitHub Actions workflow family was introduced. Existing trusted M3 gates were reused by upgrading existing domain, static and browser test paths.

## Checkpoint Results

### CP-01 — Exact Runtime Inspection

- **Status:** COMPLETED
- FamilyPilot runtime at `4891ea40...` was unchanged from accepted M3-01;
- unrelated `crmos-questionnaire` history remained untouched;
- no pre-existing M3-02 branch existed.

### CP-02 — Domain and UI Completion

- **Status:** COMPLETED
- schema-v4 domain implemented;
- calendar and correction UI implemented;
- existing M3 verification suite upgraded;
- deterministic finalizer integrated the UI inside the app closure.

### CP-03 — Exact PR Gate

- **Status:** READY_FOR_FINAL_GATE
- **Draft PR:** `#38`;
- **Trusted Generation Head:** `77c2f91349dbb7ee6ab19f573cc2f6cc43890882`;
- **Trusted Workflow:** `29916154117`, conclusion `success`;
- **Generated Durable Head:** `123b6a783695120cdd3483dcce277a5944be847d`;
- domain syntax and behavior — PASS;
- deterministic finalization — PASS;
- static contract — PASS;
- A3 Chrome regression — PASS;
- Hidden Capital Chrome regression — PASS;
- complete M3-02 Chrome regression — PASS;
- atomic generated-artifact persistence — PASS;
- mergeability — PASS;
- actual changed paths — 11 expected runtime, verification and evidence paths.

Required remaining gate:

- owner evidence head;
- synchronized zero-diff rerun of the same trusted suite;
- expected-head protected merge.

### CP-04 — Publication and Closure

- **Status:** PLANNED
- verify actual GitHub Pages HTML and four runtime modules;
- run complete public M3-02 Chrome scenario;
- store hashes and terminal evidence;
- close batch and synchronize FamilyPilot;
- proceed to M2 only after PASS.

## Verified Invariants

- Option A navigation unchanged;
- hidden Capital remains closed by default;
- A3 Analytics remains consistent;
- one payment creates one linked Expense;
- payment correction preserves operation id;
- no duplicate occurrences after normalization;
- no forbidden summary cards in the runtime DOM;
- personal obligations do not leak into household scope;
- Debts and Savings remain honest unavailable entries;
- rollback remains available.

## Recovery Record

Bounded recovery corrected:

- isolated domain fixtures missing normalized obligation arrays;
- legacy M3-01 browser API correction not recognizing the M3-02 contract;
- external UI module lacking access to the closed app IIFE.

No correction expanded product scope or introduced a new workflow family.

## Rollback

Revert the eventual M3-02 implementation merge. The accepted pre-batch FamilyPilot runtime remains recoverable while unrelated later `sandbox` history is preserved.

## Terminal Conditions

- `BATCH_COMPLETED`;
- `CHECKPOINT_FAILED_AFTER_BOUNDED_RECOVERY`;
- `REPOSITORY_STATE_CONFLICT`;
- `PUBLIC_VERIFICATION_FAILED`.

## Changelog

### Version 1.1 — 2026-07-22

- recorded completed implementation and trusted Chrome PASS;
- recorded generated durable head;
- advanced CP-03 to final synchronized gate.

### Version 1.0 — 2026-07-22

- established M3-02.

# END OF FILE
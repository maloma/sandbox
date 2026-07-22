# Batch Manifest — PF-08A-M3-02-OBLIGATION-SCHEDULE-CALENDAR

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Completed  
**Version:** 1.2  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `4891ea40ff8e73dfb6c0fc3a9ab1a237a31131b8`  
**Implementation Branch:** `agent/pf08a-m3-02-obligation-schedule-calendar`  
**Implementation Pull Request:** `#38`  
**Implementation Head:** `4f037ec38410245bb06d32e7eba647a826eb99eb`  
**Implementation Merge:** `7fd7fa09f9b4908053aa0fec27fe691f1b878705`  
**Closure / Public Gate Branch:** `agent/pf08a-m3-02-public-gate-upgrade`  
**Closure Pull Request:** `#39`  
**Authority:** `maloma/FamilyPilot@5b96881312f8cb9702117a2867d754547611d991`, documents 31, 60, 65 and 66  
**Depth Policy:** `SINGLE_DEPTH_HIGH`  
**Created:** 2026-07-22

## Objective

Complete the accepted current M3 boundary without changing Option A navigation or duplicating financial facts.

## Completed Runtime Scope

- removed the visible `Сегодня / Просрочено / Впереди` summary cards;
- implemented arbitrary day, week, month and year intervals;
- implemented unlimited, exact-count and until-date endings;
- generated deterministic idempotent occurrence sequences;
- preserved overdue and later occurrences simultaneously;
- added month navigation and per-date native-currency grouping;
- added quick payment directly from occurrence rows;
- corrected actual amount/date through the same linked Expense operation id;
- moved one occurrence without rewriting adjacent occurrences or the rule;
- implemented `only this`, `this and following` and `starting with next` expected-amount scopes;
- archived/restored rules while preserving history and linked operations;
- normalized M3-01 state additively to schema v4;
- preserved M1, A3, hidden Capital, personal scope and Option A;
- inlined the UI completion module deterministically inside the canonical app IIFE;
- preserved byte-identical source/root HTML.

## Excluded Scope Preserved

- M2 Debts and M4 Savings;
- external push notifications;
- automatic bank execution;
- production authentication, authorization or personal-data controls;
- real-data migration;
- paid dependencies;
- Safe-to-Spend, plan-vs-actual and M5.

## Checkpoint Results

### CP-01 — Exact Runtime Inspection

- **Status:** COMPLETED
- FamilyPilot runtime was unchanged from accepted M3-01;
- unrelated `crmos-questionnaire` history remained untouched;
- no pre-existing M3-02 branch existed.

### CP-02 — Domain and UI Completion

- **Status:** COMPLETED
- schema-v4 domain, calendar UI and correction flows implemented;
- existing M3 verification suite upgraded;
- no new workflow family introduced.

### CP-03 — Exact PR Gate

- **Status:** COMPLETED
- **Implementation PR:** `#38`;
- **Final Exact Head:** `4f037ec38410245bb06d32e7eba647a826eb99eb`;
- **Implementation Merge:** `7fd7fa09f9b4908053aa0fec27fe691f1b878705`;
- all six existing suites on final head — SUCCESS;
- domain, static, A3 Chrome, Hidden Capital Chrome and M3-02 Chrome — PASS;
- generated runtime zero-diff — PASS;
- expected-head merge — PASS.

### CP-04 — Publication and Closure

- **Status:** COMPLETED
- **Public URL:** `https://maloma.github.io/sandbox/`;
- **Public Verification Time:** `2026-07-22T11:40:28.030Z`;
- **Publication Attempts:** `1`;
- HTML, Scope, Analytics, Obligations and Obligations UI — HTTP 200;
- full downloaded-package M3-02 Chrome scenario — PASS;
- runtime exceptions — NONE;
- evidence: `docs/execution-batches/PF-08A-M3-02-OBLIGATION-SCHEDULE-CALENDAR/Public_Verification.md`.

## Public Hashes

- **HTML:** `4a34dd3674888e38e31e7aaa422db2f94ae7fdcbf2cde6ce2d1d15c46b3c4388`;
- **Scope:** `800ae1d9b8d8ad68ae6f0215e5b94978890e7a87d9f012fd5448e6e39de0899b`;
- **Analytics:** `9f934f1ecd3c87e747cd9f99a2cb9b83abc07040eacc67ddaf1808fe3ab77c9f`;
- **Obligations:** `539f0d44868478a51b07da63f58dc3ab28ae46ac96d2e203fbe6f94381b0f61b`;
- **Obligations UI:** `00f3660eb7d5458c5a12ab051d59704f725e1dcb3d2a090543189e71cf5ea86f`.

## Verified Invariants

- Option A navigation unchanged — PASS;
- separate summary cards absent — PASS;
- every three months / exact count eleven — PASS;
- idempotent generation — PASS;
- overdue and later occurrences coexist — PASS;
- month navigation and per-date grouping — PASS;
- quick pay creates one linked Expense — PASS;
- actual correction preserves operation id — PASS;
- Trash/restore recalculation — PASS;
- starting-next amount version — PASS;
- one-occurrence move — PASS;
- archive preserves history — PASS;
- personal scope isolation — PASS;
- hidden Capital and A3 Analytics — PASS;
- runtime exceptions — NONE.

## Recovery Record

Bounded recovery corrected:

- isolated test fixtures missing normalized obligation arrays;
- legacy M3-01 browser correction not recognizing M3-02;
- external UI module lacking access to the closed app IIFE.

No correction expanded product scope or created a new workflow family.

## Rollback

Revert implementation merge `7fd7fa09f9b4908053aa0fec27fe691f1b878705`. Unrelated later `sandbox` history remains preserved.

## Terminal State

```text
BATCH_COMPLETED
```

## Changelog

### Version 1.2 — 2026-07-22

- recorded implementation merge and public verification;
- completed CP-03 and CP-04;
- closed M3-02 terminally.

### Version 1.1 — 2026-07-22

- recorded trusted generation and final exact-head gate.

### Version 1.0 — 2026-07-22

- established M3-02.

# END OF FILE
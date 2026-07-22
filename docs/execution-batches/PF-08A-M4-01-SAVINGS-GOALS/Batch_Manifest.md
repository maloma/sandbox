# Batch Manifest — PF-08A-M4-01-SAVINGS-GOALS

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Completed / Public PASS  
**Version:** 1.1  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `714629922c1ea977117883357e465aa13a6598c9`  
**Implementation Branch:** `agent/pf08a-m4-01-savings-goal-integration`  
**Implementation Pull Request:** `#42`  
**Implementation Merge:** `f7366c0229fdc5115e38b5ea34e4c498a09e73f3`  
**Public Closure Branch:** `agent/pf08a-m4-01-public-verification`  
**Public Closure Pull Request:** `#44`  
**Authority:** `maloma/FamilyPilot@4ef709d8415b355642a5759b4ea800df7c3eff86`, documents 32 and 68  
**Created:** 2026-07-22

## Objective

Integrate the Founder-approved goals-only M4 boundary into Plan without treating goal configuration as a money movement or changing Capital, wallet balances, Income or Expense.

## Included Scope

- activate Plan → Savings;
- optional named household goals;
- stable goal id and persistent object;
- target amount and already-saved amount as distinct values;
- optional target date;
- create and reopen/edit the same object;
- archive with preserved read-only object and history;
- active and archived projections;
- compact contextual help that preserves unsaved editor values;
- deterministic finalization and public-package verification;
- M1/M2/M3, compact Analytics and Hidden Capital regressions.

## Excluded Scope

- emergency cushion configuration;
- unallocated savings setting;
- combined savings overview;
- personal or wallet-specific goal semantics;
- transfers between goals or wallets;
- funding operations or automatic allocations;
- Safe-to-Spend, forecasts or automation;
- production authentication, permissions or personal-data controls;
- real-data migration;
- paid dependencies.

## Financial Boundary

```text
SavingsGoal configuration
→ persistent planning object
→ no MoneyMovement
→ no Income / Expense / Transfer
→ no Capital change
```

The target amount is a plan. The already-saved amount describes existing household savings assigned to the goal; changing it does not invent a transaction.

## Verification Strategy

Existing FamilyPilot workflow families were extended; no new workflow family was introduced.

Completed suites:

- M4 domain tests;
- M4 static integration contract;
- M4 Chrome user journey;
- M3 domain/static/Chrome;
- M2 domain/static/Chrome;
- compact Analytics Chrome;
- Hidden Capital Chrome;
- deterministic source/root equality;
- public downloaded-package verification;
- rollback evidence.

## Checkpoints

### CP-01 — Exact Runtime Inspection — COMPLETED

- accepted starting runtime: `714629922c1ea977117883357e465aa13a6598c9`;
- Savings remained a disabled Plan placeholder;
- no current savings-goal state collection or unified route existed;
- integrated M2/M3 modules established the accepted dynamic UI/finalizer mounting pattern;
- no material Founder decision was required.

### CP-02 — Domain, UI and Verification Package — COMPLETED

- schema-v6 `SavingsGoal` domain added;
- only `state.savingsGoals` is mutated by the domain;
- Plan → Savings activated;
- active and archived screens, editor and help surfaces added;
- target/saved/date validation, stable edit and archive history added;
- existing finalizer extended with M4 marker, script and inline UI block;
- existing trusted/module workflow families extended;
- domain/static/Chrome verification added.

### CP-03 — Exact PR Gate — COMPLETED

- **Final Exact Head:** `f41a395fba32f05a75875c458eb2ada22c69da51`;
- **FamilyPilot Trusted PR Gate:** run `29929122198` — PASS;
- **FamilyPilot Module Regression:** run `29929118430` — PASS;
- **A3 Trusted PR Gate:** run `29929118380` — PASS;
- **A3 Compact Analytics States:** run `29929122246` — PASS;
- **PRIV-01 Trusted PR Gate:** run `29929122087` — PASS;
- **PRIV-01 Hidden Capital Disclosure:** run `29929118501` — PASS;
- M4 domain/static/Chrome — PASS;
- M2/M3/A3/Hidden Capital regressions — PASS;
- generated source/root artifacts — committed and zero-diff;
- runtime exceptions — NONE;
- expected-head merge — PASS at `f7366c0229fdc5115e38b5ea34e4c498a09e73f3`.

### CP-04 — Publication and Closure — COMPLETED

- public workflow run `29929515301` — PASS;
- downloaded HTML and eight runtime modules — HTTP 200;
- publication attempts — `1`;
- public browser marker — `PF08A_M4_01_BROWSER_PASS`;
- evidence commit on closure branch — `aa77fc74fb34f6e76afd2e4f8df50f5fefa8cbde`;
- optional empty state, create/edit/archive, contextual help and goals-only boundary — PASS;
- no operation or wallet movement — PASS;
- Capital and ordinary Income/Expense Analytics unchanged — PASS;
- M2, M3, Hidden Capital and compact Analytics preserved — PASS;
- runtime exceptions — NONE.

## Public Evidence

`docs/execution-batches/PF-08A-M4-01-SAVINGS-GOALS/Public_Verification.md`

Key SHA-256 values:

- HTML: `3c820281fc69edb6299f1d43a8864780a8d39221cf4c786d84ee07cee01d39a6`;
- Savings domain: `b9df31b8f4224252f1b754c884f4036e1a7df6adf58fc187cf705b715feb4e33`;
- Savings UI: `962b7d7a55578a07c6bb1a45997843dfc2b801f61ff7b6d25153bf589cae77b9`.

## Rollback

Revert implementation merge `f7366c0229fdc5115e38b5ea34e4c498a09e73f3`. The pre-batch accepted runtime remains `maloma/sandbox@714629922c1ea977117883357e465aa13a6598c9`.

## Terminal State

```text
BATCH_COMPLETED
```

## Changelog

### Version 1.1 — 2026-07-22

- recorded final exact-head PASS and implementation merge;
- recorded public downloaded-package PASS and hashes;
- closed M4-01 terminally.

### Version 1.0 — 2026-07-22

- established and verified the M4-01 integration package.

# END OF FILE
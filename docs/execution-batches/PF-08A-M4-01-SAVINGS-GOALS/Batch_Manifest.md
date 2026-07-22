# Batch Manifest — PF-08A-M4-01-SAVINGS-GOALS

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Trusted PASS / Owner Checkpoint  
**Version:** 1.0  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `714629922c1ea977117883357e465aa13a6598c9`  
**Working Branch:** `agent/pf08a-m4-01-savings-goal-integration`  
**Pull Request:** `#42`  
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
- deterministic finalization and public-package preparation;
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

Existing FamilyPilot workflow families are extended; no new workflow family is introduced.

Required suites:

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

- current accepted runtime: `714629922c1ea977117883357e465aa13a6598c9`;
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

### CP-03 — Exact PR Gate — TRUSTED PASS

- **Exact Head:** `c44bb5cca0e699030ad22d3e16a60c50d71e9174`;
- **FamilyPilot Trusted PR Gate:** run `29928566413` — PASS;
- **FamilyPilot Module Regression:** run `29928570420` — PASS;
- **A3 Trusted PR Gate:** run `29928568680` — PASS;
- **A3 Compact Analytics States:** run `29928568521` — PASS;
- **PRIV-01 Trusted PR Gate:** run `29928568635` — PASS;
- **PRIV-01 Hidden Capital Disclosure:** run `29928568778` — PASS;
- M4 domain/static/Chrome — PASS;
- M2/M3/A3/Hidden Capital regressions — PASS;
- generated source/root artifacts — committed and zero-diff;
- runtime exceptions — NONE.

### CP-04 — Publication and Closure — PLANNED

- append owner checkpoint;
- repeat exact-head zero-diff gates;
- merge PR `#42` with expected-head protection;
- verify published HTML and all runtime modules;
- run M4 Chrome against the downloaded package;
- save hashes and terminal evidence;
- synchronize `maloma/FamilyPilot` and activate the next accepted roadmap package only after public PASS.

## Rollback

Revert the eventual PR `#42` implementation merge. The pre-batch accepted runtime remains `maloma/sandbox@714629922c1ea977117883357e465aa13a6598c9`.

## Terminal Conditions

- `BATCH_COMPLETED`;
- `CHECKPOINT_FAILED_AFTER_BOUNDED_RECOVERY`;
- `REPOSITORY_STATE_CONFLICT`;
- `PUBLIC_VERIFICATION_FAILED`;
- `MATERIAL_SAVINGS_SCOPE_CONFLICT_REQUIRING_FOUNDER_DECISION`.

# END OF FILE
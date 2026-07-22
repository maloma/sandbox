# Batch Manifest — PF-08A-M3-01-PLAN-OBLIGATIONS

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Active  
**Version:** 1.0  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `ba7b4cae5f28c4a39bc80a251a2b43d7bb3ce194`  
**Working Branch:** `agent/pf08a-m3-01-plan-obligations`  
**Authority:** Accepted Option A navigation, FamilyPilot A5 shared integration contract and accepted M3 semantics  
**Depth Policy:** `SINGLE_DEPTH_HIGH`  
**Created:** 2026-07-22

## Objective

Convert the existing Plan placeholder into the accepted Plan hub and mount the first bounded Obligations foundation without changing the bottom navigation or duplicating financial operations.

## Included Scope

- preserve `Главная · Операции · План · Ещё`;
- replace the Plan placeholder with explicit Obligations, Debts and Savings entries;
- mount Obligations as the first active module;
- show Debts and Savings honestly as not yet integrated;
- extend existing local state non-destructively with obligation rules and occurrences;
- create, list, reopen and edit one-time and monthly obligation rules;
- create concrete occurrences;
- support planned, due, overdue, paid, postponed and skipped states;
- pay by creating or linking exactly one existing-model Expense operation;
- maintain reciprocal links between occurrence and operation;
- recalculate payment state after linked operation edit, Trash, restore or permanent deletion;
- preserve household/personal wallet scope isolation;
- preserve Main, Operations, Analytics, hidden Capital, periods, filters, categories and existing storage;
- add deterministic domain, static and headless-Chrome verification;
- merge and publish only after exact trusted PASS and verified rollback.

## Excluded Scope

- no external push notifications;
- no automatic bank payment execution;
- no production authentication, permissions or personal-data authorization;
- no M2 Debts runtime integration;
- no M4 Savings runtime integration;
- no plan-vs-actual Analytics;
- no Safe-to-Spend or M5 surface;
- no real-data migration or new paid dependency;
- no redesign of Main or bottom navigation.

## Current Runtime Inspection

- exact starting main: `ba7b4cae5f28c4a39bc80a251a2b43d7bb3ce194`;
- canonical source and root artifact share blob `3e690de8d484c1822073904e6fab280bf8ca6486`;
- bottom navigation already equals accepted Option A;
- `plansScreen` is an isolated placeholder and is the direct mounting point;
- existing state uses `familypilot.operations.foundation.v2` with schema version 2;
- ordinary operations already have a `links` object;
- current save/render pipeline recalculates Main, Operations and Analytics from `state.operations`;
- current test API can be extended without replacing existing tests;
- public development route is `https://maloma.github.io/sandbox/`.

## Runtime Model

### ObligationRule

Minimum fields:

- stable id;
- name;
- recurrence: once or monthly;
- next due date;
- expected amount and currency;
- wallet id;
- expense category id;
- active/archived state;
- creation/edit metadata.

### ObligationOccurrence

Minimum fields:

- stable id;
- rule id;
- due date;
- expected and actual amount;
- status;
- linked operation id;
- paid/postponed/skipped metadata;
- revision history.

### Payment Link

```text
ObligationOccurrence
↔ Expense operation links.obligationOccurrenceId
```

One active linked Expense is the sole payment source. No duplicate module-only money record is allowed.

## Checkpoints

### CP-01 — Exact Runtime Inspection and Model Contract

- **Status:** COMPLETED
- exact Plan, state, operation, routing and test mounting points identified;
- v2 data preservation and v3 additive normalization selected;
- one-fact / one-source payment contract selected.

### CP-02 — Domain Module and Source Patch

- **Status:** READY
- add an obligations domain helper module;
- add deterministic source patch/finalizer;
- add Plan and Obligations UI/routes;
- add state normalization and payment links.

### CP-03 — Automated Regression and Trusted PR Gate

- **Status:** PLANNED
- static source contract;
- domain unit scenarios;
- headless Chrome create/pay/postpone/skip/scope/reload scenarios;
- A3 Analytics and hidden Capital regression;
- exact source/root equality;
- trusted default-branch exact-head gate.

### CP-04 — Merge, Publication and Public Verification

- **Status:** PLANNED
- merge with expected-head protection;
- verify published HTML and all runtime modules over HTTP 200;
- run public Chrome scenarios;
- store hashes and terminal evidence;
- preserve previous stable runtime and Git-revert rollback.

## Required Invariants

- navigation labels and order unchanged;
- Capital remains hidden until explicit press;
- Income and Expense stay in thumb reach on Main and Operations;
- existing v2 localStorage remains readable;
- ordinary operation semantics remain unchanged;
- one payment produces one actual Expense;
- linked payment is visible in Operations and Analytics;
- Trash/removal of linked Expense invalidates paid projection;
- restore reestablishes paid projection;
- personal obligations do not appear in household or another personal scope;
- recurrence does not silently rewrite a specific occurrence;
- no fabricated Debts or Savings values;
- no reminder popup or competing global badge;
- root/source HTML remain byte-identical.

## Recovery

One bounded source/test correction is allowed per failed checkpoint. Reject merge on duplicate payment, data loss, scope mixing, stale paid state, unexpected path, existing-regression failure or public verification failure.

## Rollback

Revert the eventual implementation merge or restore `ba7b4cae5f28c4a39bc80a251a2b43d7bb3ce194`.

## Terminal Conditions

- `BATCH_COMPLETED`;
- `CHECKPOINT_FAILED_AFTER_BOUNDED_RECOVERY`;
- `REPOSITORY_STATE_CONFLICT`;
- `PUBLIC_VERIFICATION_FAILED`.

# END OF FILE
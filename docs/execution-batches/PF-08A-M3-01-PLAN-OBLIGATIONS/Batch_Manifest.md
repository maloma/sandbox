# Batch Manifest — PF-08A-M3-01-PLAN-OBLIGATIONS

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Ready for Automatic Prototype Merge  
**Version:** 1.1  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `ba7b4cae5f28c4a39bc80a251a2b43d7bb3ce194`  
**Working Branch:** `agent/pf08a-m3-01-plan-obligations`  
**Pull Request:** `#26`  
**Authority:** Accepted Option A navigation, FamilyPilot A5 shared integration contract and accepted M3 semantics  
**Depth Policy:** `SINGLE_DEPTH_HIGH`  
**Created:** 2026-07-22

## Objective

Convert the existing Plan placeholder into the accepted Plan hub and mount the first bounded Obligations foundation without changing the bottom navigation or duplicating financial operations.

## Implemented Scope

- preserved `Главная · Операции · План · Ещё`;
- replaced the Plan placeholder with explicit Obligations, Debts and Savings entries;
- mounted Obligations as the first active module;
- showed Debts and Savings honestly as not yet integrated;
- extended existing local state non-destructively to schema v3 with obligation rules and occurrences;
- preserved the existing storage key and v2 readability;
- implemented create, list, reopen and edit for one-time and monthly obligation rules;
- implemented concrete occurrences and planned, due, overdue, paid, postponed and skipped states;
- implemented payment through exactly one linked Expense operation;
- implemented reciprocal occurrence/operation links;
- implemented recalculation after linked operation edit, Trash and restore;
- preserved household/personal wallet scope isolation;
- preserved Main, Operations, Analytics, hidden Capital, periods, filters, categories and existing storage;
- added deterministic domain, static, A3, hidden-Capital and M3 headless-Chrome verification;
- preserved byte-identical root/source HTML.

## Excluded Scope Preserved

- no external push notifications;
- no automatic bank payment execution;
- no production authentication, permissions or personal-data authorization;
- no M2 Debts runtime integration;
- no M4 Savings runtime integration;
- no plan-vs-actual Analytics;
- no Safe-to-Spend or M5 surface;
- no real-data migration or new paid dependency;
- no redesign of Main or bottom navigation.

## Runtime Model

### ObligationRule

- stable id;
- name;
- once or monthly cadence;
- next due date;
- expected amount and currency;
- wallet and expense-category ids;
- active/archived state;
- creation/edit metadata and revisions.

### ObligationOccurrence

- stable id;
- rule id;
- scheduled and current due dates;
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

One active linked Expense is the sole payment source. Duplicate module-only payment records are rejected.

## Checkpoint Results

### CP-01 — Exact Runtime Inspection and Model Contract

- **Status:** COMPLETED
- Plan, state, operation, routing and test mounting points identified;
- additive v3 normalization selected;
- one-fact / one-source payment contract selected.

### CP-02 — Domain Module and Source Patch

- **Status:** COMPLETED
- obligations domain module implemented;
- deterministic source patch and finalizer implemented;
- Plan and Obligations routes implemented;
- state normalization and payment links implemented;
- same-day payment timestamp edge case corrected.

### CP-03 — Automated Regression and Trusted PR Gate

- **Status:** READY_FOR_MERGE
- **Verified Generated Head:** `37511d21d560b4d1dc93a4be7a548a40668af196`;
- **Source/Root Blob:** `2ef81456faf5baaf0e92e4a802652d86ffc0bf3e`;
- **Changed Paths:** exactly 13 expected implementation, workflow, test and evidence paths;
- **Trusted Generation Run:** `29907309831`, conclusion `success`;
- exact checkout — PASS;
- syntax — PASS;
- domain tests — PASS;
- deterministic patch/finalization — PASS;
- static source contract — PASS;
- compact Analytics Chrome — PASS;
- hidden Capital Chrome — PASS;
- Plan/Obligations Chrome — PASS;
- atomic artifact persistence — PASS;
- generated test API correction durably committed — PASS.

### CP-04 — Merge, Publication and Public Verification

- **Status:** READY
- remaining transition: final zero-diff exact-head gate on evidence head, merge with expected-head protection, public GitHub Pages Chrome verification and terminal evidence.

## Verification Summary

- navigation unchanged — PASS;
- Plan hub and honest module states — PASS;
- one-time/monthly rule creation — PASS;
- occurrence creation and reopening — PASS;
- due/overdue/paid/postponed/skipped behavior — PASS;
- one payment / one linked Expense — PASS;
- duplicate payment rejected — PASS;
- linked operation visible in Operations and Analytics — PASS;
- linked edit recalculates amount — PASS;
- Trash invalidates paid projection — PASS;
- restore reestablishes paid projection — PASS;
- personal/household scope isolation — PASS;
- existing v2 state readability — PASS;
- hidden Capital — PASS;
- compact Analytics — PASS;
- source/root equality — PASS;
- rollback — AVAILABLE.

## Required Invariants Preserved

- navigation labels and order unchanged;
- Capital remains hidden until explicit press;
- Income and Expense stay in thumb reach;
- ordinary operation semantics unchanged;
- no fabricated Debts or Savings values;
- no reminder popup or competing global badge;
- no production authorization claim.

## Recovery Record

Bounded recovery corrected:

- browser navigation whitespace expectation;
- same-day date-only payment timestamp;
- browser test API namespace;
- diagnostic output extraction;
- large-artifact transport through streamed atomic Git persistence.

No recovery expanded product scope or changed accepted financial semantics.

## Rollback

Revert the eventual implementation merge or restore `ba7b4cae5f28c4a39bc80a251a2b43d7bb3ce194`.

## Terminal Conditions

- `BATCH_COMPLETED`;
- `CHECKPOINT_FAILED_AFTER_BOUNDED_RECOVERY`;
- `REPOSITORY_STATE_CONFLICT`;
- `PUBLIC_VERIFICATION_FAILED`.

## Changelog

### Version 1.1 — 2026-07-22

- marked CP-02 completed;
- recorded verified generated artifacts and full trusted PASS;
- advanced CP-03 to READY_FOR_MERGE and CP-04 to READY.

### Version 1.0 — 2026-07-22

- established the Plan and Obligations runtime batch.

# END OF FILE
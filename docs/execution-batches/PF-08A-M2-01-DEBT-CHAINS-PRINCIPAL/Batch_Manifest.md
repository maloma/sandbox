# Batch Manifest — PF-08A-M2-01-DEBT-CHAINS-PRINCIPAL

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Active  
**Version:** 1.0  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `6cf4b74c9cc648d9f7e17815b918a809f309e48e`  
**Working Branch:** `agent/pf08a-m2-01-debt-chains-principal`  
**Authority:** `maloma/FamilyPilot@7eaaa3323d42328f512382e4a7d98990740077f6`, documents 31 Debt, 34, 60, 65 and 67  
**Created:** 2026-07-22

## Objective

Integrate the accepted M2 debt model into Plan, wallet capital, Operations and Home without classifying debt principal as ordinary Income or Expense.

## Included Scope

- activate Plan → Debts;
- counterparties and reusable identities;
- active and immutable closed chains;
- historical opening liabilities/receivables;
- four source actions: borrow, repay, lend, receive;
- linked `debt_inflow` and `debt_outflow` principal movements;
- one net position and chronological mutual offset;
- automatic reciprocal debt from repayment excess without a dialog;
- source editing with stable movement id and deterministic recalculation;
- zero-balance keep-open or close decision;
- later activity creates a new chain after closure;
- personal/household scope isolation;
- real Home receivable/liability totals;
- neutral principal rows in Operations;
- debt principal included in Capital but excluded from ordinary Income/Expense Analytics;
- deterministic, Chrome and public verification.

## Excluded Scope

- interest, gifts or commissions inside debt entry;
- four-option overpayment dialog;
- M4 Savings;
- amortization schedules;
- external lender/bank integrations;
- automatic bank execution;
- production authentication, permissions or personal-data controls;
- real-data migration;
- paid dependencies;
- Safe-to-Spend and plan-vs-actual.

## Verification Strategy

Existing FamilyPilot workflow files are extended; no new workflow family is introduced.

Required suites:

- M2 domain tests;
- M2 static integration contract;
- M2 Chrome user journey;
- existing M3 domain/static/Chrome;
- A3 Analytics Chrome;
- Hidden Capital Chrome;
- source/root equality;
- public downloaded-package verification;
- rollback evidence.

## Checkpoints

### CP-01 — Exact Runtime Inspection

- **Status:** COMPLETED
- Plan Debts entry disabled;
- Home debt totals fabricated;
- Capital excluded principal movements;
- Operations lacked neutral debt-principal presentation;
- Analytics required explicit principal exclusion;
- app state/UI remained inside a closed IIFE.

### CP-02 — Domain, Scope and UI Integration

- **Status:** COMPLETED / READY_FOR_GATE
- schema-v5 debt domain added;
- scope Capital extended with principal inflow/outflow;
- debt UI constructed and attached through deterministic finalization;
- domain/static/browser tests added;
- existing workflow family extended.

### CP-03 — Exact PR Gate

- **Status:** PLANNED
- finalize canonical source/root;
- run all module/regression suites;
- persist generated artifacts only after PASS;
- require synchronized zero-diff exact head;
- merge with expected-head protection.

### CP-04 — Publication and Closure

- **Status:** PLANNED
- verify published HTML and runtime modules;
- run M2 Chrome against downloaded package;
- save hashes and terminal evidence;
- synchronize FamilyPilot;
- activate M4 only after PASS.

## Rollback

Revert the eventual M2 implementation merge. Pre-batch accepted runtime remains `maloma/sandbox@6cf4b74c9cc648d9f7e17815b918a809f309e48e`.

## Terminal Conditions

- `BATCH_COMPLETED`;
- `CHECKPOINT_FAILED_AFTER_BOUNDED_RECOVERY`;
- `REPOSITORY_STATE_CONFLICT`;
- `PUBLIC_VERIFICATION_FAILED`.

# END OF FILE
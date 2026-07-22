# Batch Manifest — PF-08A-M2-01-DEBT-CHAINS-PRINCIPAL

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Trusted PASS / Final Zero-Diff Gate Pending  
**Version:** 1.1  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `6cf4b74c9cc648d9f7e17815b918a809f309e48e`  
**Working Branch:** `agent/pf08a-m2-01-debt-chains-principal`  
**Pull Request:** `#40`  
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

- **Status:** COMPLETED
- schema-v5 debt domain added;
- scope Capital extended with principal inflow/outflow;
- debt UI constructed and attached through deterministic finalization;
- stable source-derived Home debt mount replaces fabricated values;
- domain/static/browser tests added;
- existing workflow family extended.

### CP-03 — Exact PR Gate

- **Status:** TRUSTED_PASS / GENERATED_HEAD_COMMITTED / FINAL_ZERO_DIFF_PENDING
- Draft PR `#40` opened from the exact batch branch;
- authoritative trusted run `29923429307`, job `88934388190`: PASS;
- M2 domain/static/Chrome: PASS;
- M3 domain/static/Chrome: PASS;
- A3 Analytics Chrome: PASS;
- Hidden Capital Chrome: PASS;
- verified generated runtime atomically committed at `4ebe5b6f6f675beeb8cebf91e4116561753abdd1`;
- owner checkpoint commit is required only to trigger the final zero-diff suites after bot-generated head protection.

### CP-04 — Publication and Closure

- **Status:** PLANNED
- merge PR `#40` only after final exact-head zero-diff PASS;
- verify published HTML and runtime modules;
- run M2 Chrome against the downloaded public package;
- save hashes and terminal evidence;
- synchronize FamilyPilot;
- activate M4 only after PASS.

## Bounded Recovery Record

Recovered without changing accepted M2 semantics:

- made Home debt elements stable generated mount points and removed fabricated `180 € / 420 €` values;
- aligned static verification with dynamic UI mounting;
- removed self-referential forbidden-control assertions;
- reconciled the existing M3 regression with the newly active Debts route while leaving Savings disabled;
- preserved all prior M3, A3 and Hidden Capital checks.

## Rollback

Revert the eventual M2 implementation merge. Pre-batch accepted runtime remains `maloma/sandbox@6cf4b74c9cc648d9f7e17815b918a809f309e48e`.

## Terminal Conditions

- `BATCH_COMPLETED`;
- `CHECKPOINT_FAILED_AFTER_BOUNDED_RECOVERY`;
- `REPOSITORY_STATE_CONFLICT`;
- `PUBLIC_VERIFICATION_FAILED`.

## Changelog

### Version 1.1 — 2026-07-22

- recorded exact trusted PASS;
- recorded generated runtime head;
- advanced CP-03 to final owner-triggered zero-diff gate.

### Version 1.0 — 2026-07-22

- established M2 runtime integration batch.

# END OF FILE
# Batch Manifest — PF-08A-M2-01-DEBT-CHAINS-PRINCIPAL

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Public PASS / Closure Merge Pending  
**Version:** 1.2  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `6cf4b74c9cc648d9f7e17815b918a809f309e48e`  
**Implementation Branch:** `agent/pf08a-m2-01-debt-chains-principal`  
**Implementation Pull Request:** `#40`  
**Implementation Head:** `c1faf7074a2e5a49370e26c6ff325f304fada18b`  
**Implementation Merge:** `9fecb7bad53e2de5481fbac745689afa9db8537a`  
**Public Closure Branch:** `agent/pf08a-m2-01-public-verification`  
**Public Closure Pull Request:** `#41`  
**Authority:** `maloma/FamilyPilot@7eaaa3323d42328f512382e4a7d98990740077f6`, documents 31 Debt, 34, 60, 65 and 67  
**Created:** 2026-07-22

## Objective

Integrate the accepted M2 debt model into Plan, wallet capital, Operations and Home without classifying debt principal as ordinary Income or Expense.

## Completed Scope

- activated Plan → Debts;
- implemented counterparties and reusable identities;
- implemented active and immutable closed chains;
- implemented historical opening liabilities/receivables;
- implemented borrow, repay, lend and receive source actions;
- linked `debt_inflow` and `debt_outflow` principal movements;
- implemented one net position and chronological mutual offset;
- implemented automatic reciprocal debt from repayment excess without a dialog;
- implemented source editing with stable movement id and deterministic recalculation;
- implemented zero-balance keep-open or close decision;
- later activity creates a new chain after closure;
- preserved personal/household scope isolation;
- replaced fabricated Home values with source-derived receivable/liability totals;
- presented principal movements neutrally in Operations;
- included debt principal in Capital while excluding it from ordinary Income/Expense Analytics;
- completed deterministic, Chrome and public verification.

## Excluded Scope Preserved

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

Existing FamilyPilot workflow files were extended; no new workflow family was introduced.

Completed suites:

- M2 domain tests — PASS;
- M2 static integration contract — PASS;
- M2 Chrome user journey — PASS;
- M3 domain/static/Chrome — PASS;
- A3 Analytics Chrome — PASS;
- Hidden Capital Chrome — PASS;
- source/root and source/generated module equality — PASS;
- public downloaded-package verification — PASS;
- rollback evidence — AVAILABLE.

## Checkpoints

### CP-01 — Exact Runtime Inspection

- **Status:** COMPLETED
- identified disabled Debts route, fabricated Home values and missing principal-flow integration.

### CP-02 — Domain, Scope and UI Integration

- **Status:** COMPLETED
- schema-v5 debt domain, scope integration, UI, source-derived Home mount and verification package completed.

### CP-03 — Exact PR Gate and Merge

- **Status:** COMPLETED
- Draft PR `#40` verified on exact owner heads;
- final authoritative implementation head `c1faf7074a2e5a49370e26c6ff325f304fada18b` passed all six suites;
- exact-head protected merge completed at `9fecb7bad53e2de5481fbac745689afa9db8537a`.

### CP-04 — Publication and Closure

- **Status:** PUBLIC_PASS / CLOSURE_MERGE_PENDING
- public URL: `https://maloma.github.io/sandbox/`;
- expected published main: `9fecb7bad53e2de5481fbac745689afa9db8537a`;
- trusted public run `29925298021`, job `88940775132`: PASS;
- HTML, Scope, Analytics, Obligations domain/UI and Debts domain/UI: HTTP 200;
- publication attempts: 1;
- downloaded-package M2 Chrome marker: `PF08A_M2_01_BROWSER_PASS`;
- runtime exceptions: NONE;
- evidence: `docs/execution-batches/PF-08A-M2-01-DEBT-CHAINS-PRINCIPAL/Public_Verification.md`;
- closure PR `#41` remains to receive a terminal rerun and merge.

## Bounded Recovery Record

Recovered without changing accepted M2 semantics:

- made Home debt elements stable generated mount points and removed fabricated `180 € / 420 €` values;
- aligned static verification with dynamic UI mounting;
- removed self-referential forbidden-control assertions;
- reconciled the existing M3 regression with active Debts while leaving Savings disabled;
- synchronized canonical/generated Scope bytes;
- made the legacy A3 finalizer byte-idempotent;
- applied the same M3 navigation reconciliation in trusted and module-regression jobs;
- preserved all prior M3, A3 and Hidden Capital checks.

## Public Evidence SHA-256

- HTML: `0bdb9e27a6db76a43bf50bd4bd3b5016be7ad67b6949e0c1ff913d17e944cddd`;
- Scope: `519b507fc7bc15266013c5218b0ed50222ab47706706bac2d87fd3d32da44c82`;
- Analytics: `9f934f1ecd3c87e747cd9f99a2cb9b83abc07040eacc67ddaf1808fe3ab77c9f`;
- Obligations: `539f0d44868478a51b07da63f58dc3ab28ae46ac96d2e203fbe6f94381b0f61b`;
- Obligations UI: `00f3660eb7d5458c5a12ab051d59704f725e1dcb3d2a090543189e71cf5ea86f`;
- Debts: `ae4831457d791ad49f3f7fd78cab2baad93db7469d1ebbc19edf9d8dea7c7c77`;
- Debts UI: `74e8595ade32023b08a048c6a5b9917ae4be9b8c964f7069b9fb79b9a049a520`.

## Rollback

Revert implementation merge `9fecb7bad53e2de5481fbac745689afa9db8537a`. Pre-batch accepted runtime remains `maloma/sandbox@6cf4b74c9cc648d9f7e17815b918a809f309e48e`.

## Terminal State After Closure Merge

```text
BATCH_COMPLETED_M2_PUBLIC_PASS
```

## Changelog

### Version 1.2 — 2026-07-22

- recorded final implementation head and merge;
- recorded downloaded-package public PASS and hashes;
- advanced CP-04 to closure merge.

### Version 1.1 — 2026-07-22

- recorded exact trusted PASS and generated runtime head.

### Version 1.0 — 2026-07-22

- established M2 runtime integration batch.

# END OF FILE
# Batch Manifest — PF-08A-A3-01-COMPACT-ANALYTICS-STATES

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Active  
**Version:** 1.0  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `667ee9980a584f55fd5de9191df15230d796a438`  
**Working Branch:** `agent/pf08a-a3-01-compact-analytics-states`  
**Authority:** FamilyPilot `docs/61_Compact_Analytics_Foundation_Specification.md`, roadmap v1.1 and Project Operating State v1.6  
**Depth Policy:** `SINGLE_DEPTH_HIGH`  
**Created:** 2026-07-22

## Objective

Complete the accepted compact Analytics foundation by implementing honest empty, one-sided, filtered, partial-data and missing-category states while preserving totals, categories and source operations on one selected scope/period/filter set.

## Included Scope

- introduce one pure Analytics-state classifier;
- distinguish completely empty scope from an empty selected period;
- distinguish Income-only and Expense-only results;
- distinguish filtered-empty results from broader period emptiness;
- add concise recorded-data limitation copy;
- preserve missing-category operations in totals and make them visibly correctable;
- keep category distribution and source operations consistent with the displayed totals;
- preserve wallet scope, independent periods, filters, drill-down and correction;
- add deterministic, syntax, static and real headless-browser verification;
- merge and publish automatically after exact PASS and verified rollback.

## Excluded Scope

- no permanent top-level Analytics destination;
- no previous-period comparison;
- no anomaly or unusual-spending detection;
- no plan-vs-actual, forecast, Safe-to-Spend or AI advice;
- no M2, M3 or M4 integration;
- no secondary-navigation redesign;
- no Figma mutation;
- no production permissions, data migration, dependency or paid-resource addition.

## Observable Contract

```text
selected financial scope
+ selected Analytics period
+ operation mode
+ optional category/search filters
→ Income / Expense / Difference
→ category state/distribution
→ source operation state/list
```

Required result classes:

- `scope_empty`;
- `period_empty`;
- `income_only`;
- `expense_only`;
- `mixed`;
- `filtered_empty`;
- `missing_category` as an explicit source-data condition without dropping money.

## Checkpoints

### CP-01 — Runtime Inspection and Pure State Contract

- **Status:** READY
- inspect exact Analytics HTML, filter state and rendering functions;
- define deterministic classification inputs and copies;
- preserve current financial calculations.

### CP-02 — Runtime Implementation and Browser Regression

- **Status:** PLANNED
- implement the classifier and UI state bindings;
- preserve source/root artifact equality;
- verify household and personal scopes, periods and filters;
- verify missing categories remain in totals;
- verify no new analytical content.

### CP-03 — PR, Merge and Public Verification

- **Status:** PLANNED
- enumerate exact changed paths;
- obtain exact-head workflow PASS;
- merge with exact-head protection;
- verify the public page in Chrome;
- record rollback and terminal evidence.

## Required Invariants

- Capital remains first on Main;
- Income and Expense remain in the lower thumb zone;
- wallet-scope isolation remains intact;
- Home and Analytics periods remain independent;
- Trash remains excluded;
- default-wallet silence and personal-wallet warning remain unchanged;
- totals and source operations use one filtered result;
- Reset does not change wallet scope or Analytics period;
- current localStorage key and data remain readable;
- root/source HTML and generated helper modules remain paired.

## Recovery

One bounded implementation or verification correction is allowed. Reject automatic merge on any value/source mismatch, wallet-scope leak, period mutation, missing-category value loss, unexpected path, workflow failure or public verification failure.

## Rollback

Revert the eventual implementation merge or restore sandbox main `667ee9980a584f55fd5de9191df15230d796a438`.

## Terminal Conditions

- `BATCH_COMPLETED`;
- `CHECKPOINT_FAILED_AFTER_BOUNDED_RECOVERY`;
- `REPOSITORY_STATE_CONFLICT`;
- `BASELINE_CONFLICT`;
- `PUBLIC_VERIFICATION_FAILED`.

# END OF FILE

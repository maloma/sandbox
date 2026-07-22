# Batch Manifest — PF-08A-A3-01-COMPACT-ANALYTICS-STATES

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Ready for Automatic Prototype Merge  
**Version:** 1.2  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `667ee9980a584f55fd5de9191df15230d796a438`  
**Working Branch:** `agent/pf08a-a3-01-compact-analytics-states`  
**Pull Request:** `#18`  
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
- merge and publish automatically only after exact trusted PASS and verified rollback.

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

## Checkpoint Results

### CP-01 — Runtime Inspection and Pure State Contract

- **Status:** COMPLETED
- **Result:** PASS.
- current totals, categories and source rows already share one filtered result;
- one pure classifier owns only state classification and copy;
- financial calculations remain in the existing runtime;
- missing category kind falls back to the source operation kind.

### CP-02 — Runtime Implementation and Browser Regression Package

- **Status:** COMPLETED
- **Generated Runtime:**
  - `src/familypilot.html` and `index.html` share blob `32d309bdbca5eecd84f2aaaad1ef2d28837b0a22`;
  - `src/familypilot-analytics-state.js` and `familypilot-analytics-state.js` share blob `9d727a7ae18c8bfdb9a06adcd46b6e54f43c1aea`;
  - package marker `compact-analytics-states-v1` is present;
  - deterministic verification and headless-Chrome scripts are committed.
- **Result:** PASS under the trusted default-branch workflow.

### CP-03 — Trusted PR, Merge and Public Verification

- **Status:** READY_FOR_MERGE
- trusted workflow installed on `sandbox/main` by PR #19, merge commit `4e0e8cc1cf2451318ccb4e03e3b5b613c40dacd1`;
- exact changed paths: twelve, all expected;
- trusted workflow: `PF-08A A3-01 Trusted PR Gate`, run `29888240647`, conclusion `success`;
- branch workflow: `PF-08A A3-01 Compact Analytics States`, run `29888240634`, conclusion `success`;
- exact checked head before this evidence update: `9e22554e36eab23c673fa40c3387a1af60cd363f`;
- all trusted steps passed: exact checkout, marker, artifact recreation, zero diff, classifier/syntax, headless Chrome;
- next transition: rerun trusted gate on the new evidence head, merge with expected-head protection, then public Chrome verification.

## Required Invariants

- Capital remains first on Main until a later accepted privacy correction changes only its disclosure presentation;
- Income and Expense remain in the lower thumb zone;
- wallet-scope isolation remains intact;
- Home and Analytics periods remain independent;
- Trash remains excluded;
- default-wallet silence and personal-wallet warning remain unchanged;
- totals and source operations use one filtered result;
- Reset does not change wallet scope or Analytics period;
- current localStorage key and data remain readable;
- root/source HTML and generated helper modules remain paired.

## New Founder Decision Recorded During Execution

A separate follow-on privacy batch must hide Capital values on Main by default and expose them only after the user presses a button labeled `Капитал`. This decision does not alter A3 Analytics calculations and must not be mixed into PR #18.

## Verification Summary

- expected paths only — PASS;
- root/source HTML equality — PASS;
- root/source Analytics module equality — PASS;
- generated artifact reproducibility — PASS;
- deterministic classifier scenarios — PASS;
- JavaScript syntax and source contract — PASS;
- headless Chrome empty/period/one-sided/filter/missing-category/scope scenarios — PASS;
- wallet-scope isolation — PASS;
- period preservation — PASS;
- rollback retained — PASS.

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

## Changelog

### Version 1.2 — 2026-07-22

- recorded trusted exact-head and branch-workflow PASS;
- advanced CP-03 to READY_FOR_MERGE;
- retained final evidence-head rerun and public verification as mandatory.

### Version 1.1 — 2026-07-22

- recorded generated artifact blobs;
- installed the trusted default-branch PR gate;
- advanced CP-03 to READY;
- recorded the separate Founder decision for hidden Capital disclosure without expanding A3 scope.

### Version 1.0 — 2026-07-22

- established the bounded compact Analytics runtime batch.

# END OF FILE
# Batch Manifest — PF-08A-IF-01-CANONICAL-RUNTIME-SOURCE

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Ready for Pull Request Verification  
**Version:** 1.1  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `32ddc846cdea4cafe8126e5a7fda9e320fe2c78a`  
**Working Branch:** `agent/pf08a-if01-canonical-runtime-source`  
**Authority:** FamilyPilot `docs/60_Current_Integrated_Development_Roadmap.md` and Project Operating State v1.5  
**Depth Policy:** `SINGLE_DEPTH_HIGH`  
**Created:** 2026-07-22

## Objective

Remove runtime source rewriting from the public FamilyPilot loader, move all currently accepted corrections into the readable canonical source, publish the exact canonical source at the root route, and prove no regression in the accepted M1 prototype behavior.

## Included Scope

- patch `src/familypilot.html` idempotently with the corrections formerly injected by `index.html`;
- make `index.html` an exact generated copy of the canonical source;
- remove runtime `fetch`, string replacement and `document.write` behavior from the public entrypoint;
- add an idempotent consolidation and verification script;
- add a bounded branch-only workflow that runs the script, commits generated changes and re-verifies;
- preserve current public behavior, data key, visual hierarchy and wallet-warning behavior;
- open Draft PR, verify checks, merge and publish automatically after PASS;
- preserve the previous public commit for rollback.

## Excluded Scope

- no product-semantic change;
- no personal-wallet viewing-scope implementation;
- no navigation redesign;
- no M2, M3 or M4 integration;
- no permission, personal-data or production architecture change;
- no dependency or paid-resource addition;
- no destructive data migration.

## Checkpoints

### CP-01 — Establish Reproducible Consolidation

- **Status:** COMPLETED
- **Result:** PASS.
- **Evidence:**
  - `tools/pf08a-if01-consolidate-runtime.mjs` performs exact-match, idempotent generation and fail-closed verification;
  - `.github/workflows/pf08a-if01-canonical-runtime-source.yml` is bounded to the exact branch and exact affected paths;
  - workflow write permission is limited to repository contents on the branch-generation job;
  - pull-request verification is read-only.

### CP-02 — Generate Canonical Source and Root Artifact

- **Status:** COMPLETED
- **Result:** PASS.
- **Evidence:**
  - `src/familypilot.html` blob SHA `90931925157a592d22a1d040efe97c13d0870e16`;
  - `index.html` blob SHA `90931925157a592d22a1d040efe97c13d0870e16`;
  - both files are byte-identical;
  - both contain `canonical-runtime-source-v1`;
  - accepted analytics-period count, transient category reset and visible double wallet-pulse corrections live directly in the source;
  - the root entrypoint no longer contains the runtime fetch/string-replacement/document-write loader.

### CP-03 — Regression, PR, Merge and Public Verification

- **Status:** READY
- **Required Transition:**
  - open Draft PR;
  - enumerate exact changed paths;
  - inspect exact PR head and mergeability;
  - obtain pull-request workflow PASS;
  - merge with exact-head protection;
  - verify the public root serves `canonical-runtime-source-v1`;
  - record rollback and terminal evidence.

## Required Invariants

- `Capital` remains first on Main;
- Income and Expense remain in the lower thumb zone;
- default wallet remains silent;
- non-default wallet warning remains immediately above Save and pulses twice when visible;
- category counts remain period-scoped;
- unfinished category draft resets between forms;
- category length and layout rules remain unchanged;
- no localStorage key or data semantics change;
- root `index.html` and `src/familypilot.html` remain byte-identical.

## Verification Summary Before PR

- canonical marker present exactly once — PASS;
- source and root artifact share one blob SHA — PASS;
- old runtime loader absent from generated root — PASS;
- one doctype and one closing HTML tag — PASS;
- generation script is idempotent — PASS;
- runtime product semantics unchanged by scope — PASS;
- rollback source commit retained — PASS.

## Recovery

- one bounded script/workflow correction is allowed;
- automatic merge is prohibited if any invariant or workflow check fails;
- rollback is restoration of main commit `32ddc846cdea4cafe8126e5a7fda9e320fe2c78a` or revert of the resulting merge commit.

## Terminal Conditions

- `BATCH_COMPLETED`;
- `CHECKPOINT_FAILED_AFTER_BOUNDED_RECOVERY`;
- `REPOSITORY_STATE_CONFLICT`;
- `WORKFLOW_PERMISSION_BLOCKER`;
- `PUBLIC_VERIFICATION_FAILED`.

## Changelog

### Version 1.1 — 2026-07-22

- marked CP-01 and CP-02 completed after branch generation;
- recorded byte-identical source and root blob SHA;
- marked CP-03 ready for PR verification.

### Version 1.0 — 2026-07-22

- established the bounded runtime source consolidation batch.

# END OF FILE

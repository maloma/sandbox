# Batch Manifest — PF-08A-IF-01-CANONICAL-RUNTIME-SOURCE

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Active  
**Version:** 1.0  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `32ddc846cdea4cafe8126e5a7fda9e320fe2c78a`  
**Working Branch:** `agent/pf08a-if01-canonical-runtime-source`  
**Authority:** FamilyPilot `docs/60_Current_Integrated_Development_Roadmap.md` and Project Operating State v1.5  
**Depth Policy:** `SINGLE_DEPTH_HIGH`  
**Created:** 2026-07-22

## Objective

Remove runtime source rewriting from the public FamilyPilot loader, move all currently accepted corrections into the readable canonical source, publish the exact canonical source at the root route, and prove no regression in the accepted M1 prototype behavior.

## Included Scope

- patch `src/familypilot.html` idempotently with the corrections currently injected by `index.html`;
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

- **Status:** READY
- create idempotent patch/verification script;
- add branch-only workflow;
- ensure exact-match assertions fail closed.

### CP-02 — Generate Canonical Source and Root Artifact

- **Status:** PLANNED
- apply current runtime corrections to `src/familypilot.html`;
- generate `index.html` as an exact copy;
- prove old runtime patch loader is absent.

### CP-03 — Regression, PR, Merge and Public Verification

- **Status:** PLANNED
- verify source/index equality and required markers;
- verify no forbidden loader constructs;
- verify PR scope and workflow result;
- merge with exact-head protection;
- verify public root serves the canonical marker;
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
- root `index.html` and `src/familypilot.html` are byte-identical after generation.

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

# END OF FILE

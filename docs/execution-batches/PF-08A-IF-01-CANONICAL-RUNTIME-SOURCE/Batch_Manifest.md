# Batch Manifest — PF-08A-IF-01-CANONICAL-RUNTIME-SOURCE

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Completed  
**Version:** 1.2  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `32ddc846cdea4cafe8126e5a7fda9e320fe2c78a`  
**Implementation Branch:** `agent/pf08a-if01-canonical-runtime-source`  
**Implementation Pull Request:** `#14`  
**Implementation Head:** `e340d42acc79223439f800c243e6f4fc95cebf69`  
**Implementation Merge Commit:** `078fff9a9a47b26fd6a4472fe107ba66e3cba926`  
**Closure Branch:** `agent/pf08a-if01-public-verification`  
**Authority:** FamilyPilot `docs/60_Current_Integrated_Development_Roadmap.md` and Project Operating State v1.5  
**Depth Policy:** `SINGLE_DEPTH_HIGH`  
**Created:** 2026-07-22

## Objective

Remove runtime source rewriting from the public FamilyPilot loader, move all currently accepted corrections into the readable canonical source, publish the exact canonical source at the root route, and prove no regression in the accepted M1 prototype behavior.

## Completed Scope

- embedded the currently published analytics-period category-count correction directly in `src/familypilot.html`;
- embedded transient category-draft reset directly in the source;
- embedded the visibility-triggered two-pulse non-default-wallet warning directly in the source;
- added `canonical-runtime-source-v1`;
- generated `index.html` as a byte-identical copy of `src/familypilot.html`;
- removed runtime `fetch`, string replacement and `document.write` behavior from the root entrypoint;
- added an idempotent consolidation and verification script;
- added a bounded branch-generation and PR-verification workflow;
- verified exact PR scope and workflow success;
- merged PR #14 with exact-head protection;
- verified the public root contract with HTTP 200 and a cache-busted public smoke test;
- preserved the previous public commit for rollback.

## Excluded Scope Preserved

- no product-semantic change;
- no personal-wallet viewing-scope implementation;
- no navigation redesign;
- no M2, M3 or M4 integration;
- no permission, personal-data or production architecture change;
- no dependency or paid-resource addition;
- no destructive data migration.

## Checkpoint Results

### CP-01 — Establish Reproducible Consolidation

- **Status:** COMPLETED
- **Result:** PASS.
- **Evidence:** `tools/pf08a-if01-consolidate-runtime.mjs` and `.github/workflows/pf08a-if01-canonical-runtime-source.yml`.

### CP-02 — Generate Canonical Source and Root Artifact

- **Status:** COMPLETED
- **Result:** PASS.
- **Canonical Source Blob SHA:** `90931925157a592d22a1d040efe97c13d0870e16`.
- **Root Artifact Blob SHA:** `90931925157a592d22a1d040efe97c13d0870e16`.

### CP-03 — Regression, PR, Merge and Public Verification

- **Status:** COMPLETED
- **Result:** PASS.
- **PR Workflow Run:** `29882255653`, conclusion `success` on exact merge head.
- **Merge Commit:** `078fff9a9a47b26fd6a4472fe107ba66e3cba926`.
- **Public Evidence:** `docs/execution-batches/PF-08A-IF-01-CANONICAL-RUNTIME-SOURCE/Public_Verification.md`.
- **Public Result:** HTTP 200; canonical marker present; old loader absent.

## Preserved Invariants

- Capital remains first on Main;
- Income and Expense remain in the lower thumb zone;
- default wallet remains silent;
- non-default wallet warning remains immediately above Save and pulses twice when visible;
- category counts remain period-scoped;
- unfinished category draft resets between forms;
- category length and layout rules remain unchanged;
- no localStorage key or data semantics changed;
- root `index.html` and `src/familypilot.html` are byte-identical.

## Verification Summary

- exact source anchors and idempotent generation — PASS;
- source/root byte identity — PASS;
- canonical marker — PASS;
- old runtime loader absence — PASS;
- exact six-file implementation PR scope — PASS;
- PR workflow on final head — PASS;
- exact-head protected merge — PASS;
- public HTTP and marker smoke test — PASS;
- rollback retained — PASS.

## Rollback

- preferred: Git revert of merge commit `078fff9a9a47b26fd6a4472fe107ba66e3cba926`;
- preserved previous public state: `32ddc846cdea4cafe8126e5a7fda9e320fe2c78a`.

## Terminal State

```text
BATCH_COMPLETED
```

## Next Authorized Runtime Batch

```text
PF-08A-IF-02 — Existing-Surface Personal Wallet Scope
```

This next batch implements the already accepted wallet-specific Main Capital, Operations and Analytics scope without starting the full Wallet Management package.

## Changelog

### Version 1.2 — 2026-07-22

- marked CP-03 and the batch completed;
- recorded exact PR head, merge commit and public verification;
- established personal-wallet scope as the next runtime batch.

### Version 1.1 — 2026-07-22

- marked CP-01 and CP-02 completed after branch generation;
- recorded byte-identical source and root blob SHA;
- marked CP-03 ready for PR verification.

### Version 1.0 — 2026-07-22

- established the bounded runtime source consolidation batch.

# END OF FILE

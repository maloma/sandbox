# Batch Manifest — PF-08A-IF-02-PERSONAL-WALLET-SCOPE

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Ready for Pull Request Verification  
**Version:** 1.1  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `6cfa4bfaff9294b39e61d5e159b19ebd82dc114e`  
**Working Branch:** `agent/pf08a-if02-personal-wallet-scope`  
**Authority:** FamilyPilot `docs/59_Analytics_Period_Entry_State_and_Personal_Wallet_Scope.md`, `docs/51_Personal_Wallet_Privacy_and_Household_Capital_Default_Decision.md`, current roadmap and Project Operating State  
**Depth Policy:** `SINGLE_DEPTH_HIGH`  
**Created:** 2026-07-22

## Objective

Implement the already accepted existing-surface personal-wallet viewing scope so the selected wallet controls both operation destination and the visible Main Capital, Operations and Analytics data.

## Included Scope

- classify the selected active wallet as household or personal using the current prototype wallet fixtures/model;
- while a personal wallet is selected, filter Operations to that wallet;
- while a personal wallet is selected, calculate Analytics from that wallet only;
- while a personal wallet is selected, show that wallet's balance/personal capital instead of household capital;
- preserve independent Home and Analytics periods inside each selected wallet scope;
- return deterministically to household Operations, Analytics and Capital when the default household wallet is selected;
- preserve operation creation/edit wallet attribution and the existing compact non-default-wallet warning;
- add deterministic automated regression checks and public smoke evidence;
- merge and publish automatically only after PASS and verified rollback.

## Excluded Scope

- no wallet creation, editing or deletion UI;
- no grant/revoke permission UI;
- no production authentication or authorization enforcement;
- no household-capital opt-in control UI;
- no additional shared-wallet product design;
- no multicurrency conversion implementation;
- no M2, M3 or M4 integration;
- no secondary-navigation redesign;
- no data-key migration.

## Observable Contract

### Household wallet selected

- Main Capital uses the household scope under current prototype rules;
- Operations and Analytics use accessible non-personal household-wallet operations;
- personal-wallet detail operations remain excluded even when a personal wallet is opted into household aggregate capital;
- existing household entry behavior remains unchanged.

### Personal wallet selected

- Main Capital shows the selected personal wallet balance/personal capital;
- Operations show only operations with the selected wallet ID;
- Analytics use only operations with the selected wallet ID;
- household operations and household capital are not mixed into the personal view;
- operation entry continues to save to the selected personal wallet;
- a compact non-default-wallet warning remains above Save;
- switching back to the household wallet restores the household scope.

## Privacy Boundary

The static prototype models owner access through deterministic fixtures but does not claim production permission enforcement. A personal wallet is available only when the current fixture member is its owner or is explicitly included in `allowedMemberIds`.

Access and household-capital inclusion remain independent. This batch does not implement the inclusion control UI.

## Checkpoint Results

### CP-01 — Runtime Model and Route Inspection

- **Status:** COMPLETED
- **Result:** PASS.
- **Findings:** Main, Operations, Analytics and category counts previously consumed unscoped `activeOps()` independently; Capital always used household calculation.
- **Resolution:** one shared `FamilyPilotScope` module owns accessible wallets, selected scope, visible operations, household aggregate capital, personal capital and scope descriptors.

### CP-02 — Implement Existing-Surface Wallet Scope

- **Status:** COMPLETED
- **Result:** PASS.
- **Implementation:**
  - `src/familypilot-scope.js` and generated root `familypilot-scope.js` contain the shared scope model;
  - Main Capital, Home flow metrics, Operations, Analytics and category counts use the shared visible scope;
  - Operations and Analytics show the active context label;
  - personal Capital shows the selected wallet name and personal balance;
  - household scope restores deterministically;
  - inaccessible personal wallet selection falls back to the default accessible household wallet;
  - root/source HTML remain byte-identical;
  - root/source scope modules remain byte-identical.
- **HTML Blob SHA:** `9a3a50d2537c73c9be0cdba527e61d7a4f29daa0` for both `index.html` and `src/familypilot.html`.
- **Scope Module Blob SHA:** `7d2338fb2a0ec26b0e705c5fb14eaa2f57b70eb4` for both scope-module locations.
- **Verification:** deterministic pure-model scenarios, application and scope-module syntax validation, static contract checks, and a real headless-Chrome scenario all passed before generated artifacts were committed.

### CP-03 — Regression, PR, Merge and Public Verification

- **Status:** READY
- **Required Transition:**
  - open Draft PR;
  - enumerate exact changed paths;
  - run deterministic and headless-browser PR checks on the exact head;
  - merge with exact-head protection after PASS;
  - verify public HTML and scope-module markers plus the public wallet-switching scenario;
  - record rollback and terminal evidence.

## Required Invariants

- Capital remains first on Main;
- Income and Expense remain in the lower thumb zone;
- default wallet remains silent during entry;
- personal-wallet warning remains immediately above Save;
- Home and Analytics period state remain independent;
- category counts remain selected-period scoped;
- Trash remains excluded from active calculations;
- no operation changes wallet silently during edit;
- current local persistence remains readable without data-key migration;
- `index.html` and `src/familypilot.html` remain byte-identical;
- `familypilot-scope.js` and `src/familypilot-scope.js` remain byte-identical.

## Verification Summary Before PR

- household operation scope excludes personal operations — PASS;
- personal scope contains only the selected personal wallet operations — PASS;
- Trash is excluded — PASS;
- personal Capital uses selected-wallet flow — PASS;
- household aggregate may include opted-in personal value without exposing personal details — PASS;
- inaccessible personal wallet falls back safely — PASS;
- household scope restores after switching back — PASS;
- default-wallet warning remains hidden and personal-wallet warning remains visible — PASS;
- source and generated artifacts are equal — PASS;
- JavaScript syntax validation — PASS;
- headless-browser scenario — PASS;
- rollback base retained — PASS.

## Recovery

One bounded implementation or verification correction is allowed. Reject automatic merge on any household-data leak into personal scope, scope restoration failure, unexpected changed path, workflow failure or public verification failure.

## Rollback

Revert the eventual implementation merge or restore sandbox main commit `6cfa4bfaff9294b39e61d5e159b19ebd82dc114e`.

## Terminal Conditions

- `BATCH_COMPLETED`;
- `CHECKPOINT_FAILED_AFTER_BOUNDED_RECOVERY`;
- `REPOSITORY_STATE_CONFLICT`;
- `BASELINE_CONFLICT`;
- `PUBLIC_VERIFICATION_FAILED`.

## Changelog

### Version 1.1 — 2026-07-22

- marked CP-01 and CP-02 completed;
- recorded shared scope architecture and exact generated artifact hashes;
- recorded deterministic and browser-regression PASS;
- marked CP-03 ready for PR verification.

### Version 1.0 — 2026-07-22

- established the bounded existing-surface personal-wallet scope batch.

# END OF FILE

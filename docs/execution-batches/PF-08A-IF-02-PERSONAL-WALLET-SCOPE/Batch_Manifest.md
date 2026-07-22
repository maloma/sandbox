# Batch Manifest — PF-08A-IF-02-PERSONAL-WALLET-SCOPE

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Active  
**Version:** 1.0  
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
- no data-key migration unless strictly required and proven backward-compatible.

## Observable Contract

### Household wallet selected

- Main Capital uses the household scope under current prototype rules;
- Operations and Analytics use household-scope operations;
- existing household behavior remains unchanged.

### Personal wallet selected

- Main Capital shows the selected personal wallet balance/personal capital;
- Operations show only operations with the selected wallet ID;
- Analytics use only operations with the selected wallet ID;
- household operations and household capital are not mixed into the personal view;
- operation entry continues to save to the selected personal wallet;
- a compact non-default-wallet warning remains above Save;
- switching back to the household wallet restores the household scope.

## Privacy Boundary

The static prototype may model owner access through deterministic fixtures, but it must not claim production permission enforcement. The UI must never expose another personal wallet merely because it belongs to the same household unless the fixture explicitly marks it accessible.

Access and household-capital inclusion remain independent. This batch does not implement the inclusion control.

## Checkpoints

### CP-01 — Runtime Model and Route Inspection

- **Status:** READY
- inspect exact wallet, operation, Capital, Operations and Analytics functions;
- identify the minimum bounded changes;
- establish deterministic fixtures and assertions.

### CP-02 — Implement Existing-Surface Wallet Scope

- **Status:** PLANNED
- implement shared scope selectors/calculation helpers;
- update Main Capital, Operations and Analytics;
- preserve entry/edit behavior and periods;
- generate root artifact from canonical source.

### CP-03 — Regression, PR, Merge and Public Verification

- **Status:** PLANNED
- verify household and personal scenarios;
- verify create/edit/reload and scope restoration;
- verify source/root equality and no loader regression;
- open PR, obtain workflow PASS, merge with exact-head protection;
- verify public marker and scenario evidence;
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
- current local persistence remains readable;
- `index.html` and `src/familypilot.html` remain byte-identical.

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

# END OF FILE

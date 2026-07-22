# Batch Manifest — PF-08A-PRIV-01-HIDDEN-CAPITAL

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Active  
**Version:** 1.0  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `6289b1188cab01ca53c30fd07ef48453bf97425c`  
**Working Branch:** `agent/pf08a-priv01-hidden-capital`  
**Authority:** Founder decision on 2026-07-22 and current PF-08A Main/Wallet baseline  
**Depth Policy:** `SINGLE_DEPTH_HIGH`  
**Created:** 2026-07-22

## Objective

Prevent shoulder-surfing disclosure of Capital on Main. The Main screen must show only one button labeled `Капитал`; the current family or personal Capital value and details appear only after an explicit press.

## Included Scope

- replace the visible Capital card with a button-like disclosure control;
- keep the button first on Main;
- show no Capital amount, change, graph, dates or wallet-scope label on Main;
- open the existing Capital overlay after pressing the button;
- show the current selected financial scope, Capital amount and change inside the overlay;
- preserve family/personal wallet calculations and isolation;
- keep the disclosure closed on page load and after closing;
- add deterministic static and headless-Chrome verification;
- merge and publish automatically only after trusted exact-head PASS and rollback verification.

## Excluded Scope

- no authentication, PIN, biometric or device-lock implementation;
- no permission or access-control changes;
- no change to Capital calculations;
- no change to wallet inclusion rules;
- no hiding of Income, Expense, debts or Analytics values;
- no navigation redesign;
- no persistence migration or new dependency;
- no production release.

## Observable Contract

### Main closed state

- the first Main control reads exactly `Капитал`;
- it looks and behaves as a button;
- no Capital value, change, graph or date is visible;
- personal wallet selection does not reveal its name or Capital on Main;
- the Capital overlay is closed after load.

### Open state

- pressing `Капитал` opens the Capital overlay;
- the overlay identifies family or selected personal scope;
- the overlay displays the correct Capital value and operation change;
- personal and household details remain isolated;
- closing the overlay returns to the hidden Main state.

## Checkpoints

### CP-01 — Exact Runtime Inspection and Disclosure Contract

- **Status:** COMPLETED
- current Main renders Capital amount, change, graph, dates and scope label directly;
- existing `capitalInfo` overlay and `openCapitalInfo()` are reusable;
- current calculations remain owned by `scopedCapitalSnapshot()`.

### CP-02 — Runtime Implementation and Regression

- **Status:** READY
- patch canonical source;
- generate byte-identical root artifact;
- verify household and personal disclosure;
- verify closed-by-default and post-close state;
- preserve current A3 Analytics and wallet tests.

### CP-03 — Trusted PR, Merge and Public Verification

- **Status:** PLANNED
- install or use default-branch trusted workflow;
- verify exact changed paths and exact head;
- merge with expected-head protection;
- verify public GitHub Pages disclosure in Chrome;
- record terminal evidence.

## Required Invariants

- Capital remains first on Main, but only as a disclosure button;
- Income and Expense remain in the lower thumb zone;
- wallet-scope isolation remains intact;
- compact Analytics A3 behavior remains intact;
- Home/Analytics periods remain independent;
- Trash remains excluded;
- default-wallet silence and personal-wallet warning remain unchanged;
- current localStorage key and data remain readable;
- root/source HTML remain byte-identical.

## Recovery

One bounded implementation or verification correction is allowed. Reject merge on any Main Capital leak, wrong scope value, wallet-detail mixing, broken overlay close, unexpected path, regression failure or public verification failure.

## Rollback

Revert the eventual implementation merge or restore `6289b1188cab01ca53c30fd07ef48453bf97425c`.

## Terminal Conditions

- `BATCH_COMPLETED`;
- `CHECKPOINT_FAILED_AFTER_BOUNDED_RECOVERY`;
- `REPOSITORY_STATE_CONFLICT`;
- `PUBLIC_VERIFICATION_FAILED`.

# END OF FILE
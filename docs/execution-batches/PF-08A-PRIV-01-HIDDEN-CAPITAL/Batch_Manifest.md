# Batch Manifest — PF-08A-PRIV-01-HIDDEN-CAPITAL

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Ready for Automatic Prototype Merge  
**Version:** 1.1  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `6289b1188cab01ca53c30fd07ef48453bf97425c`  
**Working Branch:** `agent/pf08a-priv01-hidden-capital`  
**Pull Request:** `#21`  
**Authority:** Founder decision on 2026-07-22 and current PF-08A Main/Wallet baseline  
**Depth Policy:** `SINGLE_DEPTH_HIGH`  
**Created:** 2026-07-22

## Objective

Prevent shoulder-surfing disclosure of Capital on Main. The Main screen shows only one button labeled `Капитал`; the current family or personal Capital value and details appear only after an explicit press.

## Implemented Scope

- replaced the visible Capital card with a button-like disclosure control;
- kept the button first on Main;
- removed Capital amount, change, graph, dates and wallet-scope label from Main;
- reused the existing Capital overlay after pressing the button;
- moved the current selected scope, Capital amount and change into the overlay;
- preserved family/personal wallet calculations and isolation;
- kept the disclosure closed on page load and after closing;
- added deterministic static and headless-Chrome verification;
- preserved byte-identical root/source HTML.

## Excluded Scope Preserved

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
- no Capital value, change, graph, date or visible wallet label exists there;
- personal wallet selection does not reveal its name or Capital in visible Main text;
- the Capital overlay is closed after load and after dismiss.

### Open state

- pressing `Капитал` opens the Capital overlay;
- the overlay identifies family or selected personal scope;
- the overlay displays the correct Capital value and operation change;
- personal and household details remain isolated;
- closing the overlay returns to the hidden Main state.

## Checkpoint Results

### CP-01 — Exact Runtime Inspection and Disclosure Contract

- **Status:** COMPLETED
- **Result:** PASS.

### CP-02 — Runtime Implementation and Regression

- **Status:** COMPLETED
- **HTML Blob:** `3e690de8d484c1822073904e6fab280bf8ca6486` for both `src/familypilot.html` and `index.html`.
- **Package Marker:** `hidden-capital-disclosure-v1`.
- **Visible Main Text:** exactly `Капитал`.
- **Main Capital Value Exposure:** none.
- **Household Disclosure:** PASS.
- **Personal Disclosure:** PASS.
- **Overlay Closed State:** PASS.
- **Wallet Scope Isolation:** PASS.
- **Compact Analytics Regression:** PASS.

### CP-03 — Trusted PR, Merge and Public Verification

- **Status:** READY_FOR_MERGE
- **Trusted Gate Bootstrap Merge:** `6100ade6953a9a27dcfa70446bd7aa39fbc806da`.
- **Trusted Gate Recovery Merge:** `f3c922e9c3a0effcd3f124a4de0350ff6b4f71cb`.
- **Verified Head Before This Evidence Update:** `4c652b28252517438346c7126e03093a48a94261`.
- **Exact Changed Paths:** nine expected paths.
- **Privacy Trusted Workflow:** run `29889336451`, conclusion `success`.
- **Privacy Branch Workflow:** run `29889336122`, conclusion `success`.
- **A3 Trusted Regression:** run `29889336343`, conclusion `success`.
- **A3 Branch Regression:** run `29889336108`, conclusion `success`.
- **Remaining Transition:** repeat the trusted gate on the new evidence head, merge with expected-head protection, then verify the published GitHub Pages route in Chrome.

## Verification Summary

- first Main control is the disclosure button — PASS;
- visible button text exactly `Капитал` — PASS;
- no Main amount/change/graph/dates/scope label — PASS;
- no personal wallet name in visible Main button text — PASS;
- household Capital appears only after press — PASS;
- personal Capital appears only after press — PASS;
- family/personal details remain isolated — PASS;
- close returns to hidden state — PASS;
- source/root equality — PASS;
- A3 Analytics static and Chrome regression — PASS;
- JavaScript syntax — PASS;
- storage and calculations unchanged — PASS;
- rollback retained — PASS.

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

The bounded recovery corrected test whitespace normalization and replaced detached-head `git push` with verified GitHub Contents API persistence. No product scope or calculation changed.

## Rollback

Revert the eventual implementation merge or restore `6289b1188cab01ca53c30fd07ef48453bf97425c`.

## Terminal Conditions

- `BATCH_COMPLETED`;
- `CHECKPOINT_FAILED_AFTER_BOUNDED_RECOVERY`;
- `REPOSITORY_STATE_CONFLICT`;
- `PUBLIC_VERIFICATION_FAILED`.

## Changelog

### Version 1.1 — 2026-07-22

- marked CP-02 completed;
- recorded exact HTML blob and all successful trusted/regression workflows;
- advanced CP-03 to READY_FOR_MERGE.

### Version 1.0 — 2026-07-22

- established the hidden Capital disclosure batch.

# END OF FILE
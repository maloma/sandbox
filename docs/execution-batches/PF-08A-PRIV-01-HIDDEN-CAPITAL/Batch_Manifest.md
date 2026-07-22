# Batch Manifest — PF-08A-PRIV-01-HIDDEN-CAPITAL

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Completed  
**Version:** 1.2  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `6289b1188cab01ca53c30fd07ef48453bf97425c`  
**Implementation Branch:** `agent/pf08a-priv01-hidden-capital`  
**Implementation Pull Request:** `#21`  
**Implementation Head:** `8e8822e2993372abde160060b2d86fa3ac500c21`  
**Implementation Merge Commit:** `3b62f927d7728d5c05bb3dd3e3e649974a9cb441`  
**Closure Branch:** `agent/pf08a-priv01-public-verification`  
**Closure Pull Request:** `#25`  
**Authority:** Founder decision on 2026-07-22 and current PF-08A Main/Wallet baseline  
**Depth Policy:** `SINGLE_DEPTH_HIGH`  
**Created:** 2026-07-22

## Objective

Prevent shoulder-surfing disclosure of Capital on Main. The Main screen shows only one button labeled `Капитал`; the current family or personal Capital value and details appear only after an explicit press.

## Completed Scope

- replaced the visible Capital card with a button-like disclosure control;
- kept the button first on Main;
- removed Capital amount, change, graph, dates and wallet-scope label from Main;
- reused the Capital overlay after pressing the button;
- moved the current selected scope, Capital amount and change into the overlay;
- preserved family/personal wallet calculations and isolation;
- kept the disclosure closed on page load and after closing;
- added deterministic static, trusted PR, local Chrome and public Chrome verification;
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

- first Main control visible text exactly `Капитал`;
- button-like disclosure behavior;
- no Capital value, change, graph, date or visible wallet label;
- personal wallet selection does not reveal its name or Capital in visible Main text;
- overlay closed after load and after dismiss.

### Open state

- pressing `Капитал` opens the Capital overlay;
- overlay identifies family or selected personal scope;
- correct Capital value and operation change are shown;
- personal and household details remain isolated;
- closing returns to the hidden Main state.

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

- **Status:** COMPLETED
- **Trusted Gate Bootstrap Merge:** `6100ade6953a9a27dcfa70446bd7aa39fbc806da`.
- **Trusted Gate Recovery Merge:** `f3c922e9c3a0effcd3f124a4de0350ff6b4f71cb`.
- **Final Privacy Trusted Workflow:** run `29889523597`, conclusion `success`.
- **Final Privacy Branch Workflow:** run `29889523566`, conclusion `success`.
- **Final A3 Trusted Regression:** run `29889523559`, conclusion `success`.
- **Final A3 Branch Regression:** run `29889523568`, conclusion `success`.
- **Implementation Merge:** `3b62f927d7728d5c05bb3dd3e3e649974a9cb441`.
- **Trusted Public Gate Merge:** `b64e7dab2083d5b343e1a3646ee50462264fa78c`.
- **Trusted Public Workflow:** run `29889733305`, conclusion `success`.
- **Public Evidence:** `docs/execution-batches/PF-08A-PRIV-01-HIDDEN-CAPITAL/Public_Verification.md`.
- **Public Result:** HTML 200; scope module 200; Analytics module 200; no Main Capital values; household/personal disclosure PASS; runtime exceptions NONE.

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
- public GitHub Pages Chrome verification — PASS;
- JavaScript syntax — PASS;
- storage and calculations unchanged — PASS;
- runtime exceptions — NONE;
- rollback retained — PASS.

## Required Invariants Preserved

- Capital remains first on Main, but only as a disclosure button;
- Income and Expense remain in the lower thumb zone;
- wallet-scope isolation remains intact;
- compact Analytics A3 behavior remains intact;
- Home/Analytics periods remain independent;
- Trash remains excluded;
- default-wallet silence and personal-wallet warning remain unchanged;
- current localStorage key and data remain readable;
- root/source HTML remain byte-identical.

## Recovery Record

The bounded recovery corrected test whitespace normalization and replaced detached-head `git push` with verified GitHub Contents API persistence. No product scope or calculation changed.

## Rollback

- preferred: Git revert of implementation merge `3b62f927d7728d5c05bb3dd3e3e649974a9cb441`;
- preserved previous accepted state: `6289b1188cab01ca53c30fd07ef48453bf97425c`.

## Terminal State

```text
BATCH_COMPLETED
```

## Next Authorized Product Work

```text
PF-08A-A4 — Final Secondary Navigation Decision Package
```

## Changelog

### Version 1.2 — 2026-07-22

- marked CP-03 and the batch completed;
- recorded implementation merge and trusted public Chrome evidence;
- exposed A4 final secondary-navigation decision package as the next workstream.

### Version 1.1 — 2026-07-22

- marked CP-02 completed;
- recorded exact HTML blob and successful trusted/regression workflows;
- advanced CP-03 to READY_FOR_MERGE.

### Version 1.0 — 2026-07-22

- established the hidden Capital disclosure batch.

# END OF FILE
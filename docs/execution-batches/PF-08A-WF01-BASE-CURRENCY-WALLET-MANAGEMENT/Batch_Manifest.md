# Batch Manifest — PF-08A-WF01-BASE-CURRENCY-WALLET-MANAGEMENT

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Trusted PASS / Owner Checkpoint  
**Version:** 1.0  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `fad18ac3c63af94f1cc987bb23036ecf18c0e4a5`  
**Working Branch:** `agent/pf08a-wf01-base-currency-wallet-management`  
**Pull Request:** `#45`  
**Authority:** `maloma/FamilyPilot@88d7bead`, documents 46, 51 and 69  
**Created:** 2026-07-22

## Objective

Integrate bounded base-currency wallet management while preserving personal-wallet privacy, IF-02 scope and the separation between access and household-capital inclusion.

## Included

- `Ещё → Кошельки`;
- create additional shared wallet in household base currency;
- create current-member personal wallet;
- stable ids and zero starting balance;
- rename according to ownership;
- shared included in household capital;
- personal owner-only and excluded by default;
- owner-controlled personal capital inclusion;
- selector refresh and IF-02 scope preservation;
- deterministic, Chrome and public verification.

## Excluded

- grant/revoke access and production permissions;
- personal-data access changes;
- FX, crypto, investment and pension wallets;
- valuation and exchange rates;
- transfers and opening-balance entry;
- archive/delete/merge/split/ownership conversion.

## Financial and Privacy Boundary

Wallet creation, rename and capital-inclusion changes create no Income, Expense or Transfer. Capital inclusion never changes `allowedMemberIds`.

## Checkpoints

### CP-01 — Runtime Inspection — COMPLETED

Current runtime already contained wallet fixtures, selector and IF-02 scope. Wallet management was absent. Existing dynamic finalizer pattern was reusable.

### CP-02 — Domain, UI and Verification — COMPLETED

- schema-v7 wallet management domain;
- shared/personal creation defaults;
- stable rename and owner-only inclusion change;
- Wallet Management screen and modal;
- no permission, FX, transfer or destructive controls;
- domain/static/Chrome tests;
- existing workflow families extended.

### CP-03 — Exact PR Gate — TRUSTED PASS

- verified source head: `93cf1e481e990af91edceb2204a01e2b47062e0d`;
- trusted run `29933728879`, job `88969762365`;
- domain and static contracts — PASS;
- A3, Hidden Capital, M3, M2 and M4 regressions — PASS;
- WF-01 Chrome journey — PASS;
- runtime exceptions — NONE;
- generated artifacts persisted by the parallel verified branch run at `2cddb7795a6acfaa1e6fd3d80dcce4be28012860`;
- trusted persistence correctly failed closed after the branch moved, preventing a stale write.

### CP-04 — Publication and Closure — PLANNED

- owner checkpoint and exact-head zero-diff rerun;
- expected-head merge;
- downloaded-package public verification;
- terminal evidence and canonical synchronization.

## Rollback

Revert the eventual PR #45 merge. Pre-batch accepted runtime remains `fad18ac3c63af94f1cc987bb23036ecf18c0e4a5`.

# END OF FILE
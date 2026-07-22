# Batch Manifest — PF-08A-WF01-BASE-CURRENCY-WALLET-MANAGEMENT

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Completed / Public PASS  
**Version:** 1.1  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `fad18ac3c63af94f1cc987bb23036ecf18c0e4a5`  
**Implementation Pull Request:** `#45`  
**Implementation Merge:** `85339932958f58cd416eb966a67e1bb35f56383c`  
**Public Closure Pull Request:** `#46`  
**Authority:** `maloma/FamilyPilot@88d7bead`, documents 46, 51 and 69  
**Created:** 2026-07-22

## Objective

Integrate bounded base-currency wallet management while preserving personal-wallet privacy, IF-02 scope and the separation between access and household-capital inclusion.

## Included

- `Ещё → Кошельки`;
- additional shared and current-member personal base-currency wallets;
- stable ids, zero start and ownership-aware rename;
- shared capital inclusion and personal owner-only/excluded default;
- owner-controlled personal capital inclusion;
- accessible selector and IF-02 scope preservation;
- deterministic, Chrome and public verification.

## Excluded

Permissions and real personal-data access; FX/crypto/investment/pension valuation; transfers and opening-balance entry; destructive or ownership-conversion lifecycle actions.

## Financial and Privacy Boundary

Wallet creation, rename and capital-inclusion changes create no Income, Expense or Transfer. Capital inclusion never changes `allowedMemberIds`.

## Checkpoints

### CP-01 — Runtime Inspection — COMPLETED

Fixtures, selector and IF-02 scope existed; wallet management was absent.

### CP-02 — Domain, UI and Verification — COMPLETED

Schema-v7 wallet management, restricted UI, domain/static/Chrome tests and existing workflow-family extensions completed.

### CP-03 — Exact PR Gate — COMPLETED

- initial trusted functional PASS: run `29933728879`;
- verified generated artifacts: `2cddb7795a6acfaa1e6fd3d80dcce4be28012860`;
- final exact owner head: `af7357010a10e0a0720f787be9b6ae6bbd273540`;
- final trusted run `29934029164`, job `88970802238` — PASS;
- all domain/static/browser regressions and zero-diff — PASS;
- runtime exceptions — NONE;
- expected-head merge — `85339932958f58cd416eb966a67e1bb35f56383c`.

### CP-04 — Publication and Closure — COMPLETED

- public run `29934350619`, job `88971923616` — PASS;
- expected main `85339932958f58cd416eb966a67e1bb35f56383c`;
- HTML plus ten runtime modules — HTTP 200;
- publication attempts — 1;
- browser marker — `PF08A_WF01_BROWSER_PASS`;
- shared/personal creation, privacy defaults, independent capital inclusion, cross-member isolation and selector/scope — PASS;
- no management operations or permission/FX/transfer controls — PASS;
- prior modules — PASS;
- runtime exceptions — NONE.

## Public Evidence

`docs/execution-batches/PF-08A-WF01-BASE-CURRENCY-WALLET-MANAGEMENT/Public_Verification.md`

Key hashes:

- HTML: `a651fd54a516fd2d70f811432f5a4be7e5eca586445f716d85d8ab09848912a4`;
- wallet domain: `6e7d8d4142f3417099126ef607ff6084ca082fc2c39e641c289472eb02d87bc3`;
- wallet UI: `5ca234f3950e0b9eeca34b338b506b8d51755611299e4e77cfc5f383a6efbf6e`.

## Rollback

Revert implementation merge `85339932958f58cd416eb966a67e1bb35f56383c`. Pre-batch runtime remains `fad18ac3c63af94f1cc987bb23036ecf18c0e4a5`.

## Terminal State

```text
BATCH_COMPLETED
```

# END OF FILE
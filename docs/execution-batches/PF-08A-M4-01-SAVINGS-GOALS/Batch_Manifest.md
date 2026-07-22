# Batch Manifest — PF-08A-M4-01-SAVINGS-GOALS

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Active  
**Version:** 1.0  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `714629922c1ea977117883357e465aa13a6598c9`  
**Working Branch:** `agent/pf08a-m4-01-savings-goals`  
**Authority:** `maloma/FamilyPilot@8076cf9680d8e1b05b67be9f5feb99e5343b8290`, documents 32, 60, 65 and 68  
**Created:** 2026-07-22

## Objective

Integrate the Founder-approved Savings Goal Configuration flow into Plan without changing wallet balance, Capital or ordinary Income/Expense Analytics.

## Included Scope

- activate Plan → Savings;
- household SavingsGoal schema v6;
- named goals with target amount, saved amount and optional date;
- create, persist, edit and archive;
- stable goal ids;
- progress and remaining amount;
- compact contextual help that preserves unsaved form values;
- neutral optional empty state;
- explicit separation from emergency cushion, unallocated savings and combined overview;
- deterministic finalization inside the canonical app IIFE;
- domain, static, Chrome and public downloaded-package verification;
- preservation of M1, M2, M3, A3, Hidden Capital and Option A;
- exact rollback.

## Excluded Scope

- emergency cushion configuration;
- unallocated-savings setting;
- combined savings overview;
- personal-goal semantics;
- goal funding or withdrawal transactions;
- wallet/goal transfers;
- savings distribution automation;
- forecasts and Safe-to-Spend;
- production permissions, migrations, external integrations or paid dependencies.

## Financial Invariants

- goal target is a plan;
- saved amount is a declared assignment of existing household savings;
- create/edit/archive creates no Income, Expense, Transfer or ordinary Operations row;
- create/edit/archive changes no wallet balance or Capital;
- no-goal state is valid and non-alarming.

## Verification Strategy

Existing FamilyPilot workflow files are extended; no new workflow family is introduced.

Required suites:

- M4 domain test;
- M4 static integration contract;
- M4 Chrome user journey;
- M2 domain/static/Chrome;
- M3 domain/static/Chrome;
- A3 Analytics Chrome;
- Hidden Capital Chrome;
- source/root equality;
- public downloaded-package verification;
- rollback evidence.

## Checkpoints

### CP-01 — Exact Runtime Inspection

- **Status:** COMPLETED
- Savings static Plan entry disabled;
- app state and render functions live inside closed IIFE;
- current finalizer already supports deterministic inline modules;
- no Scope/Capital/Analytics mutation is required for M4;
- M4 must prove the absence of financial movements.

### CP-02 — Domain, UI and Verification Integration

- **Status:** ACTIVE
- Savings domain added;
- Savings UI added;
- finalizer extended;
- domain/static/browser tests added;
- existing workflows extended;
- authoritative PR verification pending.

### CP-03 — Exact PR Gate and Merge

- **Status:** PLANNED
- open one Draft PR;
- inspect exact changed paths and first failure;
- apply bounded corrections;
- persist generated source/root only after full PASS;
- require final exact-head zero-diff PASS;
- merge with expected-head protection.

### CP-04 — Publication and Closure

- **Status:** PLANNED
- verify GitHub Pages downloaded package;
- save exact hashes and browser evidence;
- merge closure PR;
- synchronize canonical FamilyPilot;
- advance only after PASS.

## Rollback

Revert the eventual M4 implementation merge. Pre-batch accepted runtime remains `maloma/sandbox@714629922c1ea977117883357e465aa13a6598c9`.

## Terminal Conditions

- `BATCH_COMPLETED_M4_PUBLIC_PASS`;
- `CHECKPOINT_FAILED_AFTER_BOUNDED_RECOVERY`;
- `REPOSITORY_STATE_CONFLICT`;
- `PUBLIC_VERIFICATION_FAILED`.

# END OF FILE
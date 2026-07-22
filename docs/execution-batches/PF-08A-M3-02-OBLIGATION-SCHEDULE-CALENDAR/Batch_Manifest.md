# Batch Manifest — PF-08A-M3-02-OBLIGATION-SCHEDULE-CALENDAR

**Document Type:** Runtime Execution Batch Manifest  
**Status:** Active  
**Version:** 1.0  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `4891ea40ff8e73dfb6c0fc3a9ab1a237a31131b8`  
**Working Branch:** `agent/pf08a-m3-02-obligation-schedule-calendar`  
**Authority:** `maloma/FamilyPilot@5b96881312f8cb9702117a2867d754547611d991`, documents 31, 60, 65 and 66  
**Depth Policy:** `SINGLE_DEPTH_HIGH`  
**Created:** 2026-07-22

## Objective

Complete the accepted current M3 boundary without changing Option A navigation or duplicating financial facts.

## Included Scope

- remove the visible `Сегодня / Просрочено / Впереди` summary cards;
- support arbitrary day, week, month and year intervals;
- support unlimited, exact-count and until-date endings;
- generate deterministic idempotent occurrence sequences;
- preserve overdue and later occurrences simultaneously;
- add month navigation and per-date grouping with native-currency totals;
- add quick payment from an occurrence row;
- correct actual amount/date through the same linked Expense operation;
- move one occurrence without rewriting adjacent occurrences or the rule;
- implement `only this`, `this and following` and `starting with next` expected-amount scopes;
- archive/restore rules while preserving history and linked operations;
- normalize M3-01 state additively to schema v4;
- preserve M1, A3, hidden Capital, personal scope and Option A.

## Excluded Scope

- M2 Debts and M4 Savings;
- external push notifications;
- automatic bank execution;
- production authentication, authorization or personal-data controls;
- real-data migration;
- paid dependencies;
- Safe-to-Spend, plan-vs-actual and M5.

## Verification Strategy

To minimize GitHub usage, no new workflow family is introduced. The existing trusted M3 gate is reused by upgrading its existing domain, static and browser test files on the PR head.

Required checks:

- JavaScript syntax;
- M3-01 compatibility;
- M3-02 domain scenarios;
- exact source/root equality;
- A3 browser regression;
- hidden-Capital browser regression;
- complete M3-02 Chrome scenario;
- public GitHub Pages verification after merge;
- rollback evidence.

## Checkpoints

### CP-01 — Exact Runtime Inspection

- **Status:** COMPLETED
- FamilyPilot runtime files at `4891ea40...` remain byte-compatible with M3-01;
- later `sandbox` commits affect unrelated `crmos-questionnaire` paths;
- M3-02 branch did not previously exist;
- current module and UI mounting points are sufficient for an additive completion layer.

### CP-02 — Domain and UI Completion

- **Status:** ACTIVE
- replace the M3-01 domain module with an additive schema-v4 implementation;
- add the post-bootstrap UI completion module;
- upgrade existing M3 trusted tests instead of creating repeated workflow packages.

### CP-03 — Exact PR Gate

- **Status:** PLANNED
- enumerate changed paths;
- require all existing trusted regression suites to pass on one exact head;
- merge automatically with expected-head protection.

### CP-04 — Publication and Closure

- **Status:** PLANNED
- verify actual GitHub Pages files and full Chrome behavior;
- store evidence;
- close batch terminally;
- synchronize FamilyPilot canonical state;
- proceed to M2 only after PASS.

## Rollback

Revert the eventual M3-02 implementation merge. The latest accepted pre-batch runtime remains `maloma/sandbox@28df3a245cf3141a8f6209cbd460a05e07fdc9b2`, while unrelated later `sandbox` history remains preserved.

## Terminal Conditions

- `BATCH_COMPLETED`;
- `CHECKPOINT_FAILED_AFTER_BOUNDED_RECOVERY`;
- `REPOSITORY_STATE_CONFLICT`;
- `PUBLIC_VERIFICATION_FAILED`.

# END OF FILE
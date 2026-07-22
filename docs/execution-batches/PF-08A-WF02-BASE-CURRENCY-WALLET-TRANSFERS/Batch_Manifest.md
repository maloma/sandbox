# Batch Manifest — PF-08A-WF02-BASE-CURRENCY-WALLET-TRANSFERS

**Document Type:** Runtime Execution Batch  
**Status:** Active / Prepared  
**Version:** 1.0  
**Product:** FamilyPilot  
**Owner Chat:** `#3 FamilyPilot — Wallets & Family Implementation`  
**Repository:** `maloma/sandbox`  
**Starting Commit:** `605234b77106805030983c84aa167dcd08358172`  
**Working Branch:** `agent/pf08a-wf02-base-currency-transfers`  
**Created:** 2026-07-22

## Objective

Implement bounded base-currency transfers between wallets accessible to the current member.

## Sandbox Contract

```text
Product: FamilyPilot
Task: PF-08A-WF-02
Purpose: bounded base-currency wallet transfers
Expected lifetime: until implementation/public closure
Expected workflow cost: within declared limits
Cleanup: no temporary workflows or diagnostic artifacts after closure
Destination: current accepted prototype remains sandbox until separate migration decision
```

## GitHub Operation Plan

```text
Mode: GH-2 — Prepared Write Package
Authored commits: 1
Generated-runtime commits: maximum 1
Push/ref updates: maximum 2
PR cycles: 1
Full workflow runs: maximum 3
Artifacts: 0
New workflow families: 0
Public verification: 1
```

The generated-runtime commit is limited to deterministic `src/familypilot.html` and `index.html` output after complete tests. Push and pull-request heavy triggers are separated.

## Included

- one stable `TransferEvent`;
- exactly two linked transfer movements;
- distinct accessible base-currency wallets;
- positive amount and explicit date;
- one Operations projection classified as Transfer;
- no ordinary Income or Expense;
- correction with stable event/movement/projection IDs and auditable history;
- wallet and Capital recalculation;
- personal/household scope isolation;
- reload idempotency;
- M2/M3/M4/WF-01/Hidden Capital/Analytics regression;
- downloaded public verification and rollback.

## Excluded

- FX, conversion, rates, spread, fees and commissions;
- grant/revoke access and production permissions;
- inaccessible personal wallets;
- opening balance;
- destructive delete, reversal or cancellation;
- archive, merge, split or ownership conversion;
- crypto, bank integration, custody, private keys and seed phrases.

## Implementation Files

- `familypilot-wallet-transfers.js`;
- `familypilot-wallet-transfers-ui.js`;
- `familypilot-scope.js`;
- deterministic runtime finalizer;
- targeted domain, integration and browser tests;
- two existing workflow files narrowed for bounded delivery;
- this Manifest and append-only Ledger.

## Checkpoints

### CP-01 — Canonical and Runtime Inspection — COMPLETED

Exact base, accepted authorities, mounting points, scope logic and workflow behavior were inspected. No canonical conflict or protected-action dependency exists.

### CP-02 — Prepared Implementation — COMPLETED

Domain, scope, UI, finalizer, tests and bounded workflows are prepared outside GitHub. WF-02 domain tests pass locally.

### CP-03 — Branch Delivery and Runtime Bootstrap — READY

One authored commit plus one bounded external-bootstrap correction commit, exact-head verification and one PR cycle. Canonical HTML remains unchanged.

### CP-04 — Merge and Public Verification — PENDING

Merge exact accepted head, verify downloaded public package once, preserve rollback and synchronize canonical FamilyPilot documentation.

## Stop Conditions

- more than three full workflow runs;
- more than three failed runs;
- repeated identical error twice;
- unexpected workflow family or artifact upload;
- canonical conflict;
- protected permission, production, banking or irreversible boundary;
- branch/base drift;
- correction limit exhaustion.

## Rollback

Revert the eventual WF-02 runtime merge. No production data, credentials, banking action or irreversible migration is involved.

# END OF FILE

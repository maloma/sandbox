# Checkpoint Ledger — PF-08A-M2-01-DEBT-CHAINS-PRINCIPAL

**Document Type:** Append-Only Runtime Checkpoint Ledger  
**Status:** Active  
**Repository:** `maloma/sandbox`  
**Branch:** `agent/pf08a-m2-01-debt-chains-principal`  
**Created:** 2026-07-22

Append-only rule: preserve all records and append later transitions using monotonic ordering markers.

---

## Record 001 — Runtime Inspection Completed

- **Ordering Marker:** 001
- **Checkpoint ID:** CP-01
- **Status:** COMPLETED
- **Starting Commit:** `6cf4b74c9cc648d9f7e17815b918a809f309e48e`.
- **Canonical Authority:** `maloma/FamilyPilot@7eaaa3323d42328f512382e4a7d98990740077f6`.
- **Findings:** Plan Debts disabled; Home displayed fabricated 180/420 values; Capital counted only income/expense; debt principal had no neutral Operations type; Analytics needed explicit principal exclusion; app state lived inside closed IIFE.
- **Selected Mounting:** UMD debt domain plus UI module deterministically inlined through the existing finalizer; existing workflow family reused.
- **Verification Result:** PASS.
- **Next Authorized Transition:** CP-02 implementation and local/domain verification.
- **Founder Intervention Required:** No.
- **Record Integrity State:** VALID.

---

## Record 002 — Domain and Scope Completed

- **Ordering Marker:** 002
- **Checkpoint ID:** CP-02
- **Status:** COMPLETED
- **Debt Domain:** schema v5 with Counterparty, DebtChain and source/derived DebtEvent objects.
- **Source Actions:** opening liability, opening receivable, borrow, repay, lend and receive repayment.
- **Money Movements:** `debt_inflow` and `debt_outflow`; principal remains outside ordinary Income/Expense kinds.
- **Projection:** chronological net balance, derived offsets, derived reciprocal debt, zero closure event.
- **Editing:** active source events editable; linked movement id stable; derived rows rebuilt; closed chain immutable.
- **Scope:** personal/household wallet isolation.
- **Capital:** debt inflow/outflow included in wallet capital calculation.
- **Local Domain Verification:** PASS after correcting a test-only stale object reference to stable chain ids.
- **Next Authorized Transition:** UI/test integration and authoritative Chrome gate.
- **Founder Intervention Required:** No.
- **Record Integrity State:** VALID.

---

## Record 003 — UI and Verification Package Completed

- **Ordering Marker:** 003
- **Checkpoint ID:** CP-02
- **Status:** READY_FOR_PR_GATE
- **UI:** Plan Debts activation; real Home totals; chain list/detail; four actions; historical opening; source editor; read-only derived history; zero keep-open/close; Operations neutral rows.
- **Analytics Boundary:** debt principal explicitly excluded from ordinary Analytics period/source lists.
- **Finalizer:** adds M2 marker/script and inlines debt UI inside the canonical app IIFE while preserving source/root equality.
- **Tests:** new M2 domain, static and Chrome files.
- **Workflow:** two existing FamilyPilot workflow files extended; no new workflow family.
- **Preserved Regressions:** M3, A3, Hidden Capital and Option A remain mandatory.
- **Expected PR Scope:** domain, UI, scope, finalizer, two existing workflow files, three M2 tests, generated source/root, Manifest and Ledger.
- **Authoritative Browser State:** pending GitHub Chrome gate; no browser PASS claimed yet.
- **Next Authorized Transition:** open Draft PR, enumerate exact paths and inspect first exact failure.
- **Founder Intervention Required:** No.
- **Record Integrity State:** VALID.

# END OF CURRENT LEDGER PREFIX
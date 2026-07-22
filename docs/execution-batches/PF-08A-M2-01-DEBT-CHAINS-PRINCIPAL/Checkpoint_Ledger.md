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

---

## Record 004 — Bounded Gate Recovery Completed

- **Ordering Marker:** 004
- **Checkpoint ID:** CP-03
- **Status:** COMPLETED
- **Pull Request:** `#40` — `Integrate debt chains and principal movements`.
- **Initial Failure Class:** verifier and compatibility failures before terminal product verification.
- **Stable Home Mount Recovery:** generated HTML now owns permanent `homeDebtReceivableValue` and `homeDebtLiabilityValue` mount points with zero source placeholders; fabricated `180 € / 420 €` values removed.
- **Static Verification Recovery:** dynamic Debts screen/editor contracts are verified from `familypilot-debts-ui.js`; generated HTML is verified for stable mount, marker, script and inline boundaries.
- **Diagnostic Recovery:** self-referential selectors used to prove forbidden UI absence are no longer mistaken for actual controls.
- **M3 Compatibility Recovery:** the existing M3 regression now expects Debts active and only Savings disabled; all M3 functional assertions remain in force.
- **Product Semantics Changed:** No.
- **Verification Coverage Reduced:** No.
- **Founder Intervention Required:** No.
- **Record Integrity State:** VALID.

---

## Record 005 — Exact Trusted Gate Passed

- **Ordering Marker:** 005
- **Checkpoint ID:** CP-03
- **Status:** TRUSTED_PASS
- **Verified Source Head:** `2e70686f4bb010b34cd1d4ebab95c807b9d68784`.
- **Workflow Run:** `29923429307`.
- **Workflow Job:** `88934388190`.
- **Syntax and Module Checks:** PASS.
- **M3 Domain:** PASS.
- **M2 Domain:** PASS.
- **Deterministic Finalization:** PASS.
- **M3 Static Contract:** PASS.
- **M2 Static Contract:** PASS.
- **A3 Analytics Chrome Regression:** PASS.
- **Hidden Capital Chrome Regression:** PASS.
- **M3 Chrome Regression:** PASS.
- **M2 Chrome User Journey:** PASS.
- **Atomic Artifact Persistence:** PASS.
- **Runtime Exceptions:** NONE in verified browser journeys.
- **Verification Result:** PASS.
- **Founder Intervention Required:** No.
- **Record Integrity State:** VALID.

---

## Record 006 — Verified Generated Runtime Persisted

- **Ordering Marker:** 006
- **Checkpoint ID:** CP-03
- **Status:** GENERATED_HEAD_COMMITTED
- **Generated PR Head:** `4ebe5b6f6f675beeb8cebf91e4116561753abdd1`.
- **Generated Artifacts:** `src/familypilot.html` and `index.html` persisted atomically only after the complete trusted PASS.
- **Canonical Equality:** source/root generated from the same finalizer output.
- **Bot-Generated Rerun State:** `action_required`; this is not a product failure and requires an owner checkpoint commit to trigger final exact-head suites.
- **Next Authorized Transition:** owner checkpoint commit, final synchronized zero-diff gate, expected-head merge.
- **Founder Intervention Required:** No.
- **Record Integrity State:** VALID.

---

## Record 007 — Final Exact-Head Gate Passed

- **Ordering Marker:** 007
- **Checkpoint ID:** CP-03
- **Status:** READY_FOR_MERGE
- **Exact Head:** `a514096a535f02d780b113f8cf043420c7a78953`.
- **FamilyPilot Trusted PR Gate:** run `29924632404` — PASS.
- **FamilyPilot Module Regression:** run `29924629855` — PASS.
- **A3 Trusted PR Gate:** run `29924630039` — PASS.
- **A3 Compact Analytics States:** run `29924631172` — PASS.
- **PRIV-01 Trusted PR Gate:** run `29924631168` — PASS.
- **PRIV-01 Hidden Capital Disclosure:** run `29924629762` — PASS.
- **Zero-Diff:** PASS for canonical/generated HTML, Scope and Analytics artifacts.
- **M2/M3/A3/Hidden Capital Browser Suites:** PASS.
- **Mergeability:** PASS.
- **Rollback:** revert eventual PR #40 merge to return to pre-batch main.
- **Next Authorized Transition:** expected-head merge and public verification.
- **Founder Intervention Required:** No.
- **Record Integrity State:** VALID.

# END OF CURRENT LEDGER PREFIX
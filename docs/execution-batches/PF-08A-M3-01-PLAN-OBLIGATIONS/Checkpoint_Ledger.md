# Checkpoint Ledger — PF-08A-M3-01-PLAN-OBLIGATIONS

**Document Type:** Append-Only Runtime Checkpoint Ledger  
**Status:** Active  
**Repository:** `maloma/sandbox`  
**Branch:** `agent/pf08a-m3-01-plan-obligations`  
**Created:** 2026-07-22

Append-only rule: preserve all records and append later transitions using monotonic ordering markers.

---

## Record 001 — Batch Established and Runtime Inspected

- **Ordering Marker:** 001
- **Checkpoint ID:** PREP / CP-01
- **Status:** COMPLETED
- **Starting Commit:** `ba7b4cae5f28c4a39bc80a251a2b43d7bb3ce194`.
- **Founder Navigation Decision:** `Главная · Операции · План · Ещё`; infrequent modules may be reached through Plan.
- **Exact Runtime Findings:**
  - current bottom navigation already matches the accepted structure;
  - `plansScreen` is a bounded placeholder;
  - source/root HTML share blob `3e690de8d484c1822073904e6fab280bf8ca6486`;
  - state uses schema v2 under `familypilot.operations.foundation.v2`;
  - ordinary operations contain `links:{}`;
  - `renderAll()` already recalculates Main, Operations and Analytics from canonical operations;
  - current test API is extensible;
  - no obligation state or module exists yet.
- **Selected Model:** additive schema v3 normalization with `obligationRules` and `obligationOccurrences`; same storage key; no destructive migration.
- **Payment Contract:** occurrence payment creates or links exactly one Expense operation carrying reciprocal obligation ids.
- **Scope Contract:** obligation visibility follows the selected household or personal wallet scope.
- **Regression Boundary:** preserve hidden Capital, A3 Analytics, periods, categories, Trash, wallet scope and existing operation flows.
- **Verification Result:** PASS. Exact mounting points are sufficient for bounded implementation.
- **Next Authorized Transition:** CP-02 domain module, source patch and deterministic tests.
- **Founder Intervention Required:** No.
- **Record Integrity State:** VALID.

---

## Record 002 — CP-02 Implementation Package and Trusted Gate Activated

- **Ordering Marker:** 002
- **Checkpoint ID:** CP-02 / CP-03
- **Status:** READY_FOR_TRUSTED_GENERATION
- **Implementation Pull Request:** `#26` — `Mount Plan hub and obligations foundation`.
- **Completed Package Files:** obligations domain module, deterministic HTML patch, finalizer, static verifier, domain tests, M3 Chrome scenario and branch workflow.
- **Trusted Gate Pull Request:** `#27` — `Add trusted M3 Plan and obligations gate`.
- **Trusted Gate Merge:** `cdfc36c5c6aa4440960b8237cd7b1f72163f0e38`.
- **Gate Order:** exact head → syntax → domain tests → deterministic patch → source/root finalization → static contract → A3 Chrome → hidden Capital Chrome → M3 Chrome → generated HTML persistence.
- **Persistence Rule:** `src/familypilot.html` and `index.html` are written to the PR branch only after every verification step passes.
- **Expected Runtime Result:** unchanged bottom navigation; real Plan hub; Obligations mounted; Debts/Savings honest; schema v3 additive state; one linked Expense per payment; Trash/restore recalculation; scope isolation.
- **Verification Result:** READY. This record synchronizes PR #26 against trusted default-branch workflow code.
- **Recovery Action:** reject merge and correct the first exact failed assertion; no partial runtime artifact is accepted.
- **Exact Stop Point:** trusted generation run pending.
- **Next Authorized Transition:** inspect exact workflow steps and generated branch state.
- **Founder Intervention Required:** No.
- **Record Integrity State:** VALID.

---

## Record 003 — CP-03 Bounded Browser Recovery

- **Ordering Marker:** 003
- **Checkpoint ID:** CP-03-REC01
- **Status:** COMPLETED / RETRY_READY
- **First Trusted Run:** `29905118834`.
- **Passed Before Failure:** exact checkout, tool/module syntax, domain tests, deterministic patch, source/root finalization, static source contract, A3 Chrome and Hidden Capital Chrome.
- **First M3 Browser Failure:** test expected whitespace between adjacent navigation icon and label nodes; corrected only the expected DOM text.
- **Second Trusted Run:** `29905290923`.
- **Passed Before Failure:** all previous steps including A3 and Hidden Capital regressions.
- **Second M3 Browser Finding:** a date-only payment value for `today` was converted to local noon and could be rejected as a future operation before 12:00.
- **Product Correction:** today's selected payment date now uses the current timestamp; earlier selected dates retain date-based normalization.
- **Correction File:** `tools/pf08a-m3-01-correct-today-payment-time.mjs`.
- **Trusted Gate Correction Pull Request:** `#28`.
- **Trusted Gate Correction Merge:** `fb10c567315bc5ce63d7f02def8d0d9ba2d5a457`.
- **Scope:** no navigation, domain, calculation or unrelated behavior expansion.
- **Verification Result:** RETRY_READY. This record triggers the corrected trusted gate.
- **Recovery Budget:** bounded correction used; further failure requires exact classification before any additional mutation.
- **Exact Stop Point:** corrected trusted generation pending.
- **Next Authorized Transition:** inspect corrected full-pipeline result and generated branch artifacts.
- **Founder Intervention Required:** No.
- **Record Integrity State:** VALID.

# END OF CURRENT LEDGER PREFIX
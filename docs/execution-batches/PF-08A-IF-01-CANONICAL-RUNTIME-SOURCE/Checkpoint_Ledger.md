# Checkpoint Ledger — PF-08A-IF-01-CANONICAL-RUNTIME-SOURCE

**Document Type:** Append-Only Runtime Checkpoint Ledger  
**Status:** Active  
**Repository:** `maloma/sandbox`  
**Branch:** `agent/pf08a-if01-canonical-runtime-source`  
**Created:** 2026-07-22

Append-only rule: preserve all existing records and append later transitions using monotonic ordering markers.

---

## Record 001 — Batch Established

- **Ordering Marker:** 001
- **Checkpoint ID:** PREP
- **Status:** COMPLETED
- **Starting Commit:** `32ddc846cdea4cafe8126e5a7fda9e320fe2c78a`
- **Objective:** Establish bounded authority before runtime mutation.
- **Completed Changes:** Created Manifest v1.0 on the exact working branch.
- **Commit State:** `887d9e62483fdb65f286405da72c0ca18fd5fdf5`.
- **Verification Result:** PASS. Product semantics, personal-wallet scope, navigation, modules, permissions, data migration and costs are excluded.
- **Exact Stop Point:** CP-01 READY.
- **Next Authorized Transition:** Create the idempotent consolidation script and branch-only workflow.
- **Record Integrity State:** VALID.

---

## Record 002 — CP-01 Reproducible Consolidation Established

- **Ordering Marker:** 002
- **Checkpoint ID:** CP-01
- **Status:** COMPLETED
- **Objective:** Create an idempotent, fail-closed method for consolidating the current runtime corrections into the canonical source.
- **Completed Changes:**
  - created `tools/pf08a-if01-consolidate-runtime.mjs`;
  - created `.github/workflows/pf08a-if01-canonical-runtime-source.yml`;
  - bounded the push generator to `agent/pf08a-if01-canonical-runtime-source` and exact affected paths;
  - bounded PR verification to read-only contents access;
  - required exact source matches, canonical tokens, forbidden-loader checks and source/root equality.
- **Commit State:** script `8a4ab3cb9eb987b17e5a3f61696a1fbf024be5f8`; workflow `3fb90fe4a96bf273ff6de21b84980221579c62d8`.
- **Verification Result:** PASS. The workflow executed the generator on the branch and produced the canonical artifacts.
- **Recovery Boundary:** Any missing or duplicate source anchor causes a hard failure rather than a guessed mutation.
- **Exact Stop Point:** CP-01 complete.
- **Next Authorized Transition:** CP-02 generation verification.
- **Record Integrity State:** VALID.

---

## Record 003 — CP-02 Canonical Source and Root Generated

- **Ordering Marker:** 003
- **Checkpoint ID:** CP-02
- **Status:** COMPLETED
- **Objective:** Make the readable source directly canonical and make the root entrypoint an exact artifact of that source.
- **Completed Changes:**
  - embedded the analytics-period category-count correction directly in the source;
  - embedded transient new-category draft reset directly in the source;
  - embedded the visibility-triggered two-pulse non-default-wallet warning directly in the source;
  - added the `canonical-runtime-source-v1` marker;
  - replaced the old root runtime loader with the complete generated application document.
- **Canonical Source Path:** `src/familypilot.html`.
- **Canonical Source Blob SHA:** `90931925157a592d22a1d040efe97c13d0870e16`.
- **Root Artifact Path:** `index.html`.
- **Root Artifact Blob SHA:** `90931925157a592d22a1d040efe97c13d0870e16`.
- **Verification Actions:** fetched both files from the exact working branch; compared their Git blob SHA; inspected canonical markers and direct application content.
- **Verification Result:** PASS. Source and root are byte-identical and the old fetch/string-replacement/document-write root loader is absent.
- **Preserved Behavior:** Capital-first Main, bottom Income/Expense actions, default-wallet silence, non-default-wallet warning, period counts, category draft reset, category layout and storage semantics.
- **Exact Stop Point:** CP-02 complete.
- **Next Authorized Transition:** CP-03 PR verification, merge and public smoke test.
- **Record Integrity State:** VALID.

---

## Record 004 — CP-03 Pre-PR Quality Gate

- **Ordering Marker:** 004
- **Checkpoint ID:** CP-03
- **Status:** READY
- **Objective:** Establish the exact branch state eligible for Draft PR verification.
- **Manifest Version:** 1.1.
- **Manifest Update Commit:** `94c3cca8b5e32c22fc81664518166670a991d3c1`.
- **Expected Changed Paths:**
  - `.github/workflows/pf08a-if01-canonical-runtime-source.yml`;
  - `docs/execution-batches/PF-08A-IF-01-CANONICAL-RUNTIME-SOURCE/Batch_Manifest.md`;
  - `docs/execution-batches/PF-08A-IF-01-CANONICAL-RUNTIME-SOURCE/Checkpoint_Ledger.md`;
  - `tools/pf08a-if01-consolidate-runtime.mjs`;
  - `src/familypilot.html`;
  - `index.html`.
- **Verification Result:** PASS before PR. Runtime generation is deterministic, scope is bounded and rollback remains available.
- **Known Remaining Work:** Create PR, enumerate actual paths, obtain PR workflow PASS, merge with exact-head protection and verify the public root marker.
- **Recovery Action:** Reject merge on any unexpected changed path, workflow failure, head drift or public marker mismatch.
- **Exact Stop Point:** Commit this record and create the Draft PR.
- **Next Authorized Transition:** CP-03 PR creation and verification.
- **Record Integrity State:** VALID.

# END OF CURRENT LEDGER PREFIX

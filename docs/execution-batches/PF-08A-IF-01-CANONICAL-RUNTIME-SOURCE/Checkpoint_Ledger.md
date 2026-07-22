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

---

## Record 005 — CP-03 Pull Request Gate Passed

- **Ordering Marker:** 005
- **Checkpoint ID:** CP-03
- **Status:** READY_FOR_MERGE
- **Objective:** Prove the exact pull-request state is eligible for automatic development-prototype merge.
- **Pull Request:** `#14` — `Consolidate FamilyPilot into one canonical runtime source`.
- **Base Commit:** `32ddc846cdea4cafe8126e5a7fda9e320fe2c78a`.
- **Verified Head Before This Record:** `9ed654bcad1b8e420f220eef42a7133e8e386a49`.
- **Actual Changed Paths:** exactly the six expected paths from Record 004.
- **Mergeability:** PASS.
- **Workflow:** `PF-08A IF-01 Canonical Runtime Source`, run `29882198354`, conclusion `success`.
- **Runtime Artifact Evidence:** `index.html` and `src/familypilot.html` share blob SHA `90931925157a592d22a1d040efe97c13d0870e16`.
- **Verification Result:** PASS. No unexpected path, product-semantic change, dependency, permission, migration or cost change is present.
- **Rollback Method:** Revert the eventual merge commit or restore main commit `32ddc846cdea4cafe8126e5a7fda9e320fe2c78a`.
- **Remaining Work:** obtain workflow PASS on the new ledger head, mark PR Ready, merge with exact-head protection, verify public root marker and close the batch.
- **Exact Stop Point:** Commit this record; re-read PR head and workflow state.
- **Next Authorized Transition:** Automatic merge after the new exact head passes the PR workflow.
- **Record Integrity State:** VALID.

---

## Record 006 — CP-03 Merge and Public Verification Completed

- **Ordering Marker:** 006
- **Checkpoint ID:** CP-03
- **Status:** COMPLETED
- **Objective:** Record exact-head protected merge, public publication and terminal runtime evidence.
- **Pull Request:** `#14`.
- **Final Head:** `e340d42acc79223439f800c243e6f4fc95cebf69`.
- **Final Head Workflow:** run `29882255653`, conclusion `success`.
- **Mergeability Before Merge:** PASS.
- **Merge Method:** merge commit with expected-head protection.
- **Resulting Main Commit:** `078fff9a9a47b26fd6a4472fe107ba66e3cba926`.
- **Main Root Blob SHA:** `90931925157a592d22a1d040efe97c13d0870e16`.
- **Main Canonical Source Blob SHA:** `90931925157a592d22a1d040efe97c13d0870e16`.
- **Public URL:** `https://maloma.github.io/sandbox/`.
- **Public Verification:** PASS at `2026-07-22T01:12:01Z`.
- **Public HTTP Status:** `200`.
- **Public Attempts:** `1`.
- **Public Response SHA-256:** `387db605445d76aa1839979f478196dbe794ffb4a6a23b4eda707545ab8b7ea1`.
- **Public Assertions:** canonical marker present; old fetch loader absent; `document.write(source)` absent; old boot placeholder absent.
- **Evidence Path:** `docs/execution-batches/PF-08A-IF-01-CANONICAL-RUNTIME-SOURCE/Public_Verification.md`.
- **Verification Result:** PASS. The published root serves the consolidated canonical runtime contract.
- **Rollback Method:** Revert `078fff9a9a47b26fd6a4472fe107ba66e3cba926` or restore `32ddc846cdea4cafe8126e5a7fda9e320fe2c78a`.
- **Terminal State:** `BATCH_COMPLETED`.
- **Next Authorized Transition:** `PF-08A-IF-02 — Existing-Surface Personal Wallet Scope`.
- **Founder Intervention Required:** No.
- **Record Integrity State:** VALID.

# END OF CURRENT LEDGER PREFIX

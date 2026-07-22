# Checkpoint Ledger — PF-08A-PRIV-01-HIDDEN-CAPITAL

**Document Type:** Append-Only Runtime Checkpoint Ledger  
**Status:** Closed  
**Repository:** `maloma/sandbox`  
**Branch:** `agent/pf08a-priv01-hidden-capital`  
**Created:** 2026-07-22

Append-only rule: preserve all records and append later transitions using monotonic ordering markers.

---

## Record 001 — Batch Established and Runtime Inspected

- **Ordering Marker:** 001
- **Checkpoint ID:** PREP / CP-01
- **Status:** COMPLETED
- **Starting Commit:** `6289b1188cab01ca53c30fd07ef48453bf97425c`.
- **Founder Decision:** Capital must be hidden on Main; Main shows only a button labeled `Капитал`; value and details open after pressing it.
- **Inspected Current Runtime:**
  - Main currently renders Capital title, wallet-scope label, amount, change, graph and dates;
  - `renderCapital()` writes the current scoped value directly into Main;
  - `openCapitalInfo()` already opens a reusable overlay;
  - family and personal Capital calculations already come from `scopedCapitalSnapshot()`.
- **Chosen Implementation:** replace the visible card with a single disclosure button, move all value rendering into the overlay, and preserve current calculations unchanged.
- **Explicit Boundary:** no PIN, biometrics, authentication, permissions, calculation or data-key change.
- **Verification Result:** PASS. The decision is complete enough for bounded reversible implementation.
- **Next Authorized Transition:** CP-02 source patch, generated artifact and browser regression.
- **Founder Intervention Required:** No.
- **Record Integrity State:** VALID.

---

## Record 002 — Trusted Generation and Verification Gate Activated

- **Ordering Marker:** 002
- **Checkpoint ID:** CP-02
- **Status:** READY_FOR_TRUSTED_GENERATION
- **Objective:** Generate privacy runtime artifacts from trusted default-branch workflow code rather than accepting unverified branch output.
- **Implementation Pull Request:** `#21` — `Hide Capital values behind explicit disclosure`.
- **Trusted Gate Pull Request:** `#22` — `Add trusted hidden Capital pull-request gate`.
- **Trusted Gate Head:** `dc6edb93c790452906da61af57d48a26a2169262`.
- **Trusted Gate Merge:** `6100ade6953a9a27dcfa70446bd7aa39fbc806da`.
- **Gate Contract:** exact PR-head checkout; apply patch once; generate byte-identical root/source HTML; static no-leak validation; compact Analytics regression; family/personal hidden-Capital Chrome regression; commit generated HTML only after every check passes.
- **Expected Runtime Result:** Main first control text exactly `Капитал`; no Capital amount, change, graph, dates or wallet label on Main; family/personal values only inside the opened overlay.
- **Verification Result:** READY. This ledger commit synchronizes PR #21 and triggers trusted generation.
- **Recovery Action:** reject merge if generation, no-leak checks, A3 regression or disclosure browser scenario fails.
- **Exact Stop Point:** trusted generation and synchronized-head PASS pending.
- **Next Authorized Transition:** inspect generated source and workflow evidence.
- **Founder Intervention Required:** No.
- **Record Integrity State:** VALID.

---

## Record 003 — Bounded Verification and Persistence Recovery

- **Ordering Marker:** 003
- **Checkpoint ID:** CP-02-REC01
- **Status:** COMPLETED / RETRY_READY
- **Initial Trusted Run:** `PF-08A PRIV-01 Trusted PR Gate`, run `29889087661`.
- **Initial Result:** patch, finalization, static verification and A3 regression PASS; privacy Chrome comparison failed because DOM whitespace normalization and expected currency formatting used different non-breaking-space characters.
- **Correction:** canonicalize whitespace in expected and rendered currency strings.
- **Corrected Trusted Run:** `PF-08A PRIV-01 Trusted PR Gate`, run `29889179227`.
- **Corrected Result:** exact checkout, patch, finalization, no-leak verification, A3 browser regression and hidden-Capital browser regression all PASS.
- **Remaining Failure:** only detached-head `git push` of already verified generated HTML failed; product and verification results were green.
- **Persistence Recovery Pull Request:** `#23` — `Recover trusted hidden Capital artifact persistence`.
- **Persistence Recovery Merge:** `f3c922e9c3a0effcd3f124a4de0350ff6b4f71cb`.
- **Recovery Mechanism:** sequential GitHub Contents API updates of `src/familypilot.html` and `index.html` against their current blob SHAs after the same complete verification pipeline.
- **Verification Result:** RETRY_READY. This record synchronizes PR #21 against the recovered trusted gate.
- **Recovery Budget:** bounded recovery used for test normalization and artifact-persistence transport; no product-scope expansion occurred.
- **Exact Stop Point:** trusted generation through Contents API pending.
- **Next Authorized Transition:** inspect generated branch head, then require synchronized zero-diff PASS.
- **Founder Intervention Required:** No.
- **Record Integrity State:** VALID.

---

## Record 004 — CP-02 Completed and CP-03 Pull Request Gate Passed

- **Ordering Marker:** 004
- **Checkpoint ID:** CP-02 / CP-03
- **Status:** READY_FOR_MERGE
- **Objective:** Record the durable generated runtime and exact-head eligibility for automatic prototype merge.
- **Pull Request:** `#21` — `Hide Capital values behind explicit disclosure`.
- **Verified Head Before This Evidence Update:** `4c652b28252517438346c7126e03093a48a94261`.
- **Generated HTML Blob:** `3e690de8d484c1822073904e6fab280bf8ca6486` for both `src/familypilot.html` and `index.html`.
- **Actual Changed Paths:** exactly nine expected paths.
- **Mergeability:** PASS.
- **Privacy Trusted Workflow:** `PF-08A PRIV-01 Trusted PR Gate`, run `29889336451`, conclusion `success`.
- **Privacy Branch Workflow:** `PF-08A PRIV-01 Hidden Capital Disclosure`, run `29889336122`, conclusion `success`.
- **A3 Trusted Regression:** `PF-08A A3-01 Trusted PR Gate`, run `29889336343`, conclusion `success`.
- **A3 Branch Regression:** `PF-08A A3-01 Compact Analytics States`, run `29889336108`, conclusion `success`.
- **Assertions:** first Main control exactly `Капитал`; no Main Capital amount/change/graph/dates/scope label; family value opens only in overlay; personal value opens only in isolated personal overlay; close restores hidden state; source/root equal; A3 unchanged.
- **Verification Result:** PASS. No Capital calculation, wallet inclusion, permission, navigation, storage-key or unrelated product change exists.
- **Rollback Method:** revert the eventual merge or restore `6289b1188cab01ca53c30fd07ef48453bf97425c`.
- **Remaining Work:** obtain the same complete PASS on this new evidence head, merge with expected-head protection, then verify the public route in Chrome.
- **Exact Stop Point:** append-only evidence committed.
- **Next Authorized Transition:** final evidence-head gate and automatic merge.
- **Founder Intervention Required:** No.
- **Record Integrity State:** VALID.

---

## Record 005 — Merge, Publication and Public Verification Completed

- **Ordering Marker:** 005
- **Checkpoint ID:** CP-03
- **Status:** COMPLETED
- **Objective:** Record final exact-head verification, implementation merge, publication and public browser evidence.
- **Implementation Pull Request:** `#21` — `Hide Capital values behind explicit disclosure`.
- **Final Implementation Head:** `8e8822e2993372abde160060b2d86fa3ac500c21`.
- **Final Privacy Trusted Workflow:** `PF-08A PRIV-01 Trusted PR Gate`, run `29889523597`, conclusion `success`.
- **Final Privacy Branch Workflow:** `PF-08A PRIV-01 Hidden Capital Disclosure`, run `29889523566`, conclusion `success`.
- **Final A3 Trusted Regression:** `PF-08A A3-01 Trusted PR Gate`, run `29889523559`, conclusion `success`.
- **Final A3 Branch Regression:** `PF-08A A3-01 Compact Analytics States`, run `29889523568`, conclusion `success`.
- **Merge Method:** merge commit with expected-head protection.
- **Implementation Merge Commit:** `3b62f927d7728d5c05bb3dd3e3e649974a9cb441`.
- **Trusted Public Gate Pull Request:** `#24`.
- **Trusted Public Gate Merge:** `b64e7dab2083d5b343e1a3646ee50462264fa78c`.
- **Closure Pull Request:** `#25` — `Close hidden Capital disclosure batch`.
- **Trusted Public Workflow:** `PF-08A PRIV-01 Trusted Public Gate`, run `29889733305`, conclusion `success`.
- **Public URL:** `https://maloma.github.io/sandbox/`.
- **Public Verification Time:** `2026-07-22T03:53:57.035Z`.
- **Public HTML Status:** `200`.
- **Public Scope Module Status:** `200`.
- **Public Analytics Module Status:** `200`.
- **Publication Attempts:** `1`.
- **Public HTML SHA-256:** `a8b2ce6a1f09f01c0a10a83a117a8f7a3455ba7f92cd279d7fd9c3292fee2e0b`.
- **Public Scope Module SHA-256:** `800ae1d9b8d8ad68ae6f0215e5b94978890e7a87d9f012fd5448e6e39de0899b`.
- **Public Analytics Module SHA-256:** `9f934f1ecd3c87e747cd9f99a2cb9b83abc07040eacc67ddaf1808fe3ab77c9f`.
- **Public Assertions:** first Main control visible text exactly `Капитал`; no Capital amount/change/graph/dates/visible wallet label on Main; overlay closed on load and dismiss; family and personal Capital appear only after explicit press; contexts remain isolated; compact Analytics and wallet scope remain operational; runtime exceptions none.
- **Evidence Path:** `docs/execution-batches/PF-08A-PRIV-01-HIDDEN-CAPITAL/Public_Verification.md`.
- **Verification Result:** PASS. The published development prototype implements the Founder’s Capital-disclosure privacy decision.
- **Rollback Method:** revert `3b62f927d7728d5c05bb3dd3e3e649974a9cb441` or restore `6289b1188cab01ca53c30fd07ef48453bf97425c`.
- **Terminal State:** `BATCH_COMPLETED`.
- **Next Authorized Transition:** synchronize FamilyPilot canonical state and prepare `PF-08A-A4 — Final Secondary Navigation Decision Package`.
- **Founder Intervention Required:** only when the materially different final navigation structures are ready for selection.
- **Record Integrity State:** VALID.

# END OF CURRENT LEDGER PREFIX
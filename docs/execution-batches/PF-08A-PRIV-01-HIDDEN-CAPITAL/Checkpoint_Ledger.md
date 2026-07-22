# Checkpoint Ledger — PF-08A-PRIV-01-HIDDEN-CAPITAL

**Document Type:** Append-Only Runtime Checkpoint Ledger  
**Status:** Active  
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

# END OF CURRENT LEDGER PREFIX
# Checkpoint Ledger — PF-08A-M3-03-PAYMENT-ATTENTION

**Document Type:** Append-Only Checkpoint Ledger  
**Status:** Active  
**Repository:** `maloma/sandbox`  
**Branch:** `agent/pf08a-m3-03-payment-attention`  
**Created:** 2026-07-23

Append-only rule: preserve every record and append later transitions with monotonic ordering markers.

---

## Record 001 — Founder Package Selection Accepted

- **Ordering Marker:** 001
- **Checkpoint:** CP-01
- **Status:** COMPLETED
- **Founder Direction:** `Делаем платежи и напоминания.`
- **Interpretation:** implement a bounded in-app payment-attention package on top of the completed obligation schedule, not a duplicate payment calendar.
- **Protected Boundaries:** external notifications, automatic execution, permissions, identity, FX, banking and destructive lifecycle remain excluded.
- **Record Integrity:** VALID.

---

## Record 002 — Exact Runtime Base Verified

- **Ordering Marker:** 002
- **Checkpoint:** CP-01
- **Status:** COMPLETED
- **Base:** `maloma/sandbox@8923d652397d330bd86232b370499a901e51794c`.
- **Existing M3:** recurring/one-time occurrences, overdue persistence, quick pay, individual move, amount versions and month calendar already present.
- **Existing WF-02:** terminal public PASS and bounded runtime bridge available.
- **Result:** M3-03 may add attention projection without changing payment economics.
- **Record Integrity:** VALID.

---

## Record 003 — M3-03 Package Prepared

- **Ordering Marker:** 003
- **Checkpoint:** CP-02
- **Status:** PREPARED
- **Home Surface:** overdue, today and upcoming groups with amounts and wallet context.
- **Reminder Default:** 3 days; selectable 0/1/3/7/14/30 days.
- **Quick Action:** `Оплачено` creates one linked Expense through existing M3 API.
- **Detail Route:** exact occurrence opens in the bounded M3-03 detail sheet without changing the canonical HTML shell.
- **State Model:** reminder lead configuration stored under `state.config`; attention rows remain derived from occurrences.
- **Privacy:** active wallet and personal/household scope preserved.
- **Artifacts:** NONE.
- **Next:** publish one final implementation commit and obtain exact-head trusted verification.
- **Record Integrity:** VALID.

# END OF CURRENT LEDGER PREFIX

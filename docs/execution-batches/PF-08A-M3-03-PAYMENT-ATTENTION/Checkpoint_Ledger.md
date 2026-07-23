# Checkpoint Ledger — PF-08A-M3-03-PAYMENT-ATTENTION

**Document Type:** Append-Only Checkpoint Ledger  
**Status:** Terminal  
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
- **Detail Route:** exact occurrence opens from the Home attention block without changing the canonical payment model.
- **State Model:** reminder lead configuration stored under `state.config`; attention rows remain derived from occurrences.
- **Privacy:** active wallet and personal/household scope preserved.
- **Artifacts:** NONE.
- **Next:** publish one final implementation commit and obtain exact-head trusted verification.
- **Record Integrity:** VALID.

---

## Record 004 — Implementation Verified and Merged

- **Ordering Marker:** 004
- **Checkpoint:** CP-03
- **Status:** COMPLETED
- **Accepted Exact Head:** `e55f344a7cbabb57046f1dc428e58a671bef6830`.
- **Implementation PR:** `maloma/sandbox#50`.
- **Runtime Merge:** `cbb6651e53d61b5552598f32159f36fe6e1ec82d`.
- **Exact-Head Gates:** M3-03 Payment Attention, FamilyPilot Trusted, A3 Trusted and A3 Compact — PASS.
- **Regression Coverage:** Analytics, Privacy, existing Obligations, Payment Attention, Debts, Savings, Wallet Management and Wallet Transfers — PASS.
- **Bounded Correction:** an attention-row click now enters `Обязательства` before opening the exact occurrence.
- **Existing M3 Rework:** NONE.
- **Artifacts:** NONE.
- **Record Integrity:** VALID.

---

## Record 005 — Pages Publication Trigger Corrected

- **Ordering Marker:** 005
- **Checkpoint:** CP-04
- **Status:** COMPLETED
- **Observed Public Failure:** `familypilot-payment-attention.js` and `familypilot-payment-attention-ui.js` returned HTTP `404`; the published scope module was still the older version.
- **Root Cause:** Pages redeployed only after HTML, README or Pages-workflow changes; external FamilyPilot module changes did not trigger deployment.
- **Correction PR:** `maloma/sandbox#61`.
- **Correction Merge:** `c25aabf741b589dbb2a6e359a97cf0f2a8fef031`.
- **Correction:** Pages path filters now include root FamilyPilot modules and source mirrors.
- **Product Semantics Changed:** No.
- **Future Prevention:** later external FamilyPilot module changes trigger Pages publication without requiring an unrelated HTML edit.
- **Record Integrity:** VALID.

---

## Record 006 — Public Package Verification Passed

- **Ordering Marker:** 006
- **Checkpoint:** CP-04
- **Status:** COMPLETED
- **Public URL:** `https://maloma.github.io/sandbox/`.
- **Trusted Public Run:** `29976278518` — SUCCESS.
- **Verifier Permissions:** contents read-only.
- **Published Files:** HTML and all required FamilyPilot modules returned HTTP `200` under the verifier contract.
- **Browser Marker:** `PF08A_M3_03_BROWSER_PASS`.
- **Verified:** Home payment attention, overdue/today/upcoming grouping, per-rule lead time, default 3 days, quick pay, exact-occurrence route, scope isolation and prior-module compatibility.
- **External Notifications:** NONE.
- **Runtime Exceptions:** NONE.
- **Artifacts:** NONE.
- **Record Integrity:** VALID.

---

## Record 007 — Terminal Evidence Package Prepared

- **Ordering Marker:** 007
- **Checkpoint:** CP-04
- **Status:** COMPLETED
- **Evidence File:** `Public_Verification.md`.
- **Rollback:** revert runtime merge `cbb6651e53d61b5552598f32159f36fe6e1ec82d`.
- **Irreversible Actions:** NONE.
- **Production Data or Credentials:** NONE.
- **Terminal State:** `PF-08A-M3-03 — COMPLETED / INTEGRATED / PUBLIC PASS` after the evidence-head read-only gate and PR merge.
- **Record Integrity:** VALID.

---

## Record 008 — Comprehensive Demo Data Added and Publicly Verified

- **Ordering Marker:** 008
- **Checkpoint:** CP-05
- **Status:** COMPLETED
- **Founder Direction:** `сформируй демо-данные для проверки всех режимов`.
- **Implementation PR:** `maloma/sandbox#62`.
- **Accepted Exact Head:** `1aba4d40a62b953c44c65e310519900a526ddf3d`.
- **Demo Merge:** `3eb727e60a79feead45319982233eacf4cc63c4c`.
- **Exact-Head M3-03 Gate:** run `30001940990` — SUCCESS.
- **Public Verification PR:** `maloma/sandbox#63`.
- **Trusted Public Run:** `30002204164` — SUCCESS.
- **Demo Version:** `m3-03-payment-attention-demo-v1`.
- **Coverage:** 12 relative-date scenarios covering overdue, today, lead times 1/3/7/14/30, recurring, outside-window, personal scope, paid, skipped and single-occurrence postponed states.
- **Reminder Choices Covered:** 0/1/3/7/14/30 days.
- **Paid Demo Contract:** exactly one linked Expense.
- **Scope Contract:** household and Anna personal wallet fixtures remain isolated.
- **Controls:** automatic one-time demo seed; `Обновить демо`; `Удалить демо`.
- **Cleanup:** removes only marked demo rules, occurrences and linked demo operations; ordinary records remain untouched.
- **External Notifications:** NONE.
- **Runtime Exceptions:** NONE.
- **Artifacts:** NONE.
- **Rollback:** revert demo merge `3eb727e60a79feead45319982233eacf4cc63c4c` without removing the base M3-03 package.
- **Record Integrity:** VALID.

# END OF TERMINAL LEDGER
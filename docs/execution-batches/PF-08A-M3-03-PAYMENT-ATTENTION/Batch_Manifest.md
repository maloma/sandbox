# Batch Manifest — PF-08A-M3-03-PAYMENT-ATTENTION

**Package:** `PF-08A-M3-03 — Planned Payment Attention and In-App Reminders`  
**Repository:** `maloma/sandbox`  
**Base:** `8923d652397d330bd86232b370499a901e51794c`  
**Branch:** `agent/pf08a-m3-03-payment-attention`  
**Status:** Active  
**Authority:** Founder decision in the active FamilyPilot development chat on 2026-07-23: `Делаем платежи и напоминания.`

## Objective

Make already accepted one-time and recurring payment occurrences visible on Home when they require attention, without duplicating financial facts or adding external notification infrastructure.

## Included

- Home `Платежи` block;
- unresolved overdue payments remain visible;
- payments due today;
- upcoming payments inside a per-rule reminder window;
- default reminder window of 3 days;
- selectable 0, 1, 3, 7, 14 or 30 days;
- direct `Оплачено` action from Home;
- exact occurrence detail opening;
- current wallet/personal scope isolation;
- paid, skipped and cancelled occurrences disappear from attention;
- one linked Expense through the existing obligation payment contract;
- no duplicate reminder records;
- deterministic, integration, Chrome and public verification;
- rollback by reverting the eventual merge.

## Explicitly Excluded

- push notifications;
- browser notification permission;
- email, SMS or messenger delivery;
- background service workers;
- automatic bank execution;
- automatic payment;
- repeated popups;
- new global badge system;
- schedule changes caused by reminder settings;
- automatic overdue movement or deletion;
- permissions, identity, FX, banking or destructive lifecycle changes.

## Product Rules

1. Reminder state is derived from the canonical `PaymentOccurrence`; it is not a second payment object.
2. `overdue` means unresolved and before today.
3. `today` means unresolved and due today.
4. `upcoming` means unresolved and inside the selected lead window.
5. Default lead window is 3 days.
6. Overdue payments remain visible until paid, skipped, moved or otherwise resolved.
7. Quick payment creates exactly one linked Expense.
8. Reminder configuration does not alter due dates, recurrence or expected amounts.
9. Household Home never exposes inaccessible personal-wallet payments.
10. The block is hidden when no payment requires attention.

## Implementation Files

- `familypilot-payment-attention.js`;
- `familypilot-payment-attention-ui.js`;
- `familypilot-scope.js` and `src/familypilot-scope.js`;
- M3-03 domain, integration and browser verification;
- existing FamilyPilot trusted PR workflow;
- this Manifest and append-only Ledger.

## Checkpoints

- **CP-01:** exact base and accepted M3/WF regressions verified;
- **CP-02:** attention domain and Home UX implemented;
- **CP-03:** deterministic runtime generation and exact-head gates;
- **CP-04:** sandbox merge, downloaded public-package verification and durable evidence;
- **CP-05:** canonical FamilyPilot documentation reconciliation.

## Verification

Required markers:

- `PF08A_M3_03_DOMAIN_PASS`;
- `PF08A_M3_03_INTEGRATION_PASS`;
- `PF08A_M3_03_BROWSER_PASS`.

All previous Analytics, Privacy, M3, M2, M4, WF-01 and WF-02 regressions remain mandatory.

## GitHub Resource Discipline

Soft Development Mode:

- meaningful commits/pushes only;
- no unchanged reruns;
- no artifacts;
- one trusted PR workflow family;
- timeouts and superseded-run cancellation retained;
- public verification read-only.

# END OF FILE

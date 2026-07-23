# Public Verification — PF-08A-M3-03 Payment Attention

**Status:** PASS  
**Verified:** 2026-07-23  
**Public URL:** `https://maloma.github.io/sandbox/`

## Runtime

- accepted feature head: `e55f344a7cbabb57046f1dc428e58a671bef6830`;
- implementation PR: `maloma/sandbox#50`;
- runtime merge: `cbb6651e53d61b5552598f32159f36fe6e1ec82d`;
- Pages publication-trigger correction: `c25aabf741b589dbb2a6e359a97cf0f2a8fef031`;
- original public-verification PR: `maloma/sandbox#60`;
- comprehensive demo-data PR: `maloma/sandbox#62`;
- comprehensive demo-data merge: `3eb727e60a79feead45319982233eacf4cc63c4c`;
- demo public-verification PR: `maloma/sandbox#63`.

## Verification Result

Trusted original public workflow run `29976278518` completed successfully with read-only repository permissions.

Trusted comprehensive-demo public workflow run `30002204164` also completed successfully with read-only repository permissions.

The verifier downloaded the actually published package with cache-busting and required HTTP `200` for:

- `index.html`;
- `familypilot-scope.js`;
- Analytics;
- Obligations and Obligations UI;
- Payment Attention and Payment Attention UI;
- Debts and Debts UI;
- Savings and Savings UI;
- Wallet Management and Wallet Management UI;
- Wallet Transfers and Wallet Transfers UI.

The downloaded package then passed the same Chrome scenario used for the accepted M3-03 implementation, extended with all comprehensive demo fixtures.

Browser marker:

```text
PF08A_M3_03_BROWSER_PASS
```

## Verified User Behavior

- the Home screen contains the `Платежи` attention block when relevant payments exist;
- overdue occurrences remain visible until the user resolves them;
- payments due today are shown separately;
- upcoming payments appear according to the reminder lead time configured for their rule;
- the default reminder lead time is 3 days;
- supported choices are 0, 1, 3, 7, 14 and 30 days;
- `Оплачено` creates exactly one linked Expense through the existing obligation API;
- selecting an attention row opens `Обязательства` and the exact occurrence;
- personal and household wallet scopes remain isolated;
- existing obligation calendar, one-occurrence move, payment correction and overdue behavior remain unchanged;
- Analytics, Privacy, Debts, Savings, Wallet Management and Wallet Transfers remain compatible;
- runtime exceptions: NONE.

## Comprehensive Demo Data

The public demo prototype now provides a reversible set of 12 scenarios relative to the current date:

1. overdue payment;
2. due today with a 0-day reminder;
3. reminder 1 day before due date;
4. recurring payment with the default 3-day reminder;
5. reminder 7 days before due date;
6. reminder 14 days before due date;
7. reminder 30 days before due date;
8. payment outside its reminder window;
9. personal payment visible only in Anna’s personal wallet;
10. already paid payment with exactly one linked Expense;
11. skipped payment;
12. one postponed occurrence.

Verified controls:

- automatic one-time demo loading for the demo household;
- `План → Обязательства → Демо платежей`;
- `Обновить демо` recreates dates relative to today;
- `Удалить демо` removes only marked demo rules, occurrences and linked demo operations;
- ordinary user-created rules, payments and operations are preserved;
- full cleanup leaves no marked demo financial operation behind.

## Excluded and Confirmed Absent

- push notifications;
- browser Notification permission requests;
- SMS or email;
- bank execution or automatic payment;
- new access permissions;
- uploaded workflow artifacts.

## Publication Correction

The first original public check correctly failed because GitHub Pages was configured to redeploy only after changes to HTML, README or the Pages workflow. M3-03 added external JavaScript modules without changing `index.html`, so the published site still returned `404` for both Payment Attention files.

The Pages path filters were corrected to redeploy when FamilyPilot runtime modules or source mirrors change. The original and comprehensive-demo trusted public checks subsequently passed.

## Rollback

To remove only the comprehensive demo fixtures, revert demo merge `3eb727e60a79feead45319982233eacf4cc63c4c`.

To remove the complete M3-03 runtime package, revert runtime merge `cbb6651e53d61b5552598f32159f36fe6e1ec82d`.

The package adds no production data migration, credential, real banking action or irreversible operation.
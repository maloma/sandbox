# Public Verification — PF-08A-M3-03 Payment Attention

**Status:** PASS  
**Verified:** 2026-07-23  
**Public URL:** `https://maloma.github.io/sandbox/`

## Runtime

- original M3-03 implementation merge: `cbb6651e53d61b5552598f32159f36fe6e1ec82d`;
- Pages publication-trigger correction: `c25aabf741b589dbb2a6e359a97cf0f2a8fef031`;
- comprehensive demo-data merge: `3eb727e60a79feead45319982233eacf4cc63c4c`;
- compact planning UX PR: `maloma/sandbox#64`;
- accepted compact UX exact head: `556583cdb6f393da81fed5bd3d87c9986f969d92`;
- compact planning UX merge: `23aa2c7852fd2664c757bebc7ed4fee8bfa8e54a`;
- compact public-verification PR: `maloma/sandbox#65`.

## Verification Result

The exact-head implementation gate run `30006140503` completed successfully.

The read-only public workflow run `30006363960` downloaded the actually published GitHub Pages package with cache-busting, required HTTP `200` for the HTML and all FamilyPilot modules, and ran the accepted Chrome scenario only against those downloaded files.

Browser marker:

```text
PF08A_M3_03_BROWSER_PASS
```

## Verified User Behavior

- the large `Платежи` card is absent from the Home screen;
- payment attention is represented by a compact indicator on the `План` bottom-navigation item;
- `План → Обязательства` explains whether attention is overdue, due today or upcoming;
- overdue payment rows use a distinct red-tinted state;
- payments due today use a distinct amber state;
- paid rows use a distinct completed green state;
- an invalid or empty stored obligation month no longer opens January 1970 and is repaired to the current month;
- each date is a separate visual group;
- a date with more than one payment shows the payment count and combined `Запланировать` amount;
- normal payment rows do not expose recurrence sequence or recurrence wording;
- every unresolved payment, including a future occurrence, has an immediate checkbox-style paid action;
- early payment creates exactly one linked Expense and changes the occurrence to paid;
- selecting a payment still opens its exact occurrence detail;
- selecting a rule opens a dedicated rule card;
- recurrence, reminder settings and other rule information are shown inside the rule card rather than the list;
- edit, clone and delete/restore controls are located inside the rule card;
- personal and household wallet scopes remain isolated;
- the 12-scenario reversible demo set remains available and fully removable;
- Analytics, Privacy, Debts, Savings, Wallet Management and Wallet Transfers remain compatible;
- runtime exceptions: NONE.

## Existing Financial Behavior Preserved

- one paid occurrence creates one canonical linked Expense;
- duplicate active payment remains rejected;
- a user may record payment before the planned due date using the actual payment date;
- moving an occurrence changes only that occurrence;
- recurring schedule generation remains unchanged;
- overdue occurrences do not disappear because a later occurrence exists;
- ordinary records are not deleted by demo cleanup.

## Notification Boundary

The compact in-app indicator is implemented.

The following remain intentionally absent and require a separate delivery package:

- morning operating-system notification for payments due today;
- evening operating-system notification for due payments not marked paid;
- browser push permission;
- service worker / Push Manager;
- SMS;
- email;
- automatic or bank payment.

A static page cannot reliably send morning/evening notifications while closed without a separately designed push/service-worker delivery mechanism.

## Comprehensive Demo Data

The public development prototype still contains 12 reversible scenarios relative to the current date:

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

Controls:

- `План → Обязательства → Демо платежей`;
- `Обновить демо` recreates dates relative to today;
- `Удалить демо` removes only marked demo rules, occurrences and linked demo operations.

## Excluded and Confirmed Absent

- uploaded workflow artifacts;
- credentials;
- production-data migration;
- real banking action;
- irreversible operation.

## Rollback

To remove only the compact UX correction while preserving the base M3-03 module and demo fixtures, revert:

```text
23aa2c7852fd2664c757bebc7ed4fee8bfa8e54a
```

To remove only the comprehensive demo fixtures, revert:

```text
3eb727e60a79feead45319982233eacf4cc63c4c
```

To remove the complete M3-03 runtime package, revert:

```text
cbb6651e53d61b5552598f32159f36fe6e1ec82d
```

# Public Verification — PF-08A-M3-03 Payment Attention

**Status:** PASS  
**Verified:** 2026-07-23  
**Public URL:** `https://maloma.github.io/sandbox/`

## Runtime

- accepted feature head: `e55f344a7cbabb57046f1dc428e58a671bef6830`;
- implementation PR: `maloma/sandbox#50`;
- runtime merge: `cbb6651e53d61b5552598f32159f36fe6e1ec82d`;
- Pages publication-trigger correction: `c25aabf741b589dbb2a6e359a97cf0f2a8fef031`;
- public-verification PR: `maloma/sandbox#60`.

## Verification Result

Trusted public workflow run `29976278518` completed successfully with read-only repository permissions.

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

The downloaded package then passed the same Chrome scenario used for the accepted M3-03 implementation.

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

## Excluded and Confirmed Absent

- push notifications;
- browser Notification permission requests;
- SMS or email;
- bank execution or automatic payment;
- new access permissions;
- uploaded workflow artifacts.

## Publication Correction

The first public check correctly failed because GitHub Pages was configured to redeploy only after changes to HTML, README or the Pages workflow. M3-03 added external JavaScript modules without changing `index.html`, so the published site still returned `404` for both Payment Attention files.

The Pages path filters were corrected to redeploy when FamilyPilot runtime modules or source mirrors change. The subsequent trusted public check passed.

## Rollback

Revert runtime merge `cbb6651e53d61b5552598f32159f36fe6e1ec82d`.

The package adds no production data migration, credential, real banking action or irreversible operation.

# Public Verification — PF-08A-M3-02-OBLIGATION-SCHEDULE-CALENDAR

**Status:** PASS  
**Verified At:** 2026-07-22T11:40:28.030Z  
**Public URL:** `https://maloma.github.io/sandbox/`  
**Expected Main Commit:** `7fd7fa09f9b4908053aa0fec27fe691f1b878705`  
**HTML Status:** `200`  
**Scope Module Status:** `200`  
**Analytics Module Status:** `200`  
**Obligations Module Status:** `200`  
**Obligations UI Module Status:** `200`  
**Publication Attempts:** `1`  
**HTML SHA-256:** `4a34dd3674888e38e31e7aaa422db2f94ae7fdcbf2cde6ce2d1d15c46b3c4388`  
**Scope SHA-256:** `800ae1d9b8d8ad68ae6f0215e5b94978890e7a87d9f012fd5448e6e39de0899b`  
**Analytics SHA-256:** `9f934f1ecd3c87e747cd9f99a2cb9b83abc07040eacc67ddaf1808fe3ab77c9f`  
**Obligations SHA-256:** `539f0d44868478a51b07da63f58dc3ab28ae46ac96d2e203fbe6f94381b0f61b`  
**Obligations UI SHA-256:** `00f3660eb7d5458c5a12ab051d59704f725e1dcb3d2a090543189e71cf5ea86f`  

## Assertions

- bottom navigation remains `Главная · Операции · План · Ещё` — PASS;
- separate Today / Overdue / Upcoming summary cards are absent — PASS;
- arbitrary recurrence and exact count eleven — PASS;
- reload/normalization does not duplicate occurrences — PASS;
- month navigation and per-date grouping — PASS;
- quick pay creates exactly one linked Expense — PASS;
- actual amount/date correction preserves operation id — PASS;
- Trash and restore recalculate payment projection — PASS;
- starting-with-next amount version preserves selected occurrence — PASS;
- moving one occurrence leaves adjacent occurrences unchanged — PASS;
- overdue and later occurrences coexist — PASS;
- archiving stops generation and preserves history — PASS;
- personal obligation does not leak into household scope — PASS;
- hidden Capital and compact Analytics remain operational — PASS;
- runtime exceptions — NONE.

## Browser Output

```text
{
  "status": "PASS",
  "marker": "PF08A_M3_02_BROWSER_PASS",
  "navigation": "Главная · Операции · План · Ещё",
  "summaryCardsRemoved": true,
  "arbitraryRecurrence": true,
  "exactCountEleven": true,
  "idempotentGeneration": true,
  "monthCalendar": true,
  "perDateGrouping": true,
  "quickPay": true,
  "oneLinkedExpense": true,
  "actualCorrectionSameOperation": true,
  "trashRestoreRecalculated": true,
  "amountVersionStartingNext": true,
  "oneOccurrenceMove": true,
  "overdueCoexistence": true,
  "archivePreservesHistory": true,
  "personalScopeIsolated": true,
  "hiddenCapitalPreserved": true,
  "compactAnalyticsPreserved": true,
  "runtimeExceptions": []
}
```

# END OF FILE

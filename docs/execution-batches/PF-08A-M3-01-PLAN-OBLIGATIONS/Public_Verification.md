# Public Verification — PF-08A-M3-01-PLAN-OBLIGATIONS

**Status:** PASS  
**Verified At:** 2026-07-22T09:31:00.793Z  
**Public URL:** `https://maloma.github.io/sandbox/`  
**Expected Main Commit:** `d2be5fe98dc44d635f30c857659fcad562fe54c4`  
**HTML Status:** `200`  
**Scope Module Status:** `200`  
**Analytics Module Status:** `200`  
**Obligations Module Status:** `200`  
**Publication Attempts:** `1`  
**HTML SHA-256:** `d0fe53d33385aa5748ca693792018337dd82d1303fb2959f128d4fa7e8aaa2a7`  
**Scope SHA-256:** `800ae1d9b8d8ad68ae6f0215e5b94978890e7a87d9f012fd5448e6e39de0899b`  
**Analytics SHA-256:** `9f934f1ecd3c87e747cd9f99a2cb9b83abc07040eacc67ddaf1808fe3ab77c9f`  
**Obligations SHA-256:** `0e6123cb1712f4f8d369a160087cc5f89b72445d94fb62b46907ec241953ea42`  

## Assertions

- bottom navigation remains `Главная · Операции · План · Ещё` — PASS;
- Plan root exposes Obligations and honest unavailable Debts/Savings entries — PASS;
- one-time obligation rule and occurrence creation — PASS;
- payment creates exactly one linked Expense — PASS;
- duplicate payment is rejected — PASS;
- linked Expense participates in Analytics source operations — PASS;
- Trash invalidates and restore reestablishes paid projection — PASS;
- personal obligation does not leak into household scope — PASS;
- hidden Capital remains closed and undisclosed by default — PASS;
- compact Analytics remains operational — PASS;
- runtime exceptions — NONE.

## Browser Output

```text
{
  "status": "PASS",
  "marker": "PF08A_M3_01_BROWSER_PASS",
  "navigation": "Главная · Операции · План · Ещё",
  "planHub": true,
  "ruleEditor": true,
  "occurrenceCreated": true,
  "oneLinkedExpense": true,
  "duplicatePaymentRejected": true,
  "analyticsSourceLinked": true,
  "trashRestoreRecalculated": true,
  "personalScopeIsolated": true,
  "hiddenCapitalPreserved": true,
  "compactAnalyticsPreserved": true
}
```

# END OF FILE

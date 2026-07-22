# Public Verification — PF-08A-M2-01-DEBT-CHAINS-PRINCIPAL

**Status:** PASS  
**Verified At:** 2026-07-22T13:45:03.581Z  
**Public URL:** `https://maloma.github.io/sandbox/`  
**Expected Main Commit:** `9fecb7bad53e2de5481fbac745689afa9db8537a`  
**HTML Status:** `200`  
**Scope Status:** `200`  
**Analytics Status:** `200`  
**Obligations Status:** `200`  
**Obligations UI Status:** `200`  
**Debts Status:** `200`  
**Debts UI Status:** `200`  
**Publication Attempts:** `1`  

## SHA-256

- HTML: `0bdb9e27a6db76a43bf50bd4bd3b5016be7ad67b6949e0c1ff913d17e944cddd`
- Scope: `519b507fc7bc15266013c5218b0ed50222ab47706706bac2d87fd3d32da44c82`
- Analytics: `9f934f1ecd3c87e747cd9f99a2cb9b83abc07040eacc67ddaf1808fe3ab77c9f`
- Obligations: `539f0d44868478a51b07da63f58dc3ab28ae46ac96d2e203fbe6f94381b0f61b`
- Obligations UI: `00f3660eb7d5458c5a12ab051d59704f725e1dcb3d2a090543189e71cf5ea86f`
- Debts: `ae4831457d791ad49f3f7fd78cab2baad93db7469d1ebbc19edf9d8dea7c7c77`
- Debts UI: `74e8595ade32023b08a048c6a5b9917ae4be9b8c964f7069b9fb79b9a049a520`

## Assertions

- Plan → Debts is active — PASS;
- Home receivable/liability totals are source-derived — PASS;
- fabricated 180/420 values are absent — PASS;
- historical opening balances and four source actions — PASS;
- debt principal changes Capital but is excluded from ordinary Income/Expense Analytics — PASS;
- overpayment automatically creates reciprocal debt without a dialog — PASS;
- mutual offset leaves one net position while preserving history — PASS;
- active source editing recalculates linked movement with stable id — PASS;
- closed chain is immutable and later activity creates a new chain — PASS;
- personal debt does not leak into household scope — PASS;
- M3, Hidden Capital and compact Analytics remain operational — PASS;
- runtime exceptions — NONE.

## Browser Output

```text
{
  "status": "PASS",
  "marker": "PF08A_M2_01_BROWSER_PASS",
  "navigation": "Главная · Операции · План · Ещё",
  "historicalOpening": true,
  "principalAffectsCapital": true,
  "principalExcludedFromIncomeExpenseAnalytics": true,
  "homeTotalsSourceDerived": true,
  "mutualOffset": true,
  "automaticReciprocalDebt": true,
  "noOverpaymentDialog": true,
  "noNonPrincipalField": true,
  "sourceEditStableOperation": true,
  "keepOpenAndClose": true,
  "closedChainImmutable": true,
  "newChainAfterClosure": true,
  "trashRestoreRecalculated": true,
  "personalScopeIsolated": true,
  "m3Preserved": true,
  "hiddenCapitalPreserved": true,
  "runtimeExceptions": []
}
```

# END OF FILE

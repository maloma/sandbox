# Public Verification — PF-08A-WF01-BASE-CURRENCY-WALLET-MANAGEMENT

**Status:** PASS  
**Verified At:** 2026-07-22T15:39:03.976Z  
**Public URL:** `https://maloma.github.io/sandbox/`  
**Expected Main Commit:** `85339932958f58cd416eb966a67e1bb35f56383c`  
**Publication Attempts:** `1`  

## HTTP Status

- index.html: `200`
- familypilot-scope.js: `200`
- familypilot-analytics-state.js: `200`
- familypilot-obligations.js: `200`
- familypilot-obligations-ui-v2.js: `200`
- familypilot-debts.js: `200`
- familypilot-debts-ui.js: `200`
- familypilot-savings-goals.js: `200`
- familypilot-savings-goals-ui.js: `200`
- familypilot-wallet-management.js: `200`
- familypilot-wallet-management-ui.js: `200`

## SHA-256

- index.html: `a651fd54a516fd2d70f811432f5a4be7e5eca586445f716d85d8ab09848912a4`
- familypilot-scope.js: `519b507fc7bc15266013c5218b0ed50222ab47706706bac2d87fd3d32da44c82`
- familypilot-analytics-state.js: `9f934f1ecd3c87e747cd9f99a2cb9b83abc07040eacc67ddaf1808fe3ab77c9f`
- familypilot-obligations.js: `539f0d44868478a51b07da63f58dc3ab28ae46ac96d2e203fbe6f94381b0f61b`
- familypilot-obligations-ui-v2.js: `00f3660eb7d5458c5a12ab051d59704f725e1dcb3d2a090543189e71cf5ea86f`
- familypilot-debts.js: `ae4831457d791ad49f3f7fd78cab2baad93db7469d1ebbc19edf9d8dea7c7c77`
- familypilot-debts-ui.js: `74e8595ade32023b08a048c6a5b9917ae4be9b8c964f7069b9fb79b9a049a520`
- familypilot-savings-goals.js: `b9df31b8f4224252f1b754c884f4036e1a7df6adf58fc187cf705b715feb4e33`
- familypilot-savings-goals-ui.js: `962b7d7a55578a07c6bb1a45997843dfc2b801f61ff7b6d25153bf589cae77b9`
- familypilot-wallet-management.js: `6e7d8d4142f3417099126ef607ff6084ca082fc2c39e641c289472eb02d87bc3`
- familypilot-wallet-management-ui.js: `5ca234f3950e0b9eeca34b338b506b8d51755611299e4e77cfc5f383a6efbf6e`

## Assertions

- Wallet Management route and default wallet preservation — PASS;
- shared and personal base-currency creation with zero start — PASS;
- stable rename and linked-operation preservation — PASS;
- personal privacy and household-capital exclusion defaults — PASS;
- capital inclusion remains independent from access — PASS;
- cross-member isolation and accessible selector — PASS;
- personal and household scope switching — PASS;
- no management Income, Expense or Transfer — PASS;
- no permission, FX, transfer or destructive controls — PASS;
- M2, M3, M4, Hidden Capital and compact Analytics — PASS;
- runtime exceptions — NONE.

## Browser Output

```text
{
  "status": "PASS",
  "marker": "PF08A_WF01_BROWSER_PASS",
  "navigation": "Главная · Операции · План · Ещё",
  "defaultWalletPreserved": true,
  "sharedCreate": true,
  "personalCreate": true,
  "baseCurrencyOnly": true,
  "zeroStart": true,
  "stableRename": true,
  "operationLinksPreserved": true,
  "personalPrivateByDefault": true,
  "personalExcludedByDefault": true,
  "capitalInclusionIndependentFromAccess": true,
  "crossMemberIsolation": true,
  "activeSelectorUpdated": true,
  "personalScope": true,
  "householdScopeRestored": true,
  "noManagementOperation": true,
  "noPermissionsUi": true,
  "noFxOrTransferUi": true,
  "priorModulesPreserved": true,
  "runtimeExceptions": []
}
```

# END OF FILE

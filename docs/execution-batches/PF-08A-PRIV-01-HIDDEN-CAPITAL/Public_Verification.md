# Public Verification — PF-08A-PRIV-01-HIDDEN-CAPITAL

**Status:** PASS  
**Verified At:** 2026-07-22T03:53:57.035Z  
**Public URL:** `https://maloma.github.io/sandbox/`  
**Expected Main Commit:** `3b62f927d7728d5c05bb3dd3e3e649974a9cb441`  
**HTTP Status:** `200`  
**Scope Module HTTP Status:** `200`  
**Analytics Module HTTP Status:** `200`  
**Publication Attempts:** `1`  
**HTML SHA-256:** `a8b2ce6a1f09f01c0a10a83a117a8f7a3455ba7f92cd279d7fd9c3292fee2e0b`  
**Scope Module SHA-256:** `800ae1d9b8d8ad68ae6f0215e5b94978890e7a87d9f012fd5448e6e39de0899b`  
**Analytics Module SHA-256:** `9f934f1ecd3c87e747cd9f99a2cb9b83abc07040eacc67ddaf1808fe3ab77c9f`  

## Assertions

- first Main control visible text exactly `Капитал` — PASS;
- no Capital amount, change, graph, dates or visible wallet label on Main — PASS;
- Capital overlay closed on load and after dismiss — PASS;
- household Capital appears only after explicit press — PASS;
- personal Capital appears only after explicit press — PASS;
- household and personal details remain isolated — PASS;
- compact Analytics and wallet scope foundations remain operational — PASS;
- runtime exceptions — NONE.

## Browser Output

```text
{
  "status": "PASS",
  "browser": "/usr/bin/google-chrome",
  "marker": "PF08A_PRIV01_BROWSER_PASS",
  "visible_main_text": "Капитал",
  "main_values_exposed": false,
  "household_disclosure": true,
  "personal_disclosure": true,
  "closed_after_dismiss": true,
  "wallet_scope_isolated": true
}
```

# END OF FILE

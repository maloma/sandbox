# Public Verification — PF-08A-A3-01-COMPACT-ANALYTICS-STATES

**Status:** PASS  
**Verified At:** 2026-07-22T03:26:34.002Z  
**Public URL:** `https://maloma.github.io/sandbox/`  
**Expected Main Commit:** `a42d3add5160f3a95dab7392ac17ef9b28bbdecf`  
**HTTP Status:** `200`  
**Scope Module HTTP Status:** `200`  
**Analytics Module HTTP Status:** `200`  
**Publication Attempts:** `1`  
**HTML SHA-256:** `3a353911196d97d22bf9eee9bfb17e7bdc5fd6cc250b526c796f06abe85d1e40`  
**Scope Module SHA-256:** `800ae1d9b8d8ad68ae6f0215e5b94978890e7a87d9f012fd5448e6e39de0899b`  
**Analytics Module SHA-256:** `9f934f1ecd3c87e747cd9f99a2cb9b83abc07040eacc67ddaf1808fe3ab77c9f`  

## Assertions

- published compact Analytics marker present — PASS;
- published generated modules loaded — PASS;
- scope-empty, period-empty, Income-only, Expense-only, filtered-empty and mixed states — PASS;
- missing-category value preserved in totals and source rows — PASS;
- totals and source-operation result consistency — PASS;
- Reset preserves Analytics period and wallet scope — PASS;
- personal-wallet Analytics isolation — PASS;
- runtime exceptions — NONE.

## Browser Output

```text
{
  "status": "PASS",
  "browser": "/usr/bin/google-chrome",
  "marker": "PF08A_A3_01_BROWSER_PASS",
  "states": [
    "scope_empty",
    "period_empty",
    "income_only",
    "expense_only",
    "filtered_empty",
    "mixed"
  ],
  "missing_category_preserved": true,
  "result_source_consistency": true,
  "reset_preserved_scope_and_period": true,
  "personal_scope_isolated": true
}
```

# END OF FILE

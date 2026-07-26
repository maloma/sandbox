# M4-03 Runtime Package Note

This package keeps the user-facing module name `Накопления` and applies account-ledger logic internally.

Implemented:

- purpose accounts backed by savings goals;
- internal transfers between operating money, purpose accounts and investment accounts;
- no ordinary Income or Expense for internal transfers;
- fixed-date and fixed-contribution recalculation;
- manual investment valuation with separate capital delta;
- 30/90-day deterministic forecast from obligations, planned incomes and planned savings transfers;
- source-explainable forecast events and missing-data disclosure.

The earlier generic wallet-transfer entry remains superseded and hidden in normal product mode.

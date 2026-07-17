# FamilyPilot — Money Amount Limit Rule

**Document Type:** Product Domain and Validation Rule

**Status:** Accepted

**Version:** 1.0

**Date:** 2026-07-18

---

# 1. Rule

The maximum monetary amount accepted by FamilyPilot is:

**999 999.99 EUR**

This is a shared product rule, not a calculator-only display workaround.

# 2. Scope

The limit applies to every monetary amount entry in the product, including:

- debt principal;
- debt repayment;
- opening debt balance;
- reciprocal debt;
- ordinary expense;
- ordinary income;
- transfer amount;
- amounts entered or calculated in the embedded calculator;
- edited monetary records where amount editing is allowed.

# 3. Input Behaviour

- The user may enter no more than six digits before the decimal separator and two digits after it.
- The maximum valid value is `999999.99`.
- Additional digits that would exceed the limit are not accepted.
- Pasted values above the limit are rejected.
- Saving is blocked when a value above the limit is present.
- The user sees: `Максимальная сумма — 999 999,99 €`.

# 4. Calculator Behaviour

- A single numeric operand cannot exceed `999999.99`.
- A calculated result whose absolute value exceeds `999999.99` cannot be used as an amount.
- The calculator must not display amount results in exponential notation.
- The Use action is disabled for results above the limit.
- Backspace and full-clear actions remain available.

# 5. Data Preservation

The limit applies to new or edited input. Existing historical test data is not silently modified or deleted by the validation rule.

# 6. Acceptance Criteria

The rule is implemented correctly when:

- `999999.99` is accepted;
- the next digit is rejected;
- pasted values above the limit are rejected;
- calculator result `1000000` cannot be used;
- all monetary forms enforce the same maximum;
- the interface remains readable and never switches an amount to exponential notation.

# END OF FILE

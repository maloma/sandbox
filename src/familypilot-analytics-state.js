(function attachFamilyPilotAnalyticsState(root){
  'use strict';

  const toCount = value => Math.max(0, Number(value) || 0);
  const toAmount = value => Math.max(0, Number(value) || 0);

  function flowState(income, expense) {
    const hasIncome = toAmount(income) > 0;
    const hasExpense = toAmount(expense) > 0;
    if (hasIncome && hasExpense) return 'mixed';
    if (hasIncome) return 'income_only';
    if (hasExpense) return 'expense_only';
    return 'zero';
  }

  function scopeEmptyMessage(scopeType, scopeLabel) {
    if (scopeType === 'personal') {
      return `В кошельке «${scopeLabel || 'Личный кошелёк'}» операций пока нет.`;
    }
    return 'В этом финансовом контексте операций пока нет.';
  }

  function classify(input = {}) {
    const scopeCount = toCount(input.scopeCount);
    const periodCount = toCount(input.periodCount);
    const filteredCount = toCount(input.filteredCount);
    const periodIncome = toAmount(input.periodIncome);
    const periodExpense = toAmount(input.periodExpense);
    const mode = ['expense', 'income', 'all'].includes(input.mode) ? input.mode : 'expense';
    const optionalFiltersActive = Boolean(input.optionalFiltersActive);
    const scopeType = input.scopeType === 'personal' ? 'personal' : 'household';
    const scopeLabel = String(input.scopeLabel || '').trim();
    const periodFlow = flowState(periodIncome, periodExpense);

    let state = periodFlow;
    let emptyReason = null;
    let categoryMessage = '';
    let operationsMessage = '';

    if (scopeCount === 0) {
      state = 'scope_empty';
      emptyReason = 'scope';
      categoryMessage = scopeEmptyMessage(scopeType, scopeLabel);
      operationsMessage = categoryMessage;
    } else if (periodCount === 0) {
      state = 'period_empty';
      emptyReason = 'period';
      categoryMessage = 'За выбранный период операций нет.';
      operationsMessage = categoryMessage;
    } else if (filteredCount === 0 && optionalFiltersActive) {
      state = 'filtered_empty';
      emptyReason = 'filters';
      categoryMessage = 'По выбранным условиям данных нет.';
      operationsMessage = categoryMessage;
    } else if (filteredCount === 0 && mode === 'expense' && periodExpense === 0) {
      state = periodFlow === 'income_only' ? 'income_only' : 'period_empty';
      emptyReason = 'no_expense';
      categoryMessage = 'За выбранный период расходов нет.';
      operationsMessage = categoryMessage;
    } else if (filteredCount === 0 && mode === 'income' && periodIncome === 0) {
      state = periodFlow === 'expense_only' ? 'expense_only' : 'period_empty';
      emptyReason = 'no_income';
      categoryMessage = 'За выбранный период приходов нет.';
      operationsMessage = categoryMessage;
    } else if (filteredCount === 0) {
      state = 'filtered_empty';
      emptyReason = 'result';
      categoryMessage = 'По выбранным условиям данных нет.';
      operationsMessage = categoryMessage;
    }

    return Object.freeze({
      state,
      periodFlow,
      emptyReason,
      categoryMessage,
      operationsMessage,
      basisLabel: 'На основе записанных операций',
      isEmpty: filteredCount === 0,
      scopeCount,
      periodCount,
      filteredCount,
      optionalFiltersActive,
      mode,
      scopeType,
      scopeLabel
    });
  }

  root.FamilyPilotAnalyticsState = Object.freeze({ flowState, classify });
})(typeof window !== 'undefined' ? window : globalThis);

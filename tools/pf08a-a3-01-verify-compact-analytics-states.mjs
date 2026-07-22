import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const sourcePath = 'src/familypilot.html';
const indexPath = 'index.html';
const sourceScopePath = 'src/familypilot-scope.js';
const rootScopePath = 'familypilot-scope.js';
const sourceAnalyticsPath = 'src/familypilot-analytics-state.js';
const rootAnalyticsPath = 'familypilot-analytics-state.js';

const source = readFileSync(sourcePath, 'utf8');
const index = readFileSync(indexPath, 'utf8');
const sourceScope = readFileSync(sourceScopePath, 'utf8');
const rootScope = readFileSync(rootScopePath, 'utf8');
const sourceAnalytics = readFileSync(sourceAnalyticsPath, 'utf8');
const rootAnalytics = readFileSync(rootAnalyticsPath, 'utf8');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const equal = (actual, expected, message) => {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) throw new Error(`${message}: expected ${right}, got ${left}`);
};

const sandbox = {};
sandbox.globalThis = sandbox;
vm.runInNewContext(sourceAnalytics, sandbox, { filename: sourceAnalyticsPath });
const analytics = sandbox.FamilyPilotAnalyticsState;
assert(analytics, 'FamilyPilotAnalyticsState was not attached');

let view = analytics.classify({
  scopeCount: 0, periodCount: 0, filteredCount: 0,
  mode: 'expense', scopeType: 'personal', scopeLabel: 'Личный кошелёк Анны'
});
equal(view.state, 'scope_empty', 'personal empty scope state');
assert(view.operationsMessage.includes('Личный кошелёк Анны'), 'personal empty scope copy must identify wallet');

view = analytics.classify({
  scopeCount: 4, periodCount: 0, filteredCount: 0,
  mode: 'expense', scopeType: 'household', scopeLabel: 'Семейный контекст'
});
equal(view.state, 'period_empty', 'period empty state');
equal(view.operationsMessage, 'За выбранный период операций нет.', 'period empty copy');

view = analytics.classify({
  scopeCount: 2, periodCount: 2, filteredCount: 0,
  periodIncome: 300, periodExpense: 0, mode: 'expense', optionalFiltersActive: false
});
equal(view.state, 'income_only', 'income-only flow state');
equal(view.emptyReason, 'no_expense', 'income-only expense-mode reason');
equal(view.categoryMessage, 'За выбранный период расходов нет.', 'no Expense copy');

view = analytics.classify({
  scopeCount: 2, periodCount: 2, filteredCount: 0,
  periodIncome: 0, periodExpense: 150, mode: 'income', optionalFiltersActive: false
});
equal(view.state, 'expense_only', 'expense-only flow state');
equal(view.emptyReason, 'no_income', 'expense-only income-mode reason');
equal(view.categoryMessage, 'За выбранный период приходов нет.', 'no Income copy');

view = analytics.classify({
  scopeCount: 3, periodCount: 3, filteredCount: 0,
  periodIncome: 200, periodExpense: 80, mode: 'all', optionalFiltersActive: true
});
equal(view.state, 'filtered_empty', 'filtered empty state');
equal(view.operationsMessage, 'По выбранным условиям данных нет.', 'filtered empty copy');

view = analytics.classify({
  scopeCount: 3, periodCount: 3, filteredCount: 3,
  periodIncome: 200, periodExpense: 80, mode: 'all', optionalFiltersActive: false
});
equal(view.state, 'mixed', 'mixed state');
equal(view.basisLabel, 'На основе записанных операций', 'recorded-data basis');

const requiredSourceTokens = [
  'compact-analytics-states-v1',
  '<script src="./familypilot-analytics-state.js"></script>',
  'id="analyticsDataBasis"',
  'function analyticsPeriodOperations()',
  'function analyticsOptionalFiltersActive()',
  'function analyticsStateSnapshot(',
  'analyticsStateApi.classify',
  "$('analyticsScreen').dataset.analyticsState=viewState.state",
  'data-missing-category="true"',
  'Откройте операцию, чтобы выбрать категорию',
  'setAnalyticsPeriod:(range,anchor)=>',
  'replaceOperationsForTest:operations=>',
  'getAnalyticsViewState:()=>'
];
for (const token of requiredSourceTokens) assert(source.includes(token), `required source token missing: ${token}`);

const forbiddenSourceTokens = [
  '<script src="./src/familypilot-analytics-state.js"></script>',
  "function analyticsCategoryHtml(list){if(!list.length)return'<div class=\"empty\">По выбранным условиям данных нет.</div>'",
  "function analyticsOperationsHtml(list){return list.length?list.map",
  "$('analyticsCategories').innerHTML=analyticsCategoryHtml(list);",
  "$('analyticsOperations').innerHTML=analyticsOperationsHtml(list);"
];
for (const token of forbiddenSourceTokens) assert(!source.includes(token), `forbidden old Analytics token present: ${token}`);

assert(source === index, 'index.html must be byte-identical to src/familypilot.html');
assert(sourceScope === rootScope, 'scope modules must be byte-identical');
assert(sourceAnalytics === rootAnalytics, 'Analytics-state modules must be byte-identical');
assert(!index.includes("fetch('./src/familypilot.html"), 'old root fetch loader returned');
assert(!index.includes('document.write(source)'), 'old root document.write loader returned');

const inlineScripts = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1].trim())
  .filter(Boolean);
assert(inlineScripts.length === 1, `expected one inline application script, found ${inlineScripts.length}`);
new vm.Script(inlineScripts[0], { filename: sourcePath });
new vm.Script(sourceScope, { filename: sourceScopePath });
new vm.Script(sourceAnalytics, { filename: sourceAnalyticsPath });

console.log(JSON.stringify({
  status: 'PASS',
  classifier_states: ['scope_empty', 'period_empty', 'income_only', 'expense_only', 'filtered_empty', 'mixed'],
  recorded_data_basis: 'На основе записанных операций',
  source_sha256: sha256(source),
  index_sha256: sha256(index),
  scope_sha256: sha256(sourceScope),
  analytics_state_sha256: sha256(sourceAnalytics),
  syntax_validation: 'PASS'
}, null, 2));

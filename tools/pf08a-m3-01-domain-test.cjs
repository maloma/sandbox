const assert = require('node:assert/strict');
const obligations = require('../familypilot-obligations.js');

const NOW = new Date('2026-07-22T12:00:00Z').getTime();
const DAY = 86400000;

function stateFixture() {
  return {
    schemaVersion: 2,
    currentMemberId: 'member-anna',
    activeWalletId: 'wallet-household-main',
    wallets: [
      { id: 'wallet-household-main', type: 'household_default', name: 'Семейный кошелёк', nativeCurrency: 'EUR' },
      { id: 'wallet-personal-anna', type: 'personal', name: 'Личный кошелёк Анны', nativeCurrency: 'EUR' }
    ],
    categories: [{ id: 'cat-rent', kind: 'expense', name: 'Жильё' }],
    operations: []
  };
}

const state = stateFixture();
obligations.normalizeState(state, NOW);
assert.equal(state.schemaVersion, 3, 'schema must upgrade additively to v3');
assert.deepEqual(state.obligationRules, []);
assert.deepEqual(state.obligationOccurrences, []);

const oneTime = obligations.createRule(state, {
  name: 'Аренда',
  amount: 700,
  dueAt: NOW,
  cadence: 'once',
  walletId: 'wallet-household-main',
  categoryId: 'cat-rent',
  currency: 'EUR'
}, 'member-anna', NOW);
assert.equal(oneTime.ok, true);
assert.equal(state.obligationRules.length, 1);
assert.equal(state.obligationOccurrences.length, 1);
assert.equal(obligations.occurrenceDisplayStatus(oneTime.occurrence, NOW), 'due');

const duplicateBefore = state.operations.length;
const payment = obligations.payOccurrence(state, oneTime.occurrence.id, {
  amount: 690,
  occurredAt: NOW
}, 'member-anna', NOW);
assert.equal(payment.ok, true);
assert.equal(state.operations.length, duplicateBefore + 1, 'payment creates one Expense');
assert.equal(payment.operation.kind, 'expense');
assert.equal(payment.operation.links.obligationOccurrenceId, oneTime.occurrence.id);
assert.equal(oneTime.occurrence.linkedOperationId, payment.operation.id);
assert.equal(oneTime.occurrence.status, 'paid');
assert.equal(oneTime.occurrence.actualAmount, 690);

const duplicate = obligations.payOccurrence(state, oneTime.occurrence.id, { amount: 690, occurredAt: NOW }, 'member-anna', NOW);
assert.equal(duplicate.ok, false, 'duplicate active payment must be rejected');
assert.equal(state.operations.length, duplicateBefore + 1, 'duplicate payment must not create another Expense');

payment.operation.amount = 680;
obligations.syncPaymentLinks(state, NOW);
assert.equal(oneTime.occurrence.actualAmount, 680, 'linked operation edit must recalculate actual amount');

payment.operation.status = 'trash';
obligations.syncPaymentLinks(state, NOW + DAY);
assert.notEqual(oneTime.occurrence.status, 'paid', 'trashed linked operation must invalidate paid projection');
assert.equal(obligations.occurrenceDisplayStatus(oneTime.occurrence, NOW + DAY), 'overdue');

payment.operation.status = 'active';
obligations.syncPaymentLinks(state, NOW + DAY);
assert.equal(oneTime.occurrence.status, 'paid', 'restored linked operation must restore paid projection');

const monthly = obligations.createRule(state, {
  name: 'Интернет',
  amount: 25,
  dueAt: NOW + 5 * DAY,
  cadence: 'monthly',
  walletId: 'wallet-household-main',
  categoryId: 'cat-rent',
  currency: 'EUR'
}, 'member-anna', NOW + 1);
assert.equal(monthly.ok, true);
const originalRuleDue = monthly.rule.nextDueAt;
const originalOccurrenceDue = monthly.occurrence.dueAt;

const postponed = obligations.postponeOccurrence(state, monthly.occurrence.id, NOW + 8 * DAY, 'member-anna', NOW + 2);
assert.equal(postponed.ok, true);
assert.equal(monthly.occurrence.dueAt, NOW + 8 * DAY);
assert.equal(monthly.rule.nextDueAt, originalRuleDue, 'postponing one occurrence must not rewrite rule cadence date');
assert.equal(monthly.occurrence.scheduledDueAt, originalOccurrenceDue);
assert.equal(obligations.occurrenceDisplayStatus(monthly.occurrence, NOW + 2), 'postponed');

const skipped = obligations.skipOccurrence(state, monthly.occurrence.id, 'member-anna', NOW + 3);
assert.equal(skipped.ok, true);
assert.equal(monthly.occurrence.status, 'skipped');
assert.ok(skipped.nextOccurrence, 'monthly skip must generate the next occurrence');
assert.notEqual(skipped.nextOccurrence.id, monthly.occurrence.id);

const currentOpen = skipped.nextOccurrence;
const ruleUpdate = obligations.updateRule(state, monthly.rule.id, {
  name: 'Домашний интернет',
  amount: 30,
  dueAt: monthly.rule.nextDueAt,
  cadence: 'monthly',
  walletId: 'wallet-household-main',
  categoryId: 'cat-rent',
  currency: 'EUR'
}, 'member-anna', NOW + 4);
assert.equal(ruleUpdate.ok, true);
assert.equal(currentOpen.expectedAmount, 25, 'existing occurrence must not be silently rewritten by rule edit');
assert.equal(monthly.rule.amount, 30, 'future rule defaults must update');

const personal = obligations.createRule(state, {
  name: 'Личная подписка',
  amount: 12,
  dueAt: NOW + DAY,
  cadence: 'monthly',
  walletId: 'wallet-personal-anna',
  categoryId: 'cat-rent',
  currency: 'EUR'
}, 'member-anna', NOW + 5);
assert.equal(personal.ok, true);

const householdVisible = obligations.visibleRules(state, new Set(['wallet-household-main']));
const personalVisible = obligations.visibleRules(state, new Set(['wallet-personal-anna']));
assert.ok(householdVisible.every(rule => rule.walletId === 'wallet-household-main'));
assert.ok(personalVisible.every(rule => rule.walletId === 'wallet-personal-anna'));
assert.ok(!householdVisible.some(rule => rule.id === personal.rule.id), 'personal rule must not leak into household scope');

const overdueRule = obligations.createRule(state, {
  name: 'Просроченный счёт',
  amount: 40,
  dueAt: NOW - DAY,
  cadence: 'once',
  walletId: 'wallet-household-main',
  categoryId: 'cat-rent',
  currency: 'EUR'
}, 'member-anna', NOW + 6);
assert.equal(obligations.occurrenceDisplayStatus(overdueRule.occurrence, NOW), 'overdue');
const attention = obligations.attentionItems(state, new Set(['wallet-household-main']), NOW);
assert.ok(attention.some(item => item.targetId === overdueRule.occurrence.id && item.severity === 'red'));

console.log(JSON.stringify({
  status: 'PASS',
  schemaUpgrade: true,
  oneFactOneExpense: true,
  duplicatePaymentRejected: true,
  linkedEditRecalculated: true,
  trashRestoreRecalculated: true,
  occurrenceOverridePreserved: true,
  monthlyNextOccurrence: true,
  ruleEditDoesNotRewriteOccurrence: true,
  scopeIsolation: true,
  attention: true
}, null, 2));

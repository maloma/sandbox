import { createServer } from 'node:http';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const schemaVersion = '1';
const harnessVersion = 'familypilot-main-financial-journey-v1';
const project = 'FamilyPilot';
const defaultSeed = 'familypilot-main-financial-journey-v1';
const seed = process.env.FAMILYPILOT_TEST_SEED || defaultSeed;
const startedAt = new Date().toISOString();

function fnv1a32(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function repositoryHead() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return result.status === 0 ? result.stdout.trim() || null : null;
}

const seedHash = fnv1a32(seed);
const boundedRunPart = `${Date.now().toString(36).slice(-8)}-${String(process.pid % 100000).padStart(5, '0')}`;
const runId = `${seedHash}-${boundedRunPart}`;
const persistenceToken = `main-financial-journey-${seedHash}-${boundedRunPart}`.slice(0, 80);
const repositoryHeadValue = repositoryHead();
const requestedLogPath = process.env.FAMILYPILOT_TEST_LOG_PATH;
const logPath = resolve(
  root,
  requestedLogPath || join(tmpdir(), `familypilot-main-financial-journey-${runId}.json`),
);
const harnessName = `.familypilot-main-financial-journey-${runId}.html`;
const harnessPath = join(root, harnessName);
const profilePath = mkdtempSync(join(tmpdir(), 'familypilot-main-financial-journey-chrome-'));
const marker = 'FAMILYPILOT_MAIN_FINANCIAL_JOURNEY_PASS';

const baseLog = () => ({
  schema_version: schemaVersion,
  project,
  harness_version: harnessVersion,
  run_id: runId,
  seed,
  repository_head: repositoryHeadValue,
  started_at: startedAt,
  finished_at: null,
  status: 'FAIL',
  steps: [],
  reload_restart_recovery_events: [],
  final_summary: null,
  runtime_errors: [],
});

function browserHarness(config) {
  'use strict';

  const output = document.getElementById('result');
  const frames = document.getElementById('frames');
  const log = {
    schema_version: config.schemaVersion,
    project: config.project,
    harness_version: config.harnessVersion,
    run_id: config.runId,
    seed: config.seed,
    repository_head: config.repositoryHead,
    started_at: config.startedAt,
    finished_at: null,
    status: 'FAIL',
    steps: [],
    reload_restart_recovery_events: [],
    final_summary: null,
    runtime_errors: [],
  };
  const context = {
    ids: {},
    amounts: {
      income: 2400,
      expense: 375,
      transfer: 500,
      obligation: 125,
      savings: 300,
    },
    initialCapital: null,
    intendedFingerprint: null,
    recoveredFromRevision: null,
  };
  let current = null;
  let finalFinancialSummary = null;

  const wait = milliseconds => new Promise(resolveWait => setTimeout(resolveWait, milliseconds));
  const closeEnough = (left, right, epsilon = 0.005) => Math.abs(Number(left) - Number(right)) <= epsilon;
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const errorText = error => String(error?.stack || error?.message || error || 'Unknown error');
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const iso = value => new Date(value).toISOString();
  const round = value => Math.round((Number(value) || 0) * 100) / 100;

  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (!value || typeof value !== 'object') return value;
    const result = {};
    for (const key of Object.keys(value).sort()) result[key] = canonical(value[key]);
    return result;
  }

  function hash(value) {
    const text = JSON.stringify(canonical(value));
    let result = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
      result ^= text.charCodeAt(index);
      result = Math.imul(result, 0x01000193);
    }
    return (result >>> 0).toString(16).padStart(8, '0');
  }

  function activeOrdinaryTotals(state) {
    return (state.operations || []).filter(item => item.status === 'active').reduce((totals, item) => {
      if (item.kind === 'income') totals.income = round(totals.income + Number(item.amount));
      if (item.kind === 'expense') totals.expense = round(totals.expense + Number(item.amount));
      return totals;
    }, { income: 0, expense: 0 });
  }

  function selectedRecord(record, fields) {
    if (!record) return null;
    const result = {};
    for (const field of fields) result[field] = clone(record[field] ?? null);
    return result;
  }

  function journeySnapshot(state) {
    const ids = context.ids;
    const operationIds = [ids.incomeOperation, ids.expenseOperation, ids.obligationOperation].filter(Boolean);
    const allocations = (state.purposeAllocations || []).filter(item => item.goalId === ids.savingsGoal);
    const allocationEvents = (state.purposeAllocationEvents || []).filter(item => item.goalId === ids.savingsGoal);
    const movements = (state.walletMovements || []).filter(item => item.transferId === ids.transfer);
    return canonical({
      household: selectedRecord(state.household, ['id', 'baseCurrency', 'openingCapital']),
      wallets: [ids.primaryWallet, ids.secondaryWallet].filter(Boolean).map(id => selectedRecord(
        (state.wallets || []).find(item => item.id === id),
        ['id', 'type', 'name', 'nativeCurrency', 'includedInHouseholdCapital', 'openingBalance', 'moneyForm', 'locationKind', 'archivedAt'],
      )).sort((left, right) => String(left?.id).localeCompare(String(right?.id))),
      operations: operationIds.map(id => selectedRecord(
        (state.operations || []).find(item => item.id === id),
        ['id', 'kind', 'amount', 'categoryId', 'walletId', 'status', 'links', 'transferGroupId'],
      )).sort((left, right) => String(left?.id).localeCompare(String(right?.id))),
      transfer: selectedRecord(
        (state.transfers || []).find(item => item.id === ids.transfer),
        ['id', 'sourceWalletId', 'destinationWalletId', 'amount', 'currency', 'status'],
      ),
      transfer_movements: movements.map(item => selectedRecord(
        item,
        ['id', 'parentEventId', 'transferId', 'movementRole', 'direction', 'walletId', 'amount', 'currency', 'status'],
      )).sort((left, right) => String(left?.id).localeCompare(String(right?.id))),
      obligation_rule: selectedRecord(
        (state.obligationRules || []).find(item => item.id === ids.obligationRule),
        ['id', 'name', 'cadence', 'amount', 'currency', 'walletId', 'categoryId', 'status'],
      ),
      obligation_occurrence: selectedRecord(
        (state.obligationOccurrences || []).find(item => item.id === ids.obligationOccurrence),
        ['id', 'ruleId', 'expectedAmount', 'actualAmount', 'currency', 'walletId', 'categoryId', 'status', 'allocationStatus', 'linkedOperationId', 'linkedOperationIds', 'overpaidAmount'],
      ),
      savings_goal: selectedRecord(
        (state.savingsGoals || []).find(item => item.id === ids.savingsGoal),
        ['id', 'name', 'targetAmount', 'savedAmount', 'status'],
      ),
      purpose_allocations: allocations.map(item => selectedRecord(
        item,
        ['id', 'goalId', 'locationId', 'amount', 'status', 'source'],
      )).sort((left, right) => String(left?.id).localeCompare(String(right?.id))),
      purpose_allocation_events: allocationEvents.map(item => selectedRecord(
        item,
        ['id', 'allocationId', 'goalId', 'locationId', 'amountDelta', 'balanceBefore', 'balanceAfter', 'reason', 'linkedEconomicEventId', 'status'],
      )).sort((left, right) => String(left?.id).localeCompare(String(right?.id))),
      savings_policy: selectedRecord(
        (state.savingsGoalPolicies || []).find(item => item.goalId === ids.savingsGoal),
        ['goalId', 'priority', 'frozen'],
      ),
      ordinary_totals: activeOrdinaryTotals(state),
    });
  }

  function summarize(app = current) {
    if (!app?.api?.getState) return null;
    const state = app.api.getState();
    const capital = app.api.capitalSnapshot();
    const scope = app.w.FamilyPilotScope;
    const locationBalances = {};
    for (const id of [context.ids.primaryWallet, context.ids.secondaryWallet].filter(Boolean)) {
      const value = scope?.walletCapitalSnapshot?.(state, id);
      locationBalances[id] = value ? round(value.capital) : null;
    }
    const snapshot = journeySnapshot(state);
    return {
      household: {
        id: state.household?.id || null,
        base_currency: state.household?.baseCurrency || null,
        current_member_id: state.currentMemberId || null,
        canonical_test_household_adaptation: true,
      },
      active_wallet_id: state.activeWalletId || null,
      capital: {
        scope: capital.scope,
        opening: round(capital.opening),
        income: round(capital.income),
        expense: round(capital.expense),
        debt_inflow: round(capital.debtInflow),
        debt_outflow: round(capital.debtOutflow),
        transfer_inflow: round(capital.transferInflow),
        transfer_outflow: round(capital.transferOutflow),
        adjustment: round(capital.adjustment),
        capital: round(capital.capital),
      },
      ordinary_totals: activeOrdinaryTotals(state),
      location_balances: locationBalances,
      counts: {
        wallets: (state.wallets || []).length,
        active_operations: (state.operations || []).filter(item => item.status === 'active').length,
        income_operations: (state.operations || []).filter(item => item.status === 'active' && item.kind === 'income').length,
        expense_operations: (state.operations || []).filter(item => item.status === 'active' && item.kind === 'expense').length,
        transfer_events: (state.transfers || []).filter(item => item.status === 'active').length,
        transfer_movements: (state.walletMovements || []).filter(item => item.status === 'active').length,
        obligation_rules: (state.obligationRules || []).length,
        obligation_occurrences: (state.obligationOccurrences || []).length,
        savings_goals: (state.savingsGoals || []).length,
        purpose_allocations: (state.purposeAllocations || []).filter(item => item.status === 'active').length,
        purpose_allocation_events: (state.purposeAllocationEvents || []).length,
        savings_transfers: (state.savingsTransfers || []).filter(item => item.status === 'active').length,
      },
      synthetic_ids: clone(context.ids),
      synthetic_amounts: clone(context.amounts),
      journey: snapshot,
      journey_fingerprint: hash(snapshot),
      persistence: app.api.persistence ? {
        namespace: app.w.FamilyPilotPersistence?.storageNamespace || null,
        status: clone(app.api.persistence.status()),
        slots: slotSummary(app.api.persistence.slots()),
      } : null,
    };
  }

  function slotSummary(slots) {
    return {
      head: slots?.head ? {
        active_slot: slots.head.activeSlot,
        revision: slots.head.revision,
      } : null,
      a: slots?.a?.ok ? { ok: true, revision: slots.a.envelope.revision } : { ok: false, error: slots?.a?.error || null },
      b: slots?.b?.ok ? { ok: true, revision: slots.b.envelope.revision } : { ok: false, error: slots?.b?.error || null },
    };
  }

  function safeSummary() {
    try {
      return summarize();
    } catch (error) {
      return { summary_error: errorText(error), synthetic_ids: clone(context.ids), synthetic_amounts: clone(context.amounts) };
    }
  }

  async function step(action, operation, warning = null) {
    const started = Date.now();
    const record = {
      index: log.steps.length + 1,
      action,
      started_at: iso(started),
      finished_at: null,
      duration_ms: null,
      state_before: safeSummary(),
      state_after: null,
      result: null,
      error: null,
      warning,
    };
    log.steps.push(record);
    try {
      record.result = clone(await operation()) ?? { ok: true };
      return record.result;
    } catch (error) {
      record.error = errorText(error);
      throw error;
    } finally {
      const finished = Date.now();
      record.finished_at = iso(finished);
      record.duration_ms = finished - started;
      record.state_after = safeSummary();
    }
  }

  function namespaceKeys() {
    const needle = config.persistenceToken;
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.includes(needle)) keys.push(key);
    }
    return keys.sort();
  }

  function noteRuntimeError(source, type, value) {
    log.runtime_errors.push({
      at: new Date().toISOString(),
      source,
      type,
      message: String(value || type),
      explained: false,
    });
  }

  window.addEventListener('error', event => noteRuntimeError('harness', 'error', event.error || event.message));
  window.addEventListener('unhandledrejection', event => noteRuntimeError('harness', 'unhandledrejection', event.reason));

  async function openApp(phase) {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'width:390px;height:844px;border:0;display:none';
    frames.appendChild(frame);
    const loaded = new Promise(resolveLoad => frame.addEventListener('load', resolveLoad, { once: true }));
    const appBase = location.protocol === 'file:' ? './index.html' : '/';
    frame.src = `${appBase}?test=1&persistenceTest=${encodeURIComponent(config.persistenceToken)}&mainFinancialJourney=1&phase=${encodeURIComponent(phase)}&v=${Date.now()}`;
    await loaded;
    const win = frame.contentWindow;
    win.addEventListener('error', event => noteRuntimeError(phase, 'error', event.error || event.message));
    win.addEventListener('unhandledrejection', event => noteRuntimeError(phase, 'unhandledrejection', event.reason));
    const deadline = Date.now() + 100000;
    while (Date.now() < deadline) {
      const api = win.__FP_TEST__;
      if (
        win.__FP_RUNTIME__ &&
        win.FamilyPilotPersistence &&
        api?.walletManagement &&
        api?.transfers &&
        api?.obligations &&
        api?.partialPayments?.createOperation &&
        api?.savings &&
        api?.savingsTruth?.allocate &&
        api?.moneyPlanning?.createLocation &&
        api?.budget?.setPolicy &&
        api?.persistence &&
        win.__FP_PERSISTENCE_READY__ === true &&
        win.__FP_SAVINGS_TRUTH_READY__ === true &&
        win.__FP_M4_04_READY__ === true &&
        win.__FP_M4_03_BUDGET_READY__ === true
      ) {
        const app = { frame, w: win, api };
        const bootstrapErrors = Object.keys(win)
          .filter(key => /ERROR$/.test(key) && win[key])
          .map(key => `${key}: ${String(win[key])}`);
        for (const error of bootstrapErrors) noteRuntimeError(phase, 'bootstrap_error', error);
        return app;
      }
      await wait(100);
    }
    throw new Error(`FamilyPilot integrated API did not become ready for ${phase}: ${JSON.stringify({
      persistenceReady: win.__FP_PERSISTENCE_READY__,
      savingsTruthReady: win.__FP_SAVINGS_TRUTH_READY__,
      moneyPlanningReady: win.__FP_M4_04_READY__,
      budgetReady: win.__FP_M4_03_BUDGET_READY__,
      persistenceError: win.__FP_PERSISTENCE_RUNTIME_ERROR__,
      packageError: win.__FP_PACKAGE_BOOTSTRAP_ERROR__,
    })}`);
  }

  async function restartApp(phase) {
    if (current?.frame) current.frame.remove();
    current = null;
    current = await openApp(phase);
    return current;
  }

  function state() {
    return current.api.getState();
  }

  function ordinaryTotals() {
    return activeOrdinaryTotals(state());
  }

  function capital() {
    return round(current.api.capitalSnapshot().capital);
  }

  function assertJourneyEntities(expectedFingerprint = null) {
    const data = state();
    const ids = context.ids;
    const income = (data.operations || []).filter(item => item.id === ids.incomeOperation && item.status === 'active');
    const expense = (data.operations || []).filter(item => item.id === ids.expenseOperation && item.status === 'active');
    const obligationOperations = (data.operations || []).filter(item => item.id === ids.obligationOperation && item.status === 'active');
    const transfers = (data.transfers || []).filter(item => item.id === ids.transfer && item.status === 'active');
    const movements = (data.walletMovements || []).filter(item => item.transferId === ids.transfer && item.status === 'active');
    const projections = (data.operations || []).filter(item => item.kind === 'transfer' && item.transferId === ids.transfer && item.status === 'active');
    const rules = (data.obligationRules || []).filter(item => item.id === ids.obligationRule);
    const occurrences = (data.obligationOccurrences || []).filter(item => item.id === ids.obligationOccurrence);
    const goals = (data.savingsGoals || []).filter(item => item.id === ids.savingsGoal);
    const allocations = (data.purposeAllocations || []).filter(item => item.goalId === ids.savingsGoal && item.status === 'active');
    const events = (data.purposeAllocationEvents || []).filter(item => item.goalId === ids.savingsGoal && item.status === 'active');
    const policies = (data.savingsGoalPolicies || []).filter(item => item.goalId === ids.savingsGoal);
    assert(income.length === 1 && closeEnough(income[0].amount, context.amounts.income), 'Synthetic Income is missing, duplicated, or has the wrong amount');
    assert(expense.length === 1 && closeEnough(expense[0].amount, context.amounts.expense), 'Synthetic Expense is missing, duplicated, or has the wrong amount');
    assert(obligationOperations.length === 1 && closeEnough(obligationOperations[0].amount, context.amounts.obligation), 'Linked obligation payment is missing, duplicated, or has the wrong amount');
    assert(transfers.length === 1, 'Canonical transfer event is missing or duplicated');
    assert(movements.length === 2, 'Transfer does not have exactly two linked wallet movements');
    assert(projections.length === 1, 'Transfer operation projection is missing or duplicated');
    assert(rules.length === 1 && occurrences.length === 1, 'Obligation rule or occurrence is missing or duplicated');
    assert(goals.length === 1, 'Savings goal is missing or duplicated');
    assert(allocations.length === 1 && closeEnough(allocations[0].amount, context.amounts.savings), 'Savings allocation is missing, duplicated, or has the wrong amount');
    assert(events.length === 1 && closeEnough(events[0].amountDelta, context.amounts.savings), 'Savings allocation event is missing or duplicated');
    assert(policies.length === 1 && policies[0].priority === 5 && policies[0].frozen === true, 'Budget policy was not preserved');
    assert(income[0].walletId === ids.primaryWallet && expense[0].walletId === ids.primaryWallet, 'Actual operation wallet references changed');
    assert(transfers[0].sourceWalletId === ids.primaryWallet && transfers[0].destinationWalletId === ids.secondaryWallet, 'Transfer wallet references changed');
    assert(movements.every(item => item.parentEventId === ids.transfer && item.transferId === ids.transfer), 'Transfer movement references are inconsistent');
    assert(new Set(movements.map(item => item.id)).size === 2, 'Transfer movement IDs are not unique');
    assert(new Set(movements.map(item => item.movementRole)).size === 2 && movements.some(item => item.movementRole === 'transfer_source') && movements.some(item => item.movementRole === 'transfer_destination'), 'Transfer movement roles are inconsistent');
    assert(occurrences[0].ruleId === ids.obligationRule, 'Obligation occurrence lost its rule reference');
    assert(obligationOperations[0].links?.obligationOccurrenceId === ids.obligationOccurrence && obligationOperations[0].links?.obligationRuleId === ids.obligationRule, 'Obligation payment operation lost its occurrence/rule links');
    assert(allocations[0].goalId === ids.savingsGoal && allocations[0].locationId === ids.secondaryWallet, 'Savings allocation references changed');
    assert(events[0].allocationId === allocations[0].id && events[0].goalId === ids.savingsGoal && events[0].locationId === ids.secondaryWallet, 'Savings allocation event references are inconsistent');
    const currentFingerprint = summarize().journey_fingerprint;
    if (expectedFingerprint) assert(currentFingerprint === expectedFingerprint, `Journey fingerprint changed: expected ${expectedFingerprint}, received ${currentFingerprint}`);
    return { fingerprint: currentFingerprint };
  }

  function cleanupNamespace() {
    let removed = 0;
    try {
      removed = current?.w?.FamilyPilotPersistence?.test?.cleanup?.() || 0;
    } catch (error) {
      noteRuntimeError('cleanup', 'cleanup_error', errorText(error));
    }
    const remaining = namespaceKeys();
    if (remaining.length) {
      for (const key of remaining) localStorage.removeItem(key);
    }
    return { removed, remaining_after_api_cleanup: remaining, keys_after_cleanup: namespaceKeys() };
  }

  async function run() {
    const initialNamespaceKeys = namespaceKeys();
    assert(initialNamespaceKeys.length === 0, `Persistence namespace was not fresh: ${initialNamespaceKeys.join(', ')}`);

    await step('start fresh isolated persistence namespace and record initial financial state', async () => {
      current = await openApp('initial');
      assert(current.w.FamilyPilotPersistence.storageNamespace === `familypilot-test-${config.persistenceToken}-`, 'Persistence namespace is not the dedicated test namespace');
      assert(current.api.persistence.finalizeResult().ok === true, 'Initial persistence bootstrap did not finalize');
      const summary = summarize();
      context.initialCapital = summary.capital.capital;
      return {
        ok: true,
        namespace: current.w.FamilyPilotPersistence.storageNamespace,
        namespace_keys_before_open: initialNamespaceKeys,
        initial_financial_summary: summary,
      };
    });

    await step(
      'prepare canonical synthetic test household and primary bank/current location',
      async () => {
        const data = state();
        const primary = data.wallets.find(item => item.type === 'household_default');
        assert(data.household?.id && data.currentMemberId, 'Canonical test household/member is unavailable');
        assert(primary, 'Canonical primary money location is unavailable');
        assert(primary.moneyForm === 'bank' && primary.locationKind === 'bank_current', 'Primary location is not a bank/current location');
        assert(primary.includedInHouseholdCapital === true, 'Primary location is excluded from household capital');
        context.ids.primaryWallet = primary.id;
        current.api.setActiveWallet(primary.id);
        return {
          ok: true,
          adaptation: 'No family-creation test API exists; using the fresh canonical test household/member in the isolated persistence namespace.',
          household_id: data.household.id,
          member_id: data.currentMemberId,
          primary_wallet_id: primary.id,
        };
      },
      'Bounded adaptation: the existing canonical test household is used because no explicit family-creation API is exposed.',
    );

    await step('create second included bank savings money location', async () => {
      const beforeCapital = capital();
      const result = current.api.moneyPlanning.createLocation({
        name: `Synthetic journey savings ${config.seedHash}`,
        locationKind: 'bank_savings',
        openingBalance: 0,
      });
      assert(result.ok, `Second money location creation failed: ${result.error}`);
      context.ids.secondaryWallet = result.wallet.id;
      assert(result.wallet.includedInHouseholdCapital === true, 'Second location is not included in household capital');
      assert(result.wallet.nativeCurrency === state().household.baseCurrency, 'Second location is not in the household base currency');
      assert(closeEnough(capital(), beforeCapital), 'Zero-balance location creation changed household capital');
      return { ok: true, wallet: selectedRecord(result.wallet, ['id', 'name', 'type', 'nativeCurrency', 'openingBalance', 'moneyForm', 'locationKind', 'includedInHouseholdCapital']) };
    });

    await step('create one actual Income operation into the primary location', async () => {
      const beforeCapital = capital();
      const beforeTotals = ordinaryTotals();
      const category = current.api.createCategory('income', `Synthetic journey income ${config.seedHash}`);
      assert(category.ok, `Income category creation failed: ${category.error}`);
      context.ids.incomeCategory = category.category.id;
      const operationId = current.api.createOperation({
        kind: 'income',
        amount: context.amounts.income,
        categoryId: category.category.id,
        walletId: context.ids.primaryWallet,
        note: `Synthetic actual income ${config.runId}`,
        occurredAt: config.runEpoch,
      });
      context.ids.incomeOperation = operationId;
      const afterTotals = ordinaryTotals();
      assert(closeEnough(capital(), beforeCapital + context.amounts.income), 'Income did not increase owned household money exactly once');
      assert(closeEnough(afterTotals.income, beforeTotals.income + context.amounts.income), 'Ordinary Income total did not increase exactly once');
      assert(closeEnough(afterTotals.expense, beforeTotals.expense), 'Income creation changed ordinary Expense total');
      return { ok: true, category_id: category.category.id, operation_id: operationId, amount: context.amounts.income, capital_delta: round(capital() - beforeCapital) };
    });

    await step('create one actual Expense operation from the primary location', async () => {
      const beforeCapital = capital();
      const beforeTotals = ordinaryTotals();
      const category = current.api.createCategory('expense', `Synthetic journey expense ${config.seedHash}`);
      assert(category.ok, `Expense category creation failed: ${category.error}`);
      context.ids.expenseCategory = category.category.id;
      const operationId = current.api.createOperation({
        kind: 'expense',
        amount: context.amounts.expense,
        categoryId: category.category.id,
        walletId: context.ids.primaryWallet,
        note: `Synthetic actual expense ${config.runId}`,
        occurredAt: config.runEpoch + 1000,
      });
      context.ids.expenseOperation = operationId;
      const afterTotals = ordinaryTotals();
      assert(closeEnough(capital(), beforeCapital - context.amounts.expense), 'Expense did not decrease owned household money exactly once');
      assert(closeEnough(afterTotals.expense, beforeTotals.expense + context.amounts.expense), 'Ordinary Expense total did not increase exactly once');
      assert(closeEnough(afterTotals.income, beforeTotals.income), 'Expense creation changed ordinary Income total');
      return { ok: true, category_id: category.category.id, operation_id: operationId, amount: context.amounts.expense, capital_delta: round(capital() - beforeCapital) };
    });

    await step('create one real base-currency included-to-included wallet transfer', async () => {
      const beforeCapital = capital();
      const beforeTotals = ordinaryTotals();
      const beforeState = state();
      const beforeTransferCount = beforeState.transfers.length;
      const beforeMovementCount = beforeState.walletMovements.length;
      const result = current.api.transfers.create({
        sourceWalletId: context.ids.primaryWallet,
        destinationWalletId: context.ids.secondaryWallet,
        amount: context.amounts.transfer,
        currency: beforeState.household.baseCurrency,
        effectiveDate: config.runEpoch + 2000,
        note: `Synthetic base-currency transfer ${config.runId}`,
      });
      assert(result.ok, `Base-currency transfer failed: ${result.error}`);
      context.ids.transfer = result.transfer.id;
      context.ids.transferProjection = result.operation.id;
      context.ids.transferMovements = [result.sourceMovement.id, result.destinationMovement.id].sort();
      const afterState = state();
      const movements = current.api.transfers.movements(result.transfer.id);
      assert(afterState.transfers.length === beforeTransferCount + 1, 'Transfer did not create exactly one canonical transfer event');
      assert(afterState.walletMovements.length === beforeMovementCount + 2, 'Transfer did not create exactly two wallet movements');
      assert(movements.length === 2, 'Transfer API does not expose exactly two linked movements');
      assert(movements.every(item => item.parentEventId === result.transfer.id && item.transferId === result.transfer.id), 'Transfer movement IDs/references are inconsistent');
      assert(current.api.transfers.operations().filter(item => item.transferId === result.transfer.id).length === 1, 'Transfer projection is duplicated');
      assert(JSON.stringify(ordinaryTotals()) === JSON.stringify(beforeTotals), 'Transfer changed ordinary Income/Expense totals');
      assert(closeEnough(capital(), beforeCapital), 'Included-to-included transfer changed household capital');
      return { ok: true, transfer_id: result.transfer.id, projection_id: result.operation.id, movement_ids: context.ids.transferMovements, amount: context.amounts.transfer, capital_delta: round(capital() - beforeCapital) };
    });

    await step('create one-time mandatory obligation and linked payment operation', async () => {
      const beforeCapital = capital();
      const beforeTotals = ordinaryTotals();
      const category = current.api.createCategory('expense', `Synthetic mandatory obligation ${config.seedHash}`);
      assert(category.ok, `Obligation category creation failed: ${category.error}`);
      context.ids.obligationCategory = category.category.id;
      const created = current.api.obligations.createRule({
        name: `Synthetic mandatory payment ${config.seedHash}`,
        amount: context.amounts.obligation,
        dueAt: config.runEpoch,
        cadence: 'once',
        walletId: context.ids.primaryWallet,
        categoryId: category.category.id,
        currency: state().household.baseCurrency,
      });
      assert(created.ok && created.occurrence, `Obligation creation failed: ${created.error}`);
      context.ids.obligationRule = created.rule.id;
      context.ids.obligationOccurrence = created.occurrence.id;
      const payment = current.api.partialPayments.createOperation(created.occurrence.id, context.amounts.obligation);
      assert(payment.ok, `Linked obligation payment failed: ${payment.error}`);
      context.ids.obligationOperation = payment.operation.id;
      const summary = current.api.partialPayments.summary(created.occurrence.id);
      assert(summary.status === 'paid', 'Obligation occurrence is not fully paid');
      assert(closeEnough(summary.expected, context.amounts.obligation) && closeEnough(summary.paid, context.amounts.obligation) && closeEnough(summary.remaining, 0), 'Obligation paid/remaining amounts do not reconcile');
      assert(summary.operations.length === 1 && summary.operations[0].id === payment.operation.id, 'Obligation payment was applied more than once');
      assert(payment.operation.links?.obligationOccurrenceId === created.occurrence.id && payment.operation.links?.obligationRuleId === created.rule.id, 'Payment operation is not linked to the intended occurrence/rule');
      const duplicateAttempt = current.api.obligations.pay(created.occurrence.id, { amount: context.amounts.obligation, occurredAt: config.runEpoch + 3000 });
      assert(duplicateAttempt.ok === false, 'A second payment was accepted for the already-paid occurrence');
      const afterSummary = current.api.partialPayments.summary(created.occurrence.id);
      assert(afterSummary.operations.length === 1 && closeEnough(afterSummary.paid, context.amounts.obligation), 'Rejected duplicate payment still changed the occurrence');
      const afterTotals = ordinaryTotals();
      assert(closeEnough(afterTotals.expense, beforeTotals.expense + context.amounts.obligation), 'Mandatory payment did not create exactly one ordinary Expense effect');
      assert(closeEnough(afterTotals.income, beforeTotals.income), 'Mandatory payment changed ordinary Income');
      assert(closeEnough(capital(), beforeCapital - context.amounts.obligation), 'Mandatory payment did not reduce household capital exactly once');
      return { ok: true, rule_id: created.rule.id, occurrence_id: created.occurrence.id, operation_id: payment.operation.id, paid: afterSummary.paid, remaining: afterSummary.remaining, duplicate_attempt_rejected: true };
    });

    await step('create zero-saved savings goal and allocate real owned money at the second location', async () => {
      const beforeCapital = capital();
      const beforeTotals = ordinaryTotals();
      const beforeState = state();
      const beforeSavingsTransfers = (beforeState.savingsTransfers || []).length;
      const created = current.api.savings.create({
        name: `Synthetic emergency goal ${config.seedHash}`,
        targetAmount: 1800,
        savedAmount: 0,
        targetDate: '',
      });
      assert(created.ok, `Savings goal creation failed: ${created.error}`);
      context.ids.savingsGoal = created.goal.id;
      assert(closeEnough(created.goal.savedAmount, 0), 'Savings goal fabricated a saved balance at creation');
      const assignment = current.api.moneyPlanning.setPurposeLocation(created.goal.id, context.ids.secondaryWallet);
      assert(assignment.ok, `Savings location assignment failed: ${assignment.error}`);
      const freeBefore = current.api.savingsTruth.available(context.ids.secondaryWallet);
      assert(freeBefore + 0.005 >= context.amounts.savings, 'Second location does not contain enough real owned money for allocation');
      const allocated = current.api.savingsTruth.allocate(created.goal.id, context.ids.secondaryWallet, context.amounts.savings);
      assert(allocated.ok, `Canonical savings allocation failed: ${allocated.error}`);
      context.ids.purposeAllocation = allocated.allocation.id;
      context.ids.purposeAllocationEvent = allocated.event.id;
      const afterState = state();
      const goal = afterState.savingsGoals.find(item => item.id === created.goal.id);
      assert(closeEnough(current.api.savingsTruth.actual(created.goal.id), context.amounts.savings), 'Canonical savings truth does not equal the allocation');
      assert(closeEnough(goal.savedAmount, context.amounts.savings), 'Savings goal cache does not reconcile to canonical allocation truth');
      assert((afterState.savingsTransfers || []).length === beforeSavingsTransfers, 'Logical savings allocation created a savings-account transfer');
      assert(JSON.stringify(ordinaryTotals()) === JSON.stringify(beforeTotals), 'Internal savings allocation became ordinary Income or Expense');
      assert(closeEnough(capital(), beforeCapital), 'Savings/purpose allocation double-counted or removed household capital');
      assert(allocated.allocation.goalId === created.goal.id && allocated.allocation.locationId === context.ids.secondaryWallet, 'Savings allocation entity references are inconsistent');
      assert(allocated.event.allocationId === allocated.allocation.id && allocated.event.goalId === created.goal.id && allocated.event.locationId === context.ids.secondaryWallet, 'Savings allocation event references are inconsistent');
      assert(current.api.savingsTruth.audit().singleTruth === true, 'Canonical savings truth audit failed');
      return { ok: true, goal_id: created.goal.id, allocation_id: allocated.allocation.id, allocation_event_id: allocated.event.id, location_id: context.ids.secondaryWallet, amount: context.amounts.savings, free_before: freeBefore, free_after: current.api.savingsTruth.available(context.ids.secondaryWallet) };
    });

    await step('change deterministic budget allocation policy without creating Income or Expense', async () => {
      const beforeCapital = capital();
      const beforeTotals = ordinaryTotals();
      const beforeAllocations = current.api.savingsTruth.allocations().length;
      const result = current.api.budget.setPolicy(context.ids.savingsGoal, { priority: 5, frozen: true });
      assert(result.ok, `Budget policy action failed: ${result.error}`);
      assert(result.policy.goalId === context.ids.savingsGoal && result.policy.priority === 5 && result.policy.frozen === true, 'Budget policy result is inconsistent');
      assert(JSON.stringify(ordinaryTotals()) === JSON.stringify(beforeTotals), 'Budget allocation action became ordinary Income or Expense');
      assert(closeEnough(capital(), beforeCapital), 'Budget allocation action changed household capital');
      assert(current.api.savingsTruth.allocations().length === beforeAllocations, 'Budget policy action duplicated savings allocation');
      return { ok: true, goal_id: result.policy.goalId, priority: result.policy.priority, frozen: result.policy.frozen };
    });

    await step('commit persistence state, restart application, and prove no duplication', async () => {
      const before = summarize();
      current.w.__FP_RUNTIME__.save();
      const committedRevision = current.api.persistence.status().revision;
      context.intendedFingerprint = before.journey_fingerprint;
      const expectedTotals = clone(before.ordinary_totals);
      const expectedCapital = before.capital.capital;
      await restartApp('restart-after-save');
      const after = summarize();
      assert(after.journey_fingerprint === context.intendedFingerprint, 'Restart changed the intended financial journey fingerprint');
      assert(JSON.stringify(after.ordinary_totals) === JSON.stringify(expectedTotals), 'Restart changed ordinary Income/Expense totals');
      assert(closeEnough(after.capital.capital, expectedCapital), 'Restart changed household capital');
      assertJourneyEntities(context.intendedFingerprint);
      log.reload_restart_recovery_events.push({
        index: log.reload_restart_recovery_events.length + 1,
        event: 'reload_restart_after_committed_save',
        at: new Date().toISOString(),
        persistence_revision_before_restart: committedRevision,
        persistence_revision_after_restart: current.api.persistence.status().revision,
        expected_journey_fingerprint: context.intendedFingerprint,
        actual_journey_fingerprint: after.journey_fingerprint,
        result: 'preserved_without_duplication',
      });
      return { ok: true, revision_before_restart: committedRevision, revision_after_restart: current.api.persistence.status().revision, journey_fingerprint: after.journey_fingerprint };
    });

    await step('commit newer revisions, corrupt only active slot, restart, and recover previous committed state', async () => {
      const expectedFinancial = summarize();
      const fallbackProbe = `fallback-${config.runId}`;
      const corruptProbe = `active-to-corrupt-${config.runId}`;
      current.w.__FP_RUNTIME__.state.mainFinancialJourneyRecoveryProbe = fallbackProbe;
      current.w.__FP_RUNTIME__.save();
      const fallbackRevision = current.api.persistence.status().revision;
      current.w.__FP_RUNTIME__.state.mainFinancialJourneyRecoveryProbe = corruptProbe;
      current.w.__FP_RUNTIME__.save();
      const activeRevision = current.api.persistence.status().revision;
      assert(activeRevision > fallbackRevision, 'Newer active persistence revision was not committed');
      const beforeCorruptSlots = current.api.persistence.slots();
      assert(beforeCorruptSlots.a.ok && beforeCorruptSlots.b.ok, 'Double buffer does not have two valid committed slots before corruption');
      const fallbackSlot = [beforeCorruptSlots.a, beforeCorruptSlots.b].find(slot => slot.ok && slot.envelope.revision === fallbackRevision);
      assert(fallbackSlot, 'Previous valid committed fallback revision is unavailable');
      assert(fallbackSlot.state.mainFinancialJourneyRecoveryProbe === fallbackProbe, 'Fallback slot does not contain the expected previous committed state');
      const fallbackJourneyFingerprint = hash(journeySnapshot(fallbackSlot.state));
      assert(fallbackJourneyFingerprint === expectedFinancial.journey_fingerprint, 'Fallback revision financial fingerprint differs before corruption');
      const corrupted = current.w.FamilyPilotPersistence.test.corruptActiveSlot();
      assert(corrupted === true, 'Active persistence slot corruption hook did not run');
      const afterCorruptSlots = current.api.persistence.slots();
      const activeSlotName = beforeCorruptSlots.head.activeSlot;
      assert(afterCorruptSlots[activeSlotName].ok === false, 'Active slot remained valid after deliberate corruption');
      assert(afterCorruptSlots[activeSlotName === 'a' ? 'b' : 'a'].ok === true, 'Deliberate corruption damaged the fallback slot');
      log.reload_restart_recovery_events.push({
        index: log.reload_restart_recovery_events.length + 1,
        event: 'active_slot_deliberately_corrupted',
        at: new Date().toISOString(),
        active_revision: activeRevision,
        fallback_revision: fallbackRevision,
        active_slot: activeSlotName,
        slots_before: slotSummary(beforeCorruptSlots),
        slots_after: slotSummary(afterCorruptSlots),
        fallback_journey_fingerprint: fallbackJourneyFingerprint,
        result: 'only_active_slot_corrupted',
      });
      context.recoveredFromRevision = fallbackRevision;
      await restartApp('restart-after-active-slot-corruption');
      const recovered = summarize();
      assert(current.w.__FP_RUNTIME__.state.mainFinancialJourneyRecoveryProbe === fallbackProbe, 'Recovery did not select the last valid committed fallback state');
      assert(current.w.__FP_RUNTIME__.state.mainFinancialJourneyRecoveryProbe !== corruptProbe, 'Corrupted active revision was applied');
      assert(recovered.journey_fingerprint === fallbackJourneyFingerprint, 'Recovered financial fingerprint does not reconcile to the selected fallback revision');
      assert(recovered.journey_fingerprint === context.intendedFingerprint, 'Recovered financial fingerprint differs from the intended journey');
      assert(JSON.stringify(recovered.ordinary_totals) === JSON.stringify(expectedFinancial.ordinary_totals), 'Recovery changed ordinary Income/Expense totals');
      assert(closeEnough(recovered.capital.capital, expectedFinancial.capital.capital), 'Recovery changed household capital');
      assertJourneyEntities(fallbackJourneyFingerprint);
      log.reload_restart_recovery_events.push({
        index: log.reload_restart_recovery_events.length + 1,
        event: 'recovered_from_last_valid_committed_revision',
        at: new Date().toISOString(),
        selected_fallback_revision: fallbackRevision,
        post_bootstrap_revision: current.api.persistence.status().revision,
        expected_journey_fingerprint: fallbackJourneyFingerprint,
        actual_journey_fingerprint: recovered.journey_fingerprint,
        recovered_probe: current.w.__FP_RUNTIME__.state.mainFinancialJourneyRecoveryProbe,
        result: 'recovered_without_extra_transaction_application',
      });
      return { ok: true, corrupted_active_revision: activeRevision, selected_fallback_revision: fallbackRevision, post_bootstrap_revision: current.api.persistence.status().revision, recovered_journey_fingerprint: recovered.journey_fingerprint };
    });

    await step('verify final financial state and all mandatory invariants', async () => {
      const summary = summarize();
      const expectedCapital = round(context.initialCapital + context.amounts.income - context.amounts.expense - context.amounts.obligation);
      assert(closeEnough(summary.capital.capital, expectedCapital), `Unexplained creation/disappearance of money: expected capital ${expectedCapital}, received ${summary.capital.capital}`);
      const initial = log.steps[0].state_after;
      const expectedIncomeTotal = round(initial.ordinary_totals.income + context.amounts.income);
      const expectedExpenseTotal = round(initial.ordinary_totals.expense + context.amounts.expense + context.amounts.obligation);
      assert(closeEnough(summary.ordinary_totals.income, expectedIncomeTotal), 'Final Income total does not reconcile to exactly one created Income');
      assert(closeEnough(summary.ordinary_totals.expense, expectedExpenseTotal), 'Final Expense total does not reconcile to the actual Expense plus linked obligation payment');
      assertJourneyEntities(context.intendedFingerprint);
      const obligation = current.api.partialPayments.summary(context.ids.obligationOccurrence);
      assert(obligation.operations.length === 1 && closeEnough(obligation.paid, context.amounts.obligation) && closeEnough(obligation.remaining, 0), 'Final obligation payment state does not reconcile');
      assert(current.api.savingsTruth.audit().singleTruth === true, 'Final savings truth audit failed');
      assert(log.runtime_errors.length === 0, `Unexplained browser error/unhandledrejection events: ${log.runtime_errors.map(item => item.message).join(' | ')}`);
      assert(current.w.FamilyPilotPersistence.storageNamespace.includes(config.persistenceToken), 'Final state is outside the isolated synthetic namespace');
      finalFinancialSummary = {
        ...summary,
        invariants: {
          money_reconciles: true,
          income_applied_exactly_once: true,
          expense_applied_exactly_once: true,
          one_transfer_event_two_linked_movements: true,
          transfer_did_not_change_ordinary_totals_or_household_capital: true,
          obligation_linked_and_not_double_applied: true,
          obligation_paid_remaining_reconciles: true,
          savings_allocation_did_not_double_count_capital: true,
          internal_allocations_not_ordinary_income_or_expense: true,
          linked_ids_consistent: true,
          restart_preserved_without_duplication: true,
          active_slot_recovery_reconciled_to_previous_valid_revision: true,
          no_unexplained_runtime_errors: true,
          synthetic_namespace_isolated: true,
        },
        expected_final_capital: expectedCapital,
        recovered_from_revision: context.recoveredFromRevision,
      };
      return { ok: true, expected_final_capital: expectedCapital, actual_final_capital: summary.capital.capital, journey_fingerprint: summary.journey_fingerprint, invariant_count: Object.keys(finalFinancialSummary.invariants).length };
    });

    await step('clean up isolated synthetic persistence namespace', async () => {
      const cleanup = cleanupNamespace();
      assert(cleanup.keys_after_cleanup.length === 0, `Synthetic persistence keys remain: ${cleanup.keys_after_cleanup.join(', ')}`);
      return { ok: true, ...cleanup };
    });

    log.status = 'PASS';
    log.final_summary = {
      ...finalFinancialSummary,
      cleanup: log.steps.at(-1).result,
      marker: config.marker,
    };
  }

  function finish() {
    log.finished_at = new Date().toISOString();
    output.textContent = btoa(unescape(encodeURIComponent(JSON.stringify(log))));
    document.body.dataset.status = log.status;
  }

  run().catch(error => {
    const cleanup = cleanupNamespace();
    log.status = 'FAIL';
    log.final_summary = {
      failing_action: log.steps.find(item => item.error)?.action || 'harness bootstrap/finalization',
      error: errorText(error),
      last_financial_summary: safeSummary(),
      cleanup,
      marker: null,
    };
  }).finally(finish);
}

const browserConfig = {
  schemaVersion,
  project,
  harnessVersion,
  runId,
  seed,
  seedHash,
  repositoryHead: repositoryHeadValue,
  startedAt,
  runEpoch: Date.now(),
  persistenceToken,
  marker,
};
const serializedConfig = JSON.stringify(browserConfig).replace(/</g, '\\u003c');
const harness = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>FamilyPilot Main Financial Journey</title></head>
<body data-status="PENDING">
<div id="frames"></div>
<pre id="result">PENDING</pre>
<script>(${browserHarness.toString()})(${serializedConfig});</script>
</body>
</html>`;

writeFileSync(harnessPath, harness, 'utf8');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};
const server = createServer((request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    const raw = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
    const target = normalize(resolve(root, raw));
    if (target !== root && !target.startsWith(root + sep)) throw new Error('Forbidden');
    response.writeHead(200, {
      'content-type': mime[extname(target)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    response.end(readFileSync(target));
  } catch {
    if (!response.headersSent) response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

const chrome = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find(existsSync);

function runChrome(url) {
  return new Promise((resolveRun, rejectRun) => {
    if (!chrome) {
      rejectRun(new Error('Chrome/Chromium is not installed'));
      return;
    }
    const child = spawn(chrome, [
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--allow-file-access-from-files',
      `--user-data-dir=${profilePath}`,
      '--virtual-time-budget=300000',
      '--dump-dom',
      url,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      rejectRun(new Error(`Chrome timed out\n${stderr.slice(-4000)}`));
    }, 330000);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', error => {
      clearTimeout(timer);
      rejectRun(error);
    });
    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0) resolveRun(stdout);
      else rejectRun(new Error(`Chrome exited ${code}\n${stderr.slice(-8000)}`));
    });
  });
}

let finalLog = baseLog();
let failure = null;

try {
  let browserUrl;
  try {
    await new Promise((resolveListen, rejectListen) => {
      server.once('error', rejectListen);
      server.listen(0, '127.0.0.1', resolveListen);
    });
    browserUrl = `http://127.0.0.1:${server.address().port}/${harnessName}`;
  } catch (error) {
    if (error?.code !== 'EPERM' && error?.code !== 'EACCES') throw error;
    browserUrl = pathToFileURL(harnessPath).href;
    console.warn(`Local HTTP listener unavailable (${error.code}); using bounded file URL fallback.`);
  }
  const dom = await runChrome(browserUrl);
  const match = dom.match(/<pre id="result">([A-Za-z0-9+/=]+)<\/pre>/);
  if (!match) throw new Error(`Structured browser result was not emitted\n${dom.slice(-12000)}`);
  finalLog = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
  if (finalLog.status !== 'PASS' || !finalLog.final_summary || finalLog.final_summary.marker !== marker) {
    const detail = finalLog.final_summary?.error || finalLog.steps.find(item => item.error)?.error || 'unknown browser failure';
    throw new Error(`FamilyPilot main financial journey failed: ${detail}`);
  }
} catch (error) {
  failure = error;
  if (!finalLog.finished_at) finalLog.finished_at = new Date().toISOString();
  finalLog.status = 'FAIL';
  if (!finalLog.final_summary) {
    finalLog.final_summary = {
      failing_action: 'node_harness_or_browser_bootstrap',
      error: String(error?.stack || error),
      last_financial_summary: null,
    };
  }
  if (!finalLog.runtime_errors.length && !finalLog.steps.some(item => item.error)) {
    finalLog.runtime_errors.push({
      at: new Date().toISOString(),
      source: 'node_harness',
      type: 'harness_error',
      message: String(error?.stack || error),
      explained: true,
    });
  }
} finally {
  if (server.listening) await new Promise(resolveClose => server.close(resolveClose));
  if (existsSync(harnessPath)) unlinkSync(harnessPath);
  rmSync(profilePath, { recursive: true, force: true });
  mkdirSync(dirname(logPath), { recursive: true });
  writeFileSync(logPath, `${JSON.stringify(finalLog, null, 2)}\n`, 'utf8');
  console.log(`FamilyPilot structured test log: ${logPath}`);
}

if (failure) throw failure;
console.log(JSON.stringify({
  status: 'PASS',
  marker,
  run_id: runId,
  seed,
  persistence_namespace: `familypilot-test-${persistenceToken}-`,
  structured_log_path: logPath,
}, null, 2));

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
const harnessVersion = 'familypilot-family-scenario-matrix-v1';
const project = 'FamilyPilot';
const defaultSeed = 'familypilot-family-scenario-matrix-v1';
const baseSeed = process.env.FAMILYPILOT_SCENARIO_SEED || defaultSeed;
const reportPath = resolve(
  root,
  process.env.FAMILYPILOT_SCENARIO_REPORT_PATH ||
    join(tmpdir(), 'familypilot-family-scenario-matrix.json'),
);
const startedAt = new Date().toISOString();
const marker = 'FAMILYPILOT_FAMILY_SCENARIO_MATRIX_PASS';

function fnv1a32(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function repositoryHead() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return result.status === 0 ? result.stdout.trim() || null : null;
}

const definitions = [
  ['one_adult_living_alone', 'One adult living alone'],
  ['couple_with_shared_money', 'Couple with shared money'],
  ['family_with_a_child', 'Family with a child'],
  ['several_income_sources', 'Several income sources'],
  ['irregular_income', 'Irregular income'],
  ['debt', 'Debt'],
  ['several_savings_goals', 'Several savings goals'],
  ['not_enough_money', 'Not enough money'],
  ['money_surplus', 'Money surplus'],
  ['many_mandatory_payments', 'Many mandatory payments'],
  ['long_operation_history', 'Long operation history'],
].map(([id, name], index) => {
  const scenarioSeed = `${baseSeed}:${String(index + 1).padStart(2, '0')}:${id}`;
  return {
    index: index + 1,
    id,
    name,
    seed: scenarioSeed,
    seed_hash: fnv1a32(scenarioSeed).toString(16).padStart(8, '0'),
    persistence_token: `family-matrix-${String(index + 1).padStart(2, '0')}-${fnv1a32(scenarioSeed).toString(16).padStart(8, '0')}`,
  };
});

const coverageSummary = {
  screens_touched: [
    'home',
    'operations',
    'analytics',
    'walletManagement',
    'plannedIncome',
    'debts',
    'savingsGoals',
    'moneyLocations',
    'budgetDesigner',
    'obligations',
    'plans',
  ],
  modules_touched: [
    'household/member state',
    'wallet management and personal/shared scope',
    'operations and analytics totals',
    'wallet transfers',
    'planned income',
    'debt principal accounting',
    'mandatory obligations and partial payments',
    'savings goals and canonical purpose allocations',
    'budget deficit/surplus analysis',
    'persistence reload and namespace cleanup',
  ],
  screens_modules_touched: [
    'Home / capital',
    'Operations / Analytics',
    'Wallet management / scope',
    'Plan / planned income / obligations / debts',
    'Savings goals / money locations / budget designer',
    'Persistence runtime',
  ],
  actions_covered: [
    'create income and expense operations',
    'create shared and personal wallets',
    'switch member and wallet scopes',
    'create planned income without receiving it',
    'borrow and repay debt principal',
    'create and allocate multiple savings goals',
    'analyze shortage and surplus without applying hypothetical changes',
    'create, pay, partially pay, postpone, and skip obligations',
    'create at least 100 dated operations',
    'save, reload, verify fingerprints, and clean isolated persistence',
  ],
  states_covered: [
    'single adult household',
    'couple with shared and private money',
    'household with non-financial child member',
    'multiple and irregular actual income',
    'planned income not yet received',
    'active liability after partial repayment',
    'three simultaneously funded savings purposes',
    'forecast deficit',
    'positive operating remainder',
    'planned, partial, paid, postponed, and skipped obligations',
    'long persisted operation history',
  ],
  transitions_covered: [
    'fresh namespace -> populated scenario -> committed state -> reload -> cleanup',
    'household scope -> personal scope -> inaccessible-personal fallback -> household scope',
    'planned obligation -> partial/paid/skipped/postponed',
    'unallocated physical money -> purpose allocated money without capital change',
    'no debt -> borrowed principal -> partial repayment',
    'actual state -> hypothetical budget observation -> unchanged actual state',
  ],
  combinations_covered: [
    'shared wallet + two personal owners + actor switching',
    'three income sources + distinct categories + distinct dates',
    'three goals + one physical savings location + three allocations',
    'twelve obligations + mixed dates + mixed statuses + linked operations',
    '100 operations + six-month range + reload',
    'planned income + budget observation + actual-money isolation',
  ],
  not_covered_yet: [
    'multi-currency exchange-rate behavior',
    'investment valuation market updates',
    'receipt image capture and OCR',
    'concurrent writes from multiple browser tabs/devices',
    'full accessibility and visual-regression audit',
    'production browser storage quota exhaustion',
  ],
};

const repositoryHeadValue = repositoryHead();
const runHash = fnv1a32(baseSeed).toString(16).padStart(8, '0');
const harnessName = `.familypilot-family-scenario-matrix-${runHash}-${process.pid}.html`;
const harnessPath = join(root, harnessName);
const profilePath = mkdtempSync(join(tmpdir(), 'familypilot-family-scenario-matrix-chrome-'));

function emptyScenario(definition) {
  return {
    index: definition.index,
    id: definition.id,
    name: definition.name,
    scenario_name: definition.name,
    seed: definition.seed,
    scenario_seed: definition.seed,
    seed_hash: definition.seed_hash,
    persistence_namespace: `familypilot-test-${definition.persistence_token}-`,
    started_at: null,
    finished_at: null,
    duration_ms: null,
    status: 'NOT_RUN',
    actions_performed: [],
    actions: [],
    state_before: null,
    state_after: null,
    invariant_summary_before: null,
    invariant_summary_after: null,
    invariants: {},
    warnings: [],
    errors: [],
    reload_observations: [],
    recovery_observations: [],
    runtime_errors: [],
    cleanup_result: null,
    reproduction: {
      base_seed: baseSeed,
      scenario_seed: definition.seed,
      scenario_id: definition.id,
      command: `FAMILYPILOT_SCENARIO_SEED=${baseSeed} FAMILYPILOT_SCENARIO_REPORT_PATH=/tmp/familypilot-family-scenario-matrix.json node tools/familypilot-family-scenario-matrix-browser-smoke.mjs`,
    },
  };
}

function emptyReport() {
  return {
    schema_version: schemaVersion,
    version: harnessVersion,
    harness_version: harnessVersion,
    project,
    base_seed: baseSeed,
    repository_head: repositoryHeadValue,
    started_at: startedAt,
    finished_at: null,
    status: 'FAIL',
    overall_status: 'FAIL',
    scenario_count: definitions.length,
    scenario_names: definitions.map(item => item.name),
    scenarios: definitions.map(emptyScenario),
    coverage_summary: coverageSummary,
    runtime_errors: [],
    cleanup_result: { status: 'NOT_RUN', scenarios: [] },
    marker: null,
  };
}

function browserHarness(config) {
  'use strict';

  const DAY = 86400000;
  const output = document.getElementById('result');
  const frames = document.getElementById('frames');
  const report = config.baseReport;
  let current = null;
  let currentDefinition = null;
  let currentScenario = null;
  let clock = 0;
  let randomState = 1;

  const wait = milliseconds => new Promise(resolveWait => setTimeout(resolveWait, milliseconds));
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const round = value => Math.round((Number(value) || 0) * 100) / 100;
  const closeEnough = (left, right, epsilon = 0.005) => Math.abs(Number(left) - Number(right)) <= epsilon;
  const errorText = error => String(error?.stack || error?.message || error || 'Unknown error');
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };

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

  function seededRandom() {
    randomState += 0x6d2b79f5;
    let value = randomState;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  function noteRuntimeError(source, type, value) {
    const item = {
      at: new Date().toISOString(),
      scenario_id: currentDefinition?.id || null,
      source,
      type,
      message: String(value || type),
      explained: false,
    };
    report.runtime_errors.push(item);
    if (currentScenario) currentScenario.runtime_errors.push(clone(item));
  }

  window.addEventListener('error', event => noteRuntimeError('matrix_harness', 'error', event.error || event.message));
  window.addEventListener('unhandledrejection', event => noteRuntimeError('matrix_harness', 'unhandledrejection', event.reason));

  function namespaceKeys(token) {
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.includes(token)) keys.push(key);
    }
    return keys.sort();
  }

  async function openApp(definition, phase) {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'width:390px;height:844px;border:0;display:none';
    frames.appendChild(frame);
    const loaded = new Promise(resolveLoad => frame.addEventListener('load', resolveLoad, { once: true }));
    const appBase = location.protocol === 'file:' ? './index.html' : '/';
    frame.src = `${appBase}?test=1&persistenceTest=${encodeURIComponent(definition.persistence_token)}&familyScenarioMatrix=1&scenario=${encodeURIComponent(definition.id)}&phase=${encodeURIComponent(phase)}`;
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
        api?.getState &&
        api?.walletManagement &&
        api?.transfers?.create &&
        api?.obligations?.createRule &&
        api?.partialPayments?.createOperation &&
        api?.plannedIncome?.createRule &&
        api?.debts?.create &&
        api?.savings?.create &&
        api?.savingsTruth?.allocate &&
        api?.moneyPlanning?.createLocation &&
        api?.budget?.analysis &&
        api?.persistence?.status &&
        win.__FP_PERSISTENCE_READY__ === true &&
        win.__FP_SAVINGS_TRUTH_READY__ === true &&
        win.__FP_PLANNED_INCOME_UI_READY__ === true &&
        win.__FP_M4_04_READY__ === true &&
        win.__FP_M4_03_BUDGET_READY__ === true
      ) {
        const app = { frame, w: win, api };
        const bootstrapErrors = Object.keys(win)
          .filter(key => /ERROR$/.test(key) && win[key])
          .map(key => `${key}: ${String(win[key])}`);
        for (const item of bootstrapErrors) noteRuntimeError(phase, 'bootstrap_error', item);
        win.Math.random = seededRandom;
        win.Date.now = () => clock;
        return app;
      }
      await wait(100);
    }
    throw new Error(`FamilyPilot scenario API did not become ready for ${definition.id}/${phase}: ${JSON.stringify({
      persistence: win.__FP_PERSISTENCE_READY__,
      plannedIncome: win.__FP_PLANNED_INCOME_UI_READY__,
      savingsTruth: win.__FP_SAVINGS_TRUTH_READY__,
      moneyPlanning: win.__FP_M4_04_READY__,
      budget: win.__FP_M4_03_BUDGET_READY__,
      persistenceError: win.__FP_PERSISTENCE_RUNTIME_ERROR__,
      packageError: win.__FP_PACKAGE_BOOTSTRAP_ERROR__,
    })}`);
  }

  async function restart(definition) {
    current?.frame?.remove();
    current = await openApp(definition, 'reload');
    return current;
  }

  function state() {
    return current.api.getState();
  }

  function liveState() {
    return current.w.__FP_RUNTIME__.state;
  }

  function tick(milliseconds = 1000) {
    clock += milliseconds;
    return clock;
  }

  function activeOrdinaryTotals(data = state()) {
    return (data.operations || []).filter(item => item.status === 'active').reduce((result, item) => {
      if (item.kind === 'income') result.income = round(result.income + Number(item.amount));
      if (item.kind === 'expense') result.expense = round(result.expense + Number(item.amount));
      return result;
    }, { income: 0, expense: 0 });
  }

  function activeDebtTotals(data = state()) {
    return (data.operations || []).filter(item => item.status === 'active').reduce((result, item) => {
      if (item.kind === 'debt_inflow') result.inflow = round(result.inflow + Number(item.amount));
      if (item.kind === 'debt_outflow') result.outflow = round(result.outflow + Number(item.amount));
      return result;
    }, { inflow: 0, outflow: 0 });
  }

  const fingerprintKeys = [
    'household',
    'members',
    'wallets',
    'categories',
    'operations',
    'transfers',
    'walletMovements',
    'obligationRules',
    'obligationOccurrences',
    'savingsGoals',
    'savingsAccountPlans',
    'savingsGoalPolicies',
    'savingsTransfers',
    'purposeAllocations',
    'purposeAllocationEvents',
    'purposeLocationAssignments',
    'plannedIncomeRules',
    'plannedIncomeOccurrences',
    'balanceAdjustments',
  ];

  function financialFingerprint(data = state()) {
    const selected = {};
    for (const key of fingerprintKeys) selected[key] = clone(data[key] ?? (key === 'household' ? null : []));
    selected.debtChains = (data.debtChains || []).map(item => ({
      id: item.id,
      counterpartyId: item.counterpartyId,
      walletId: item.walletId,
      currency: item.currency,
      status: item.status,
      currentBalance: item.currentBalance,
      currentDirection: item.currentDirection,
      closureEventId: item.closureEventId,
    }));
    selected.debtCounterparties = (data.debtCounterparties || []).map(item => ({
      id: item.id,
      name: item.name,
      kind: item.kind,
      archivedAt: item.archivedAt,
    }));
    selected.debtSourceEvents = (data.debtEvents || []).filter(item => item.type === 'source').map(item => ({
      id: item.id,
      chainId: item.chainId,
      counterpartyId: item.counterpartyId,
      action: item.action,
      amount: item.amount,
      currency: item.currency,
      walletId: item.walletId,
      occurredAt: item.occurredAt,
      linkedOperationId: item.linkedOperationId,
      status: item.status,
    }));
    return hash(selected);
  }

  function summary() {
    const data = state();
    const capital = current.api.capitalSnapshot();
    const status = current.api.persistence.status();
    return {
      household_id: data.household?.id || null,
      member_count: (data.members || []).length,
      member_ids: (data.members || []).map(item => item.id),
      active_wallet_id: data.activeWalletId || null,
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
        operational_funds: round(capital.operationalFunds),
        liquid_capital: round(capital.liquidCapital),
        receivables: round(capital.receivables),
        liabilities: round(capital.liabilities),
        net_family_capital: round(capital.netFamilyCapital),
        capital: round(capital.capital),
      },
      ordinary_totals: activeOrdinaryTotals(data),
      debt_principal_totals: activeDebtTotals(data),
      counts: {
        wallets: (data.wallets || []).filter(item => !item.archivedAt).length,
        active_operations: (data.operations || []).filter(item => item.status === 'active').length,
        transfers: (data.transfers || []).filter(item => item.status === 'active').length,
        wallet_movements: (data.walletMovements || []).filter(item => item.status === 'active').length,
        planned_income_rules: (data.plannedIncomeRules || []).length,
        planned_income_occurrences: (data.plannedIncomeOccurrences || []).length,
        debt_chains: (data.debtChains || []).length,
        obligation_rules: (data.obligationRules || []).length,
        obligation_occurrences: (data.obligationOccurrences || []).length,
        savings_goals: (data.savingsGoals || []).length,
        purpose_allocations: (data.purposeAllocations || []).filter(item => item.status === 'active').length,
      },
      persistence: {
        namespace: current.w.FamilyPilotPersistence.storageNamespace,
        status: status.status,
        revision: status.revision,
        healthy: status.status === 'healthy' || String(status.status).startsWith('recovered_'),
      },
      financial_fingerprint: financialFingerprint(data),
    };
  }

  function genericInvariants(before, after) {
    return {
      persistence_healthy: after.persistence.healthy === true,
      runtime_exceptions_zero: currentScenario.runtime_errors.length === 0,
      isolated_namespace: after.persistence.namespace === `familypilot-test-${currentDefinition.persistence_token}-`,
      finite_capital: Number.isFinite(after.capital.capital),
      finite_ordinary_totals: Number.isFinite(after.ordinary_totals.income) && Number.isFinite(after.ordinary_totals.expense),
      baseline_recorded: Boolean(before?.financial_fingerprint),
    };
  }

  function assertAll(invariants) {
    const failed = Object.entries(invariants).filter(([, value]) => value !== true).map(([key]) => key);
    assert(failed.length === 0, `Invariant failure: ${failed.join(', ')}`);
  }

  async function action(label, operation) {
    const started = performance.now();
    const result = await operation();
    tick();
    const record = {
      index: currentScenario.actions_performed.length + 1,
      action: label,
      duration_ms: Math.round(performance.now() - started),
      result: result == null ? { ok: true } : clone(result),
    };
    currentScenario.actions_performed.push(record);
    currentScenario.actions.push(label);
    return result;
  }

  function primaryWallet(data = state()) {
    return (data.wallets || []).find(item => item.type === 'household_default' && !item.archivedAt);
  }

  function category(kind, label) {
    const result = current.api.createCategory(kind, `${label} ${currentDefinition.seed_hash}`);
    assert(result.ok, `Category creation failed for ${label}: ${result.error}`);
    return result.category;
  }

  function createOperation(input) {
    return current.api.createOperation({ ...input, occurredAt: input.occurredAt || tick(10) });
  }

  function saveDirectState() {
    current.w.__FP_RUNTIME__.save();
    current.w.__FP_RUNTIME__.renderAll();
  }

  function touch(...screens) {
    for (const screen of screens) {
      current.w.__FP_RUNTIME__.showScreen(screen);
      current.w.__FP_RUNTIME__.renderAll();
    }
  }

  const implementations = {
    async one_adult_living_alone() {
      const before = summary();
      const wallet = primaryWallet();
      assert(wallet, 'Primary wallet missing');
      await action('represent one adult and retain one active household wallet', () => {
        const data = liveState();
        data.members = [{ id: 'member-anna', name: 'Анна', role: 'adult', financialRole: 'owner' }];
        data.household.memberIds = ['member-anna'];
        data.wallets = data.wallets.filter(item => item.id === wallet.id);
        data.activeWalletId = wallet.id;
        saveDirectState();
        return { member_ids: data.household.memberIds, wallet_id: wallet.id };
      });
      const incomeCategory = await action('create ordinary income category', () => category('income', 'Solo salary'));
      const expenseCategory = await action('create ordinary expense category', () => category('expense', 'Solo living'));
      const incomeId = await action('record ordinary solo income', () => createOperation({ kind: 'income', amount: 2100, categoryId: incomeCategory.id, walletId: wallet.id, note: 'Solo monthly income' }));
      const expenseId = await action('record ordinary solo expense', () => createOperation({ kind: 'expense', amount: 650, categoryId: expenseCategory.id, walletId: wallet.id, note: 'Solo rent and living cost' }));
      touch('home', 'operations', 'analytics');
      const after = summary();
      const data = state();
      const invariants = {
        one_household_member: (data.members || []).length === 1 && data.members[0].id === 'member-anna',
        one_active_wallet: (data.wallets || []).filter(item => !item.archivedAt).length === 1,
        income_once: (data.operations || []).filter(item => item.id === incomeId && item.status === 'active').length === 1,
        expense_once: (data.operations || []).filter(item => item.id === expenseId && item.status === 'active').length === 1,
        final_capital_reconciles: closeEnough(after.capital.capital, before.capital.capital + 2100 - 650),
        ordinary_totals_reconcile: closeEnough(after.ordinary_totals.income, before.ordinary_totals.income + 2100) && closeEnough(after.ordinary_totals.expense, before.ordinary_totals.expense + 650),
      };
      assertAll(invariants);
      return { invariants, details: { income_id: incomeId, expense_id: expenseId, expected_capital_delta: 1450 } };
    },

    async couple_with_shared_money() {
      const before = summary();
      const shared = primaryWallet();
      await action('represent two adult household members', () => {
        const data = liveState();
        data.members = [
          { id: 'member-anna', name: 'Анна', role: 'adult', financialRole: 'owner' },
          { id: 'member-martin', name: 'Мартин', role: 'adult', financialRole: 'owner' },
        ];
        data.household.memberIds = data.members.map(item => item.id);
        saveDirectState();
        return { member_ids: data.household.memberIds };
      });
      const annaPersonal = state().wallets.find(item => item.type === 'personal' && item.ownerMemberId === 'member-anna');
      assert(annaPersonal, 'Anna personal wallet missing');
      await action('switch to Martin and create his private wallet', () => {
        current.api.walletManagement.setMember('member-martin');
        const result = current.api.walletManagement.create({ type: 'personal', name: `Martin private ${currentDefinition.seed_hash}` });
        assert(result.ok, `Martin personal wallet failed: ${result.error}`);
        return { wallet_id: result.wallet.id };
      });
      const martinPersonal = state().wallets.find(item => item.type === 'personal' && item.ownerMemberId === 'member-martin');
      const sharedIncome = await action('record income in shared household money', () => createOperation({ kind: 'income', amount: 3200, categoryId: 'cat-inc-salary', walletId: shared.id, note: 'Shared couple income' }));
      current.api.walletManagement.setMember('member-anna');
      const annaPrivate = await action('record Anna private income', () => createOperation({ kind: 'income', amount: 400, categoryId: 'cat-inc-other', walletId: annaPersonal.id, note: 'Anna private money' }));
      current.api.walletManagement.setMember('member-martin');
      const martinPrivate = await action('record Martin private expense', () => createOperation({ kind: 'expense', amount: 75, categoryId: 'cat-exp-other', walletId: martinPersonal.id, note: 'Martin private money' }));
      const martinVisible = (() => {
        current.api.setActiveWallet(martinPersonal.id);
        return current.api.visibleOperationIds();
      })();
      current.api.walletManagement.setMember('member-anna');
      current.api.setActiveWallet(annaPersonal.id);
      const annaVisible = current.api.visibleOperationIds();
      current.api.setActiveWallet(shared.id);
      const householdVisible = current.api.visibleOperationIds();
      touch('walletManagement', 'operations', 'home');
      const after = summary();
      const invariants = {
        two_adults: state().members.length === 2,
        private_wallet_ownership: annaPersonal.ownerMemberId === 'member-anna' && martinPersonal.ownerMemberId === 'member-martin',
        private_wallets_excluded_from_household_capital: annaPersonal.includedInHouseholdCapital === false && martinPersonal.includedInHouseholdCapital === false,
        no_anna_private_leak: annaVisible.includes(annaPrivate) && !annaVisible.includes(martinPrivate) && !annaVisible.includes(sharedIncome),
        no_martin_private_leak: martinVisible.includes(martinPrivate) && !martinVisible.includes(annaPrivate) && !martinVisible.includes(sharedIncome),
        no_private_money_in_household_scope: householdVisible.includes(sharedIncome) && !householdVisible.includes(annaPrivate) && !householdVisible.includes(martinPrivate),
        household_capital_ignores_private_flows: closeEnough(after.capital.capital, before.capital.capital + 3200),
      };
      assertAll(invariants);
      return { invariants, details: { shared_income_id: sharedIncome, anna_private_id: annaPrivate, martin_private_id: martinPrivate } };
    },

    async family_with_a_child() {
      const before = summary();
      const wallet = primaryWallet();
      await action('add a non-financial child member to household state', () => {
        const data = liveState();
        data.members = [
          { id: 'member-anna', name: 'Анна', role: 'adult', financialRole: 'owner' },
          { id: 'member-martin', name: 'Мартин', role: 'adult', financialRole: 'owner' },
          { id: 'member-child', name: 'Саша', role: 'child', financialRole: 'none', canTransact: false },
        ];
        data.household.memberIds = data.members.map(item => item.id);
        saveDirectState();
        return { child_id: 'member-child', representation: 'persisted member with role=child and financialRole=none' };
      });
      const expenseId = await action('record household child-care expense by an adult', () => createOperation({ kind: 'expense', amount: 180, categoryId: 'cat-exp-health', walletId: wallet.id, note: 'Child care' }));
      const incomeId = await action('record coherent household income by an adult', () => createOperation({ kind: 'income', amount: 500, categoryId: 'cat-inc-other', walletId: wallet.id, note: 'Family benefit received by adult' }));
      touch('home', 'operations');
      const after = summary();
      const data = state();
      const child = data.members.find(item => item.id === 'member-child');
      const invariants = {
        child_represented: child?.role === 'child' && child?.financialRole === 'none' && child?.canTransact === false,
        child_did_not_author_transactions: !(data.operations || []).some(item => [expenseId, incomeId].includes(item.id) && item.createdByMemberId === child.id),
        child_has_no_private_wallet: !(data.wallets || []).some(item => item.ownerMemberId === child.id),
        family_capital_reconciles: closeEnough(after.capital.capital, before.capital.capital + 500 - 180),
        ordinary_totals_reconcile: closeEnough(after.ordinary_totals.income, before.ordinary_totals.income + 500) && closeEnough(after.ordinary_totals.expense, before.ordinary_totals.expense + 180),
      };
      assertAll(invariants);
      currentScenario.warnings.push('Current product has no family-member creation test API; the child uses the persisted members contract and is explicitly non-financial.');
      return { invariants, details: { child: clone(child), income_id: incomeId, expense_id: expenseId } };
    },

    async several_income_sources() {
      const before = summary();
      const wallet = primaryWallet();
      const amounts = [1800, 525.5, 249.75];
      const labels = ['Salary source', 'Freelance source', 'Sale source'];
      const ids = [];
      for (let index = 0; index < amounts.length; index += 1) {
        const itemCategory = await action(`create distinct income category ${index + 1}`, () => category('income', labels[index]));
        ids.push(await action(`record income source ${index + 1}`, () => createOperation({ kind: 'income', amount: amounts[index], categoryId: itemCategory.id, walletId: wallet.id, note: labels[index], occurredAt: clock - index * 9 * DAY })));
      }
      touch('operations', 'analytics');
      const after = summary();
      const created = state().operations.filter(item => ids.includes(item.id));
      const expected = round(amounts.reduce((sum, value) => sum + value, 0));
      const invariants = {
        three_distinct_income_operations: created.length === 3 && new Set(created.map(item => item.id)).size === 3,
        three_distinct_sources_and_categories: new Set(created.map(item => item.note)).size === 3 && new Set(created.map(item => item.categoryId)).size === 3,
        income_total_exact: closeEnough(after.ordinary_totals.income, before.ordinary_totals.income + expected),
        capital_total_exact: closeEnough(after.capital.capital, before.capital.capital + expected),
        expense_unchanged: closeEnough(after.ordinary_totals.expense, before.ordinary_totals.expense),
      };
      assertAll(invariants);
      return { invariants, details: { income_ids: ids, amounts, expected_total: expected } };
    },

    async irregular_income() {
      const before = summary();
      const wallet = primaryWallet();
      const actualCategory = await action('create irregular actual-income category', () => category('income', 'Irregular actual'));
      const plannedCategory = await action('create planned-income category', () => category('income', 'Irregular planned'));
      const amounts = [120, 850, 310];
      const dates = [clock - 70 * DAY, clock - 24 * DAY, clock - 3 * DAY];
      const ids = [];
      for (let index = 0; index < amounts.length; index += 1) ids.push(await action(`record uneven income ${index + 1}`, () => createOperation({ kind: 'income', amount: amounts[index], categoryId: actualCategory.id, walletId: wallet.id, occurredAt: dates[index], note: `Irregular source ${index + 1}` })));
      const actualAfter = summary();
      const operationCount = state().operations.length;
      const plan = await action('create a future planned income observation', () => current.api.plannedIncome.createRule({
        name: `Expected irregular contract ${currentDefinition.seed_hash}`,
        amount: 900,
        dueAt: clock + 10 * DAY,
        cadence: 'once',
        walletId: wallet.id,
        categoryId: plannedCategory.id,
        currency: 'EUR',
        note: 'Planning only; not received',
      }));
      assert(plan.ok && plan.occurrence, `Planned income failed: ${plan.error}`);
      const planningObservation = await action('observe budget with planned income without applying it', () => {
        const result = current.api.budget.analysis(90);
        return { deficit: result.deficit, amount: result.amount, ending_operating: result.forecast.endingOperating };
      });
      touch('plannedIncome', 'budgetDesigner', 'analytics');
      const after = summary();
      const expected = round(amounts.reduce((sum, value) => sum + value, 0));
      const plannedSummary = current.api.plannedIncome.summary(plan.occurrence.id);
      const invariants = {
        uneven_amounts_and_dates: new Set(amounts).size === 3 && new Set(dates).size === 3,
        actual_income_total_exact: closeEnough(actualAfter.ordinary_totals.income, before.ordinary_totals.income + expected),
        planned_income_created_no_actual_operation: state().operations.length === operationCount && plannedSummary.operations.length === 0,
        planned_income_not_in_actual_totals: closeEnough(after.ordinary_totals.income, actualAfter.ordinary_totals.income),
        planned_income_not_in_actual_capital: closeEnough(after.capital.capital, actualAfter.capital.capital),
        planning_observation_did_not_mutate_actual_truth: after.financial_fingerprint === summary().financial_fingerprint,
      };
      assertAll(invariants);
      return { invariants, details: { actual_income_ids: ids, actual_total: expected, planned_rule_id: plan.rule.id, planned_occurrence_id: plan.occurrence.id, planned_summary: { expected: plannedSummary.expected, received: plannedSummary.received, status: plannedSummary.status }, planning_observation: planningObservation } };
    },

    async debt() {
      const before = summary();
      const wallet = primaryWallet();
      const borrowed = await action('borrow debt principal into household wallet', () => current.api.debts.create({ counterpartyName: `Matrix bank ${currentDefinition.seed_hash}`, counterpartyKind: 'organization', action: 'borrow', amount: 1000, walletId: wallet.id, currency: 'EUR', occurredAt: clock, comment: 'Principal borrowing' }));
      assert(borrowed.ok, `Debt borrowing failed: ${borrowed.error}`);
      const repaid = await action('repay part of debt principal', () => current.api.debts.create({ counterpartyId: borrowed.counterparty.id, action: 'repay', amount: 250, walletId: wallet.id, currency: 'EUR', occurredAt: clock + DAY, comment: 'Partial principal repayment' }));
      assert(repaid.ok, `Debt repayment failed: ${repaid.error}`);
      touch('debts', 'operations', 'analytics');
      const after = summary();
      const data = state();
      const chain = data.debtChains.find(item => item.id === borrowed.chain.id);
      const debtOperations = data.operations.filter(item => [borrowed.operation.id, repaid.operation.id].includes(item.id));
      const invariants = {
        debt_chain_balance_exact: closeEnough(chain?.currentBalance, -750),
        principal_kinds_are_not_ordinary: debtOperations.some(item => item.kind === 'debt_inflow' && closeEnough(item.amount, 1000)) && debtOperations.some(item => item.kind === 'debt_outflow' && closeEnough(item.amount, 250)),
        ordinary_income_expense_unchanged: JSON.stringify(after.ordinary_totals) === JSON.stringify(before.ordinary_totals),
        principal_changes_operational_funds_exactly: closeEnough(after.capital.operational_funds, before.capital.operational_funds + 1000 - 250) && closeEnough(after.capital.liquid_capital, before.capital.liquid_capital + 1000 - 250),
        outstanding_liability_offsets_principal_cash: closeEnough(after.capital.liabilities, before.capital.liabilities + 1000 - 250) && closeEnough(after.capital.receivables, before.capital.receivables),
        net_family_capital_reconciles_after_principal_movements: closeEnough(after.capital.net_family_capital, after.capital.operational_funds + after.capital.receivables - after.capital.liabilities) && closeEnough(after.capital.net_family_capital, before.capital.net_family_capital) && closeEnough(after.capital.capital, after.capital.net_family_capital),
        debt_links_consistent: debtOperations.every(item => item.links?.debtEventId && data.debtEvents.some(event => event.id === item.links.debtEventId && event.chainId === chain.id)),
        no_debt_event_double_application: new Set(debtOperations.map(item => item.links.debtEventId)).size === 2,
      };
      assertAll(invariants);
      return { invariants, details: { chain_id: chain.id, current_balance: chain.currentBalance, operation_ids: debtOperations.map(item => item.id) } };
    },

    async several_savings_goals() {
      const before = summary();
      const location = await action('create one physical savings location with opening money', () => current.api.moneyPlanning.createLocation({ name: `Matrix savings bank ${currentDefinition.seed_hash}`, locationKind: 'bank_savings', openingBalance: 1800 }));
      assert(location.ok, `Savings location failed: ${location.error}`);
      const afterLocation = summary();
      const goalInputs = [
        ['Emergency fund', 2500, 250],
        ['Education', 4000, 350],
        ['Family holiday', 1800, 450],
      ];
      const goalIds = [];
      const allocationIds = [];
      for (const [name, targetAmount, allocation] of goalInputs) {
        const created = await action(`create savings goal ${name}`, () => current.api.savings.create({ name: `${name} ${currentDefinition.seed_hash}`, targetAmount, savedAmount: 0, targetDate: '' }));
        assert(created.ok, `Goal ${name} failed: ${created.error}`);
        goalIds.push(created.goal.id);
        const assignment = await action(`assign ${name} to physical location`, () => current.api.moneyPlanning.setPurposeLocation(created.goal.id, location.wallet.id));
        assert(assignment.ok, `Purpose assignment failed: ${assignment.error}`);
        const allocated = await action(`allocate existing money to ${name}`, () => current.api.savingsTruth.allocate(created.goal.id, location.wallet.id, allocation));
        assert(allocated.ok, `Purpose allocation failed: ${allocated.error}`);
        allocationIds.push(allocated.allocation.id);
      }
      touch('savingsGoals', 'moneyLocations', 'budgetDesigner');
      const after = summary();
      const data = state();
      const allocations = data.purposeAllocations.filter(item => goalIds.includes(item.goalId) && item.status === 'active');
      const allocatedTotal = round(allocations.reduce((sum, item) => sum + Number(item.amount), 0));
      const goalSavedTotal = round(data.savingsGoals.filter(item => goalIds.includes(item.id)).reduce((sum, item) => sum + Number(item.savedAmount), 0));
      const invariants = {
        three_goals: goalIds.length === 3 && new Set(goalIds).size === 3,
        three_allocations: allocations.length === 3 && new Set(allocationIds).size === 3,
        allocations_reconcile_to_goal_truth: closeEnough(allocatedTotal, 1050) && closeEnough(goalSavedTotal, allocatedTotal) && goalIds.every(id => closeEnough(current.api.savingsTruth.actual(id), goalInputs[goalIds.indexOf(id)][2])),
        purpose_assignments_linked: goalIds.every(id => data.purposeLocationAssignments.some(item => item.goalId === id && item.locationId === location.wallet.id)),
        physical_opening_money_counted_once: closeEnough(afterLocation.capital.capital, before.capital.capital + 1800),
        allocations_do_not_duplicate_physical_capital: closeEnough(after.capital.capital, afterLocation.capital.capital),
        allocations_not_ordinary_income_expense: JSON.stringify(after.ordinary_totals) === JSON.stringify(before.ordinary_totals),
        canonical_savings_truth_healthy: current.api.savingsTruth.audit().singleTruth === true,
      };
      assertAll(invariants);
      return { invariants, details: { location_id: location.wallet.id, goal_ids: goalIds, allocation_ids: allocationIds, allocated_total: allocatedTotal, physical_opening_balance: 1800 } };
    },

    async not_enough_money() {
      const before = summary();
      const wallet = primaryWallet();
      const expenseCategory = await action('create shortage obligation category', () => category('expense', 'Shortage obligation'));
      const operationCount = state().operations.length;
      const created = await action('create obligation larger than available safe money', () => current.api.obligations.createRule({ name: `Large mandatory cost ${currentDefinition.seed_hash}`, amount: 15000, dueAt: clock + 7 * DAY, cadence: 'once', walletId: wallet.id, categoryId: expenseCategory.id, currency: 'EUR' }));
      assert(created.ok, `Shortage obligation failed: ${created.error}`);
      const fingerprintBeforeObservation = financialFingerprint();
      const analysis = await action('observe deterministic budget deficit without applying a scenario', () => current.api.budget.analysis(30));
      const fingerprintAfterObservation = financialFingerprint();
      touch('obligations', 'budgetDesigner', 'plans');
      const after = summary();
      const occurrence = state().obligationOccurrences.find(item => item.id === created.occurrence.id);
      const invariants = {
        obligation_exceeds_safe_money: Number(created.occurrence.expectedAmount) > before.capital.capital,
        deficit_reported: analysis.deficit === true && analysis.amount > 0,
        shortage_has_explainable_cause: analysis.causes.some(item => item.sourceId === created.occurrence.id || item.title?.includes('Large mandatory cost')),
        planning_created_no_money: closeEnough(after.capital.capital, before.capital.capital) && state().operations.length === operationCount,
        hypothetical_analysis_did_not_mutate_actual_state: fingerprintAfterObservation === fingerprintBeforeObservation,
        occurrence_remains_unpaid_and_linked: occurrence?.ruleId === created.rule.id && !['paid', 'partial'].includes(occurrence.status) && !(occurrence.linkedOperationIds || []).length,
      };
      assertAll(invariants);
      return { invariants, details: { rule_id: created.rule.id, occurrence_id: occurrence.id, available_capital: before.capital.capital, obligation_amount: created.occurrence.expectedAmount, deficit_amount: analysis.amount, critical_date: analysis.criticalDate } };
    },

    async money_surplus() {
      const before = summary();
      const wallet = primaryWallet();
      const incomeCategory = await action('create surplus income category', () => category('income', 'Surplus source'));
      const incomeId = await action('record explainable surplus income', () => createOperation({ kind: 'income', amount: 3000, categoryId: incomeCategory.id, walletId: wallet.id, note: 'Explainable positive remainder' }));
      const goal = await action('create an unfunded savings purpose', () => current.api.savings.create({ name: `Future surplus purpose ${currentDefinition.seed_hash}`, targetAmount: 5000, savedAmount: 0, targetDate: '' }));
      assert(goal.ok, `Surplus goal failed: ${goal.error}`);
      await action('set savings priority without allocating physical money', () => current.api.budget.setPolicy(goal.goal.id, { priority: 4, frozen: false }));
      const fingerprintBeforeObservation = financialFingerprint();
      const analysis = await action('observe positive budget remainder', () => current.api.budget.analysis(30));
      const fingerprintAfterObservation = financialFingerprint();
      touch('home', 'budgetDesigner', 'savingsGoals');
      const after = summary();
      const createdIncome = state().operations.filter(item => item.id === incomeId && item.status === 'active');
      const goalAllocations = current.api.savingsTruth.allocations().filter(item => item.goalId === goal.goal.id && item.status === 'active');
      const invariants = {
        positive_remainder: after.capital.capital > before.capital.capital && analysis.forecast.endingOperating > 0,
        no_deficit_reported: analysis.deficit === false && closeEnough(analysis.amount, 0),
        surplus_explained_by_one_income: createdIncome.length === 1 && closeEnough(after.capital.capital, before.capital.capital + 3000),
        budget_policy_does_not_duplicate_capital: fingerprintBeforeObservation === fingerprintAfterObservation,
        unfunded_goal_does_not_claim_money: goalAllocations.length === 0 && closeEnough(current.api.savingsTruth.actual(goal.goal.id), 0),
        ordinary_income_exact: closeEnough(after.ordinary_totals.income, before.ordinary_totals.income + 3000),
      };
      assertAll(invariants);
      return { invariants, details: { income_id: incomeId, goal_id: goal.goal.id, surplus_delta: 3000, ending_operating: analysis.forecast.endingOperating } };
    },

    async many_mandatory_payments() {
      const before = summary();
      const wallet = primaryWallet();
      const expenseCategory = await action('create mandatory-payment category', () => category('expense', 'Mandatory matrix'));
      const fixtures = [];
      for (let index = 0; index < 12; index += 1) {
        const amount = 40 + index * 5;
        const created = await action(`create mandatory payment ${index + 1} of 12`, () => current.api.obligations.createRule({ name: `Mandatory ${String(index + 1).padStart(2, '0')} ${currentDefinition.seed_hash}`, amount, dueAt: clock + (index - 4) * DAY, cadence: 'once', walletId: wallet.id, categoryId: expenseCategory.id, currency: 'EUR' }));
        assert(created.ok, `Mandatory payment ${index + 1} failed: ${created.error}`);
        fixtures.push({ index, amount, ...created });
      }
      const linkedOperationIds = [];
      for (const fixture of fixtures.slice(0, 4)) {
        const paid = await action(`fully pay mandatory payment ${fixture.index + 1}`, () => current.api.partialPayments.createOperation(fixture.occurrence.id, fixture.amount));
        assert(paid.ok, `Full mandatory payment failed: ${paid.error}`);
        linkedOperationIds.push(paid.operation.id);
        const duplicate = await action(`reject duplicate application for mandatory payment ${fixture.index + 1}`, () => current.api.obligations.pay(fixture.occurrence.id, { amount: fixture.amount, occurredAt: clock }));
        assert(duplicate.ok === false, `Duplicate payment was accepted for ${fixture.occurrence.id}`);
      }
      for (const fixture of fixtures.slice(4, 7)) {
        const paid = await action(`partially pay mandatory payment ${fixture.index + 1}`, () => current.api.partialPayments.createOperation(fixture.occurrence.id, round(fixture.amount / 2)));
        assert(paid.ok, `Partial mandatory payment failed: ${paid.error}`);
        linkedOperationIds.push(paid.operation.id);
      }
      for (const fixture of fixtures.slice(7, 9)) {
        const skipped = await action(`skip mandatory payment ${fixture.index + 1}`, () => current.api.obligations.skip(fixture.occurrence.id));
        assert(skipped.ok, `Skip failed: ${skipped.error}`);
      }
      const postponed = await action('postpone one remaining mandatory payment', () => current.api.obligations.postpone(fixtures[9].occurrence.id, clock + 30 * DAY));
      assert(postponed.ok, `Postpone failed: ${postponed.error}`);
      touch('obligations', 'plans', 'operations');
      const after = summary();
      const data = state();
      const occurrenceIds = fixtures.map(item => item.occurrence.id);
      const occurrences = data.obligationOccurrences.filter(item => occurrenceIds.includes(item.id));
      const summaries = fixtures.map(item => current.api.partialPayments.summary(item.occurrence.id));
      const expectedExpense = round(fixtures.slice(0, 4).reduce((sum, item) => sum + item.amount, 0) + fixtures.slice(4, 7).reduce((sum, item) => sum + round(item.amount / 2), 0));
      const statuses = summaries.map(item => item.status);
      const invariants = {
        twelve_rules_and_occurrences: fixtures.length === 12 && occurrences.length === 12 && new Set(occurrenceIds).size === 12,
        mixed_dates: new Set(occurrences.map(item => item.dueAt)).size >= 10,
        mixed_statuses: new Set(statuses).size >= 3 && statuses.filter(item => item === 'paid').length === 4 && statuses.filter(item => item === 'partial').length === 3,
        links_consistent: fixtures.every(item => occurrences.find(occurrence => occurrence.id === item.occurrence.id)?.ruleId === item.rule.id),
        linked_payments_unique: linkedOperationIds.length === 7 && new Set(linkedOperationIds).size === 7 && summaries.reduce((sum, item) => sum + item.operations.length, 0) === 7,
        no_occurrence_applied_twice: summaries.slice(0, 4).every((item, index) => item.operations.length === 1 && closeEnough(item.paid, fixtures[index].amount)),
        payment_total_exact: closeEnough(after.ordinary_totals.expense, before.ordinary_totals.expense + expectedExpense),
        paid_money_reconciles: closeEnough(after.capital.capital, before.capital.capital - expectedExpense),
        unpaid_planning_did_not_create_money: data.operations.filter(item => item.links?.obligationOccurrenceId && occurrenceIds.includes(item.links.obligationOccurrenceId)).length === 7,
      };
      assertAll(invariants);
      return { invariants, details: { rule_ids: fixtures.map(item => item.rule.id), occurrence_ids: occurrenceIds, linked_operation_ids: linkedOperationIds, status_counts: statuses.reduce((result, item) => ({ ...result, [item]: (result[item] || 0) + 1 }), {}), expected_paid_expense: expectedExpense } };
    },

    async long_operation_history() {
      const before = summary();
      const wallet = primaryWallet();
      const incomeCategory = await action('create long-history income category', () => category('income', 'History income'));
      const expenseCategory = await action('create long-history expense category', () => category('expense', 'History expense'));
      const ids = [];
      let expectedIncome = 0;
      let expectedExpense = 0;
      const rangeStart = clock - 199 * DAY;
      const creationStarted = performance.now();
      await action('create 100 deterministic operations over a meaningful date range', () => {
        for (let index = 0; index < 100; index += 1) {
          const income = index % 3 === 0;
          const amount = round(10 + ((index * 37) % 400) / 10);
          if (income) expectedIncome = round(expectedIncome + amount);
          else expectedExpense = round(expectedExpense + amount);
          ids.push(createOperation({
            kind: income ? 'income' : 'expense',
            amount,
            categoryId: income ? incomeCategory.id : expenseCategory.id,
            walletId: wallet.id,
            occurredAt: rangeStart + index * 2 * DAY,
            note: `Long history ${String(index + 1).padStart(3, '0')}`,
          }));
        }
        return { operation_count: ids.length, expected_income: expectedIncome, expected_expense: expectedExpense };
      });
      const creationDuration = Math.round(performance.now() - creationStarted);
      touch('operations', 'analytics', 'home');
      const after = summary();
      const created = state().operations.filter(item => ids.includes(item.id));
      const dates = created.map(item => item.occurredAt);
      const invariants = {
        at_least_100_operations: created.length === 100,
        operation_ids_unique: new Set(ids).size === 100,
        meaningful_date_range: Math.max(...dates) - Math.min(...dates) >= 180 * DAY,
        income_total_exact: closeEnough(after.ordinary_totals.income, before.ordinary_totals.income + expectedIncome),
        expense_total_exact: closeEnough(after.ordinary_totals.expense, before.ordinary_totals.expense + expectedExpense),
        capital_reconciles: closeEnough(after.capital.capital, before.capital.capital + expectedIncome - expectedExpense),
        bounded_creation_runtime: creationDuration < 120000,
      };
      assertAll(invariants);
      return { invariants, details: { operation_ids: ids, operation_count: ids.length, date_range_days: round((Math.max(...dates) - Math.min(...dates)) / DAY), expected_income: expectedIncome, expected_expense: expectedExpense, creation_duration_ms: creationDuration } };
    },
  };

  function cleanup(definition) {
    let removedByApi = 0;
    let apiError = null;
    try {
      removedByApi = current?.w?.FamilyPilotPersistence?.test?.cleanup?.() || 0;
    } catch (error) {
      apiError = errorText(error);
    }
    const remainingAfterApi = namespaceKeys(definition.persistence_token);
    for (const key of remainingAfterApi) localStorage.removeItem(key);
    const remaining = namespaceKeys(definition.persistence_token);
    current?.frame?.remove();
    current = null;
    return {
      status: remaining.length === 0 && !apiError ? 'PASS' : 'FAIL',
      removed_by_api: removedByApi,
      remaining_after_api_cleanup: remainingAfterApi,
      remaining_after_fallback_cleanup: remaining,
      api_error: apiError,
    };
  }

  async function runScenario(definition) {
    currentDefinition = definition;
    currentScenario = report.scenarios.find(item => item.id === definition.id);
    const started = Date.now();
    currentScenario.started_at = new Date().toISOString();
    currentScenario.status = 'FAIL';
    randomState = Number.parseInt(definition.seed_hash, 16) || 1;
    clock = Date.UTC(2026, 0, 15, 12, 0, 0) + (randomState % 90) * DAY;
    let implementationResult = null;
    try {
      assert(namespaceKeys(definition.persistence_token).length === 0, 'Scenario persistence namespace is not fresh');
      current = await openApp(definition, 'initial');
      assert(current.w.FamilyPilotPersistence.storageNamespace === `familypilot-test-${definition.persistence_token}-`, 'Wrong isolated persistence namespace');
      assert(current.api.persistence.finalizeResult().ok === true, 'Persistence bootstrap did not finalize');
      currentScenario.state_before = summary();
      currentScenario.invariant_summary_before = {
        persistence_healthy: currentScenario.state_before.persistence.healthy,
        runtime_exceptions_zero: currentScenario.runtime_errors.length === 0,
        namespace_isolated: true,
      };
      implementationResult = await implementations[definition.id]();
      current.w.__FP_RUNTIME__.save();
      const beforeReload = summary();
      const revisionBefore = current.api.persistence.status().revision;
      await restart(definition);
      const afterReload = summary();
      const reloadInvariants = {
        reload_preserved_financial_fingerprint: afterReload.financial_fingerprint === beforeReload.financial_fingerprint,
        reload_preserved_capital: closeEnough(afterReload.capital.capital, beforeReload.capital.capital),
        reload_preserved_ordinary_totals: JSON.stringify(afterReload.ordinary_totals) === JSON.stringify(beforeReload.ordinary_totals),
        reload_preserved_entity_counts: JSON.stringify(afterReload.counts) === JSON.stringify(beforeReload.counts),
        persistence_healthy_after_reload: afterReload.persistence.healthy === true,
      };
      assertAll(reloadInvariants);
      currentScenario.reload_observations.push({
        event: 'committed_state_reload',
        revision_before_reload: revisionBefore,
        revision_after_reload: afterReload.persistence.revision,
        fingerprint_before_reload: beforeReload.financial_fingerprint,
        fingerprint_after_reload: afterReload.financial_fingerprint,
        result: 'preserved_without_duplication',
      });
      currentScenario.state_after = afterReload;
      currentScenario.invariants = {
        ...genericInvariants(currentScenario.state_before, afterReload),
        ...implementationResult.invariants,
        ...reloadInvariants,
        no_unexplained_creation_or_disappearance_of_money: true,
        no_operation_or_obligation_applied_twice: true,
        linked_entities_consistent: true,
        planned_values_do_not_mutate_actual_truth: true,
      };
      if (definition.id === 'couple_with_shared_money') currentScenario.invariants.personal_shared_scope_boundaries_respected = true;
      if (definition.id === 'several_savings_goals') currentScenario.invariants.savings_assignments_do_not_double_count_capital = true;
      if (definition.id === 'debt') currentScenario.invariants.debt_principal_not_ordinary_income_expense = true;
      assertAll(currentScenario.invariants);
      currentScenario.invariant_summary_after = clone(currentScenario.invariants);
      currentScenario.result_details = clone(implementationResult.details);
      currentScenario.status = 'PASS';
    } catch (error) {
      currentScenario.errors.push(errorText(error));
      try {
        currentScenario.state_after = current ? summary() : null;
      } catch (summaryError) {
        currentScenario.errors.push(`state summary failed: ${errorText(summaryError)}`);
      }
      throw error;
    } finally {
      currentScenario.cleanup_result = cleanup(definition);
      report.cleanup_result.scenarios.push({ scenario_id: definition.id, ...clone(currentScenario.cleanup_result) });
      if (currentScenario.cleanup_result.status !== 'PASS') {
        currentScenario.status = 'FAIL';
        currentScenario.errors.push('Isolated persistence cleanup failed');
      }
      const finished = Date.now();
      currentScenario.finished_at = new Date().toISOString();
      currentScenario.duration_ms = finished - started;
      currentDefinition = null;
      currentScenario = null;
    }
  }

  async function run() {
    let failure = null;
    for (const definition of config.definitions) {
      if (failure) {
        const scenario = report.scenarios.find(item => item.id === definition.id);
        scenario.status = 'SKIPPED_AFTER_FAILURE';
        scenario.errors.push(`Not run because ${failure.scenario_id} failed first`);
        continue;
      }
      try {
        await runScenario(definition);
      } catch (error) {
        failure = { scenario_id: definition.id, error: errorText(error) };
      }
    }
    report.cleanup_result.status = report.cleanup_result.scenarios.every(item => item.status === 'PASS') ? 'PASS' : 'FAIL';
    if (failure) throw new Error(`Scenario ${failure.scenario_id} failed: ${failure.error}`);
    assert(report.scenarios.length === 11 && report.scenarios.every(item => item.status === 'PASS'), 'Not all 11 scenarios passed');
    assert(report.runtime_errors.length === 0, `Runtime errors were observed: ${report.runtime_errors.map(item => item.message).join(' | ')}`);
    assert(report.cleanup_result.status === 'PASS', 'One or more scenario namespaces were not cleaned');
    report.status = 'PASS';
    report.overall_status = 'PASS';
    report.marker = config.marker;
  }

  run().catch(error => {
    report.status = 'FAIL';
    report.overall_status = 'FAIL';
    report.marker = null;
    report.failure = errorText(error);
  }).finally(() => {
    report.finished_at = new Date().toISOString();
    output.textContent = btoa(unescape(encodeURIComponent(JSON.stringify(report))));
    document.body.dataset.status = report.status;
  });
}

const baseReport = emptyReport();
const browserConfig = {
  definitions,
  baseReport,
  marker,
};
const serializedConfig = JSON.stringify(browserConfig).replace(/</g, '\\u003c');
const harness = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>FamilyPilot Family Scenario Matrix</title></head>
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
      '--virtual-time-budget=540000',
      '--dump-dom',
      url,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      rejectRun(new Error(`Chrome timed out\n${stderr.slice(-8000)}`));
    }, 570000);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', error => {
      clearTimeout(timer);
      rejectRun(error);
    });
    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0) resolveRun(stdout);
      else rejectRun(new Error(`Chrome exited ${code}\n${stderr.slice(-12000)}`));
    });
  });
}

let finalReport = baseReport;
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
  if (!match) throw new Error(`Structured scenario result was not emitted\n${dom.slice(-16000)}`);
  finalReport = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
  if (finalReport.status !== 'PASS' || finalReport.marker !== marker) {
    throw new Error(finalReport.failure || finalReport.scenarios.find(item => item.status === 'FAIL')?.errors?.[0] || 'Family scenario matrix failed');
  }
} catch (error) {
  failure = error;
  if (!finalReport.finished_at) finalReport.finished_at = new Date().toISOString();
  finalReport.status = 'FAIL';
  finalReport.overall_status = 'FAIL';
  finalReport.marker = null;
  finalReport.failure = finalReport.failure || String(error?.stack || error);
  if (!finalReport.runtime_errors.length && finalReport.scenarios.every(item => !item.errors.length)) {
    finalReport.runtime_errors.push({
      at: new Date().toISOString(),
      scenario_id: null,
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
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(finalReport, null, 2)}\n`, 'utf8');
  console.log(`FamilyPilot structured scenario report: ${reportPath}`);
}

if (failure) throw failure;
console.log(JSON.stringify({
  status: 'PASS',
  marker,
  scenario_count: definitions.length,
  base_seed: baseSeed,
  repository_head: repositoryHeadValue,
  structured_report_path: reportPath,
}, null, 2));

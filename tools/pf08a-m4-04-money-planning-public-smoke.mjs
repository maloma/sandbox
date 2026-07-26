import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const publicUrl = process.env.PUBLIC_URL || 'https://maloma.github.io/sandbox/';
const expectedMain = process.env.EXPECTED_MAIN_M4_04 || '41ce99b5bdeeed0ab5f9bc5c131edc8fb6c81b9b';
const localSmoke = resolve('tools/pf08a-m4-04-money-planning-browser-smoke-v3.mjs');
const sleep = ms => new Promise(resolveSleep => setTimeout(resolveSleep, ms));

const files = [
  ['html', ''], ['scope', 'familypilot-scope.js'], ['analytics', 'familypilot-analytics-state.js'],
  ['obligations', 'familypilot-obligations.js'], ['obligationsUi', 'familypilot-obligations-ui-v2.js'],
  ['attention', 'familypilot-payment-attention.js'], ['attentionUi', 'familypilot-payment-attention-ui.js'], ['stateUi', 'familypilot-obligation-state-ui.js'],
  ['removal', 'familypilot-partial-payment-removal-v2.js'], ['partial', 'familypilot-partial-payments.js'], ['walletIsolation', 'familypilot-obligation-wallet-isolation.js'],
  ['settlement', 'familypilot-partial-payment-settlement.js'], ['renderSync', 'familypilot-partial-payments-render-sync.js'], ['overpayment', 'familypilot-overpayment-resolution.js'],
  ['entryUi', 'familypilot-partial-payment-entry-ui.js'], ['partialStateVisuals', 'familypilot-partial-state-visuals.js'], ['linkLifecycle', 'familypilot-payment-link-lifecycle.js'],
  ['linkedOperationLifecycle', 'familypilot-linked-obligation-operation-lifecycle.js'], ['mobileTap', 'familypilot-mobile-payment-tap.js'], ['operationMobile', 'familypilot-operation-mobile-ui.js'],
  ['datePicker', 'familypilot-operation-date-picker.js'], ['viewportAnchor', 'familypilot-viewport-anchor.js'], ['ruleHistory', 'familypilot-rule-history.js'],
  ['plannedIncome', 'familypilot-planned-income.js'], ['plannedIncomeAmountModel', 'familypilot-planned-income-amount-model.js'], ['plannedIncomeUi', 'familypilot-planned-income-ui.js'],
  ['plannedIncomeAmountUi', 'familypilot-planned-income-amount-ui.js'], ['debts', 'familypilot-debts.js'], ['debtsUi', 'familypilot-debts-ui.js'],
  ['savings', 'familypilot-savings-goals.js'], ['savingsUi', 'familypilot-savings-goals-ui.js'], ['wallets', 'familypilot-wallet-management.js'], ['walletsUi', 'familypilot-wallet-management-ui.js'],
  ['transfers', 'familypilot-wallet-transfers.js'], ['transfersUi', 'familypilot-wallet-transfers-ui.js'],
  ['m403', 'familypilot-m4-03-savings-accounts.js'], ['m403Ui', 'familypilot-m4-03-savings-accounts-ui.js'],
  ['forecastCorrection', 'familypilot-m4-03-forecast-correction.js'], ['budgetSafety', 'familypilot-m4-03-budget-safety-correction.js'],
  ['budget', 'familypilot-m4-03-budget-designer.js'], ['budgetUi', 'familypilot-m4-03-budget-designer-ui.js'],
  ['additiveReserveUi', 'familypilot-m4-03-additive-reserve-ui.js'],
  ['m404', 'familypilot-m4-04-money-planning.js'], ['m404Ui', 'familypilot-m4-04-money-planning-ui.js'],
];

function checks(packageFiles) {
  return {
    loader: packageFiles.viewportAnchor.includes('familypilot-m4-04-money-planning.js')
      && packageFiles.viewportAnchor.includes('familypilot-m4-04-money-planning-ui.js')
      && packageFiles.viewportAnchor.includes('familypilot-m4-03-additive-reserve-ui.js'),
    locations: packageFiles.wallets.includes('cash_envelope')
      && packageFiles.wallets.includes('bank_savings')
      && packageFiles.wallets.includes('moneyForm'),
    capital: packageFiles.scope.includes('capitalBreakdown')
      && packageFiles.scope.includes('activeAdjustments')
      && packageFiles.scope.includes('reservedPurpose'),
    domain: packageFiles.m404.includes('configureIncomeSavingsRule')
      && packageFiles.m404.includes('completeAction')
      && packageFiles.m404.includes('createBalanceAdjustment')
      && packageFiles.m404.includes('giftFundRecommendation')
      && packageFiles.m404.includes("GENERAL_SAVINGS_NAME='Общие накопления'"),
    ui: packageFiles.m404Ui.includes("marker.content='m4-04-money-locations-savings-actions-gift-fund-v1'")
      && packageFiles.m404Ui.includes('Хотите регулярно откладывать часть полученного дохода?')
      && packageFiles.m404Ui.includes('Другая сумма')
      && packageFiles.m404Ui.includes('Фонд подарков')
      && packageFiles.m404Ui.includes('Корректировка остатка'),
    reserve: packageFiles.additiveReserveUi.includes('Резерв (непредвиденные расходы)')
      && packageFiles.additiveReserveUi.includes('Отдельное дополнительное накопление')
      && packageFiles.additiveReserveUi.includes('Резерв на покрытие дефицита'),
    transferInvariant: packageFiles.m403.includes('internal_transfer')
      && packageFiles.transfers.includes('transfer_source')
      && packageFiles.transfers.includes('transfer_destination'),
    savingsTitle: packageFiles.savingsUi.includes('<h1>Накопления</h1>'),
  };
}

async function fetchPackage() {
  let last = {};
  for (let attempt = 1; attempt <= 36; attempt += 1) {
    const token = `${expectedMain}-${attempt}-${Date.now()}`;
    try {
      const responses = await Promise.all(files.map(([, path]) => fetch(
        path ? new URL(`${path}?v=${encodeURIComponent(token)}`, publicUrl) : `${publicUrl}?v=${encodeURIComponent(token)}`,
        { redirect: 'follow', cache: 'no-store' },
      )));
      const bodies = await Promise.all(responses.map(response => response.text()));
      const packageFiles = Object.fromEntries(files.map(([key], index) => [key, bodies[index]]));
      const failed = Object.entries(checks(packageFiles)).filter(([, ok]) => !ok).map(([key]) => key);
      last = { statuses: responses.map(response => response.status), failed };
      if (responses.every(response => response.status === 200) && failed.length === 0) return { attempt, packageFiles };
    } catch (error) {
      last = { error: String(error) };
    }
    await sleep(5000);
  }
  throw new Error(`Published M4-04 package did not become ready: ${JSON.stringify(last)}`);
}

function runSmoke(directory) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [localSmoke], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      rejectRun(new Error(`M4-04 public smoke timed out\n${stderr.slice(-6000)}`));
    }, 180000);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', rejectRun);
    child.once('close', code => {
      clearTimeout(timer);
      if (code) rejectRun(new Error(`${stderr.slice(-10000)}\n${stdout.slice(-10000)}`));
      else if (!stdout.includes('PF08A_M4_04_MONEY_PLANNING_PASS')) rejectRun(new Error(`M4-04 marker missing\n${stdout.slice(-10000)}`));
      else resolveRun(stdout);
    });
  });
}

const published = await fetchPackage();
const directory = mkdtempSync(join(tmpdir(), 'pf08a-m4-04-public-'));
try {
  for (const [key, path] of files) writeFileSync(join(directory, path || 'index.html'), published.packageFiles[key], 'utf8');
  const stdout = await runSmoke(directory);
  console.log(JSON.stringify({
    status: 'PASS',
    public_url: publicUrl,
    expected_main: expectedMain,
    publication_attempts: published.attempt,
    browser_marker: 'PF08A_M4_04_MONEY_PLANNING_PASS',
    two_layer_model: true,
    cash_and_bank_capital: true,
    no_purpose_double_count: true,
    neutral_balance_adjustment: true,
    income_percentage_reminder: true,
    general_savings_only: true,
    selected_cash_or_bank_location: true,
    per_action_confirmation: true,
    birthday_planning: true,
    gift_fund_hybrid: true,
    runtime_exceptions: [],
  }, null, 2));
  console.log(stdout.trim());
} finally {
  rmSync(directory, { recursive: true, force: true });
}

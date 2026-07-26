import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const publicUrl = process.env.PUBLIC_URL || 'https://maloma.github.io/sandbox/';
const expectedMain = process.env.EXPECTED_MAIN_M4_03_ADDITIVE_RESERVE || '9f3ca4f71b29dd33c07f18bb3c6eabadd6afc7f8';
const localSmoke = resolve('tools/pf08a-m4-03-additive-reserve-browser-smoke-v2.mjs');
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
];

function checks(packageFiles) {
  return {
    loader: packageFiles.viewportAnchor.includes('familypilot-m4-03-additive-reserve-ui.js'),
    domain: packageFiles.budgetSafety.includes('__additiveReserveCorrection')
      && packageFiles.budgetSafety.includes("fundingMode:'additional_contribution'")
      && packageFiles.budgetSafety.includes('reviewThreshold:REVIEW_THRESHOLD')
      && packageFiles.budgetSafety.includes('sourceItems:[]'),
    ui: packageFiles.additiveReserveUi.includes("marker.content='m4-03-additive-reserve-v1'")
      && packageFiles.additiveReserveUi.includes('Другие цели не уменьшаются')
      && packageFiles.additiveReserveUi.includes('минимум на 33%'),
    oldBehaviorHidden: !packageFiles.additiveReserveUi.includes('берёт 5% от незамороженных взносов'),
    ordinaryContract: packageFiles.m403.includes('internal_transfer')
      && packageFiles.m403.includes('OPERATING_ACCOUNT_ID'),
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
  throw new Error(`Published additive reserve package did not become ready: ${JSON.stringify(last)}`);
}

function runSmoke(directory) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [localSmoke], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      rejectRun(new Error(`Additive reserve public smoke timed out\n${stderr.slice(-5000)}`));
    }, 180000);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', rejectRun);
    child.once('close', code => {
      clearTimeout(timer);
      if (code) rejectRun(new Error(`${stderr.slice(-9000)}\n${stdout.slice(-9000)}`));
      else if (!stdout.includes('PF08A_M4_03_ADDITIVE_RESERVE_PASS')) rejectRun(new Error(`Additive reserve marker missing\n${stdout.slice(-9000)}`));
      else resolveRun(stdout);
    });
  });
}

const published = await fetchPackage();
const directory = mkdtempSync(join(tmpdir(), 'pf08a-m4-03-additive-reserve-public-'));
try {
  for (const [key, path] of files) writeFileSync(join(directory, path || 'index.html'), published.packageFiles[key], 'utf8');
  const stdout = await runSmoke(directory);
  console.log(JSON.stringify({
    status: 'PASS',
    public_url: publicUrl,
    expected_main: expectedMain,
    publication_attempts: published.attempt,
    browser_marker: 'PF08A_M4_03_ADDITIVE_RESERVE_PASS',
    additive_reserve: true,
    other_goals_unchanged: true,
    no_contribution_overrides: true,
    per_item_confirmation: true,
    recommendation_review_threshold: 0.33,
    runtime_exceptions: [],
  }, null, 2));
  console.log(stdout.trim());
} finally {
  rmSync(directory, { recursive: true, force: true });
}

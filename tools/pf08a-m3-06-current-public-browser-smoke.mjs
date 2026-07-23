import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const publicUrl = process.env.PUBLIC_URL || 'https://maloma.github.io/sandbox/';
const expectedMain = process.env.EXPECTED_MAIN_M306 || 'a6f7702936d55c3cbf94a780b9f49158629659ba';
const localSmoke = resolve('tools/pf08a-m3-06-mobile-ux-browser-smoke.mjs');
const sleep = milliseconds => new Promise(resolveSleep => setTimeout(resolveSleep, milliseconds));

const files = [
  ['html', ''],
  ['scope', 'familypilot-scope.js'],
  ['analytics', 'familypilot-analytics-state.js'],
  ['obligations', 'familypilot-obligations.js'],
  ['obligationsUi', 'familypilot-obligations-ui-v2.js'],
  ['attention', 'familypilot-payment-attention.js'],
  ['attentionUi', 'familypilot-payment-attention-ui.js'],
  ['stateUi', 'familypilot-obligation-state-ui.js'],
  ['linkLifecycle', 'familypilot-payment-link-lifecycle.js'],
  ['mobileTap', 'familypilot-mobile-payment-tap.js'],
  ['operationMobile', 'familypilot-operation-mobile-ui.js'],
  ['datePicker', 'familypilot-operation-date-picker.js'],
  ['partial', 'familypilot-partial-payments.js'],
  ['settlement', 'familypilot-partial-payment-settlement.js'],
  ['renderSync', 'familypilot-partial-payments-render-sync.js'],
  ['ruleHistory', 'familypilot-rule-history.js'],
  ['plannedIncome', 'familypilot-planned-income.js'],
  ['plannedIncomeUi', 'familypilot-planned-income-ui.js'],
  ['debts', 'familypilot-debts.js'],
  ['debtsUi', 'familypilot-debts-ui.js'],
  ['savings', 'familypilot-savings-goals.js'],
  ['savingsUi', 'familypilot-savings-goals-ui.js'],
  ['wallets', 'familypilot-wallet-management.js'],
  ['walletsUi', 'familypilot-wallet-management-ui.js'],
  ['transfers', 'familypilot-wallet-transfers.js'],
  ['transfersUi', 'familypilot-wallet-transfers-ui.js']
];

function packageChecks(packageFiles) {
  return {
    currentLoader:
      packageFiles.scope.includes('familypilot-mobile-payment-tap.js') &&
      packageFiles.scope.includes('familypilot-operation-mobile-ui.js') &&
      packageFiles.scope.includes('familypilot-operation-date-picker.js') &&
      packageFiles.scope.includes('familypilot-partial-payments.js') &&
      packageFiles.scope.includes('familypilot-rule-history.js') &&
      packageFiles.scope.includes('familypilot-planned-income.js'),
    mobileTap: packageFiles.mobileTap.includes('__FP_MOBILE_PAYMENT_TAP_READY__'),
    mobileSpacing: packageFiles.operationMobile.includes('__FP_OPERATION_MOBILE_UI_READY__'),
    datePicker: packageFiles.datePicker.includes('__FP_OPERATION_DATE_PICKER_READY__'),
    laterPackages:
      packageFiles.partial.includes('__FP_PARTIAL_PAYMENTS_READY__') &&
      packageFiles.ruleHistory.includes('__FP_RULE_HISTORY_READY__') &&
      packageFiles.plannedIncomeUi.includes('__FP_PLANNED_INCOME_UI_READY__')
  };
}

async function fetchCurrentPackage() {
  let last = {};
  for (let attempt = 1; attempt <= 36; attempt += 1) {
    const token = `${expectedMain}-${attempt}-${Date.now()}`;
    try {
      const responses = await Promise.all(files.map(([, path]) => fetch(
        path ? new URL(`${path}?v=${encodeURIComponent(token)}`, publicUrl) : `${publicUrl}?v=${encodeURIComponent(token)}`,
        { redirect: 'follow', cache: 'no-store' }
      )));
      const bodies = await Promise.all(responses.map(response => response.text()));
      const packageFiles = Object.fromEntries(files.map(([key], index) => [key, bodies[index]]));
      const checks = packageChecks(packageFiles);
      const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
      last = { statuses: responses.map(response => response.status), failed };
      if (responses.every(response => response.status === 200) && failed.length === 0) {
        return { attempt, packageFiles };
      }
    } catch (error) {
      last = { error: String(error) };
    }
    await sleep(5000);
  }
  throw new Error(`Current public package did not become ready: ${JSON.stringify(last)}`);
}

function runSmoke(directory) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [localSmoke], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      rejectRun(new Error(`Current public mobile smoke timed out: ${stderr.slice(-4000)}`));
    }, 150000);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', error => {
      clearTimeout(timeout);
      rejectRun(error);
    });
    child.once('close', code => {
      clearTimeout(timeout);
      if (code !== 0) {
        rejectRun(new Error(`Current public mobile smoke exited ${code}: ${stderr.slice(-6000)} ${stdout.slice(-6000)}`));
      } else if (!stdout.includes('PF08A_M3_06_MOBILE_UX_BROWSER_PASS')) {
        rejectRun(new Error(`Current public mobile PASS marker missing: ${stdout.slice(-6000)}`));
      } else {
        resolveRun(stdout);
      }
    });
  });
}

const published = await fetchCurrentPackage();
const directory = mkdtempSync(join(tmpdir(), 'pf08a-m3-06-current-public-'));
try {
  for (const [key, path] of files) {
    writeFileSync(join(directory, path || 'index.html'), published.packageFiles[key], 'utf8');
  }
  const stdout = await runSmoke(directory);
  console.log(JSON.stringify({
    status: 'PASS',
    public_url: publicUrl,
    expected_main: expectedMain,
    publication_attempts: published.attempt,
    browser_marker: 'PF08A_M3_06_MOBILE_UX_BROWSER_PASS',
    full_target_tap: true,
    history_collapsed: true,
    dynamic_bottom_spacing: true,
    manual_expense_link_without_duplicate: true,
    custom_date_picker: true,
    later_packages_preserved: true,
    runtime_exceptions: []
  }, null, 2));
  console.log(stdout.trim());
} finally {
  rmSync(directory, { recursive: true, force: true });
}

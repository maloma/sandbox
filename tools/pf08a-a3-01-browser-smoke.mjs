import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, unlinkSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const root = process.cwd();
const harnessName = '.pf08a-a3-01-browser-harness.html';
const harnessPath = join(root, harnessName);
const profilePath = mkdtempSync(join(tmpdir(), 'pf08a-a3-01-chrome-'));
const marker = 'PF08A_A3_01_BROWSER_PASS';

const harness = `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><title>PF-08A A3-01 Browser Smoke</title></head>
<body data-status="PENDING">
<iframe id="app" src="/?test=1&pf08a-a3-01-browser=1" style="width:390px;height:844px;border:0"></iframe>
<pre id="result">PENDING</pre>
<script>
(() => {
  const result = document.getElementById('result');
  const frame = document.getElementById('app');
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const equal = (actual, expected, message) => {
    const left = JSON.stringify(actual);
    const right = JSON.stringify(expected);
    if (left !== right) throw new Error(message + ': expected ' + right + ', got ' + left);
  };
  const text = node => (node?.textContent || '').replace(/\\s+/g, ' ').trim();
  const now = Date.now();

  const operation = ({ id, kind, amount, categoryId, walletId = 'wallet-household-main', occurredAt = now }) => ({
    id, kind, amount, categoryId, walletId, note: '', occurredAt,
    createdByMemberId: 'member-anna', createdAt: occurredAt - 1000,
    lastEditedByMemberId: 'member-anna', lastEditedAt: occurredAt - 1000,
    revisions: [], status: 'active', deletedAt: null, deletedByMemberId: null,
    trashExpiresAt: null, receipt: null, links: {}, transferGroupId: null
  });

  async function waitForTestApi() {
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      const api = frame.contentWindow && frame.contentWindow.__FP_TEST__;
      if (api) return api;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('FamilyPilot test API did not become ready');
  }

  async function run() {
    const api = await waitForTestApi();
    const doc = frame.contentDocument;
    const analyticsScreen = doc.getElementById('analyticsScreen');
    const categories = doc.getElementById('analyticsCategories');
    const operations = doc.getElementById('analyticsOperations');
    const periodLabel = () => text(doc.querySelector('[data-label="analytics"]'));

    assert(text(doc.getElementById('analyticsDataBasis')) === 'На основе записанных операций', 'recorded-data basis copy expected');

    // Completely empty personal scope.
    api.replaceOperationsForTest([]);
    api.setActiveWallet('wallet-personal-anna');
    api.setAnalyticsPeriod('month', now);
    api.resetAnalyticsFilters();
    let view = api.getAnalyticsViewState();
    assert(view.state === 'scope_empty', 'personal scope_empty state expected');
    assert(text(categories).includes('Личный кошелёк Анны'), 'personal empty category copy must identify wallet');
    assert(text(operations).includes('Личный кошелёк Анны'), 'personal empty source copy must identify wallet');
    assert(analyticsScreen.dataset.analyticsState === 'scope_empty', 'scope_empty DOM state expected');

    // Income-only selected period, Expense mode has an honest empty state.
    api.createOperation({ id: 'a3-income-only', kind: 'income', amount: 300, categoryId: 'cat-inc-other', walletId: 'wallet-personal-anna', occurredAt: now });
    api.setAnalyticsMode('expense');
    view = api.getAnalyticsViewState();
    assert(view.state === 'income_only', 'income_only state expected');
    assert(view.emptyReason === 'no_expense', 'no_expense reason expected');
    assert(text(categories) === 'За выбранный период расходов нет.', 'Income-only category copy expected');
    assert(text(operations) === 'За выбранный период расходов нет.', 'Income-only operation copy expected');
    api.setAnalyticsMode('all');
    assert(text(doc.getElementById('analyticsIncome')).includes('300'), 'Income-only total expected');
    assert(doc.querySelectorAll('#analyticsOperations [data-op-id]').length === 1, 'Income-only source operation expected');

    // Expense-only selected period, Income mode has an honest empty state.
    api.replaceOperationsForTest([operation({ id: 'a3-expense-only', kind: 'expense', amount: 80, categoryId: 'cat-exp-other', walletId: 'wallet-personal-anna' })]);
    api.setAnalyticsMode('income');
    view = api.getAnalyticsViewState();
    assert(view.state === 'expense_only', 'expense_only state expected');
    assert(view.emptyReason === 'no_income', 'no_income reason expected');
    assert(text(categories) === 'За выбранный период приходов нет.', 'Expense-only category copy expected');
    assert(text(operations) === 'За выбранный период приходов нет.', 'Expense-only operation copy expected');

    // Scope has history, selected day is empty.
    api.setActiveWallet('wallet-household-main');
    api.replaceOperationsForTest([operation({ id: 'a3-old-expense', kind: 'expense', amount: 55, categoryId: 'cat-exp-food', occurredAt: now - 60 * 86400000 })]);
    api.setAnalyticsPeriod('day', now);
    api.setAnalyticsMode('all');
    view = api.getAnalyticsViewState();
    assert(view.state === 'period_empty', 'period_empty state expected');
    assert(text(categories) === 'За выбранный период операций нет.', 'period-empty category copy expected');
    assert(text(operations) === 'За выбранный период операций нет.', 'period-empty operation copy expected');

    // Optional filter empty state and Reset preserves period and wallet.
    api.replaceOperationsForTest([
      operation({ id: 'a3-mixed-income', kind: 'income', amount: 200, categoryId: 'cat-inc-other' }),
      operation({ id: 'a3-mixed-expense', kind: 'expense', amount: 60, categoryId: 'cat-exp-food' })
    ]);
    api.setAnalyticsPeriod('month', now);
    api.setAnalyticsMode('all');
    api.setAnalyticsSearch('does-not-exist');
    view = api.getAnalyticsViewState();
    assert(view.state === 'filtered_empty', 'filtered_empty state expected');
    assert(text(categories) === 'По выбранным условиям данных нет.', 'filtered-empty category copy expected');
    assert(text(operations) === 'По выбранным условиям данных нет.', 'filtered-empty operation copy expected');
    const beforeResetPeriod = periodLabel();
    const beforeResetWallet = api.getActiveWallet();
    api.resetAnalyticsFilters();
    assert(periodLabel() === beforeResetPeriod, 'Reset must preserve Analytics period');
    assert(api.getActiveWallet() === beforeResetWallet, 'Reset must preserve wallet scope');

    // Missing category remains in totals and source rows.
    api.replaceOperationsForTest([
      operation({ id: 'a3-missing-category', kind: 'expense', amount: 77, categoryId: 'missing-category' }),
      operation({ id: 'a3-valid-income', kind: 'income', amount: 100, categoryId: 'cat-inc-other' })
    ]);
    api.setAnalyticsPeriod('all', now);
    api.setAnalyticsMode('all');
    view = api.getAnalyticsViewState();
    assert(view.state === 'mixed', 'mixed state expected for missing-category scenario');
    assert(text(doc.getElementById('analyticsExpense')).includes('77'), 'missing-category amount must remain in Expense total');
    assert(text(doc.getElementById('analyticsIncome')).includes('100'), 'valid Income total expected');
    assert(categories.querySelector('[data-missing-category="true"]'), 'missing category distribution row expected');
    assert(operations.querySelector('[data-missing-category="true"]'), 'missing category source row expected');
    assert(text(operations).includes('Откройте операцию, чтобы выбрать категорию'), 'missing category correction hint expected');
    equal(api.analyticsFilteredOperations().sort(), ['a3-missing-category', 'a3-valid-income'].sort(), 'source operation IDs must match totals');
    assert(text(doc.getElementById('analyticsResultCount')) === 'Найдено: 2', 'result count must match source rows');

    // Personal/household isolation remains intact after Analytics changes.
    api.replaceOperationsForTest([
      operation({ id: 'a3-household', kind: 'expense', amount: 10, categoryId: 'cat-exp-food' }),
      operation({ id: 'a3-personal', kind: 'income', amount: 25, categoryId: 'cat-inc-other', walletId: 'wallet-personal-anna' })
    ]);
    api.setActiveWallet('wallet-personal-anna');
    api.setAnalyticsPeriod('all', now);
    api.setAnalyticsMode('all');
    equal(api.analyticsFilteredOperations(), ['a3-personal'], 'personal Analytics isolation');
    assert(!text(operations).includes('a3-household'), 'household operation must not appear in personal Analytics DOM');

    const payload = {
      marker: '${marker}',
      states: ['scope_empty', 'period_empty', 'income_only', 'expense_only', 'filtered_empty', 'mixed'],
      missing_category_preserved: true,
      result_source_consistency: true,
      reset_preserved_scope_and_period: true,
      personal_scope_isolated: true
    };
    document.body.dataset.status = 'PASS';
    result.textContent = JSON.stringify(payload);
  }

  run().catch(error => {
    document.body.dataset.status = 'FAIL';
    result.textContent = String(error && (error.stack || error.message) || error);
  });
})();
</script>
</body>
</html>`;

writeFileSync(harnessPath, harness, 'utf8');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const server = createServer((request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    const requested = url.pathname === '/' ? '/index.html' : url.pathname;
    const normalized = normalize(decodeURIComponent(requested)).replace(/^([.][.][/\\])+/, '');
    const absolute = resolve(root, `.${sep}${normalized.replace(/^[/\\]+/, '')}`);
    if (!absolute.startsWith(root + sep) && absolute !== root) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    if (!existsSync(absolute)) {
      response.writeHead(404).end('Not found');
      return;
    }
    const body = readFileSync(absolute);
    response.writeHead(200, { 'content-type': mime[extname(absolute)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(body);
  } catch (error) {
    response.writeHead(500).end(String(error));
  }
});

const chromeCandidates = [
  process.env.CHROME_BIN,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(Boolean);
const chrome = chromeCandidates.find(candidate => existsSync(candidate));
if (!chrome) throw new Error(`No supported Chrome executable found. Checked: ${chromeCandidates.join(', ')}`);

try {
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}/${harnessName}`;
  const args = [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-background-networking', '--disable-default-apps', '--disable-extensions',
    '--disable-sync', '--metrics-recording-only', '--mute-audio', '--no-first-run',
    `--user-data-dir=${profilePath}`, '--virtual-time-budget=22000', '--dump-dom', url
  ];

  const output = await new Promise((resolveRun, rejectRun) => {
    const child = spawn(chrome, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      rejectRun(new Error(`Chrome browser smoke timed out. stderr: ${stderr.slice(-2000)}`));
    }, 50000);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', error => { clearTimeout(timeout); rejectRun(error); });
    child.once('close', code => {
      clearTimeout(timeout);
      if (code !== 0) rejectRun(new Error(`Chrome exited with ${code}. stderr: ${stderr.slice(-4000)}`));
      else resolveRun({ stdout, stderr });
    });
  });

  if (!output.stdout.includes('data-status="PASS"')) {
    throw new Error(`Browser smoke did not pass. DOM tail: ${output.stdout.slice(-7000)}`);
  }
  if (!output.stdout.includes(marker)) throw new Error(`Browser smoke marker ${marker} missing`);

  console.log(JSON.stringify({
    status: 'PASS', browser: chrome, marker,
    states: ['scope_empty', 'period_empty', 'income_only', 'expense_only', 'filtered_empty', 'mixed'],
    missing_category_preserved: true,
    result_source_consistency: true,
    reset_preserved_scope_and_period: true,
    personal_scope_isolated: true
  }, null, 2));
} finally {
  await new Promise(resolveClose => server.close(resolveClose));
  if (existsSync(harnessPath)) unlinkSync(harnessPath);
  rmSync(profilePath, { recursive: true, force: true });
}

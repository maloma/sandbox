import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, unlinkSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const root = process.cwd();
const harnessName = '.pf08a-if02-browser-harness.html';
const harnessPath = join(root, harnessName);
const profilePath = mkdtempSync(join(tmpdir(), 'pf08a-if02-chrome-'));
const marker = 'PF08A_IF02_BROWSER_PASS';

const harness = `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><title>PF-08A IF-02 Browser Smoke</title></head>
<body data-status="PENDING">
<iframe id="app" src="/?test=1&pf08a-if02-browser=1" style="width:390px;height:844px;border:0"></iframe>
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
  const sorted = values => [...values].sort();

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
    const appDocument = frame.contentDocument;
    assert(api.getActiveWallet() === 'wallet-household-main', 'default household wallet must be active');

    const personalIncomeId = api.createOperation({
      id: 'browser-personal-income',
      kind: 'income',
      amount: 300,
      categoryId: 'cat-inc-other',
      walletId: 'wallet-personal-anna',
      note: 'Personal income browser smoke'
    });
    const personalExpenseId = api.createOperation({
      id: 'browser-personal-expense',
      kind: 'expense',
      amount: 40,
      categoryId: 'cat-exp-other',
      walletId: 'wallet-personal-anna',
      note: 'Personal expense browser smoke'
    });

    const householdVisible = api.visibleOperationIds();
    assert(!householdVisible.includes(personalIncomeId), 'household scope leaked personal income');
    assert(!householdVisible.includes(personalExpenseId), 'household scope leaked personal expense');
    assert(api.capitalSnapshot().scope === 'household', 'household capital scope expected');
    assert(appDocument.getElementById('capitalTitleText').textContent === 'Капитал', 'household capital title expected');

    api.setActiveWallet('wallet-personal-anna');
    equal(sorted(api.visibleOperationIds()), sorted([personalIncomeId, personalExpenseId]), 'personal scope operation IDs');
    const personalCapital = api.capitalSnapshot();
    assert(personalCapital.scope === 'personal', 'personal capital scope expected');
    assert(personalCapital.capital === 260, 'personal capital must equal 260');
    assert(personalCapital.change === 260, 'personal change must equal 260');
    assert(appDocument.body.classList.contains('personal-wallet-scope'), 'personal scope body class expected');
    assert(appDocument.getElementById('capitalTitleText').textContent === 'Личный капитал', 'personal capital title expected');
    assert(appDocument.getElementById('capitalScopeLabel').textContent === 'Личный кошелёк Анны', 'personal capital label expected');
    assert(appDocument.getElementById('operationsScopeLabel').textContent === 'Личный кошелёк Анны', 'operations scope label expected');
    assert(appDocument.getElementById('analyticsScopeLabel').textContent === 'Личный кошелёк Анны', 'analytics scope label expected');

    equal(sorted([...appDocument.querySelectorAll('#operationsList [data-op-id]')].map(node => node.dataset.opId)), sorted([personalIncomeId, personalExpenseId]), 'personal Operations DOM');
    api.setAnalyticsMode('all');
    equal(sorted([...appDocument.querySelectorAll('#analyticsOperations [data-op-id]')].map(node => node.dataset.opId)), sorted([personalIncomeId, personalExpenseId]), 'personal Analytics DOM');

    appDocument.querySelector('[data-open-entry="expense"]').click();
    const personalWarning = appDocument.getElementById('entryWalletWarning');
    assert(personalWarning.hidden === false, 'personal entry warning must be visible');
    assert(appDocument.getElementById('entryWalletWarningName').textContent === 'Личный кошелёк Анны', 'personal warning wallet name expected');
    appDocument.querySelector('[data-close="entryModal"]').click();

    api.setActiveWallet('wallet-household-main');
    assert(api.capitalSnapshot().scope === 'household', 'household scope must restore');
    assert(appDocument.body.classList.contains('personal-wallet-scope') === false, 'personal body class must clear');
    assert(appDocument.getElementById('capitalTitleText').textContent === 'Капитал', 'household title must restore');
    assert(appDocument.getElementById('operationsScopeLabel').textContent === 'Семейный контекст', 'household Operations label must restore');
    assert(appDocument.getElementById('analyticsScopeLabel').textContent === 'Семейный контекст', 'household Analytics label must restore');
    assert(!api.visibleOperationIds().includes(personalIncomeId), 'restored household scope leaked personal income');
    assert(!api.visibleOperationIds().includes(personalExpenseId), 'restored household scope leaked personal expense');

    appDocument.querySelector('[data-open-entry="expense"]').click();
    assert(appDocument.getElementById('entryWalletWarning').hidden === true, 'default wallet entry warning must be hidden');
    appDocument.querySelector('[data-close="entryModal"]').click();

    api.setActor('member-martin');
    api.setActiveWallet('wallet-personal-anna');
    assert(api.getActiveWallet() === 'wallet-household-main', 'inaccessible personal wallet must fall back to household');
    assert(appDocument.getElementById('capitalTitleText').textContent === 'Капитал', 'fallback must render household Capital');

    const payload = {
      marker: '${marker}',
      household_personal_leak: false,
      personal_visible_operations: sorted([personalIncomeId, personalExpenseId]),
      personal_capital: personalCapital.capital,
      household_restored: true,
      inaccessible_wallet_fallback: api.getActiveWallet()
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
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--metrics-recording-only',
    '--mute-audio',
    '--no-first-run',
    `--user-data-dir=${profilePath}`,
    '--virtual-time-budget=18000',
    '--dump-dom',
    url
  ];

  const output = await new Promise((resolveRun, rejectRun) => {
    const child = spawn(chrome, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      rejectRun(new Error(`Chrome browser smoke timed out. stderr: ${stderr.slice(-2000)}`));
    }, 45000);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', error => {
      clearTimeout(timeout);
      rejectRun(error);
    });
    child.once('close', code => {
      clearTimeout(timeout);
      if (code !== 0) rejectRun(new Error(`Chrome exited with ${code}. stderr: ${stderr.slice(-4000)}`));
      else resolveRun({ stdout, stderr });
    });
  });

  if (!output.stdout.includes('data-status="PASS"')) {
    throw new Error(`Browser smoke did not pass. DOM tail: ${output.stdout.slice(-6000)}`);
  }
  if (!output.stdout.includes(marker)) {
    throw new Error(`Browser smoke marker ${marker} missing from DOM`);
  }

  console.log(JSON.stringify({
    status: 'PASS',
    browser: chrome,
    marker,
    household_personal_leak: false,
    personal_capital: 260,
    household_restored: true,
    inaccessible_wallet_fallback: 'wallet-household-main'
  }, null, 2));
} finally {
  await new Promise(resolveClose => server.close(resolveClose));
  if (existsSync(harnessPath)) unlinkSync(harnessPath);
  rmSync(profilePath, { recursive: true, force: true });
}

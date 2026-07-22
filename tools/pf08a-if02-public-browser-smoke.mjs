import { createServer } from 'node:net';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const publicUrl = process.env.PUBLIC_URL || 'https://maloma.github.io/sandbox/';
const expectedMain = process.env.EXPECTED_MAIN || '98ce13bf2ef73dbda3e7806f4c368016b46796cc';
const evidenceArgument = process.argv.find(argument => argument.startsWith('--evidence='));
const evidencePath = evidenceArgument ? evidenceArgument.slice('--evidence='.length) : null;
const sha256 = value => createHash('sha256').update(value).digest('hex');
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function reservePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);
  const chrome = candidates.find(candidate => existsSync(candidate));
  if (!chrome) throw new Error(`No supported Chrome executable found. Checked: ${candidates.join(', ')}`);
  return chrome;
}

async function waitForPublicContract() {
  let lastStatus = 0;
  let lastHtml = '';
  let lastScope = '';
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const cacheBust = `${expectedMain}-${attempt}-${Date.now()}`;
    try {
      const htmlResponse = await fetch(`${publicUrl}?v=${encodeURIComponent(cacheBust)}`, { redirect: 'follow', cache: 'no-store' });
      const scopeResponse = await fetch(new URL(`familypilot-scope.js?v=${encodeURIComponent(cacheBust)}`, publicUrl), { redirect: 'follow', cache: 'no-store' });
      lastStatus = htmlResponse.status;
      lastHtml = await htmlResponse.text();
      lastScope = await scopeResponse.text();
      const ready = htmlResponse.status === 200
        && scopeResponse.status === 200
        && lastHtml.includes('personal-wallet-scope-v1')
        && lastHtml.includes('<script src="./familypilot-scope.js"></script>')
        && lastScope.includes('FamilyPilotScope')
        && !lastHtml.includes("fetch('./src/familypilot.html")
        && !lastHtml.includes('document.write(source)');
      if (ready) {
        return {
          attempts: attempt,
          httpStatus: htmlResponse.status,
          scopeHttpStatus: scopeResponse.status,
          html: lastHtml,
          scope: lastScope
        };
      }
    } catch (error) {
      lastStatus = 0;
      lastHtml = String(error);
    }
    await sleep(10000);
  }
  throw new Error(`Public contract did not become ready. Last status: ${lastStatus}. Last response: ${lastHtml.slice(0, 1000)}`);
}

class CdpConnection {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    this.socket = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('CDP WebSocket connection timed out')), 10000);
      this.socket.addEventListener('open', () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
      this.socket.addEventListener('error', event => {
        clearTimeout(timeout);
        reject(new Error(`CDP WebSocket error: ${event.message || 'unknown error'}`));
      }, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
        else pending.resolve(message.result || {});
        return;
      }
      const listeners = this.listeners.get(message.method) || [];
      for (const listener of listeners) listener(message.params || {});
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { method, resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
    return () => this.listeners.set(method, (this.listeners.get(method) || []).filter(item => item !== listener));
  }

  waitFor(method, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        off();
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);
      const off = this.on(method, params => {
        clearTimeout(timeout);
        off();
        resolve(params);
      });
    });
  }

  close() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) this.socket.close();
  }
}

const browserExpression = `
(async () => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const equal = (actual, expected, message) => {
    const left = JSON.stringify(actual);
    const right = JSON.stringify(expected);
    if (left !== right) throw new Error(message + ': expected ' + right + ', got ' + left);
  };
  const sorted = values => [...values].sort();
  const deadline = Date.now() + 15000;
  while (!window.__FP_TEST__ && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
  const api = window.__FP_TEST__;
  assert(api, 'FamilyPilot public test API did not become ready');
  assert(api.getActiveWallet() === 'wallet-household-main', 'default household wallet must be active');

  const personalIncomeId = api.createOperation({
    id: 'public-personal-income', kind: 'income', amount: 300,
    categoryId: 'cat-inc-other', walletId: 'wallet-personal-anna', note: 'Public personal income smoke'
  });
  const personalExpenseId = api.createOperation({
    id: 'public-personal-expense', kind: 'expense', amount: 40,
    categoryId: 'cat-exp-other', walletId: 'wallet-personal-anna', note: 'Public personal expense smoke'
  });

  const householdVisible = api.visibleOperationIds();
  assert(!householdVisible.includes(personalIncomeId), 'public household scope leaked personal income');
  assert(!householdVisible.includes(personalExpenseId), 'public household scope leaked personal expense');
  assert(api.capitalSnapshot().scope === 'household', 'public household capital scope expected');

  api.setActiveWallet('wallet-personal-anna');
  equal(sorted(api.visibleOperationIds()), sorted([personalIncomeId, personalExpenseId]), 'public personal scope operation IDs');
  const personalCapital = api.capitalSnapshot();
  assert(personalCapital.scope === 'personal', 'public personal capital scope expected');
  assert(personalCapital.capital === 260, 'public personal capital must equal 260');
  assert(document.getElementById('capitalTitleText').textContent === 'Личный капитал', 'public personal Capital title expected');
  assert(document.getElementById('capitalScopeLabel').textContent === 'Личный кошелёк Анны', 'public personal Capital label expected');
  assert(document.getElementById('operationsScopeLabel').textContent === 'Личный кошелёк Анны', 'public Operations scope label expected');
  assert(document.getElementById('analyticsScopeLabel').textContent === 'Личный кошелёк Анны', 'public Analytics scope label expected');
  equal(sorted([...document.querySelectorAll('#operationsList [data-op-id]')].map(node => node.dataset.opId)), sorted([personalIncomeId, personalExpenseId]), 'public personal Operations DOM');
  api.setAnalyticsMode('all');
  equal(sorted([...document.querySelectorAll('#analyticsOperations [data-op-id]')].map(node => node.dataset.opId)), sorted([personalIncomeId, personalExpenseId]), 'public personal Analytics DOM');

  document.querySelector('[data-open-entry="expense"]').click();
  assert(document.getElementById('entryWalletWarning').hidden === false, 'public personal entry warning must be visible');
  assert(document.getElementById('entryWalletWarningName').textContent === 'Личный кошелёк Анны', 'public personal warning name expected');
  document.querySelector('[data-close="entryModal"]').click();

  api.setActiveWallet('wallet-household-main');
  assert(api.capitalSnapshot().scope === 'household', 'public household scope must restore');
  assert(document.getElementById('capitalTitleText').textContent === 'Капитал', 'public household Capital title must restore');
  assert(!api.visibleOperationIds().includes(personalIncomeId), 'public restored household scope leaked personal income');
  assert(!api.visibleOperationIds().includes(personalExpenseId), 'public restored household scope leaked personal expense');
  document.querySelector('[data-open-entry="expense"]').click();
  assert(document.getElementById('entryWalletWarning').hidden === true, 'public default-wallet warning must be hidden');
  document.querySelector('[data-close="entryModal"]').click();

  api.setActor('member-martin');
  api.setActiveWallet('wallet-personal-anna');
  assert(api.getActiveWallet() === 'wallet-household-main', 'public inaccessible wallet must fall back');

  return {
    marker: 'PF08A_IF02_PUBLIC_BROWSER_PASS',
    household_personal_leak: false,
    personal_visible_operations: sorted([personalIncomeId, personalExpenseId]),
    personal_capital: personalCapital.capital,
    household_restored: true,
    inaccessible_wallet_fallback: api.getActiveWallet()
  };
})()`;

const publicContract = await waitForPublicContract();
const chrome = findChrome();
const port = await reservePort();
const profilePath = mkdtempSync(join(tmpdir(), 'pf08a-if02-public-chrome-'));
const chromeProcess = spawn(chrome, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--disable-background-networking', '--disable-default-apps', '--disable-extensions',
  '--disable-sync', '--metrics-recording-only', '--mute-audio', '--no-first-run',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profilePath}`, 'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });
let chromeStderr = '';
chromeProcess.stderr.on('data', chunk => { chromeStderr += chunk; });

let connection;
try {
  let version;
  for (let attempt = 1; attempt <= 100; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) {
        version = await response.json();
        break;
      }
    } catch {}
    await sleep(100);
  }
  if (!version) throw new Error(`Chrome DevTools endpoint did not start. stderr: ${chromeStderr.slice(-2000)}`);

  const targetResponse = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  assert(targetResponse.ok, `Unable to create Chrome target: HTTP ${targetResponse.status}`);
  const target = await targetResponse.json();
  connection = new CdpConnection(target.webSocketDebuggerUrl);
  await connection.connect();

  const runtimeExceptions = [];
  connection.on('Runtime.exceptionThrown', params => runtimeExceptions.push(params.exceptionDetails?.text || 'Runtime exception'));
  await connection.send('Page.enable');
  await connection.send('Runtime.enable');
  const loaded = connection.waitFor('Page.loadEventFired', 30000);
  const cacheBustedUrl = `${publicUrl}?test=1&v=${encodeURIComponent(expectedMain)}-${Date.now()}`;
  await connection.send('Page.navigate', { url: cacheBustedUrl });
  await loaded;

  const evaluation = await connection.send('Runtime.evaluate', {
    expression: browserExpression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  });
  if (evaluation.exceptionDetails) {
    throw new Error(`Public browser evaluation failed: ${evaluation.exceptionDetails.text || JSON.stringify(evaluation.exceptionDetails)}`);
  }
  const browserResult = evaluation.result?.value;
  assert(browserResult?.marker === 'PF08A_IF02_PUBLIC_BROWSER_PASS', 'Public browser PASS marker missing');
  assert(runtimeExceptions.length === 0, `Public runtime exceptions detected: ${runtimeExceptions.join('; ')}`);

  const result = {
    status: 'PASS',
    verified_at: new Date().toISOString(),
    public_url: publicUrl,
    expected_main: expectedMain,
    publication_attempts: publicContract.attempts,
    http_status: publicContract.httpStatus,
    scope_http_status: publicContract.scopeHttpStatus,
    html_sha256: sha256(publicContract.html),
    scope_sha256: sha256(publicContract.scope),
    browser: chrome,
    browser_result: browserResult,
    runtime_exceptions: runtimeExceptions
  };

  if (evidencePath) {
    const markdown = `# Public Verification — PF-08A-IF-02-PERSONAL-WALLET-SCOPE\n\n`
      + `**Status:** PASS  \n`
      + `**Verified At:** ${result.verified_at}  \n`
      + `**Public URL:** \`${publicUrl}\`  \n`
      + `**Expected Main Commit:** \`${expectedMain}\`  \n`
      + `**HTTP Status:** \`${result.http_status}\`  \n`
      + `**Scope Module HTTP Status:** \`${result.scope_http_status}\`  \n`
      + `**Publication Attempts:** \`${result.publication_attempts}\`  \n`
      + `**HTML SHA-256:** \`${result.html_sha256}\`  \n`
      + `**Scope Module SHA-256:** \`${result.scope_sha256}\`\n\n`
      + `## Assertions\n\n`
      + `- public personal-wallet package marker present — PASS;\n`
      + `- public scope module loaded — PASS;\n`
      + `- household Operations exclude personal operations — PASS;\n`
      + `- selected personal Operations and Analytics contain only that wallet — PASS;\n`
      + `- selected personal Capital equals \`260 EUR\` in the deterministic scenario — PASS;\n`
      + `- personal-wallet warning appears above Save — PASS;\n`
      + `- switching back restores household scope and default-wallet silence — PASS;\n`
      + `- inaccessible personal wallet falls back to the household wallet — PASS;\n`
      + `- runtime exceptions — NONE.\n\n`
      + `## Browser Result\n\n\`\`\`json\n${JSON.stringify(browserResult, null, 2)}\n\`\`\`\n\n`
      + `# END OF FILE\n`;
    writeFileSync(evidencePath, markdown, 'utf8');
  }

  console.log(JSON.stringify(result, null, 2));
} finally {
  if (connection) connection.close();
  chromeProcess.kill('SIGKILL');
  rmSync(profilePath, { recursive: true, force: true });
}

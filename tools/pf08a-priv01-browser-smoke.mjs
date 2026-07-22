import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, unlinkSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const root = process.cwd();
const harnessName = '.pf08a-priv01-browser-harness.html';
const harnessPath = join(root, harnessName);
const profilePath = mkdtempSync(join(tmpdir(), 'pf08a-priv01-chrome-'));
const marker = 'PF08A_PRIV01_BROWSER_PASS';

const harness = `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><title>PF-08A PRIV-01 Browser Smoke</title></head>
<body data-status="PENDING">
<iframe id="app" src="/?test=1&pf08a-priv01-browser=1" style="width:390px;height:844px;border:0"></iframe>
<pre id="result">PENDING</pre>
<script>
(() => {
  const result = document.getElementById('result');
  const frame = document.getElementById('app');
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const text = node => (node?.textContent || '').replace(/\\s+/g, ' ').trim();
  const money = (value, currency = 'EUR') => new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Math.abs(Number(value) || 0));
  const signed = (value, currency = 'EUR') => (value > 0 ? '+' : value < 0 ? '−' : '') + money(value, currency);

  async function waitForTestApi() {
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      const api = frame.contentWindow && frame.contentWindow.__FP_TEST__;
      if (api) return api;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('FamilyPilot test API did not become ready');
  }

  function assertMainHidden(doc, expectedAriaFragment) {
    const home = doc.getElementById('homeScreen');
    const button = doc.getElementById('capitalRevealBtn');
    assert(button, 'Capital reveal button missing');
    assert(home.firstElementChild === button, 'Capital reveal button must remain first on Main');
    assert(text(button) === 'Капитал', 'Capital button visible text must be exactly Капитал');
    assert(button.getAttribute('aria-label').includes(expectedAriaFragment), 'Capital button accessible label mismatch');
    assert(!doc.getElementById('capitalValue'), 'Capital value node must not exist on Main');
    assert(!doc.getElementById('capitalChange'), 'Capital change node must not exist on Main');
    assert(!doc.getElementById('capitalStartDate'), 'Capital start date node must not exist on Main');
    assert(!doc.getElementById('capitalEndDate'), 'Capital end date node must not exist on Main');
    assert(!doc.getElementById('capitalScopeLabel'), 'Capital scope label node must not exist on Main');
    assert(!doc.getElementById('capitalTitleText'), 'Capital title detail node must not exist on Main');
    assert(!home.querySelector('.spark'), 'Capital graph must not exist on Main');
    assert(!doc.getElementById('capitalInfo').classList.contains('open'), 'Capital overlay must be closed');
    return button;
  }

  function openAndAssert(doc, snapshot, labelText) {
    const button = doc.getElementById('capitalRevealBtn');
    button.click();
    const overlay = doc.getElementById('capitalInfo');
    assert(overlay.classList.contains('open'), 'Capital overlay must open after press');
    const content = text(doc.getElementById('capitalInfoContent'));
    assert(content.includes(labelText), 'Capital overlay scope label missing');
    assert(content.includes(money(snapshot.capital, snapshot.currency)), 'Capital value missing from overlay');
    assert(content.includes(signed(snapshot.change, snapshot.currency)), 'Capital change missing from overlay');
    doc.querySelector('#capitalInfo [data-close="capitalInfo"]').click();
    assert(!overlay.classList.contains('open'), 'Capital overlay must close');
  }

  async function run() {
    const api = await waitForTestApi();
    const doc = frame.contentDocument;

    // Household disclosure is hidden by default.
    api.setActiveWallet('wallet-household-main');
    let button = assertMainHidden(doc, 'семейный капитал');
    let snapshot = api.capitalSnapshot();
    assert(!text(button).includes(money(snapshot.capital, snapshot.currency)), 'Household Capital leaked in button text');
    assert(!text(button).includes('Семейный кошелёк'), 'Household wallet label leaked on Main');
    openAndAssert(doc, snapshot, 'Семейный капитал');
    assertMainHidden(doc, 'семейный капитал');

    // Personal disclosure remains generic on Main and is scoped inside the overlay.
    api.setActiveWallet('wallet-personal-anna');
    button = assertMainHidden(doc, 'Личный кошелёк Анны');
    snapshot = api.capitalSnapshot();
    assert(snapshot.scope === 'personal', 'Personal Capital snapshot expected');
    assert(!text(button).includes(money(snapshot.capital, snapshot.currency)), 'Personal Capital leaked in button text');
    assert(!text(button).includes('Личный кошелёк Анны'), 'Personal wallet name leaked in visible Main text');
    openAndAssert(doc, snapshot, 'Личный кошелёк Анны');
    const personalContent = text(doc.getElementById('capitalInfoContent'));
    assert(personalContent.includes('Личный финансовый контекст'), 'Personal disclosure explanation missing');
    assert(!personalContent.includes('Семейный капитал'), 'Household summary must not replace personal disclosure');
    assertMainHidden(doc, 'Личный кошелёк Анны');

    // Switching back keeps the disclosure closed and generic.
    api.setActiveWallet('wallet-household-main');
    assertMainHidden(doc, 'семейный капитал');

    const payload = {
      marker: '${marker}',
      visible_main_text: 'Капитал',
      main_values_exposed: false,
      household_disclosure: true,
      personal_disclosure: true,
      closed_after_dismiss: true,
      wallet_scope_isolated: true
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
    const absolute = resolve(root, \`.${sep}\${normalized.replace(/^[/\\]+/, '')}\`);
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
if (!chrome) throw new Error(\`No supported Chrome executable found. Checked: \${chromeCandidates.join(', ')}\`);

try {
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  const url = \`http://127.0.0.1:\${address.port}/\${harnessName}\`;
  const args = [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-background-networking', '--disable-default-apps', '--disable-extensions',
    '--disable-sync', '--metrics-recording-only', '--mute-audio', '--no-first-run',
    \`--user-data-dir=\${profilePath}\`, '--virtual-time-budget=22000', '--dump-dom', url
  ];

  const output = await new Promise((resolveRun, rejectRun) => {
    const child = spawn(chrome, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      rejectRun(new Error(\`Chrome browser smoke timed out. stderr: \${stderr.slice(-2000)}\`));
    }, 50000);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', error => { clearTimeout(timeout); rejectRun(error); });
    child.once('close', code => {
      clearTimeout(timeout);
      if (code !== 0) rejectRun(new Error(\`Chrome exited with \${code}. stderr: \${stderr.slice(-4000)}\`));
      else resolveRun({ stdout, stderr });
    });
  });

  if (!output.stdout.includes('data-status="PASS"')) throw new Error(\`Hidden Capital browser smoke did not pass. DOM tail: \${output.stdout.slice(-7000)}\`);
  if (!output.stdout.includes(marker)) throw new Error(\`Browser smoke marker \${marker} missing\`);

  console.log(JSON.stringify({
    status: 'PASS', browser: chrome, marker,
    visible_main_text: 'Капитал',
    main_values_exposed: false,
    household_disclosure: true,
    personal_disclosure: true,
    closed_after_dismiss: true,
    wallet_scope_isolated: true
  }, null, 2));
} finally {
  await new Promise(resolveClose => server.close(resolveClose));
  if (existsSync(harnessPath)) unlinkSync(harnessPath);
  rmSync(profilePath, { recursive: true, force: true });
}

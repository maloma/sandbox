import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const root = process.cwd();
const harnessName = '.pf08a-m4-03-additive-reserve.html';
const harnessPath = join(root, harnessName);
const profilePath = mkdtempSync(join(tmpdir(), 'pf08a-m403-additive-reserve-'));
const marker = 'PF08A_M4_03_ADDITIVE_RESERVE_PASS';

const harness = `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><title>Additive reserve smoke</title></head>
<body data-status="PENDING">
<iframe id="app" src="/?test=1&additive-reserve=1" style="width:390px;height:844px;border:0"></iframe>
<pre id="result">PENDING</pre>
<script>
(() => {
  const frame = document.getElementById('app');
  const result = document.getElementById('result');
  const runtimeErrors = [];
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const text = node => (node?.textContent || '').replace(/\\s+/g, ' ').trim();

  async function waitForApi() {
    const deadline = Date.now() + 40000;
    while (Date.now() < deadline) {
      const win = frame.contentWindow;
      const api = win && win.__FP_TEST__;
      if (api?.additiveReserve?.proposal && win.__FP_M4_03_ADDITIVE_RESERVE_READY__ === true) return api;
      await new Promise(resolveWait => setTimeout(resolveWait, 100));
    }
    const win = frame.contentWindow;
    throw new Error('Additive reserve API did not become ready: ' + JSON.stringify({
      packageLoaded: win?.__FP_M4_03_BUDGET_PACKAGE_LOADED__,
      reserveUi: win?.__FP_M4_03_ADDITIVE_RESERVE_UI__,
      reserveReady: win?.__FP_M4_03_ADDITIVE_RESERVE_READY__,
      reserveError: win?.__FP_M4_03_ADDITIVE_RESERVE_UI_ERROR__,
      bootstrapError: win?.__FP_M4_03_BUDGET_BOOTSTRAP_ERROR__,
    }));
  }

  async function run() {
    const win = frame.contentWindow;
    win.addEventListener('error', event => runtimeErrors.push(String(event.error || event.message || 'error')));
    win.addEventListener('unhandledrejection', event => runtimeErrors.push(String(event.reason || 'rejection')));

    const api = await waitForApi();
    const doc = frame.contentDocument;
    const savings = api.savings;
    const reserveApi = api.additiveReserve;
    const runtime = win.__FP_RUNTIME__;
    const now = Date.now();

    assert(doc.querySelector('meta[content="m4-03-additive-reserve-v1"]'), 'Additive reserve marker missing');

    const goalA = savings.create({ name: 'Отпуск — не уменьшать', targetAmount: 1800, savedAmount: 200, targetDate: '' });
    const goalB = savings.create({ name: 'Автомобиль — не уменьшать', targetAmount: 1200, savedAmount: 300, targetDate: '' });
    assert(goalA.ok && goalB.ok, 'Control goals were not created');
    assert(savings.setPlan(goalA.goal.id, { planningMode: 'fixed_contribution', monthlyContribution: 120, contributionDay: 1 }).ok, 'Control plan A failed');
    assert(savings.setPlan(goalB.goal.id, { planningMode: 'fixed_contribution', monthlyContribution: 80, contributionDay: 1 }).ok, 'Control plan B failed');

    const beforeA = savings.plan(goalA.goal.id);
    const beforeB = savings.plan(goalB.goal.id);
    const beforeOverrides = api.budget.state().overrides.length;
    const proposal = reserveApi.proposal();

    assert(proposal.fundingMode === 'additional_contribution', 'Reserve funding mode is not additive');
    assert(Array.isArray(proposal.sourceItems) && proposal.sourceItems.length === 0, 'Reserve still reduces other goals');
    assert(proposal.reviewThreshold === 0.33, '33 percent review threshold missing');
    assert(proposal.explanation.includes('не уменьшает целевые отчисления'), 'Additive explanation missing');

    const rejected = reserveApi.apply({ ...proposal, userTargetAmount: proposal.recommendedTargetAmount, userMonthlyContribution: 50 }, [proposal.createItemId]);
    assert(!rejected.ok, 'Reserve was applied without separate contribution confirmation');

    const applied = reserveApi.apply({ ...proposal, userTargetAmount: proposal.recommendedTargetAmount, userMonthlyContribution: 50 }, [proposal.createItemId, proposal.contributionItemId]);
    assert(applied.ok, 'Confirmed additive reserve could not be applied: ' + (applied.error || 'unknown'));
    assert(applied.overrides.length === 0, 'Additive reserve created contribution overrides');
    assert(api.budget.state().overrides.length === beforeOverrides, 'Existing goal overrides changed');

    const afterA = savings.plan(goalA.goal.id);
    const afterB = savings.plan(goalB.goal.id);
    assert(afterA.monthlyContribution === beforeA.monthlyContribution, 'Goal A contribution was reduced');
    assert(afterB.monthlyContribution === beforeB.monthlyContribution, 'Goal B contribution was reduced');

    const policy = reserveApi.policy();
    assert(policy?.fundingMode === 'additional_contribution', 'Reserve policy funding mode missing');
    assert(policy.monthlyContribution === 50, 'Reserve monthly contribution was not stored');
    assert(policy.reviewThreshold === 0.33, 'Reserve policy review threshold missing');

    const state = runtime.state;
    for (let index = 0; index < 3; index += 1) {
      const seeded = win.FamilyPilotObligations.createRule(state, {
        name: 'Изменение условий резерва ' + index,
        amount: 999999.99,
        dueAt: now + (10 + index) * 86400000,
        cadence: 'once',
        walletId: 'wallet-household-main',
        categoryId: 'expense-reserve-review',
        currency: 'EUR',
      }, state.currentMemberId, now + index);
      assert(seeded.ok, 'Review-trigger obligation failed: ' + seeded.error);
    }
    runtime.save();
    runtime.renderAll();

    const changed = reserveApi.proposal();
    assert(changed.reviewRequired === true, '33 percent recommendation-change review was not triggered');
    assert(changed.recommendationChangeRatio >= 0.33, 'Recommendation change ratio is below threshold');

    reserveApi.render();
    const card = doc.getElementById('budgetReserveCard');
    const cardText = text(card);
    assert(cardText.includes('Отдельное дополнительное накопление'), 'Correct reserve explanation is absent from UI');
    assert(cardText.includes('Другие цели не уменьшаются'), 'UI does not protect other goals explicitly');
    assert(cardText.includes('33%'), 'Review threshold is absent from UI');
    assert(!cardText.includes('берёт 5% от незамороженных взносов'), 'Superseded diversion text remains visible');
    assert(runtimeErrors.length === 0, 'Runtime exceptions: ' + runtimeErrors.join(' | '));

    result.textContent = JSON.stringify({
      status: 'PASS',
      marker: '${marker}',
      additiveReserve: true,
      otherGoalsUnchanged: true,
      noContributionOverrides: true,
      separateItemConfirmation: true,
      recommendationReviewThreshold: 0.33,
      reviewTriggered: true,
      runtimeExceptions: [],
    }, null, 2);
    document.body.dataset.status = 'PASS';
  }

  frame.addEventListener('load', () => run().catch(error => {
    result.textContent = String(error?.stack || error);
    document.body.dataset.status = 'FAIL';
  }), { once: true });
})();
</script>
</body>
</html>`;

writeFileSync(harnessPath, harness);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.css': 'text/css; charset=utf-8',
};

const server = createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const raw = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
    const target = normalize(resolve(root, raw));
    if (target !== root && !target.startsWith(root + sep)) throw new Error('Forbidden');
    const body = readFileSync(target);
    res.writeHead(200, { 'content-type': mime[extname(target)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    if (!res.headersSent) res.writeHead(404);
    res.end('Not found');
  }
});

const chrome = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find(existsSync);
if (!chrome) throw new Error('Chrome/Chromium is not installed');

const runChrome = url => new Promise((resolveRun, rejectRun) => {
  const child = spawn(chrome, [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    `--user-data-dir=${profilePath}`,
    '--virtual-time-budget=100000',
    '--dump-dom',
    url,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  child.on('error', rejectRun);
  child.on('close', code => {
    if (code === 0) resolveRun(stdout);
    else rejectRun(new Error(`Chrome exited ${code}\n${stderr}`));
  });
});

await new Promise((resolveListen, rejectListen) => {
  server.once('error', rejectListen);
  server.listen(0, '127.0.0.1', resolveListen);
});

try {
  const { port } = server.address();
  const output = await runChrome(`http://127.0.0.1:${port}/${harnessName}`);
  const match = output.match(/<pre id="result">([\s\S]*?)<\/pre>/);
  const decoded = (match?.[1] || '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  if (!output.includes('data-status="PASS"') || !output.includes(marker)) {
    throw new Error(`M4-03 additive reserve smoke failed\n${decoded || output.slice(-16000)}`);
  }
  console.log(decoded);
} finally {
  await new Promise(resolveClose => server.close(resolveClose));
  if (existsSync(harnessPath)) unlinkSync(harnessPath);
  rmSync(profilePath, { recursive: true, force: true });
}

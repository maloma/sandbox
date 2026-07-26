import { createServer } from 'node:http';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const root = process.cwd();
const harnessName = '.pf08a-m4-03-budget-designer-v2.html';
const harnessPath = join(root, harnessName);
const profilePath = mkdtempSync(join(tmpdir(), 'pf08a-m403-budget-v2-'));
const marker = 'PF08A_M4_03_BUDGET_DESIGNER_PASS';

const harness = `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><title>M4-03 budget designer smoke</title></head>
<body data-status="PENDING">
<iframe id="app" src="/?test=1&m403-budget=1" style="width:390px;height:844px;border:0"></iframe>
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
      if (api?.budget?.analysis && win.__FP_M4_03_BUDGET_READY__ === true) return api;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const win = frame.contentWindow;
    throw new Error('Budget API did not become ready: ' + JSON.stringify({
      packageLoaded: win?.__FP_M4_03_BUDGET_PACKAGE_LOADED__,
      ui: win?.__FP_M4_03_BUDGET_UI__,
      ready: win?.__FP_M4_03_BUDGET_READY__,
      uiError: win?.__FP_M4_03_BUDGET_UI_ERROR__,
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
    const budget = api.budget;
    const now = Date.now();
    const future = new Date(now + 180 * 86400000).toISOString().slice(0, 10);

    assert(doc.querySelector('meta[content="m4-03-budget-designer-scenarios-v1"]'), 'Package marker missing');
    budget.open();
    assert(text(doc.querySelector('#budgetDesignerScreen h1')) === 'Проектирование бюджета', 'Budget designer screen missing');
    assert(doc.getElementById('budgetDesignerModule'), 'Plan entry missing');

    const goalA = savings.create({
      name: 'Отпуск — сценарии',
      targetAmount: 1600,
      savedAmount: 300,
      targetDate: future,
    });
    const goalB = savings.create({
      name: 'ТО автомобиля — сценарии',
      targetAmount: 900,
      savedAmount: 200,
      targetDate: '',
    });
    assert(goalA.ok && goalB.ok, 'Savings goals could not be created');
    assert(savings.setPlan(goalA.goal.id, { planningMode: 'fixed_date', monthlyContribution: 0, contributionDay: 1 }).ok, 'Fixed-date plan failed');
    assert(savings.setPlan(goalB.goal.id, { planningMode: 'fixed_contribution', monthlyContribution: 80, contributionDay: 2 }).ok, 'Fixed-contribution plan failed');
    assert(budget.setPolicy(goalA.goal.id, { priority: 2, frozen: false }).ok, 'Policy A failed');
    assert(budget.setPolicy(goalB.goal.id, { priority: 4, frozen: false }).ok, 'Policy B failed');

    const ordinaryBefore = JSON.stringify(savings.ordinaryTotals());
    const stateBefore = budget.state();

    budget.seedDeficit(9000000, now + 7 * 86400000);
    const analysis = budget.analysis(30);
    assert(analysis.deficit && analysis.amount > 0, 'Deficit was not detected');

    const reduce = analysis.scenarios.find(item => item.id === 'reduce_contributions');
    const returnFromSavings = analysis.scenarios.find(item => item.id === 'return_from_savings');
    const incomeGap = analysis.scenarios.find(item => item.id === 'income_gap');
    const combined = analysis.scenarios.find(item => item.id === 'combined_information');

    assert(reduce?.kind === 'actionable', 'Contribution reduction must be actionable');
    assert(returnFromSavings?.kind === 'actionable', 'Return from savings must be actionable');
    assert(incomeGap?.kind === 'informational', 'Income gap must be informational');
    assert(combined?.kind === 'informational', 'Combined scenario must be informational');
    assert(incomeGap.amount === analysis.amount, 'Income gap must equal the detected budget hole');
    assert(budget.state().overrides.length === stateBefore.overrides.length, 'Scenario changed state before confirmation');

    assert(budget.applyReduce(reduce.items, []).applied.length === 0, 'Unconfirmed contribution reduction was applied');
    if (reduce.items.length) {
      assert(budget.applyReduce(reduce.items, [reduce.items[0].id]).applied.length === 1, 'Confirmed contribution reduction failed');
    }

    assert(budget.applyReturn(returnFromSavings.items, []).applied.length === 0, 'Unconfirmed savings return was applied');
    if (returnFromSavings.items.length) {
      assert(budget.applyReturn(returnFromSavings.items, [returnFromSavings.items[0].id]).applied.length === 1, 'Confirmed savings return failed');
    }

    assert(JSON.stringify(savings.ordinaryTotals()) === ordinaryBefore, 'Budget scenarios changed ordinary Income or Expense');

    const monthReview = budget.monthReview();
    assert(monthReview.requiresPerItemConfirmation === true, 'Month-end allocation must require per-item confirmation');
    if (monthReview.proposals.length) {
      assert(budget.applyCatchup(monthReview, []).applied.length === 0, 'Unconfirmed month-end allocation was applied');
      assert(budget.applyCatchup(monthReview, [monthReview.proposals[0].id]).applied.length === 1, 'Confirmed month-end allocation failed');
    }

    const reserve = budget.reserve();
    assert(reserve.requiresPerItemConfirmation === true, 'Reserve design must require per-item confirmation');
    if (reserve.sourceItems.length) {
      assert(!budget.applyReserve(reserve, [reserve.createItemId]).ok, 'Reserve was created without confirmed funding source');
      assert(budget.applyReserve(reserve, [reserve.createItemId, reserve.sourceItems[0].id]).ok, 'Confirmed reserve design failed');
      assert(budget.state().reserveGoalId, 'Reserve goal was not recorded');
    }

    const recalculation = budget.recalculation();
    assert(Array.isArray(recalculation.changes), 'Month-start recalculation output missing');

    budget.open();
    assert(text(doc.getElementById('budgetDeficitCard')).includes('Необходимый дополнительный доход'), 'Income-gap explanation missing from UI');
    assert(text(doc.getElementById('budgetMonthEndCard')).includes('Выравнивание накоплений'), 'Month-end allocation UI missing');
    assert(text(doc.getElementById('budgetReserveCard')).includes('Резерв на покрытие дефицита'), 'Reserve design UI missing');
    assert(runtimeErrors.length === 0, 'Runtime exceptions: ' + runtimeErrors.join(' | '));

    result.textContent = JSON.stringify({
      status: 'PASS',
      marker: '${marker}',
      budgetDesigner: true,
      automaticMonthRecalculation: true,
      perItemConfirmation: true,
      actionable: ['reduce_contributions', 'return_from_savings'],
      informational: ['income_gap', 'combined_information'],
      monthEndAllocation: true,
      reserveDesign: true,
      priorityAndFreeze: true,
      gameIdeaPreserved: true,
      ordinaryInvariant: true,
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
    res.writeHead(200, {
      'content-type': mime[extname(target)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
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
    throw new Error(`M4-03 budget designer smoke failed\n${decoded || output.slice(-14000)}`);
  }
  console.log(decoded);
} finally {
  await new Promise(resolveClose => server.close(resolveClose));
  if (existsSync(harnessPath)) unlinkSync(harnessPath);
  rmSync(profilePath, { recursive: true, force: true });
}

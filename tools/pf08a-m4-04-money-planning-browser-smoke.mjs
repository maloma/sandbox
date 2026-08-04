import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const root = process.cwd();
const harnessName = '.pf08a-m4-04-money-planning-harness.html';
const harnessPath = join(root, harnessName);
const profilePath = mkdtempSync(join(tmpdir(), 'pf08a-m404-money-'));
const marker = 'PF08A_M4_04_MONEY_PLANNING_PASS';

const harness = `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><title>M4-04 money planning smoke</title></head>
<body data-status="PENDING">
<iframe id="app" src="/?test=1&m404=1" style="width:390px;height:844px;border:0"></iframe>
<pre id="result">PENDING</pre>
<script>
(() => {
  const frame = document.getElementById('app');
  const result = document.getElementById('result');
  const errors = [];
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const close = (a, b, epsilon = 0.011) => Math.abs(Number(a) - Number(b)) <= epsilon;
  const text = node => (node?.textContent || '').replace(/\\s+/g, ' ').trim();
  const dateText = value => {
    const date = new Date(value);
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  };

  async function ready() {
    const deadline = Date.now() + 50000;
    while (Date.now() < deadline) {
      const win = frame.contentWindow;
      const test = win && win.__FP_TEST__;
      if (test?.moneyPlanning?.capital && win.__FP_M4_04_READY__ === true) return test;
      await new Promise(resolveWait => setTimeout(resolveWait, 100));
    }
    const win = frame.contentWindow;
    throw new Error('M4-04 API not ready ' + JSON.stringify({
      package: win?.__FP_M4_04_PACKAGE_LOADED__,
      ui: win?.__FP_M4_04_UI__,
      ready: win?.__FP_M4_04_READY__,
      error: win?.__FP_M4_04_UI_ERROR__,
      bootstrap: win?.__FP_M4_03_BUDGET_BOOTSTRAP_ERROR__,
    }));
  }

  async function run() {
    const win = frame.contentWindow;
    win.addEventListener('error', event => errors.push(String(event.error || event.message || 'error')));
    win.addEventListener('unhandledrejection', event => errors.push(String(event.reason || 'rejection')));
    const test = await ready();
    const moneyApi = test.moneyPlanning;
    const doc = frame.contentDocument;
    const state0 = test.getState();
    const defaultWallet = state0.wallets.find(wallet => wallet.type === 'household_default');
    assert(defaultWallet, 'Default money location missing');
    assert(defaultWallet.moneyForm === 'bank' && defaultWallet.locationKind === 'bank_current', 'Default location is not bank current');
    assert(doc.querySelector('meta[content="m4-04-money-locations-savings-actions-gift-fund-v1"]'), 'M4-04 package marker missing');

    const beforeLocation = moneyApi.capital();
    const cash = moneyApi.createLocation({ name: 'Наличные дома — smoke', locationKind: 'cash_envelope', openingBalance: 200 });
    const savingsBank = moneyApi.createLocation({ name: 'Накопительный счёт — smoke', locationKind: 'bank_savings', openingBalance: 0 });
    assert(cash.ok && savingsBank.ok, 'Money locations could not be created');
    const afterLocation = moneyApi.capital();
    assert(close(afterLocation.cash - beforeLocation.cash, 200), 'Cash opening balance is not in cash capital');
    assert(close(afterLocation.total - beforeLocation.total, 200), 'Cash opening balance is not in total capital');

    const goal = test.savings.create({ name: 'Цель без двойного счёта — smoke', targetAmount: 500, savedAmount: 50, targetDate: '' });
    assert(goal.ok, 'Purpose goal creation failed');
    const totalBeforeAssignment = moneyApi.capital().total;
    const assignment = moneyApi.setPurposeLocation(goal.goal.id, cash.wallet.id);
    assert(assignment.ok, 'Purpose location assignment failed');
    assert(close(moneyApi.capital().total, totalBeforeAssignment), 'Purpose assignment changed capital and double-counted money');

    const ordinaryBeforeAdjustment = test.getState().operations.filter(operation => operation.status === 'active' && (operation.kind === 'income' || operation.kind === 'expense')).reduce((acc, operation) => {
      acc[operation.kind] += Number(operation.amount) || 0;
      return acc;
    }, { income: 0, expense: 0 });
    const cashBalanceBefore = moneyApi.capital().locations.find(item => item.walletId === cash.wallet.id).balance;
    const adjustment = moneyApi.adjust({ walletId: cash.wallet.id, newBalance: cashBalanceBefore - 20, note: 'Smoke reconciliation' });
    assert(adjustment.ok && adjustment.adjustment?.delta === -20, 'Neutral balance adjustment failed');
    const ordinaryAfterAdjustment = test.getState().operations.filter(operation => operation.status === 'active' && (operation.kind === 'income' || operation.kind === 'expense')).reduce((acc, operation) => {
      acc[operation.kind] += Number(operation.amount) || 0;
      return acc;
    }, { income: 0, expense: 0 });
    assert(JSON.stringify(ordinaryBeforeAdjustment) === JSON.stringify(ordinaryAfterAdjustment), 'Neutral adjustment mutated ordinary income or expense');

    const rule = moneyApi.configureRule({ percentage: 10, destinationLocationId: savingsBank.wallet.id });
    assert(rule.ok && rule.rule.percentage === 10, 'Ten-percent capital accumulation rule failed');
    assert(rule.goal.name === 'Общие накопления', 'Percentage rule destination purpose is not general capital accumulation');
    assert(rule.rule.destinationLocationId === savingsBank.wallet.id, 'Percentage rule did not retain selected physical location');

    const incomeCategory = test.createCategory('income', 'Тестовый фактический доход M4-04');
    assert(incomeCategory.ok, 'Income category creation failed');
    const incomeId = test.createOperation({ kind: 'income', amount: 1000, categoryId: incomeCategory.category.id, walletId: defaultWallet.id, note: 'M4-04 actual income' });
    assert(incomeId, 'Actual income creation failed');
    const pendingAfterIncome = moneyApi.pending();
    const incomeAction = pendingAfterIncome.find(item => item.sourceType === 'income_rule' && item.sourceId.endsWith(incomeId));
    assert(incomeAction, 'Savings reminder was not created after actual income');
    assert(close(incomeAction.plannedAmount, 100), 'Savings reminder amount is not 10% of actual income');

    const transfersBefore = test.getState().transfers.length;
    const savingsTransfersBefore = test.getState().savingsTransfers.length;
    const completion = moneyApi.complete(incomeAction.id, {
      outcome: 'full',
      sourceLocationId: defaultWallet.id,
      destinationLocationId: savingsBank.wallet.id,
      effectiveDate: Date.now(),
    });
    assert(completion.ok && completion.action.status === 'completed', 'Full planned transfer completion failed');
    assert(completion.walletTransfer && completion.purposeTransfer, 'Physical and purpose transfer records were not both created');
    assert(completion.walletTransfer.economicEventId === completion.purposeTransfer.economicEventId, 'Linked transfer records do not share one economic event');
    const afterCompletionState = test.getState();
    assert(afterCompletionState.transfers.length === transfersBefore + 1, 'Physical transfer count is wrong');
    assert(afterCompletionState.savingsTransfers.length === savingsTransfersBefore + 1, 'Purpose transfer count is wrong');
    const generalGoal = afterCompletionState.savingsGoals.find(item => item.id === afterCompletionState.specialPurposeGoalIds.generalSavings);
    assert(generalGoal && close(generalGoal.savedAmount, 100), 'General savings balance was not increased');
    const ordinaryAfterTransfer = afterCompletionState.operations.filter(operation => operation.status === 'active' && (operation.kind === 'income' || operation.kind === 'expense')).reduce((acc, operation) => {
      acc[operation.kind] += Number(operation.amount) || 0;
      return acc;
    }, { income: 0, expense: 0 });
    assert(close(ordinaryAfterTransfer.income - ordinaryAfterAdjustment.income, 1000), 'Actual income changed incorrectly');
    assert(close(ordinaryAfterTransfer.expense, ordinaryAfterAdjustment.expense), 'Savings transfer became ordinary expense');

    const birthdayA = moneyApi.createBirthday({ name: 'Близкий человек A', birthDate: dateText(Date.now() + 20 * 86400000), relationship: 'семья', budget: 120, leadDays: 14 });
    const birthdayB = moneyApi.createBirthday({ name: 'Близкий человек B', birthDate: dateText(Date.now() + 50 * 86400000), relationship: 'друзья', budget: 120, leadDays: 20 });
    assert(birthdayA.ok && birthdayB.ok, 'Birthday events could not be created');
    const gift = moneyApi.giftRecommendation();
    assert(close(gift.annualTotal, 240), 'Gift annual budget is wrong');
    assert(close(gift.baseContribution, 20), 'Gift stable monthly base is not annual total divided by 12');
    assert(gift.catchupContribution > 0 && gift.monthlyContribution > gift.baseContribution, 'Near-term birthday catch-up was not calculated');
    const rejectedGift = moneyApi.applyGift({ locationId: cash.wallet.id }, [gift.goalConfirmationId]);
    assert(!rejectedGift.ok, 'Gift plan applied without separate contribution confirmation');
    const appliedGift = moneyApi.applyGift({ locationId: cash.wallet.id }, [gift.goalConfirmationId, gift.contributionConfirmationId]);
    assert(appliedGift.ok && appliedGift.goal.name === 'Фонд подарков', 'Gift fund was not created');
    assert(close(appliedGift.plan.monthlyContribution, gift.monthlyContribution), 'Gift fund hybrid contribution was not saved');

    moneyApi.openMoney();
    const moneyText = text(doc.getElementById('moneyLocationsScreen'));
    assert(moneyText.includes('Хотите регулярно откладывать часть полученного дохода?'), 'Accepted onboarding question is missing');
    assert(moneyText.includes('Назначение всегда одно: общие накопления капитала'), 'Rule incorrectly asks for another purpose');
    assert(doc.querySelector('#moneyLocationsScreen [data-m404-adjust]'), 'Neutral adjustment UI is missing');
    moneyApi.openGifts();
    const giftText = text(doc.getElementById('giftPlanningScreen'));
    assert(giftText.includes('Фонд подарков') && giftText.includes('Временная надбавка'), 'Gift fund hybrid UI is missing');
    test.savings.openList();
    const savingsText = text(doc.getElementById('savingsGoalsScreen'));
    for (const label of ['Выполнено полностью', 'Выполнено частично', 'Другая сумма', 'Не выполнено', 'Перенести']) assert(savingsText.includes(label), 'Missing action label: ' + label);
    assert(!savingsText.includes('Другой результат'), 'Superseded action label is still visible');
    assert(text(doc.body).includes('Резерв (непредвиденные расходы)'), 'Reserve wording was not updated');

    const finalCapital = moneyApi.capital();
    assert(finalCapital.cash >= 0 && finalCapital.bank >= 0 && finalCapital.total >= finalCapital.investments, 'Capital breakdown is invalid');
    assert(close(finalCapital.total, finalCapital.cash + finalCapital.bank + finalCapital.investments), 'Capital breakdown does not reconcile');
    assert(errors.length === 0, 'Runtime exceptions: ' + errors.join(' | '));

    result.textContent = JSON.stringify({
      status: 'PASS',
      marker: '${marker}',
      twoLayerModel: true,
      cashAndBankCapital: true,
      noPurposeDoubleCount: true,
      neutralBalanceAdjustment: true,
      percentageReminderAfterActualIncome: true,
      generalCapitalSavingsOnly: true,
      selectedCashOrBankLocation: true,
      acceptedCompletionActions: true,
      linkedPhysicalAndPurposeTransfer: true,
      reserveLabel: 'Резерв (непредвиденные расходы)',
      birthdayPlanning: true,
      giftFundStableBaseAndCatchup: true,
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

writeFileSync(harnessPath, harness, 'utf8');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
const server = createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const raw = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
    const target = normalize(resolve(root, raw));
    if (target !== root && !target.startsWith(root + sep)) throw new Error('Forbidden');
    res.writeHead(200, { 'content-type': mime[extname(target)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(target));
  } catch {
    if (!res.headersSent) res.writeHead(404);
    res.end('Not found');
  }
});
const chrome = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
if (!chrome) throw new Error('Chrome/Chromium is not installed');
const runChrome = url => new Promise((resolveRun, rejectRun) => {
  const child = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', `--user-data-dir=${profilePath}`, '--virtual-time-budget=120000', '--dump-dom', url], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  child.on('error', rejectRun);
  child.on('close', code => code === 0 ? resolveRun(stdout) : rejectRun(new Error(`Chrome exited ${code}\n${stderr}`)));
});
await new Promise((resolveListen, rejectListen) => { server.once('error', rejectListen); server.listen(0, '127.0.0.1', resolveListen); });
try {
  const output = await runChrome(`http://127.0.0.1:${server.address().port}/${harnessName}`);
  const match = output.match(/<pre id="result">([\s\S]*?)<\/pre>/);
  const decoded = (match?.[1] || '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  if (!output.includes('data-status="PASS"') || !output.includes(marker)) throw new Error(`M4-04 money planning smoke failed\n${decoded || output.slice(-16000)}`);
  console.log(decoded);
} finally {
  await new Promise(resolveClose => server.close(resolveClose));
  if (existsSync(harnessPath)) unlinkSync(harnessPath);
  rmSync(profilePath, { recursive: true, force: true });
}

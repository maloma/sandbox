import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(here, 'pf08a-m4-03-budget-designer-browser-smoke-v2.mjs');
const patchedPath = join(here, '.pf08a-m4-03-budget-safety-smoke-patched.mjs');
let source = readFileSync(sourcePath, 'utf8');

source = source.replace('savedAmount: 300,', 'savedAmount: 0,');
source = source.replace('savedAmount: 200,', 'savedAmount: 0,');

const goalsNeedle = "    assert(goalA.ok && goalB.ok, 'Savings goals could not be created');";
const goalsReplacement = `${goalsNeedle}
    const truthLocation = win.FamilyPilotSavingsTruth.eligibleLocations(win.__FP_RUNTIME__.state)[0];
    assert(truthLocation, 'Canonical savings location is unavailable');
    assert(api.savingsTruth.allocate(goalA.goal.id, truthLocation.id, 300).ok, 'Canonical allocation A failed');
    assert(api.savingsTruth.allocate(goalB.goal.id, truthLocation.id, 200).ok, 'Canonical allocation B failed');`;

const returnNeedle = "      assert(budget.applyReturn(returnFromSavings.items, [returnFromSavings.items[0].id]).applied.length === 1, 'Confirmed savings return failed');";
const returnReplacement = `      const returnResult = budget.applyReturn(returnFromSavings.items, [returnFromSavings.items[0].id]);
      assert(returnResult.applied.length === 1, 'Confirmed savings return failed: ' + JSON.stringify(returnResult.errors || []));`;

const seedNeedle = '    budget.seedDeficit(9000000, now + 7 * 86400000);';
const seedReplacement = `    const runtimeState = win.__FP_RUNTIME__.state;
    for (let index = 0; index < 5; index += 1) {
      const seeded = win.FamilyPilotObligations.createRule(runtimeState, {
        name: 'Тестовый дефицит ' + index,
        amount: 999999.99,
        dueAt: now + (7 + index % 3) * 86400000,
        cadence: 'once',
        walletId: 'wallet-household-main',
        categoryId: 'expense-budget-test',
        currency: 'EUR',
      }, runtimeState.currentMemberId, now + index);
      assert(seeded.ok, 'Test deficit obligation could not be created: ' + seeded.error);
    }
    win.__FP_RUNTIME__.save();
    win.__FP_RUNTIME__.renderAll();`;
const reviewNeedle = '    const monthReview = budget.monthReview();';
const reviewReplacement = `    const monthReview = budget.monthReview();
    assert(monthReview.safetyBasis === '30_day_minimum_operating', 'Month-end remainder is not protected by next-30-day forecast');
    assert(monthReview.operatingRemainder <= monthReview.rawOperatingRemainder, 'Safe remainder exceeds raw operating remainder');
    assert(monthReview.operatingRemainder <= Math.max(0, monthReview.next30DayMinimumOperating), 'Catch-up allocation exceeds safe projected minimum');`;
const reserveNeedle = '    const reserve = budget.reserve();';
const reserveReplacement = `    const reserve = budget.reserve();
    assert(reserve.targetAmount <= reserve.targetLimit, 'Reserve target exceeds supported savings-goal limit');`;

for (const [needle, replacement] of [
  [goalsNeedle, goalsReplacement],
  [returnNeedle, returnReplacement],
  [seedNeedle, seedReplacement],
  [reviewNeedle, reviewReplacement],
  [reserveNeedle, reserveReplacement],
]) {
  if (!source.includes(needle)) throw new Error(`Expected smoke fragment was not found: ${needle}`);
  source = source.replace(needle, replacement);
}

writeFileSync(patchedPath, source, 'utf8');
try {
  await new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [patchedPath], { stdio: 'inherit' });
    child.on('error', rejectRun);
    child.on('close', code => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`M4-03 budget safety smoke exited ${code}`));
    });
  });
} finally {
  if (existsSync(patchedPath)) rmSync(patchedPath, { force: true });
}

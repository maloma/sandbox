import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(here, 'pf08a-m4-03-budget-designer-browser-smoke-v2.mjs');
const patchedPath = join(here, '.pf08a-m4-03-budget-designer-browser-smoke-patched.mjs');
const source = readFileSync(sourcePath, 'utf8');
const needle = '    budget.seedDeficit(9000000, now + 7 * 86400000);';
const replacement = `    const runtimeState = win.__FP_RUNTIME__.state;
    for (let index = 0; index < 20; index += 1) {
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

if (!source.includes(needle)) throw new Error('Expected deficit seed line was not found');
writeFileSync(patchedPath, source.replace(needle, replacement), 'utf8');

try {
  await new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [patchedPath], { stdio: 'inherit' });
    child.on('error', rejectRun);
    child.on('close', code => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`Patched M4-03 budget smoke exited ${code}`));
    });
  });
} finally {
  if (existsSync(patchedPath)) rmSync(patchedPath, { force: true });
}

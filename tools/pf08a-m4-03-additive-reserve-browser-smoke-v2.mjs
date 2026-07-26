import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(here, 'pf08a-m4-03-additive-reserve-browser-smoke.mjs');
const patchedPath = join(here, '.pf08a-m4-03-additive-reserve-browser-smoke-patched.mjs');
let source = readFileSync(sourcePath, 'utf8');

const replacements = [
  [
    '    const beforeA = savings.plan(goalA.goal.id);',
    '    const beforeA = win.FamilyPilotSavingsAccounts.planFor(runtime.state, goalA.goal.id);',
  ],
  [
    '    const beforeB = savings.plan(goalB.goal.id);',
    '    const beforeB = win.FamilyPilotSavingsAccounts.planFor(runtime.state, goalB.goal.id);',
  ],
  [
    '    const afterA = savings.plan(goalA.goal.id);',
    '    const afterA = win.FamilyPilotSavingsAccounts.planFor(runtime.state, goalA.goal.id);',
  ],
  [
    '    const afterB = savings.plan(goalB.goal.id);',
    '    const afterB = win.FamilyPilotSavingsAccounts.planFor(runtime.state, goalB.goal.id);',
  ],
];

for (const [needle, replacement] of replacements) {
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
      else rejectRun(new Error(`Patched additive reserve smoke exited ${code}`));
    });
  });
} finally {
  if (existsSync(patchedPath)) rmSync(patchedPath, { force: true });
}

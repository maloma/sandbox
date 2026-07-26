import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(here, 'pf08a-m4-04-money-planning-browser-smoke.mjs');
const patchedPath = join(here, '.pf08a-m4-04-money-planning-browser-smoke-patched.mjs');
let source = readFileSync(sourcePath, 'utf8');
const oldAssertion = "    assert(moneyText.includes('Корректировка остатка'), 'Neutral adjustment UI is missing');";
const newAssertion = "    assert(moneyText.includes('Сверка остатков') && doc.getElementById('m404AdjustmentModal')?.textContent.includes('Корректировка остатка'), 'Neutral adjustment UI is missing');";
if (!source.includes(oldAssertion)) throw new Error('Expected neutral-adjustment assertion not found');
source = source.replace(oldAssertion, newAssertion);
writeFileSync(patchedPath, source, 'utf8');
try {
  await new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [patchedPath], { stdio: 'inherit' });
    child.on('error', rejectRun);
    child.on('close', code => code === 0 ? resolveRun() : rejectRun(new Error(`M4-04 patched smoke exited ${code}`)));
  });
} finally {
  if (existsSync(patchedPath)) rmSync(patchedPath, { force: true });
}

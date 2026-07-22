import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const publicUrl = process.env.PUBLIC_URL || 'https://maloma.github.io/sandbox/';
const expectedMain = process.env.EXPECTED_MAIN || 'd2be5fe98dc44d635f30c857659fcad562fe54c4';
const evidenceArgument = process.argv.find(argument => argument.startsWith('--evidence='));
const evidencePath = evidenceArgument ? evidenceArgument.slice('--evidence='.length) : null;
const localSmoke = resolve('tools/pf08a-m3-01-browser-smoke.mjs');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const sleep = milliseconds => new Promise(resolveSleep => setTimeout(resolveSleep, milliseconds));

async function fetchPublishedPackage() {
  let last = { status: 0, body: '' };
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const token = `${expectedMain}-${attempt}-${Date.now()}`;
    try {
      const [htmlResponse, scopeResponse, analyticsResponse, obligationsResponse] = await Promise.all([
        fetch(`${publicUrl}?v=${encodeURIComponent(token)}`, { redirect: 'follow', cache: 'no-store' }),
        fetch(new URL(`familypilot-scope.js?v=${encodeURIComponent(token)}`, publicUrl), { redirect: 'follow', cache: 'no-store' }),
        fetch(new URL(`familypilot-analytics-state.js?v=${encodeURIComponent(token)}`, publicUrl), { redirect: 'follow', cache: 'no-store' }),
        fetch(new URL(`familypilot-obligations.js?v=${encodeURIComponent(token)}`, publicUrl), { redirect: 'follow', cache: 'no-store' })
      ]);
      const [html, scope, analytics, obligations] = await Promise.all([
        htmlResponse.text(), scopeResponse.text(), analyticsResponse.text(), obligationsResponse.text()
      ]);
      last = { status: htmlResponse.status, body: html };
      const ready = htmlResponse.status === 200
        && scopeResponse.status === 200
        && analyticsResponse.status === 200
        && obligationsResponse.status === 200
        && html.includes('plan-obligations-foundation-v1')
        && html.includes('hidden-capital-disclosure-v1')
        && html.includes('compact-analytics-states-v1')
        && html.includes('data-plan-module="obligations"')
        && html.includes('<script src="./familypilot-obligations.js"></script>')
        && scope.includes('FamilyPilotScope')
        && analytics.includes('FamilyPilotAnalyticsState')
        && obligations.includes('FamilyPilotObligations')
        && !html.includes('Модуль будет подключён отдельным пакетом.')
        && !html.includes("fetch('./src/familypilot.html")
        && !html.includes('document.write(source)');
      if (ready) {
        return {
          attempts: attempt,
          htmlStatus: htmlResponse.status,
          scopeStatus: scopeResponse.status,
          analyticsStatus: analyticsResponse.status,
          obligationsStatus: obligationsResponse.status,
          html,
          scope,
          analytics,
          obligations
        };
      }
    } catch (error) {
      last = { status: 0, body: String(error) };
    }
    await sleep(10000);
  }
  throw new Error(`Published M3 package did not become ready. Last status ${last.status}: ${last.body.slice(0, 1200)}`);
}

function runBrowserSmoke(directory) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [localSmoke], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      rejectRun(new Error(`Public M3 Chrome smoke timed out. stderr: ${stderr.slice(-3000)}`));
    }, 90000);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', error => { clearTimeout(timeout); rejectRun(error); });
    child.once('close', code => {
      clearTimeout(timeout);
      if (code !== 0) rejectRun(new Error(`Public M3 Chrome smoke exited ${code}. stderr: ${stderr.slice(-5000)} stdout: ${stdout.slice(-5000)}`));
      else if (!stdout.includes('PF08A_M3_01_BROWSER_PASS')) rejectRun(new Error(`Public M3 PASS marker missing. stdout: ${stdout.slice(-5000)}`));
      else resolveRun({ stdout, stderr });
    });
  });
}

const published = await fetchPublishedPackage();
const directory = mkdtempSync(join(tmpdir(), 'pf08a-m3-01-public-'));
try {
  writeFileSync(join(directory, 'index.html'), published.html, 'utf8');
  writeFileSync(join(directory, 'familypilot-scope.js'), published.scope, 'utf8');
  writeFileSync(join(directory, 'familypilot-analytics-state.js'), published.analytics, 'utf8');
  writeFileSync(join(directory, 'familypilot-obligations.js'), published.obligations, 'utf8');
  const browser = await runBrowserSmoke(directory);
  const verifiedAt = new Date().toISOString();
  const result = {
    status: 'PASS',
    verified_at: verifiedAt,
    public_url: publicUrl,
    expected_main: expectedMain,
    publication_attempts: published.attempts,
    http_status: published.htmlStatus,
    scope_http_status: published.scopeStatus,
    analytics_http_status: published.analyticsStatus,
    obligations_http_status: published.obligationsStatus,
    html_sha256: sha256(published.html),
    scope_sha256: sha256(published.scope),
    analytics_sha256: sha256(published.analytics),
    obligations_sha256: sha256(published.obligations),
    browser_marker: 'PF08A_M3_01_BROWSER_PASS',
    navigation: 'Главная · Операции · План · Ещё',
    plan_hub: true,
    one_linked_expense: true,
    duplicate_payment_rejected: true,
    trash_restore_recalculated: true,
    personal_scope_isolated: true,
    hidden_capital_preserved: true,
    compact_analytics_preserved: true,
    runtime_exceptions: []
  };
  if (evidencePath) {
    const markdown = `# Public Verification — PF-08A-M3-01-PLAN-OBLIGATIONS\n\n`
      + `**Status:** PASS  \n`
      + `**Verified At:** ${verifiedAt}  \n`
      + `**Public URL:** \`${publicUrl}\`  \n`
      + `**Expected Main Commit:** \`${expectedMain}\`  \n`
      + `**HTML Status:** \`${published.htmlStatus}\`  \n`
      + `**Scope Module Status:** \`${published.scopeStatus}\`  \n`
      + `**Analytics Module Status:** \`${published.analyticsStatus}\`  \n`
      + `**Obligations Module Status:** \`${published.obligationsStatus}\`  \n`
      + `**Publication Attempts:** \`${published.attempts}\`  \n`
      + `**HTML SHA-256:** \`${result.html_sha256}\`  \n`
      + `**Scope SHA-256:** \`${result.scope_sha256}\`  \n`
      + `**Analytics SHA-256:** \`${result.analytics_sha256}\`  \n`
      + `**Obligations SHA-256:** \`${result.obligations_sha256}\`  \n\n`
      + `## Assertions\n\n`
      + `- bottom navigation remains \`Главная · Операции · План · Ещё\` — PASS;\n`
      + `- Plan root exposes Obligations and honest unavailable Debts/Savings entries — PASS;\n`
      + `- one-time obligation rule and occurrence creation — PASS;\n`
      + `- payment creates exactly one linked Expense — PASS;\n`
      + `- duplicate payment is rejected — PASS;\n`
      + `- linked Expense participates in Analytics source operations — PASS;\n`
      + `- Trash invalidates and restore reestablishes paid projection — PASS;\n`
      + `- personal obligation does not leak into household scope — PASS;\n`
      + `- hidden Capital remains closed and undisclosed by default — PASS;\n`
      + `- compact Analytics remains operational — PASS;\n`
      + `- runtime exceptions — NONE.\n\n`
      + `## Browser Output\n\n\`\`\`text\n${browser.stdout.trim()}\n\`\`\`\n\n# END OF FILE\n`;
    writeFileSync(evidencePath, markdown, 'utf8');
  }
  console.log(JSON.stringify(result, null, 2));
} finally {
  rmSync(directory, { recursive: true, force: true });
}

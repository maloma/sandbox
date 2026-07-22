import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const publicUrl = process.env.PUBLIC_URL || 'https://maloma.github.io/sandbox/';
const expectedMain = process.env.EXPECTED_MAIN || '3b62f927d7728d5c05bb3dd3e3e649974a9cb441';
const evidenceArgument = process.argv.find(argument => argument.startsWith('--evidence='));
const evidencePath = evidenceArgument ? evidenceArgument.slice('--evidence='.length) : null;
const localSmoke = resolve('tools/pf08a-priv01-browser-smoke.mjs');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const sleep = milliseconds => new Promise(resolveSleep => setTimeout(resolveSleep, milliseconds));

async function fetchPublishedPackage() {
  let last = { status: 0, body: '' };
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const token = `${expectedMain}-${attempt}-${Date.now()}`;
    try {
      const [htmlResponse, scopeResponse, analyticsResponse] = await Promise.all([
        fetch(`${publicUrl}?v=${encodeURIComponent(token)}`, { redirect: 'follow', cache: 'no-store' }),
        fetch(new URL(`familypilot-scope.js?v=${encodeURIComponent(token)}`, publicUrl), { redirect: 'follow', cache: 'no-store' }),
        fetch(new URL(`familypilot-analytics-state.js?v=${encodeURIComponent(token)}`, publicUrl), { redirect: 'follow', cache: 'no-store' })
      ]);
      const [html, scope, analytics] = await Promise.all([
        htmlResponse.text(), scopeResponse.text(), analyticsResponse.text()
      ]);
      last = { status: htmlResponse.status, body: html };
      const ready = htmlResponse.status === 200
        && scopeResponse.status === 200
        && analyticsResponse.status === 200
        && html.includes('hidden-capital-disclosure-v1')
        && html.includes('<button id="capitalRevealBtn"')
        && !html.includes('id="capitalValue"')
        && !html.includes('id="capitalChange"')
        && html.includes('<script src="./familypilot-scope.js"></script>')
        && html.includes('<script src="./familypilot-analytics-state.js"></script>')
        && scope.includes('FamilyPilotScope')
        && analytics.includes('FamilyPilotAnalyticsState')
        && !html.includes("fetch('./src/familypilot.html")
        && !html.includes('document.write(source)');
      if (ready) {
        return {
          attempts: attempt,
          htmlStatus: htmlResponse.status,
          scopeStatus: scopeResponse.status,
          analyticsStatus: analyticsResponse.status,
          html,
          scope,
          analytics
        };
      }
    } catch (error) {
      last = { status: 0, body: String(error) };
    }
    await sleep(10000);
  }
  throw new Error(`Published hidden Capital package did not become ready. Last status ${last.status}: ${last.body.slice(0, 1000)}`);
}

function runBrowserSmoke(directory) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [localSmoke], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      rejectRun(new Error(`Public hidden Capital Chrome smoke timed out. stderr: ${stderr.slice(-3000)}`));
    }, 70000);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', error => { clearTimeout(timeout); rejectRun(error); });
    child.once('close', code => {
      clearTimeout(timeout);
      if (code !== 0) rejectRun(new Error(`Public hidden Capital Chrome smoke exited ${code}. stderr: ${stderr.slice(-5000)}`));
      else if (!stdout.includes('PF08A_PRIV01_BROWSER_PASS')) rejectRun(new Error(`Public hidden Capital PASS marker missing. stdout: ${stdout.slice(-5000)}`));
      else resolveRun({ stdout, stderr });
    });
  });
}

const published = await fetchPublishedPackage();
const directory = mkdtempSync(join(tmpdir(), 'pf08a-priv01-public-'));
try {
  writeFileSync(join(directory, 'index.html'), published.html, 'utf8');
  writeFileSync(join(directory, 'familypilot-scope.js'), published.scope, 'utf8');
  writeFileSync(join(directory, 'familypilot-analytics-state.js'), published.analytics, 'utf8');
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
    html_sha256: sha256(published.html),
    scope_sha256: sha256(published.scope),
    analytics_sha256: sha256(published.analytics),
    visible_main_text: 'Капитал',
    main_capital_values_exposed: false,
    browser_marker: 'PF08A_PRIV01_BROWSER_PASS',
    runtime_exceptions: []
  };
  if (evidencePath) {
    const markdown = `# Public Verification — PF-08A-PRIV-01-HIDDEN-CAPITAL\n\n`
      + `**Status:** PASS  \n`
      + `**Verified At:** ${verifiedAt}  \n`
      + `**Public URL:** \`${publicUrl}\`  \n`
      + `**Expected Main Commit:** \`${expectedMain}\`  \n`
      + `**HTTP Status:** \`${published.htmlStatus}\`  \n`
      + `**Scope Module HTTP Status:** \`${published.scopeStatus}\`  \n`
      + `**Analytics Module HTTP Status:** \`${published.analyticsStatus}\`  \n`
      + `**Publication Attempts:** \`${published.attempts}\`  \n`
      + `**HTML SHA-256:** \`${result.html_sha256}\`  \n`
      + `**Scope Module SHA-256:** \`${result.scope_sha256}\`  \n`
      + `**Analytics Module SHA-256:** \`${result.analytics_sha256}\`  \n\n`
      + `## Assertions\n\n`
      + `- first Main control visible text exactly \`Капитал\` — PASS;\n`
      + `- no Capital amount, change, graph, dates or visible wallet label on Main — PASS;\n`
      + `- Capital overlay closed on load and after dismiss — PASS;\n`
      + `- household Capital appears only after explicit press — PASS;\n`
      + `- personal Capital appears only after explicit press — PASS;\n`
      + `- household and personal details remain isolated — PASS;\n`
      + `- compact Analytics and wallet scope foundations remain operational — PASS;\n`
      + `- runtime exceptions — NONE.\n\n`
      + `## Browser Output\n\n\`\`\`text\n${browser.stdout.trim()}\n\`\`\`\n\n# END OF FILE\n`;
    writeFileSync(evidencePath, markdown, 'utf8');
  }
  console.log(JSON.stringify(result, null, 2));
} finally {
  rmSync(directory, { recursive: true, force: true });
}

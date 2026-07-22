import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const publicUrl=process.env.PUBLIC_URL||'https://maloma.github.io/sandbox/';
const expectedMain=process.env.EXPECTED_MAIN_M2_01||'9fecb7bad53e2de5481fbac745689afa9db8537a';
const evidenceArgument=process.argv.find(argument=>argument.startsWith('--evidence='));
const evidencePath=evidenceArgument?evidenceArgument.slice('--evidence='.length):null;
const localSmoke=resolve('tools/pf08a-m2-01-browser-smoke.mjs');
const sha256=value=>createHash('sha256').update(value).digest('hex');
const sleep=milliseconds=>new Promise(resolveSleep=>setTimeout(resolveSleep,milliseconds));

async function fetchPublishedPackage(){
  let last={status:0,body:''};
  for(let attempt=1;attempt<=30;attempt+=1){
    const token=`${expectedMain}-${attempt}-${Date.now()}`;
    try{
      const responses=await Promise.all([
        fetch(`${publicUrl}?v=${encodeURIComponent(token)}`,{redirect:'follow',cache:'no-store'}),
        fetch(new URL(`familypilot-scope.js?v=${encodeURIComponent(token)}`,publicUrl),{redirect:'follow',cache:'no-store'}),
        fetch(new URL(`familypilot-analytics-state.js?v=${encodeURIComponent(token)}`,publicUrl),{redirect:'follow',cache:'no-store'}),
        fetch(new URL(`familypilot-obligations.js?v=${encodeURIComponent(token)}`,publicUrl),{redirect:'follow',cache:'no-store'}),
        fetch(new URL(`familypilot-obligations-ui-v2.js?v=${encodeURIComponent(token)}`,publicUrl),{redirect:'follow',cache:'no-store'}),
        fetch(new URL(`familypilot-debts.js?v=${encodeURIComponent(token)}`,publicUrl),{redirect:'follow',cache:'no-store'}),
        fetch(new URL(`familypilot-debts-ui.js?v=${encodeURIComponent(token)}`,publicUrl),{redirect:'follow',cache:'no-store'})
      ]);
      const [html,scope,analytics,obligations,obligationsUi,debts,debtsUi]=await Promise.all(responses.map(response=>response.text()));
      const [htmlResponse,scopeResponse,analyticsResponse,obligationsResponse,obligationsUiResponse,debtsResponse,debtsUiResponse]=responses;
      last={status:htmlResponse.status,body:html};
      const ready=responses.every(response=>response.status===200)
        &&html.includes('debt-chains-principal-v1')
        &&html.includes('plan-obligations-foundation-v1')
        &&html.includes('hidden-capital-disclosure-v1')
        &&html.includes('compact-analytics-states-v1')
        &&html.includes('pf08a-m2-01-inline-ui:start')
        &&html.includes('id="homeDebtReceivableValue"')
        &&html.includes('id="homeDebtLiabilityValue"')
        &&html.includes('<script src="./familypilot-debts.js"></script>')
        &&!html.includes('>180 €</strong>')
        &&!html.includes('>420 €</strong>')
        &&scope.includes("operation?.kind === 'debt_inflow'")
        &&scope.includes("operation?.kind === 'debt_outflow'")
        &&analytics.includes('FamilyPilotAnalyticsState')
        &&obligations.includes('FamilyPilotObligations')
        &&obligationsUi.includes('data-m302-quick-pay')
        &&debts.includes('FamilyPilotDebts')
        &&debts.includes("derivedKind:'reciprocal'")
        &&debts.includes("derivedKind:'offset'")
        &&debtsUi.includes("section.id='debtsScreen'")
        &&debtsUi.includes('data-debt-action="borrow"')
        &&debtsUi.includes('data-debt-action="opening_receivable"')
        &&!debtsUi.includes('Additional amount above principal')
        &&!html.includes("fetch('./src/familypilot.html")
        &&!html.includes('document.write(source)');
      if(ready)return{
        attempts:attempt,
        statuses:{html:htmlResponse.status,scope:scopeResponse.status,analytics:analyticsResponse.status,obligations:obligationsResponse.status,obligationsUi:obligationsUiResponse.status,debts:debtsResponse.status,debtsUi:debtsUiResponse.status},
        html,scope,analytics,obligations,obligationsUi,debts,debtsUi
      };
    }catch(error){last={status:0,body:String(error)}}
    await sleep(10000);
  }
  throw new Error(`Published M2-01 package did not become ready. Last status ${last.status}: ${last.body.slice(0,1200)}`);
}

function runBrowserSmoke(directory){
  return new Promise((resolveRun,rejectRun)=>{
    const child=spawn(process.execPath,[localSmoke],{cwd:directory,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    const timeout=setTimeout(()=>{child.kill('SIGKILL');rejectRun(new Error(`Public M2-01 Chrome smoke timed out. stderr: ${stderr.slice(-3000)}`))},120000);
    child.stdout.on('data',chunk=>{stdout+=chunk});
    child.stderr.on('data',chunk=>{stderr+=chunk});
    child.once('error',error=>{clearTimeout(timeout);rejectRun(error)});
    child.once('close',code=>{
      clearTimeout(timeout);
      if(code!==0)rejectRun(new Error(`Public M2-01 Chrome smoke exited ${code}. stderr: ${stderr.slice(-5000)} stdout: ${stdout.slice(-5000)}`));
      else if(!stdout.includes('PF08A_M2_01_BROWSER_PASS'))rejectRun(new Error(`Public M2-01 PASS marker missing. stdout: ${stdout.slice(-5000)}`));
      else resolveRun({stdout,stderr});
    });
  });
}

const published=await fetchPublishedPackage();
const directory=mkdtempSync(join(tmpdir(),'pf08a-m2-01-public-'));
try{
  writeFileSync(join(directory,'index.html'),published.html,'utf8');
  writeFileSync(join(directory,'familypilot-scope.js'),published.scope,'utf8');
  writeFileSync(join(directory,'familypilot-analytics-state.js'),published.analytics,'utf8');
  writeFileSync(join(directory,'familypilot-obligations.js'),published.obligations,'utf8');
  writeFileSync(join(directory,'familypilot-obligations-ui-v2.js'),published.obligationsUi,'utf8');
  writeFileSync(join(directory,'familypilot-debts.js'),published.debts,'utf8');
  writeFileSync(join(directory,'familypilot-debts-ui.js'),published.debtsUi,'utf8');
  const browser=await runBrowserSmoke(directory);
  const verifiedAt=new Date().toISOString();
  const result={
    status:'PASS',verified_at:verifiedAt,public_url:publicUrl,expected_main:expectedMain,publication_attempts:published.attempts,
    http_status:published.statuses,
    html_sha256:sha256(published.html),scope_sha256:sha256(published.scope),analytics_sha256:sha256(published.analytics),
    obligations_sha256:sha256(published.obligations),obligations_ui_sha256:sha256(published.obligationsUi),
    debts_sha256:sha256(published.debts),debts_ui_sha256:sha256(published.debtsUi),browser_marker:'PF08A_M2_01_BROWSER_PASS',
    navigation:'Главная · Операции · План · Ещё',plan_debts_active:true,source_derived_home_totals:true,historical_opening:true,
    four_actions:true,principal_in_capital:true,principal_excluded_from_income_expense_analytics:true,automatic_reciprocal_debt:true,
    mutual_offset:true,source_editing:true,closed_chain_immutable:true,personal_scope_isolated:true,m3_preserved:true,
    hidden_capital_preserved:true,compact_analytics_preserved:true,runtime_exceptions:[]
  };
  if(evidencePath){
    const s=published.statuses;
    const markdown=`# Public Verification — PF-08A-M2-01-DEBT-CHAINS-PRINCIPAL\n\n`
      +`**Status:** PASS  \n**Verified At:** ${verifiedAt}  \n**Public URL:** \`${publicUrl}\`  \n**Expected Main Commit:** \`${expectedMain}\`  \n`
      +`**HTML Status:** \`${s.html}\`  \n**Scope Status:** \`${s.scope}\`  \n**Analytics Status:** \`${s.analytics}\`  \n`
      +`**Obligations Status:** \`${s.obligations}\`  \n**Obligations UI Status:** \`${s.obligationsUi}\`  \n`
      +`**Debts Status:** \`${s.debts}\`  \n**Debts UI Status:** \`${s.debtsUi}\`  \n**Publication Attempts:** \`${published.attempts}\`  \n\n`
      +`## SHA-256\n\n- HTML: \`${result.html_sha256}\`\n- Scope: \`${result.scope_sha256}\`\n- Analytics: \`${result.analytics_sha256}\`\n- Obligations: \`${result.obligations_sha256}\`\n- Obligations UI: \`${result.obligations_ui_sha256}\`\n- Debts: \`${result.debts_sha256}\`\n- Debts UI: \`${result.debts_ui_sha256}\`\n\n`
      +`## Assertions\n\n`
      +`- Plan → Debts is active — PASS;\n- Home receivable/liability totals are source-derived — PASS;\n- fabricated 180/420 values are absent — PASS;\n`
      +`- historical opening balances and four source actions — PASS;\n- debt principal changes Capital but is excluded from ordinary Income/Expense Analytics — PASS;\n`
      +`- overpayment automatically creates reciprocal debt without a dialog — PASS;\n- mutual offset leaves one net position while preserving history — PASS;\n`
      +`- active source editing recalculates linked movement with stable id — PASS;\n- closed chain is immutable and later activity creates a new chain — PASS;\n`
      +`- personal debt does not leak into household scope — PASS;\n- M3, Hidden Capital and compact Analytics remain operational — PASS;\n- runtime exceptions — NONE.\n\n`
      +`## Browser Output\n\n\`\`\`text\n${browser.stdout.trim()}\n\`\`\`\n\n# END OF FILE\n`;
    writeFileSync(evidencePath,markdown,'utf8');
  }
  console.log(JSON.stringify(result,null,2));
}finally{rmSync(directory,{recursive:true,force:true})}
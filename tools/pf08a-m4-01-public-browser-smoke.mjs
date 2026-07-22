import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const publicUrl=process.env.PUBLIC_URL||'https://maloma.github.io/sandbox/';
const expectedMain=process.env.EXPECTED_MAIN_M4_01||'f7366c0229fdc5115e38b5ea34e4c498a09e73f3';
const evidenceArgument=process.argv.find(argument=>argument.startsWith('--evidence='));
const evidencePath=evidenceArgument?evidenceArgument.slice('--evidence='.length):null;
const localSmoke=resolve('tools/pf08a-m4-01-browser-smoke.mjs');
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
        fetch(new URL(`familypilot-debts-ui.js?v=${encodeURIComponent(token)}`,publicUrl),{redirect:'follow',cache:'no-store'}),
        fetch(new URL(`familypilot-savings-goals.js?v=${encodeURIComponent(token)}`,publicUrl),{redirect:'follow',cache:'no-store'}),
        fetch(new URL(`familypilot-savings-goals-ui.js?v=${encodeURIComponent(token)}`,publicUrl),{redirect:'follow',cache:'no-store'})
      ]);
      const [html,scope,analytics,obligations,obligationsUi,debts,debtsUi,savings,savingsUi]=await Promise.all(responses.map(response=>response.text()));
      const [htmlResponse,scopeResponse,analyticsResponse,obligationsResponse,obligationsUiResponse,debtsResponse,debtsUiResponse,savingsResponse,savingsUiResponse]=responses;
      last={status:htmlResponse.status,body:html};
      const ready=responses.every(response=>response.status===200)
        &&html.includes('savings-goal-config-v1')
        &&html.includes('debt-chains-principal-v1')
        &&html.includes('plan-obligations-foundation-v1')
        &&html.includes('hidden-capital-disclosure-v1')
        &&html.includes('compact-analytics-states-v1')
        &&html.includes('pf08a-m4-01-inline-ui:start')
        &&html.includes('<script src="./familypilot-savings-goals.js"></script>')
        &&scope.includes('FamilyPilotScope')
        &&analytics.includes('FamilyPilotAnalyticsState')
        &&obligations.includes('FamilyPilotObligations')
        &&obligationsUi.includes('data-m302-quick-pay')
        &&debts.includes('FamilyPilotDebts')
        &&debtsUi.includes("section.id='debtsScreen'")
        &&savings.includes('FamilyPilotSavingsGoals')
        &&savings.includes('state.savingsGoals')
        &&savings.includes('createGoal')
        &&savings.includes('archiveGoal')
        &&!savings.includes('state.operations.push(')
        &&savingsUi.includes("section.id='savingsGoalsScreen'")
        &&savingsUi.includes('data-savings-help="target"')
        &&savingsUi.includes('data-savings-help="saved"')
        &&savingsUi.includes('data-savings-filter="archived"')
        &&!savingsUi.includes('id="savingsEmergency')
        &&!savingsUi.includes('id="savingsUnallocated')
        &&!savingsUi.includes('id="savingsTotal')
        &&!savingsUi.includes('id="savingsGoalWallet')
        &&!html.includes("fetch('./src/familypilot.html")
        &&!html.includes('document.write(source)');
      if(ready)return{
        attempts:attempt,
        statuses:{html:htmlResponse.status,scope:scopeResponse.status,analytics:analyticsResponse.status,obligations:obligationsResponse.status,obligationsUi:obligationsUiResponse.status,debts:debtsResponse.status,debtsUi:debtsUiResponse.status,savings:savingsResponse.status,savingsUi:savingsUiResponse.status},
        html,scope,analytics,obligations,obligationsUi,debts,debtsUi,savings,savingsUi
      };
    }catch(error){last={status:0,body:String(error)}}
    await sleep(10000);
  }
  throw new Error(`Published M4-01 package did not become ready. Last status ${last.status}: ${last.body.slice(0,1200)}`);
}

function runBrowserSmoke(directory){
  return new Promise((resolveRun,rejectRun)=>{
    const child=spawn(process.execPath,[localSmoke],{cwd:directory,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    const timeout=setTimeout(()=>{child.kill('SIGKILL');rejectRun(new Error(`Public M4-01 Chrome smoke timed out. stderr: ${stderr.slice(-3000)}`))},120000);
    child.stdout.on('data',chunk=>{stdout+=chunk});
    child.stderr.on('data',chunk=>{stderr+=chunk});
    child.once('error',error=>{clearTimeout(timeout);rejectRun(error)});
    child.once('close',code=>{
      clearTimeout(timeout);
      if(code!==0)rejectRun(new Error(`Public M4-01 Chrome smoke exited ${code}. stderr: ${stderr.slice(-5000)} stdout: ${stdout.slice(-5000)}`));
      else if(!stdout.includes('PF08A_M4_01_BROWSER_PASS'))rejectRun(new Error(`Public M4-01 PASS marker missing. stdout: ${stdout.slice(-5000)}`));
      else resolveRun({stdout,stderr});
    });
  });
}

const published=await fetchPublishedPackage();
const directory=mkdtempSync(join(tmpdir(),'pf08a-m4-01-public-'));
try{
  writeFileSync(join(directory,'index.html'),published.html,'utf8');
  writeFileSync(join(directory,'familypilot-scope.js'),published.scope,'utf8');
  writeFileSync(join(directory,'familypilot-analytics-state.js'),published.analytics,'utf8');
  writeFileSync(join(directory,'familypilot-obligations.js'),published.obligations,'utf8');
  writeFileSync(join(directory,'familypilot-obligations-ui-v2.js'),published.obligationsUi,'utf8');
  writeFileSync(join(directory,'familypilot-debts.js'),published.debts,'utf8');
  writeFileSync(join(directory,'familypilot-debts-ui.js'),published.debtsUi,'utf8');
  writeFileSync(join(directory,'familypilot-savings-goals.js'),published.savings,'utf8');
  writeFileSync(join(directory,'familypilot-savings-goals-ui.js'),published.savingsUi,'utf8');
  const browser=await runBrowserSmoke(directory);
  const verifiedAt=new Date().toISOString();
  const result={
    status:'PASS',verified_at:verifiedAt,public_url:publicUrl,expected_main:expectedMain,publication_attempts:published.attempts,
    http_status:published.statuses,
    html_sha256:sha256(published.html),scope_sha256:sha256(published.scope),analytics_sha256:sha256(published.analytics),
    obligations_sha256:sha256(published.obligations),obligations_ui_sha256:sha256(published.obligationsUi),
    debts_sha256:sha256(published.debts),debts_ui_sha256:sha256(published.debtsUi),
    savings_sha256:sha256(published.savings),savings_ui_sha256:sha256(published.savingsUi),browser_marker:'PF08A_M4_01_BROWSER_PASS',
    navigation:'Главная · Операции · План · Ещё',plan_savings_active:true,optional_empty_state:true,create_goal:true,
    edit_stable_id:true,archive_preserves_object:true,target_and_saved_distinct:true,contextual_help_preserves_draft:true,
    no_money_movement:true,capital_unchanged:true,ordinary_analytics_unchanged:true,household_goals_only:true,
    emergency_cushion_excluded:true,unallocated_savings_excluded:true,combined_overview_excluded:true,
    m2_preserved:true,m3_preserved:true,hidden_capital_preserved:true,compact_analytics_preserved:true,runtime_exceptions:[]
  };
  if(evidencePath){
    const s=published.statuses;
    const markdown=`# Public Verification — PF-08A-M4-01-SAVINGS-GOALS\n\n`
      +`**Status:** PASS  \n**Verified At:** ${verifiedAt}  \n**Public URL:** \`${publicUrl}\`  \n**Expected Main Commit:** \`${expectedMain}\`  \n`
      +`**HTML Status:** \`${s.html}\`  \n**Scope Status:** \`${s.scope}\`  \n**Analytics Status:** \`${s.analytics}\`  \n`
      +`**Obligations Status:** \`${s.obligations}\`  \n**Obligations UI Status:** \`${s.obligationsUi}\`  \n`
      +`**Debts Status:** \`${s.debts}\`  \n**Debts UI Status:** \`${s.debtsUi}\`  \n`
      +`**Savings Status:** \`${s.savings}\`  \n**Savings UI Status:** \`${s.savingsUi}\`  \n**Publication Attempts:** \`${published.attempts}\`  \n\n`
      +`## SHA-256\n\n- HTML: \`${result.html_sha256}\`\n- Scope: \`${result.scope_sha256}\`\n- Analytics: \`${result.analytics_sha256}\`\n`
      +`- Obligations: \`${result.obligations_sha256}\`\n- Obligations UI: \`${result.obligations_ui_sha256}\`\n`
      +`- Debts: \`${result.debts_sha256}\`\n- Debts UI: \`${result.debts_ui_sha256}\`\n`
      +`- Savings: \`${result.savings_sha256}\`\n- Savings UI: \`${result.savings_ui_sha256}\`\n\n`
      +`## Assertions\n\n`
      +`- Plan → Savings is active and all accepted Plan modules remain available — PASS;\n`
      +`- no-goal state is optional and neutral — PASS;\n`
      +`- create, edit with stable id, persistence and archive-preserved object — PASS;\n`
      +`- target amount and already-saved amount remain distinct — PASS;\n`
      +`- contextual help preserves unsaved editor values — PASS;\n`
      +`- goal configuration creates no operation or wallet movement — PASS;\n`
      +`- Capital and ordinary Income/Expense Analytics remain unchanged — PASS;\n`
      +`- goals remain household-scoped; no personal or wallet selector is introduced — PASS;\n`
      +`- emergency cushion, unallocated savings and combined overview remain excluded — PASS;\n`
      +`- M2, M3, Hidden Capital and compact Analytics remain operational — PASS;\n`
      +`- runtime exceptions — NONE.\n\n## Browser Output\n\n\`\`\`text\n${browser.stdout.trim()}\n\`\`\`\n\n# END OF FILE\n`;
    writeFileSync(evidencePath,markdown,'utf8');
  }
  console.log(JSON.stringify(result,null,2));
}finally{rmSync(directory,{recursive:true,force:true})}
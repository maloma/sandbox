import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const publicUrl=process.env.PUBLIC_URL||'https://maloma.github.io/sandbox/';
const expectedMain=process.env.EXPECTED_MAIN_M3_02||'7fd7fa09f9b4908053aa0fec27fe691f1b878705';
const evidenceArgument=process.argv.find(argument=>argument.startsWith('--evidence='));
const evidencePath=evidenceArgument?evidenceArgument.slice('--evidence='.length):null;
const localSmoke=resolve('tools/pf08a-m3-01-browser-smoke.mjs');
const sha256=value=>createHash('sha256').update(value).digest('hex');
const sleep=milliseconds=>new Promise(resolveSleep=>setTimeout(resolveSleep,milliseconds));

async function fetchPublishedPackage(){
  let last={status:0,body:''};
  for(let attempt=1;attempt<=30;attempt+=1){
    const token=`${expectedMain}-${attempt}-${Date.now()}`;
    try{
      const [htmlResponse,scopeResponse,analyticsResponse,obligationsResponse,uiResponse]=await Promise.all([
        fetch(`${publicUrl}?v=${encodeURIComponent(token)}`,{redirect:'follow',cache:'no-store'}),
        fetch(new URL(`familypilot-scope.js?v=${encodeURIComponent(token)}`,publicUrl),{redirect:'follow',cache:'no-store'}),
        fetch(new URL(`familypilot-analytics-state.js?v=${encodeURIComponent(token)}`,publicUrl),{redirect:'follow',cache:'no-store'}),
        fetch(new URL(`familypilot-obligations.js?v=${encodeURIComponent(token)}`,publicUrl),{redirect:'follow',cache:'no-store'}),
        fetch(new URL(`familypilot-obligations-ui-v2.js?v=${encodeURIComponent(token)}`,publicUrl),{redirect:'follow',cache:'no-store'})
      ]);
      const [html,scope,analytics,obligations,ui]=await Promise.all([
        htmlResponse.text(),scopeResponse.text(),analyticsResponse.text(),obligationsResponse.text(),uiResponse.text()
      ]);
      last={status:htmlResponse.status,body:html};
      const ready=htmlResponse.status===200
        &&scopeResponse.status===200
        &&analyticsResponse.status===200
        &&obligationsResponse.status===200
        &&uiResponse.status===200
        &&html.includes('plan-obligations-foundation-v1')
        &&html.includes('hidden-capital-disclosure-v1')
        &&html.includes('compact-analytics-states-v1')
        &&html.includes('pf08a-m3-02-inline-ui:start')
        &&html.includes('data-plan-module="obligations"')
        &&html.includes('<script src="./familypilot-obligations.js"></script>')
        &&scope.includes('FamilyPilotScope')
        &&analytics.includes('FamilyPilotAnalyticsState')
        &&obligations.includes('FamilyPilotObligations')
        &&obligations.includes('MAX_OCCURRENCES')
        &&ui.includes('data-m302-month')
        &&ui.includes('data-m302-quick-pay')
        &&ui.includes('starting_next')
        &&!html.includes('Модуль будет подключён отдельным пакетом.')
        &&!html.includes("fetch('./src/familypilot.html")
        &&!html.includes('document.write(source)');
      if(ready)return{attempts:attempt,htmlStatus:htmlResponse.status,scopeStatus:scopeResponse.status,analyticsStatus:analyticsResponse.status,obligationsStatus:obligationsResponse.status,uiStatus:uiResponse.status,html,scope,analytics,obligations,ui};
    }catch(error){last={status:0,body:String(error)}}
    await sleep(10000);
  }
  throw new Error(`Published M3-02 package did not become ready. Last status ${last.status}: ${last.body.slice(0,1200)}`);
}

function runBrowserSmoke(directory){
  return new Promise((resolveRun,rejectRun)=>{
    const child=spawn(process.execPath,[localSmoke],{cwd:directory,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    const timeout=setTimeout(()=>{child.kill('SIGKILL');rejectRun(new Error(`Public M3-02 Chrome smoke timed out. stderr: ${stderr.slice(-3000)}`))},120000);
    child.stdout.on('data',chunk=>{stdout+=chunk});
    child.stderr.on('data',chunk=>{stderr+=chunk});
    child.once('error',error=>{clearTimeout(timeout);rejectRun(error)});
    child.once('close',code=>{
      clearTimeout(timeout);
      if(code!==0)rejectRun(new Error(`Public M3-02 Chrome smoke exited ${code}. stderr: ${stderr.slice(-5000)} stdout: ${stdout.slice(-5000)}`));
      else if(!stdout.includes('PF08A_M3_02_BROWSER_PASS'))rejectRun(new Error(`Public M3-02 PASS marker missing. stdout: ${stdout.slice(-5000)}`));
      else resolveRun({stdout,stderr});
    });
  });
}

const published=await fetchPublishedPackage();
const directory=mkdtempSync(join(tmpdir(),'pf08a-m3-02-public-'));
try{
  writeFileSync(join(directory,'index.html'),published.html,'utf8');
  writeFileSync(join(directory,'familypilot-scope.js'),published.scope,'utf8');
  writeFileSync(join(directory,'familypilot-analytics-state.js'),published.analytics,'utf8');
  writeFileSync(join(directory,'familypilot-obligations.js'),published.obligations,'utf8');
  writeFileSync(join(directory,'familypilot-obligations-ui-v2.js'),published.ui,'utf8');
  const browser=await runBrowserSmoke(directory);
  const verifiedAt=new Date().toISOString();
  const result={
    status:'PASS',verified_at:verifiedAt,public_url:publicUrl,expected_main:expectedMain,publication_attempts:published.attempts,
    http_status:published.htmlStatus,scope_http_status:published.scopeStatus,analytics_http_status:published.analyticsStatus,
    obligations_http_status:published.obligationsStatus,obligations_ui_http_status:published.uiStatus,
    html_sha256:sha256(published.html),scope_sha256:sha256(published.scope),analytics_sha256:sha256(published.analytics),
    obligations_sha256:sha256(published.obligations),obligations_ui_sha256:sha256(published.ui),browser_marker:'PF08A_M3_02_BROWSER_PASS',
    navigation:'Главная · Операции · План · Ещё',summary_cards_removed:true,arbitrary_recurrence:true,exact_count_eleven:true,
    idempotent_generation:true,month_calendar:true,per_date_grouping:true,quick_pay:true,one_linked_expense:true,
    actual_correction_same_operation:true,trash_restore_recalculated:true,amount_version_starting_next:true,
    one_occurrence_move:true,overdue_coexistence:true,archive_preserves_history:true,personal_scope_isolated:true,
    hidden_capital_preserved:true,compact_analytics_preserved:true,runtime_exceptions:[]
  };
  if(evidencePath){
    const markdown=`# Public Verification — PF-08A-M3-02-OBLIGATION-SCHEDULE-CALENDAR\n\n`
      +`**Status:** PASS  \n**Verified At:** ${verifiedAt}  \n**Public URL:** \`${publicUrl}\`  \n**Expected Main Commit:** \`${expectedMain}\`  \n`
      +`**HTML Status:** \`${published.htmlStatus}\`  \n**Scope Module Status:** \`${published.scopeStatus}\`  \n**Analytics Module Status:** \`${published.analyticsStatus}\`  \n`
      +`**Obligations Module Status:** \`${published.obligationsStatus}\`  \n**Obligations UI Module Status:** \`${published.uiStatus}\`  \n**Publication Attempts:** \`${published.attempts}\`  \n`
      +`**HTML SHA-256:** \`${result.html_sha256}\`  \n**Scope SHA-256:** \`${result.scope_sha256}\`  \n**Analytics SHA-256:** \`${result.analytics_sha256}\`  \n`
      +`**Obligations SHA-256:** \`${result.obligations_sha256}\`  \n**Obligations UI SHA-256:** \`${result.obligations_ui_sha256}\`  \n\n`
      +`## Assertions\n\n`
      +`- bottom navigation remains \`Главная · Операции · План · Ещё\` — PASS;\n`
      +`- separate Today / Overdue / Upcoming summary cards are absent — PASS;\n`
      +`- arbitrary recurrence and exact count eleven — PASS;\n`
      +`- reload/normalization does not duplicate occurrences — PASS;\n`
      +`- month navigation and per-date grouping — PASS;\n`
      +`- quick pay creates exactly one linked Expense — PASS;\n`
      +`- actual amount/date correction preserves operation id — PASS;\n`
      +`- Trash and restore recalculate payment projection — PASS;\n`
      +`- starting-with-next amount version preserves selected occurrence — PASS;\n`
      +`- moving one occurrence leaves adjacent occurrences unchanged — PASS;\n`
      +`- overdue and later occurrences coexist — PASS;\n`
      +`- archiving stops generation and preserves history — PASS;\n`
      +`- personal obligation does not leak into household scope — PASS;\n`
      +`- hidden Capital and compact Analytics remain operational — PASS;\n`
      +`- runtime exceptions — NONE.\n\n## Browser Output\n\n\`\`\`text\n${browser.stdout.trim()}\n\`\`\`\n\n# END OF FILE\n`;
    writeFileSync(evidencePath,markdown,'utf8');
  }
  console.log(JSON.stringify(result,null,2));
}finally{rmSync(directory,{recursive:true,force:true})}

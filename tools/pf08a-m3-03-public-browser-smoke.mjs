import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const publicUrl=process.env.PUBLIC_URL||'https://maloma.github.io/sandbox/';
const expectedMain=process.env.EXPECTED_MAIN_M303||'cbb6651e53d61b5552598f32159f36fe6e1ec82d';
const localSmoke=resolve('tools/pf08a-m3-03-browser-smoke.mjs');
const sha256=value=>createHash('sha256').update(value).digest('hex');
const sleep=milliseconds=>new Promise(resolveSleep=>setTimeout(resolveSleep,milliseconds));

const files=[
  ['html',''],['scope','familypilot-scope.js'],['analytics','familypilot-analytics-state.js'],
  ['obligations','familypilot-obligations.js'],['obligationsUi','familypilot-obligations-ui-v2.js'],
  ['attention','familypilot-payment-attention.js'],['attentionUi','familypilot-payment-attention-ui.js'],
  ['debts','familypilot-debts.js'],['debtsUi','familypilot-debts-ui.js'],
  ['savings','familypilot-savings-goals.js'],['savingsUi','familypilot-savings-goals-ui.js'],
  ['wallets','familypilot-wallet-management.js'],['walletsUi','familypilot-wallet-management-ui.js'],
  ['transfers','familypilot-wallet-transfers.js'],['transfersUi','familypilot-wallet-transfers-ui.js']
];

async function fetchPublishedPackage(){
  let last={status:0,body:''};
  for(let attempt=1;attempt<=18;attempt+=1){
    const token=`${expectedMain}-${attempt}-${Date.now()}`;
    try{
      const responses=await Promise.all(files.map(([,path])=>path
        ?fetch(new URL(`${path}?v=${encodeURIComponent(token)}`,publicUrl),{redirect:'follow',cache:'no-store'})
        :fetch(`${publicUrl}?v=${encodeURIComponent(token)}`,{redirect:'follow',cache:'no-store'})));
      const bodies=await Promise.all(responses.map(response=>response.text()));
      const packageFiles=Object.fromEntries(files.map(([key],index)=>[key,bodies[index]]));
      const statuses=Object.fromEntries(files.map(([key],index)=>[key,responses[index].status]));
      last={status:statuses.html,body:packageFiles.html};
      const ready=responses.every(response=>response.status===200)
        &&packageFiles.html.includes('pf08a-wf02-runtime-bridge:start')
        &&packageFiles.html.includes('window.__FP_RUNTIME__')
        &&packageFiles.scope.includes('__FP_M3_03_READY__')
        &&packageFiles.scope.includes('familypilot-payment-attention.js')
        &&packageFiles.scope.includes('familypilot-payment-attention-ui.js')
        &&packageFiles.analytics.includes('FamilyPilotAnalyticsState')
        &&packageFiles.obligations.includes('FamilyPilotObligations')
        &&packageFiles.attention.includes('DEFAULT_LEAD_DAYS=3')
        &&packageFiles.attention.includes('paymentReminderLeadDaysByRuleId')
        &&packageFiles.attention.includes('groupedAttention')
        &&packageFiles.attentionUi.includes('paymentAttentionCard')
        &&packageFiles.attentionUi.includes('obligationReminderLeadDays')
        &&packageFiles.attentionUi.includes('data-payment-attention-pay')
        &&packageFiles.attentionUi.includes("showScreen('obligations')")
        &&packageFiles.attentionUi.includes('window.__FP_TEST__.paymentAttention')
        &&!packageFiles.attentionUi.includes('Notification.requestPermission')
        &&!packageFiles.attentionUi.includes('new Notification')
        &&!packageFiles.attentionUi.includes('PushManager')
        &&packageFiles.debts.includes('FamilyPilotDebts')
        &&packageFiles.savings.includes('FamilyPilotSavingsGoals')
        &&packageFiles.wallets.includes('FamilyPilotWalletManagement')
        &&packageFiles.transfers.includes("TRANSFER_KIND='transfer'")
        &&packageFiles.html.includes('savings-goal-config-v1')
        &&packageFiles.html.includes('debt-chains-principal-v1')
        &&packageFiles.html.includes('plan-obligations-foundation-v1')
        &&packageFiles.html.includes('hidden-capital-disclosure-v1')
        &&packageFiles.html.includes('compact-analytics-states-v1')
        &&!packageFiles.html.includes("fetch('./src/familypilot.html")
        &&!packageFiles.html.includes('document.write(source)');
      if(ready)return{attempts:attempt,statuses,...packageFiles};
    }catch(error){last={status:0,body:String(error)}}
    await sleep(5000);
  }
  throw new Error(`Published M3-03 package did not become ready. Last status ${last.status}: ${last.body.slice(0,1200)}`);
}

function runBrowserSmoke(directory){
  return new Promise((resolveRun,rejectRun)=>{
    const child=spawn(process.execPath,[localSmoke],{cwd:directory,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    const timeout=setTimeout(()=>{child.kill('SIGKILL');rejectRun(new Error(`Public M3-03 Chrome smoke timed out. stderr: ${stderr.slice(-3000)}`))},120000);
    child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
    child.once('error',error=>{clearTimeout(timeout);rejectRun(error)});
    child.once('close',code=>{
      clearTimeout(timeout);
      if(code!==0)rejectRun(new Error(`Public M3-03 Chrome smoke exited ${code}. stderr: ${stderr.slice(-5000)} stdout: ${stdout.slice(-5000)}`));
      else if(!stdout.includes('PF08A_M3_03_BROWSER_PASS'))rejectRun(new Error(`Public M3-03 PASS marker missing. stdout: ${stdout.slice(-5000)}`));
      else resolveRun({stdout,stderr});
    });
  });
}

const published=await fetchPublishedPackage();
const directory=mkdtempSync(join(tmpdir(),'pf08a-m3-03-public-'));
try{
  for(const [key,path] of files)writeFileSync(join(directory,path||'index.html'),published[key],'utf8');
  const browser=await runBrowserSmoke(directory),verifiedAt=new Date().toISOString();
  const result={
    status:'PASS',
    verified_at:verifiedAt,
    public_url:publicUrl,
    expected_main:expectedMain,
    publication_attempts:published.attempts,
    http_status:published.statuses,
    browser_marker:'PF08A_M3_03_BROWSER_PASS',
    home_payment_attention:true,
    overdue_visible:true,
    due_today_visible:true,
    upcoming_by_rule_lead_time:true,
    default_lead_days:3,
    quick_pay_one_expense:true,
    exact_occurrence_route:true,
    personal_household_scope:true,
    external_notifications:false,
    prior_modules_preserved:true,
    runtime_exceptions:[]
  };
  for(const [key] of files)result[`${key}_sha256`]=sha256(published[key]);
  console.log(JSON.stringify(result,null,2));
  console.log(browser.stdout.trim());
}finally{
  rmSync(directory,{recursive:true,force:true});
}

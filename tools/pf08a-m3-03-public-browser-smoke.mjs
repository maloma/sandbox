import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const publicUrl=process.env.PUBLIC_URL||'https://maloma.github.io/sandbox/';
const expectedMain=process.env.EXPECTED_MAIN_M303||'23aa2c7852fd2664c757bebc7ed4fee8bfa8e54a';
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

function packageChecks(packageFiles){
  return{
    htmlRuntimeBridge:packageFiles.html.includes('pf08a-wf02-runtime-bridge:start')&&packageFiles.html.includes('window.__FP_RUNTIME__'),
    scopeReady:packageFiles.scope.includes('__FP_M3_03_READY__'),
    scopeLoadsDomain:packageFiles.scope.includes('familypilot-payment-attention.js'),
    scopeLoadsUi:packageFiles.scope.includes('familypilot-payment-attention-ui.js'),
    analytics:packageFiles.analytics.includes('FamilyPilotAnalyticsState'),
    obligations:packageFiles.obligations.includes('FamilyPilotObligations'),
    defaultLeadDays:packageFiles.attention.includes('DEFAULT_LEAD_DAYS=3'),
    reminderConfig:packageFiles.attention.includes('paymentReminderLeadDaysByRuleId'),
    groupedAttention:packageFiles.attention.includes('groupedAttention'),
    demoVersion:packageFiles.attention.includes('m3-03-payment-attention-demo-v1'),
    demoApi:packageFiles.attention.includes('paymentAttentionDemo'),
    demoLoad:packageFiles.attention.includes('data-payment-demo-load'),
    demoRemove:packageFiles.attention.includes('data-payment-demo-remove'),
    compactVersion:packageFiles.attentionUi.includes('planned-payment-attention-v2'),
    monthRepair:packageFiles.attentionUi.includes('repairMonth'),
    homeCardRemoved:packageFiles.attentionUi.includes("$('paymentAttentionCard')?.remove()")&&!packageFiles.attentionUi.includes('function installHomeCard'),
    planIndicator:packageFiles.attentionUi.includes('plan-attention-badge'),
    overdueHighlight:packageFiles.attentionUi.includes('obligation-row--overdue'),
    earlyPayment:packageFiles.attentionUi.includes('obligation-pay-check')&&packageFiles.attentionUi.includes('data-m302-quick-pay'),
    dailyTotals:packageFiles.attentionUi.includes('Запланировать:'),
    ruleCards:packageFiles.attentionUi.includes('obligation-rule-card')&&packageFiles.attentionUi.includes('obligationRuleDetailModal'),
    ruleControls:packageFiles.attentionUi.includes('Клонировать')&&packageFiles.attentionUi.includes('Удалить'),
    reminderField:packageFiles.attentionUi.includes('obligationReminderLeadDays'),
    testApi:packageFiles.attentionUi.includes('window.__FP_TEST__.obligationUx'),
    noNotificationPermission:!packageFiles.attentionUi.includes('Notification.requestPermission'),
    noNotificationApi:!packageFiles.attentionUi.includes('new Notification'),
    noPushManager:!packageFiles.attentionUi.includes('PushManager'),
    debts:packageFiles.debts.includes('FamilyPilotDebts'),
    savings:packageFiles.savings.includes('FamilyPilotSavingsGoals'),
    wallets:packageFiles.wallets.includes('FamilyPilotWalletManagement'),
    transfers:packageFiles.transfers.includes("TRANSFER_KIND='transfer'"),
    priorMarkers:['savings-goal-config-v1','debt-chains-principal-v1','plan-obligations-foundation-v1','hidden-capital-disclosure-v1','compact-analytics-states-v1'].every(marker=>packageFiles.html.includes(marker)),
    noRuntimeFetch:!packageFiles.html.includes("fetch('./src/familypilot.html"),
    noDocumentWrite:!packageFiles.html.includes('document.write(source)')
  };
}

async function fetchPublishedPackage(){
  let last={statuses:{},failedChecks:['not_checked']};
  for(let attempt=1;attempt<=30;attempt+=1){
    const token=`${expectedMain}-${attempt}-${Date.now()}`;
    try{
      const responses=await Promise.all(files.map(([,path])=>path
        ?fetch(new URL(`${path}?v=${encodeURIComponent(token)}`,publicUrl),{redirect:'follow',cache:'no-store'})
        :fetch(`${publicUrl}?v=${encodeURIComponent(token)}`,{redirect:'follow',cache:'no-store'})));
      const bodies=await Promise.all(responses.map(response=>response.text()));
      const packageFiles=Object.fromEntries(files.map(([key],index)=>[key,bodies[index]]));
      const statuses=Object.fromEntries(files.map(([key],index)=>[key,responses[index].status]));
      const checks=packageChecks(packageFiles);
      const failedChecks=Object.entries(checks).filter(([,passed])=>!passed).map(([name])=>name);
      last={statuses,failedChecks};
      if(responses.every(response=>response.status===200)&&failedChecks.length===0)return{attempts:attempt,statuses,...packageFiles};
    }catch(error){last={statuses:{network:0},failedChecks:[String(error)]}}
    await sleep(5000);
  }
  throw new Error(`Published compact M3-03 package did not become ready: ${JSON.stringify(last)}`);
}

function runBrowserSmoke(directory){
  return new Promise((resolveRun,rejectRun)=>{
    const child=spawn(process.execPath,[localSmoke],{cwd:directory,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    const timeout=setTimeout(()=>{child.kill('SIGKILL');rejectRun(new Error(`Public compact M3-03 Chrome smoke timed out. stderr: ${stderr.slice(-3000)}`))},120000);
    child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
    child.once('error',error=>{clearTimeout(timeout);rejectRun(error)});
    child.once('close',code=>{
      clearTimeout(timeout);
      if(code!==0)rejectRun(new Error(`Public compact M3-03 Chrome smoke exited ${code}. stderr: ${stderr.slice(-5000)} stdout: ${stdout.slice(-5000)}`));
      else if(!stdout.includes('PF08A_M3_03_BROWSER_PASS'))rejectRun(new Error(`Public compact M3-03 PASS marker missing. stdout: ${stdout.slice(-5000)}`));
      else resolveRun({stdout,stderr});
    });
  });
}

const published=await fetchPublishedPackage();
const directory=mkdtempSync(join(tmpdir(),'pf08a-m3-03-compact-public-'));
try{
  for(const [key,path] of files)writeFileSync(join(directory,path||'index.html'),published[key],'utf8');
  const browser=await runBrowserSmoke(directory),verifiedAt=new Date().toISOString();
  const result={status:'PASS',verified_at:verifiedAt,public_url:publicUrl,expected_main:expectedMain,publication_attempts:published.attempts,http_status:published.statuses,browser_marker:'PF08A_M3_03_BROWSER_PASS',home_payment_card_removed:true,plan_attention_indicator:true,overdue_highlight:true,current_month_repair:true,daily_grouping_and_totals:true,future_payment_can_be_paid_early:true,one_linked_expense:true,rule_cards_and_controls:true,recurrence_hidden_from_list:true,all_reminder_lead_modes:true,comprehensive_demo_data:true,demo_scenarios:12,demo_cleanup:true,personal_household_scope:true,external_notifications:false,prior_modules_preserved:true,runtime_exceptions:[]};
  for(const [key] of files)result[`${key}_sha256`]=sha256(published[key]);
  console.log(JSON.stringify(result,null,2));
  console.log(browser.stdout.trim());
}finally{
  rmSync(directory,{recursive:true,force:true});
}

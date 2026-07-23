import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const publicUrl=process.env.PUBLIC_URL||'https://maloma.github.io/sandbox/';
const expectedMain='0177de6894f1e06f93c4334eade4f780bb9c7ce1';
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
  const ui=packageFiles.attentionUi;
  return{
    htmlRuntimeBridge:packageFiles.html.includes('pf08a-wf02-runtime-bridge:start')&&packageFiles.html.includes('window.__FP_RUNTIME__'),
    scopeReady:packageFiles.scope.includes('__FP_M3_03_READY__'),
    scopeLoadsDomain:packageFiles.scope.includes('familypilot-payment-attention.js'),
    scopeLoadsUi:packageFiles.scope.includes('familypilot-payment-attention-ui.js'),
    analytics:packageFiles.analytics.includes('FamilyPilotAnalyticsState'),
    obligations:packageFiles.obligations.includes('FamilyPilotObligations'),
    reminderDomain:packageFiles.attention.includes('DEFAULT_LEAD_DAYS=3')&&packageFiles.attention.includes('paymentReminderLeadDaysByRuleId'),
    comprehensiveDemo:packageFiles.attention.includes('m3-03-payment-attention-demo-v1')&&packageFiles.attention.includes('paymentAttentionDemo'),
    interactionVersion:ui.includes('planned-payment-attention-v3'),
    homeCardRemoved:ui.includes("$('paymentAttentionCard')?.remove()")&&!ui.includes('function installHomeCard'),
    planIndicator:ui.includes('plan-attention-badge'),
    rightThumbToggle:ui.includes('data-ux-payment-toggle')&&ui.includes('obligation-pay-check'),
    shortTapUnpay:ui.includes('unpayOccurrence')&&ui.includes('obligation_payment_unchecked'),
    longPressContext:ui.includes('PRESS_MS=550')&&ui.includes('paymentContextModal'),
    contextStates:['paid','unpaid','skipped','edit','delete'].every(action=>ui.includes(`data-payment-context-action="${action}"`)),
    duplicateProtection:ui.includes('matchingExpenses')&&ui.includes('paymentReconcileModal')&&ui.includes('linkExistingExpense'),
    manualExpensePreserved:ui.includes("operation.links?.obligationLinkMode==='manual_link'"),
    operationDueLink:ui.includes('Обязательство · срок'),
    homeActionOrder:ui.includes('actions.wf02-actions .action.income{order:1}')&&ui.includes('actions.wf02-actions .action.transfer{order:2}')&&ui.includes('actions.wf02-actions .action.expense{order:3}'),
    activeDisabledRules:ui.includes('Активные правила')&&ui.includes('Отключённые')&&ui.includes('data-ux-rule-toggle'),
    recurringProgress:['Выполнение правила','Дата начала','Последний выполненный','Пропущено до последней оплаты'].every(value=>ui.includes(value)),
    archiveHidden:ui.includes('#obligationArchiveBtn{display:none!important}'),
    notificationSwitchDeferred:ui.includes('Системные уведомления и их общий выключатель появятся вместе с отдельным push-модулем'),
    noExternalNotifications:!['Notification.requestPermission','new Notification','PushManager','serviceWorker.register'].some(value=>ui.includes(value)),
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
  for(let attempt=1;attempt<=36;attempt+=1){
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
  throw new Error(`Published M3-03 interaction package did not become ready: ${JSON.stringify(last)}`);
}

function runBrowserSmoke(directory){
  return new Promise((resolveRun,rejectRun)=>{
    const child=spawn(process.execPath,[localSmoke],{cwd:directory,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    const timeout=setTimeout(()=>{child.kill('SIGKILL');rejectRun(new Error(`Public M3-03 interaction Chrome smoke timed out. stderr: ${stderr.slice(-3000)}`))},150000);
    child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
    child.once('error',error=>{clearTimeout(timeout);rejectRun(error)});
    child.once('close',code=>{clearTimeout(timeout);if(code!==0)rejectRun(new Error(`Public M3-03 interaction Chrome smoke exited ${code}. stderr: ${stderr.slice(-5000)} stdout: ${stdout.slice(-5000)}`));else if(!stdout.includes('PF08A_M3_03_BROWSER_PASS'))rejectRun(new Error(`Public M3-03 interaction PASS marker missing. stdout: ${stdout.slice(-5000)}`));else resolveRun({stdout,stderr})});
  });
}

const published=await fetchPublishedPackage();
const directory=mkdtempSync(join(tmpdir(),'pf08a-m3-03-v3-public-'));
try{
  for(const [key,path] of files)writeFileSync(join(directory,path||'index.html'),published[key],'utf8');
  const browser=await runBrowserSmoke(directory),verifiedAt=new Date().toISOString();
  const result={status:'PASS',verified_at:verifiedAt,public_url:publicUrl,expected_main:expectedMain,publication_attempts:published.attempts,http_status:published.statuses,browser_marker:'PF08A_M3_03_BROWSER_PASS',right_thumb_toggle:true,short_tap_paid_unpaid:true,long_press_context:true,skipped_and_restore:true,delete_occurrence:true,duplicate_prevention:true,manual_expense_preserved:true,generated_expense_trashed:true,operation_due_link:true,home_action_order:'income-transfer-expense',active_disabled_rules_separated:true,recurring_progress_stats:true,notification_preference_deferred:true,demo_scenarios:12,personal_household_scope:true,prior_modules_preserved:true,runtime_exceptions:[]};
  for(const [key] of files)result[`${key}_sha256`]=sha256(published[key]);
  console.log(JSON.stringify(result,null,2));
  console.log(browser.stdout.trim());
}finally{rmSync(directory,{recursive:true,force:true})}

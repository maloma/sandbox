import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, unlinkSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const root=process.cwd();
const harnessName='.pf08a-m3-02-browser-harness.html';
const harnessPath=join(root,harnessName);
const profilePath=mkdtempSync(join(tmpdir(),'pf08a-m3-02-chrome-'));
const marker='PF08A_M3_02_BROWSER_PASS';

const harness=`<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>M3-02 browser smoke</title></head>
<body data-status="PENDING"><iframe id="app" src="/?test=1&pf08a-m3-02=1" style="width:390px;height:844px;border:0"></iframe><pre id="result">PENDING</pre>
<script>
(() => {
  const frame=document.getElementById('app');
  const result=document.getElementById('result');
  const assert=(condition,message)=>{if(!condition)throw new Error(message)};
  const text=node=>(node?.textContent||'').replace(/\\s+/g,' ').trim();
  const dateValue=value=>{const d=new Date(value),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())};
  const click=node=>{assert(node,'Clickable node missing');node.click()};
  const runtimeErrors=[];

  async function waitApi(){
    const deadline=Date.now()+20000;
    while(Date.now()<deadline){
      const api=frame.contentWindow&&frame.contentWindow.__FP_TEST__;
      if(api?.obligations?.renderM302)return api;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    throw new Error('FamilyPilot M3-02 test API did not become ready');
  }

  async function run(){
    const win=frame.contentWindow;
    win.addEventListener('error',event=>runtimeErrors.push(String(event.error||event.message||'error')));
    win.addEventListener('unhandledrejection',event=>runtimeErrors.push(String(event.reason||'unhandled rejection')));
    win.confirm=()=>true;
    const api=await waitApi();
    const doc=frame.contentDocument;
    const initial=api.getState();
    const household='wallet-household-main';
    const personal='wallet-personal-anna';
    const expenseCategory=initial.categories.find(category=>category.kind==='expense'&&!category.archivedAt)?.id;
    assert(expenseCategory,'Expense category fixture missing');

    const nav=[...doc.querySelectorAll('nav.bottom [data-screen]')].map(node=>text(node));
    assert(JSON.stringify(nav)===JSON.stringify(['⌂Главная','☷Операции','▣План','⊞Ещё']),'Bottom navigation labels/order changed: '+JSON.stringify(nav));
    assert(text(doc.getElementById('capitalRevealBtn'))==='Капитал','Hidden Capital control regressed');
    assert(!doc.getElementById('capitalInfo').classList.contains('open'),'Capital overlay must remain closed by default');

    click(doc.querySelector('[data-screen="plans"]'));
    assert(doc.getElementById('plansScreen').classList.contains('active'),'Plan root did not open');
    const debtPlanModule=doc.querySelector('[data-plan-module="debts"]'),savingsPlanModule=doc.querySelector('[data-plan-module="savings"]');assert(debtPlanModule&&!debtPlanModule.disabled,'Debts must remain active after M2 integration');assert(savingsPlanModule&&!savingsPlanModule.disabled,'Savings must remain active after M4 integration');assert(doc.querySelectorAll('#plansScreen .plan-module[disabled]').length===0,'All accepted Plan modules must remain active after M4 integration');
    click(doc.querySelector('[data-plan-module="obligations"]'));
    assert(doc.getElementById('obligationsScreen').classList.contains('active'),'Obligations screen did not open');
    assert(!doc.getElementById('obligationSummary'),'Forbidden summary container remains in runtime DOM');
    assert(api.obligations.hasForbiddenSummary()===false,'Forbidden Today/Overdue/Upcoming cards remain visible');
    assert(doc.getElementById('obligationMonthNav'),'Month navigation missing');

    // Create every three months with exactly eleven payments through the actual editor.
    click(doc.getElementById('obligationAddBtn'));
    assert(doc.getElementById('obligationRuleModal').classList.contains('open'),'Rule editor did not open');
    doc.getElementById('obligationName').value='Страховка';
    doc.getElementById('obligationAmount').value='120';
    doc.getElementById('obligationCadence').value='recurring';
    doc.getElementById('obligationCadence').dispatchEvent(new Event('change'));
    doc.getElementById('obligationIntervalValue').value='3';
    doc.getElementById('obligationIntervalUnit').value='month';
    doc.getElementById('obligationEndingMode').value='count';
    doc.getElementById('obligationEndingMode').dispatchEvent(new Event('change'));
    doc.getElementById('obligationPaymentCount').value='11';
    doc.getElementById('obligationDueDate').value=dateValue(Date.now());
    doc.getElementById('obligationWallet').value=household;
    doc.getElementById('obligationCategory').value=expenseCategory;
    click(doc.getElementById('obligationRuleSave'));
    assert(!doc.getElementById('obligationRuleModal').classList.contains('open'),'Rule editor did not close after save');

    let state=api.getState();
    assert(state.schemaVersion>=4,'State was not additively normalized to schema v4');
    assert(state.obligationRules.length===1,'Recurring rule was not created');
    const ruleId=state.obligationRules[0].id;
    api.obligations.ensureWindow(-Infinity,Date.now()+6*365*86400000);
    state=api.getState();
    let occurrences=state.obligationOccurrences.filter(item=>item.ruleId===ruleId).sort((a,b)=>a.sequence-b.sequence);
    assert(occurrences.length===11,'Exact count 11 was not generated: '+occurrences.length);
    assert(new Set(occurrences.map(item=>item.sequence)).size===11,'Occurrence sequence contains duplicates');
    api.obligations.normalize();
    assert(api.getState().obligationOccurrences.filter(item=>item.ruleId===ruleId).length===11,'Normalization duplicated occurrences');

    // Selected-month calendar and date grouping.
    const first=occurrences[0];
    api.obligations.setMonth(first.dueAt);
    assert(doc.querySelector('[data-obligation-occurrence="'+first.id+'"]'),'First occurrence missing from its month');
    assert(doc.querySelector('.obligation-date-heading'),'Per-date group heading missing');
    assert(text(doc.querySelector('.obligation-date-heading')).includes('1 платёж'),'Per-date count missing');

    // Quick pay from row creates one linked Expense.
    click(doc.querySelector('[data-m302-quick-pay="'+first.id+'"]'));
    state=api.getState();
    let paid=state.obligationOccurrences.find(item=>item.id===first.id);
    assert(paid.status==='paid','Quick payment did not mark occurrence paid');
    let linked=state.operations.filter(operation=>operation.links?.obligationOccurrenceId===first.id);
    assert(linked.length===1,'Quick payment must create exactly one linked Expense');
    const operationId=linked[0].id;
    assert(api.analyticsFilteredOperations().includes(operationId),'Linked Expense is missing from Analytics source operations');
    const duplicate=api.obligations.pay(first.id,{amount:120,occurredAt:Date.now()});
    assert(duplicate.ok===false,'Duplicate payment must be rejected');

    // Correct actual amount/date through the same linked operation using the real payment sheet.
    click(doc.querySelector('[data-m302-open-detail="'+first.id+'"]'));
    assert(text(doc.getElementById('obligationPayBtn'))==='Исправить оплату','Paid occurrence does not expose correction');
    click(doc.getElementById('obligationPayBtn'));
    doc.getElementById('obligationPayAmount').value='119,50';
    doc.getElementById('obligationPayDate').value=dateValue(Date.now()-86400000);
    click(doc.getElementById('obligationPaySave'));
    state=api.getState();
    linked=state.operations.filter(operation=>operation.links?.obligationOccurrenceId===first.id);
    assert(linked.length===1&&linked[0].id===operationId,'Payment correction created a second operation');
    assert(linked[0].amount===119.5,'Corrected actual amount was not saved');

    // Trash and restore still recalculate the module projection.
    api.trashOperation(operationId);
    assert(api.obligations.status(first.id)!=='paid','Trashed payment left stale paid state');
    api.restoreOperation(operationId);
    assert(api.obligations.status(first.id)==='paid','Restored payment did not restore paid state');

    // Amount version defaults to starting with the next occurrence.
    state=api.getState();
    occurrences=state.obligationOccurrences.filter(item=>item.ruleId===ruleId).sort((a,b)=>a.sequence-b.sequence);
    const second=occurrences[1],third=occurrences[2];
    api.obligations.setMonth(second.dueAt);
    click(doc.querySelector('[data-m302-open-detail="'+second.id+'"]'));
    click(doc.getElementById('obligationExpectedAmountBtn'));
    doc.getElementById('obligationExpectedAmountInput').value='150';
    assert(doc.getElementById('obligationExpectedAmountScope').value==='starting_next','Expected amount default scope changed');
    click(doc.getElementById('obligationExpectedAmountSave'));
    state=api.getState();
    assert(state.obligationOccurrences.find(item=>item.id===second.id).expectedAmount===120,'Selected occurrence changed under starting-next scope');
    assert(state.obligationOccurrences.find(item=>item.id===third.id).expectedAmount===150,'Future occurrence did not receive amount version');

    // Move only one occurrence; adjacent schedule remains unchanged.
    const thirdDueBefore=state.obligationOccurrences.find(item=>item.id===third.id).dueAt;
    click(doc.querySelector('[data-m302-open-detail="'+second.id+'"]'));
    click(doc.getElementById('obligationPostponeBtn'));
    doc.getElementById('obligationPostponeDate').value=dateValue(second.dueAt+5*86400000);
    click(doc.getElementById('obligationPostponeSave'));
    state=api.getState();
    assert(state.obligationOccurrences.find(item=>item.id===third.id).dueAt===thirdDueBefore,'Moving one occurrence rewrote an adjacent occurrence');

    // Month navigation changes only the obligation calendar period.
    const monthBefore=text(doc.getElementById('obligationMonthLabel'));
    click(doc.querySelector('[data-m302-month="1"]'));
    assert(text(doc.getElementById('obligationMonthLabel'))!==monthBefore,'Next-month navigation did not change the selected month');

    // Overdue and later regular occurrences coexist.
    const overdueRule=api.obligations.createRule({name:'Просроченная подписка',amount:20,dueAt:Date.now()-65*86400000,cadence:'recurring',intervalValue:1,intervalUnit:'month',endingMode:'count',paymentCount:4,walletId:household,categoryId:expenseCategory,currency:'EUR'});
    assert(overdueRule.ok===true,'Overdue recurrence creation failed');
    api.obligations.ensureWindow(-Infinity,Date.now()+365*86400000);
    state=api.getState();
    const overdueItems=state.obligationOccurrences.filter(item=>item.ruleId===overdueRule.rule.id);
    assert(overdueItems.some(item=>api.obligations.status(item.id)==='overdue'),'Overdue occurrence missing');
    assert(overdueItems.some(item=>api.obligations.status(item.id)==='planned'),'Later planned occurrence missing beside overdue occurrence');

    // Archive stops generation and preserves history.
    const beforeArchive=state.obligationOccurrences.filter(item=>item.ruleId===ruleId).length;
    api.obligations.archiveRule(ruleId);
    api.obligations.ensureWindow(-Infinity,Date.now()+12*365*86400000);
    state=api.getState();
    assert(state.obligationRules.find(item=>item.id===ruleId).status==='archived','Rule was not archived');
    assert(state.obligationOccurrences.filter(item=>item.ruleId===ruleId).length===beforeArchive,'Archived rule generated more occurrences');

    // Personal obligations must not leak into household scope.
    api.setActiveWallet(personal);
    const personalRule=api.obligations.createRule({name:'Личная подписка',amount:12,dueAt:Date.now()+86400000,cadence:'recurring',intervalValue:1,intervalUnit:'month',endingMode:'count',paymentCount:3,walletId:personal,categoryId:expenseCategory,currency:'EUR'});
    assert(personalRule.ok===true,'Personal obligation creation failed');
    assert(api.obligations.visible().includes(personalRule.occurrence.id),'Personal occurrence not visible in personal scope');
    api.setActiveWallet(household);
    assert(!api.obligations.visible().includes(personalRule.occurrence.id),'Personal occurrence leaked into household scope');

    assert(doc.querySelector('meta[content="compact-analytics-states-v1"]'),'A3 Analytics marker missing');
    assert(doc.querySelector('meta[content="hidden-capital-disclosure-v1"]'),'Hidden Capital marker missing');
    assert(api.obligations.hasForbiddenSummary()===false,'Forbidden summary returned after later renders');
    assert(runtimeErrors.length===0,'Runtime exceptions: '+runtimeErrors.join(' | '));

    const output={status:'PASS',marker:'${marker}',navigation:'Главная · Операции · План · Ещё',summaryCardsRemoved:true,arbitraryRecurrence:true,exactCountEleven:true,idempotentGeneration:true,monthCalendar:true,perDateGrouping:true,quickPay:true,oneLinkedExpense:true,actualCorrectionSameOperation:true,trashRestoreRecalculated:true,amountVersionStartingNext:true,oneOccurrenceMove:true,overdueCoexistence:true,archivePreservesHistory:true,personalScopeIsolated:true,hiddenCapitalPreserved:true,compactAnalyticsPreserved:true,runtimeExceptions:[]};
    result.textContent=JSON.stringify(output,null,2);
    document.body.dataset.status='PASS';
  }

  frame.addEventListener('load',()=>run().catch(error=>{
    result.textContent=String(error&&error.stack||error);
    document.body.dataset.status='FAIL';
  }),{once:true});
})();
</script></body></html>`;

writeFileSync(harnessPath,harness);

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    const raw=url.pathname==='/'?'index.html':url.pathname.replace(/^\//,'');
    const target=normalize(resolve(root,raw));
    if(target!==root&&!target.startsWith(root+sep))throw new Error('Forbidden path');
    const body=readFileSync(target);
    res.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream','cache-control':'no-store'});
    res.end(body);
  }catch(error){res.writeHead(404,{'content-type':'text/plain'});res.end('Not found');}
});

const chromeCandidates=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'];
const chrome=chromeCandidates.find(existsSync);
if(!chrome)throw new Error('Chrome/Chromium is not installed');

function runChrome(url){
  return new Promise((resolvePromise,reject)=>{
    const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',`--user-data-dir=${profilePath}`,'--virtual-time-budget=30000','--dump-dom',url],{stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    child.stdout.on('data',chunk=>stdout+=chunk);
    child.stderr.on('data',chunk=>stderr+=chunk);
    child.on('error',reject);
    child.on('close',code=>code===0?resolvePromise({stdout,stderr}):reject(new Error(`Chrome exited ${code}\n${stderr}`)));
  });
}

await new Promise((resolvePromise,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolvePromise)});

try{
  const address=server.address();
  const {stdout}=await runChrome(`http://127.0.0.1:${address.port}/${harnessName}`);
  const match=stdout.match(/<pre id="result">([\s\S]*?)<\/pre>/);
  const decoded=(match?.[1]||'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
  if(!stdout.includes('data-status="PASS"')||!stdout.includes(marker))throw new Error(`M3-02 browser smoke did not pass\n${decoded||stdout.slice(-5000)}`);
  console.log(decoded||JSON.stringify({status:'PASS',marker},null,2));
}finally{
  await new Promise(resolvePromise=>server.close(resolvePromise));
  if(existsSync(harnessPath))unlinkSync(harnessPath);
  rmSync(profilePath,{recursive:true,force:true});
}

import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, unlinkSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const root=process.cwd();
const harnessName='.pf08a-m3-01-browser-harness.html';
const harnessPath=join(root,harnessName);
const profilePath=mkdtempSync(join(tmpdir(),'pf08a-m3-01-chrome-'));
const marker='PF08A_M3_01_BROWSER_PASS';

const harness=`<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>M3 browser smoke</title></head>
<body data-status="PENDING"><iframe id="app" src="/?test=1&pf08a-m3-01=1" style="width:390px;height:844px;border:0"></iframe><pre id="result">PENDING</pre>
<script>
(() => {
  const frame=document.getElementById('app');
  const result=document.getElementById('result');
  const assert=(condition,message)=>{if(!condition)throw new Error(message)};
  const text=node=>(node?.textContent||'').replace(/\\s+/g,' ').trim();
  const dateValue=value=>{const d=new Date(value),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())};
  const click=node=>{assert(node,'Clickable node missing');node.click()};

  async function waitApi(){
    const deadline=Date.now()+15000;
    while(Date.now()<deadline){
      const api=frame.contentWindow&&frame.contentWindow.__FP_TEST__;
      if(api?.obligations)return api;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    throw new Error('FamilyPilot M3 test API did not become ready');
  }

  async function run(){
    const api=await waitApi();
    const doc=frame.contentDocument;
    const initial=api.getState();
    const household='wallet-household-main';
    const personal='wallet-personal-anna';
    const expenseCategory=initial.categories.find(category=>category.kind==='expense'&&!category.archivedAt)?.id;
    assert(expenseCategory,'Expense category fixture missing');

    // Accepted navigation remains stable. Icons and labels are adjacent in the DOM.
    const nav=[...doc.querySelectorAll('nav.bottom [data-screen]')].map(node=>text(node));
    assert(JSON.stringify(nav)===JSON.stringify(['⌂Главная','☷Операции','▣План','⊞Ещё']),'Bottom navigation labels/order changed: '+JSON.stringify(nav));
    assert(text(doc.getElementById('capitalRevealBtn'))==='Капитал','Hidden Capital control regressed');
    assert(!doc.getElementById('capitalInfo').classList.contains('open'),'Capital overlay must remain closed by default');

    // Plan root is a real hub, while unfinished modules remain honest.
    click(doc.querySelector('[data-screen="plans"]'));
    assert(doc.getElementById('plansScreen').classList.contains('active'),'Plan root did not open');
    assert(text(doc.getElementById('plansScreen')).includes('Обязательства'),'Obligations entry missing');
    assert(text(doc.getElementById('plansScreen')).includes('Долги'),'Debts entry missing');
    assert(text(doc.getElementById('plansScreen')).includes('Накопления'),'Savings entry missing');
    assert(doc.querySelectorAll('#plansScreen .plan-module[disabled]').length===2,'Debts and Savings must remain honest unavailable entries');

    click(doc.querySelector('[data-plan-module="obligations"]'));
    assert(doc.getElementById('obligationsScreen').classList.contains('active'),'Obligations screen did not open');

    // Create a one-time rule through the actual editor.
    click(doc.getElementById('obligationAddBtn'));
    assert(doc.getElementById('obligationRuleModal').classList.contains('open'),'Rule editor did not open');
    doc.getElementById('obligationName').value='Аренда';
    doc.getElementById('obligationAmount').value='700';
    doc.getElementById('obligationCadence').value='once';
    doc.getElementById('obligationDueDate').value=dateValue(Date.now());
    doc.getElementById('obligationWallet').value=household;
    doc.getElementById('obligationCategory').value=expenseCategory;
    click(doc.getElementById('obligationRuleSave'));
    assert(!doc.getElementById('obligationRuleModal').classList.contains('open'),'Rule editor did not close after save');

    let state=api.getState();
    assert(state.schemaVersion===3,'State was not additively normalized to schema v3');
    assert(state.obligationRules.length===1,'Rule was not created');
    assert(state.obligationOccurrences.length===1,'Occurrence was not created');
    const occurrenceId=state.obligationOccurrences[0].id;
    assert(doc.querySelector('[data-obligation-occurrence]'),'Occurrence row is missing');

    // Pay through the actual detail and payment route.
    click(doc.querySelector('[data-obligation-occurrence]'));
    assert(doc.getElementById('obligationDetailModal').classList.contains('open'),'Occurrence detail did not open');
    click(doc.getElementById('obligationPayBtn'));
    assert(doc.getElementById('obligationPayModal').classList.contains('open'),'Payment sheet did not open');
    doc.getElementById('obligationPayAmount').value='690';
    doc.getElementById('obligationPayDate').value=dateValue(Date.now());
    click(doc.getElementById('obligationPaySave'));

    state=api.getState();
    const occurrence=state.obligationOccurrences.find(item=>item.id===occurrenceId);
    assert(occurrence.status==='paid','Occurrence was not marked paid');
    const linked=state.operations.filter(operation=>operation.links?.obligationOccurrenceId===occurrenceId);
    assert(linked.length===1,'Payment must create exactly one linked Expense');
    assert(linked[0].kind==='expense'&&linked[0].amount===690,'Linked Expense amount/type mismatch');
    assert(api.analyticsFilteredOperations().includes(linked[0].id),'Linked Expense is missing from Analytics source operations');

    const beforeDuplicate=state.operations.length;
    const duplicate=api.obligations.pay(occurrenceId,{amount:690,occurredAt:Date.now()});
    assert(duplicate.ok===false,'Duplicate payment must be rejected');
    assert(api.getState().operations.length===beforeDuplicate,'Duplicate payment created another operation');

    // Trash and restore must recalculate the module projection.
    api.trashOperation(linked[0].id);
    assert(api.obligations.status(occurrenceId)!=='paid','Trashed payment left stale paid state');
    api.restoreOperation(linked[0].id);
    assert(api.obligations.status(occurrenceId)==='paid','Restored payment did not restore paid state');

    // Personal obligations must not leak to household scope.
    api.setActiveWallet(personal);
    const personalRule=api.obligations.createRule({name:'Личная подписка',amount:12,dueAt:Date.now()+86400000,cadence:'monthly',walletId:personal,categoryId:expenseCategory,currency:'EUR'});
    assert(personalRule.ok===true,'Personal obligation creation failed');
    assert(api.obligations.visible().includes(personalRule.occurrence.id),'Personal occurrence not visible in personal scope');
    api.setActiveWallet(household);
    assert(!api.obligations.visible().includes(personalRule.occurrence.id),'Personal occurrence leaked into household scope');

    // Existing foundations remain operational.
    assert(doc.querySelector('meta[content="compact-analytics-states-v1"]'),'A3 Analytics marker missing');
    assert(doc.querySelector('meta[content="hidden-capital-disclosure-v1"]'),'Hidden Capital marker missing');
    api.openPlan();
    assert(doc.getElementById('plansScreen').classList.contains('active'),'Plan root cannot reopen');

    const output={
      status:'PASS',
      marker:'${marker}',
      navigation:'Главная · Операции · План · Ещё',
      planHub:true,
      ruleEditor:true,
      occurrenceCreated:true,
      oneLinkedExpense:true,
      duplicatePaymentRejected:true,
      analyticsSourceLinked:true,
      trashRestoreRecalculated:true,
      personalScopeIsolated:true,
      hiddenCapitalPreserved:true,
      compactAnalyticsPreserved:true
    };
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
    const child=spawn(chrome,[
      '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
      `--user-data-dir=${profilePath}`,'--virtual-time-budget=25000','--dump-dom',url
    ],{stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    child.stdout.on('data',chunk=>stdout+=chunk);
    child.stderr.on('data',chunk=>stderr+=chunk);
    child.on('error',reject);
    child.on('close',code=>code===0?resolvePromise({stdout,stderr}):reject(new Error(`Chrome exited ${code}\n${stderr}`)));
  });
}

await new Promise((resolvePromise,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',resolvePromise);
});

try{
  const address=server.address();
  const {stdout}=await runChrome(`http://127.0.0.1:${address.port}/${harnessName}`);
  const match=stdout.match(/<pre id="result">([\s\S]*?)<\/pre>/);
  const decoded=(match?.[1]||'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
  if(!stdout.includes('data-status="PASS"')||!stdout.includes(marker)){
    throw new Error(`M3 browser smoke did not pass\n${decoded||stdout.slice(-5000)}`);
  }
  console.log(decoded||JSON.stringify({status:'PASS',marker},null,2));
}finally{
  await new Promise(resolvePromise=>server.close(resolvePromise));
  if(existsSync(harnessPath))unlinkSync(harnessPath);
  rmSync(profilePath,{recursive:true,force:true});
}

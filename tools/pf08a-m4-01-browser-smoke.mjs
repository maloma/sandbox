import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, unlinkSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const root=process.cwd();
const harnessName='.pf08a-m4-01-browser-harness.html';
const harnessPath=join(root,harnessName);
const profilePath=mkdtempSync(join(tmpdir(),'pf08a-m4-01-chrome-'));
const marker='PF08A_M4_01_BROWSER_PASS';

const harness=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>M4 browser smoke</title></head><body data-status="PENDING"><iframe id="app" src="/?test=1&pf08a-m4-01=1" style="width:390px;height:844px;border:0"></iframe><pre id="result">PENDING</pre><script>
(()=>{
  const frame=document.getElementById('app'),result=document.getElementById('result');
  const assert=(condition,message)=>{if(!condition)throw new Error(message)};
  const text=node=>(node?.textContent||'').replace(/\\s+/g,' ').trim();
  const click=node=>{assert(node,'Clickable node missing');node.click()};
  const runtimeErrors=[];
  async function waitApi(){const deadline=Date.now()+25000;while(Date.now()<deadline){const api=frame.contentWindow&&frame.contentWindow.__FP_TEST__;if(api?.savings&&api?.debts&&api?.obligations)return api;await new Promise(resolve=>setTimeout(resolve,100))}throw new Error('FamilyPilot M4 test API did not become ready')}
  async function reloadFrame(){await new Promise((resolveReload,reject)=>{const timer=setTimeout(()=>reject(new Error('Reload timeout')),20000);frame.addEventListener('load',()=>{clearTimeout(timer);resolveReload()},{once:true});frame.contentWindow.location.reload()})}
  async function run(){
    let win=frame.contentWindow;win.addEventListener('error',event=>runtimeErrors.push(String(event.error||event.message||'error')));win.addEventListener('unhandledrejection',event=>runtimeErrors.push(String(event.reason||'unhandled rejection')));win.confirm=()=>true;
    let api=await waitApi(),doc=frame.contentDocument;
    assert(doc.querySelector('meta[content="savings-goals-v1"]'),'M4 package marker missing');
    assert(text(doc.getElementById('capitalRevealBtn'))==='Капитал','Hidden Capital control regressed');assert(!doc.getElementById('capitalInfo').classList.contains('open'),'Capital overlay must remain closed');
    const nav=[...doc.querySelectorAll('nav.bottom [data-screen]')].map(node=>text(node));assert(JSON.stringify(nav)===JSON.stringify(['⌂Главная','☷Операции','▣План','⊞Ещё']),'Bottom navigation changed: '+JSON.stringify(nav));

    click(doc.querySelector('[data-screen="plans"]'));
    const obligations=doc.querySelector('[data-plan-module="obligations"]'),debts=doc.querySelector('[data-plan-module="debts"]'),savings=doc.querySelector('[data-plan-module="savings"]');
    assert(obligations&&!obligations.disabled,'Plan → Obligations regressed');assert(debts&&!debts.disabled,'Plan → Debts regressed');assert(savings&&!savings.disabled,'Plan → Savings is not active');assert(doc.querySelectorAll('#plansScreen .plan-module[disabled]').length===0,'All three Plan modules must be active after M4 integration');
    click(savings);assert(doc.getElementById('savingsScreen').classList.contains('active'),'Savings screen did not open');assert(text(doc.getElementById('savingsGoalList')).includes('Целей пока нет'),'Neutral empty state missing');assert(!/предупреж|ошибк|обязатель/i.test(text(doc.getElementById('savingsGoalList'))),'Empty state is alarming');
    assert(!doc.querySelector('[data-savings-emergency],[data-savings-unallocated],[data-savings-overview],#emergencyCushion,#unallocatedSavings,#savingsOverview'),'Excluded savings controls were mounted');

    const financialBefore=api.savings.financialSnapshot();
    click(doc.getElementById('savingsAddBtn'));doc.getElementById('savingsGoalName').value='Отпуск';doc.getElementById('savingsTargetAmount').value='2000';doc.getElementById('savingsSavedAmount').value='250';
    click(doc.querySelector('[data-savings-help="name"]'));assert(doc.getElementById('savingsHelpModal').classList.contains('open'),'Contextual help did not open');assert(doc.getElementById('savingsGoalName').value==='Отпуск'&&doc.getElementById('savingsTargetAmount').value==='2000'&&doc.getElementById('savingsSavedAmount').value==='250','Opening help cleared unsaved form values');click(doc.querySelector('#savingsHelpModal [data-savings-close]'));
    click(doc.getElementById('savingsSaveBtn'));let state=api.getState();assert(state.schemaVersion>=6,'State was not normalized to schema v6');assert(state.savingsGoals.length===1,'Goal was not created');const goalId=state.savingsGoals[0].id;assert(state.savingsGoals[0].targetDate===null,'Optional date must remain empty');assert(text(doc.getElementById('savingsDetailContent')).includes('1 750')||text(doc.getElementById('savingsDetailContent')).includes('1 750'),'Remaining amount is not displayed');click(doc.querySelector('#savingsDetailModal [data-savings-close]'));
    assert(JSON.stringify(api.savings.financialSnapshot())===JSON.stringify(financialBefore),'Creating a goal changed operations, Capital or ordinary totals');

    await reloadFrame();win=frame.contentWindow;win.addEventListener('error',event=>runtimeErrors.push(String(event.error||event.message||'error')));win.addEventListener('unhandledrejection',event=>runtimeErrors.push(String(event.reason||'unhandled rejection')));win.confirm=()=>true;api=await waitApi();doc=frame.contentDocument;state=api.getState();assert(state.savingsGoals.some(goal=>goal.id===goalId),'Goal did not persist after reload');
    api.savings.openEditor(goalId);doc.getElementById('savingsGoalName').value='Большой отпуск';doc.getElementById('savingsTargetAmount').value='2200';doc.getElementById('savingsSavedAmount').value='400';doc.getElementById('savingsTargetDate').value='2027-06-01';click(doc.getElementById('savingsSaveBtn'));state=api.getState();const edited=state.savingsGoals.find(goal=>goal.id===goalId);assert(edited&&edited.name==='Большой отпуск'&&edited.targetAmount===2200&&edited.savedAmount===400,'Goal edit failed');assert(edited.id===goalId,'Goal edit changed stable id');assert(edited.targetDate>0,'Optional date was not saved');click(doc.querySelector('#savingsDetailModal [data-savings-close]'));
    assert(JSON.stringify(api.savings.financialSnapshot())===JSON.stringify(financialBefore),'Editing a goal changed operations, Capital or ordinary totals');

    api.savings.openList();click(doc.querySelector('[data-savings-goal="'+goalId+'"]'));click(doc.getElementById('savingsArchiveBtn'));state=api.getState();assert(api.savings.active().length===0,'Archived goal remained active');assert(api.savings.archived().some(goal=>goal.id===goalId),'Archived goal was deleted instead of preserved');assert(text(doc.getElementById('savingsGoalList')).includes('Целей пока нет'),'Empty state did not return after archive');assert(!doc.getElementById('savingsArchiveSection').hidden,'Archived list is not available');assert(JSON.stringify(api.savings.financialSnapshot())===JSON.stringify(financialBefore),'Archiving a goal changed operations, Capital or ordinary totals');

    click(doc.querySelector('[data-screen="plans"]'));assert(!doc.querySelector('[data-plan-module="obligations"]').disabled&&!doc.querySelector('[data-plan-module="debts"]').disabled&&!doc.querySelector('[data-plan-module="savings"]').disabled,'Integrated Plan modules regressed');
    assert(runtimeErrors.length===0,'Runtime exceptions: '+runtimeErrors.join(' | '));
    const output={status:'PASS',marker:'${marker}',navigation:'Главная · Операции · План · Ещё',allPlanModulesActive:true,optionalEmptyState:true,goalsOnly:true,contextualHelpPreservesForm:true,create:true,reloadPersistence:true,stableEditId:true,optionalDate:true,archivePreservesObject:true,noOperationsMutation:true,noCapitalMutation:true,noOrdinaryAnalyticsMutation:true,m2Preserved:true,m3Preserved:true,hiddenCapitalPreserved:true,runtimeExceptions:[]};result.textContent=JSON.stringify(output,null,2);document.body.dataset.status='PASS';
  }
  frame.addEventListener('load',()=>run().catch(error=>{result.textContent=String(error&&error.stack||error);document.body.dataset.status='FAIL'}),{once:true});
})();
</script></body></html>`;

writeFileSync(harnessPath,harness);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1'),raw=url.pathname==='/'?'index.html':url.pathname.replace(/^\/+/, ''),target=normalize(resolve(root,raw));if(target!==root&&!target.startsWith(root+sep))throw new Error('Forbidden path');const body=readFileSync(target);res.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream','cache-control':'no-store'});res.end(body)}catch{res.writeHead(404,{'content-type':'text/plain'});res.end('Not found')}});
const chromeCandidates=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'],chrome=chromeCandidates.find(existsSync);if(!chrome)throw new Error('Chrome/Chromium is not installed');
function runChrome(url){return new Promise((resolveRun,reject)=>{const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',`--user-data-dir=${profilePath}`,'--virtual-time-budget=50000','--dump-dom',url],{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.on('error',reject);child.on('close',code=>code===0?resolveRun({stdout,stderr}):reject(new Error(`Chrome exited ${code}\n${stderr}`)))})}
await new Promise((resolveRun,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolveRun)});
try{const address=server.address(),{stdout}=await runChrome(`http://127.0.0.1:${address.port}/${harnessName}`),match=stdout.match(/<pre id="result">([\s\S]*?)<\/pre>/),decoded=(match?.[1]||'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');if(!stdout.includes('data-status="PASS"')||!stdout.includes(marker))throw new Error(`M4 browser smoke did not pass\n${decoded||stdout.slice(-8000)}`);console.log(decoded||JSON.stringify({status:'PASS',marker},null,2))}finally{await new Promise(resolveRun=>server.close(resolveRun));if(existsSync(harnessPath))unlinkSync(harnessPath);rmSync(profilePath,{recursive:true,force:true})}
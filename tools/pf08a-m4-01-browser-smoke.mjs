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
  async function run(){
    const win=frame.contentWindow;win.addEventListener('error',event=>runtimeErrors.push(String(event.error||event.message||'error')));win.addEventListener('unhandledrejection',event=>runtimeErrors.push(String(event.reason||'unhandled rejection')));
    const api=await waitApi(),doc=frame.contentDocument;
    assert(doc.querySelector('meta[content="savings-goal-config-v1"]'),'M4 package marker missing');
    const nav=[...doc.querySelectorAll('nav.bottom [data-screen]')].map(node=>text(node));assert(JSON.stringify(nav)===JSON.stringify(['⌂Главная','☷Операции','▣План','⊞Ещё']),'Bottom navigation changed: '+JSON.stringify(nav));
    const initialState=api.getState(),initialOperations=JSON.stringify(initialState.operations),initialCapital=api.savings.capital().capital,initialOrdinary=JSON.stringify(api.savings.ordinaryTotals());
    assert(initialState.schemaVersion>=6,'State was not normalized to schema v6');assert(api.savings.summary().optional===true,'No-goal state is not optional');assert(api.savings.summary().active===0,'Unexpected active savings fixture');

    click(doc.querySelector('[data-screen="plans"]'));
    const obligationPlan=doc.querySelector('[data-plan-module="obligations"]'),debtPlan=doc.querySelector('[data-plan-module="debts"]'),savingsPlan=doc.querySelector('[data-plan-module="savings"]');
    assert(obligationPlan&&!obligationPlan.disabled,'Plan → Obligations regressed');assert(debtPlan&&!debtPlan.disabled,'Plan → Debts regressed');assert(savingsPlan&&!savingsPlan.disabled,'Plan → Savings is not active');assert(doc.querySelectorAll('#plansScreen .plan-module[disabled]').length===0,'An accepted Plan module remains disabled');
    click(savingsPlan);assert(doc.getElementById('savingsGoalsScreen').classList.contains('active'),'Savings Goals screen did not open');assert(text(doc.getElementById('savingsGoalList')).includes('Целей пока нет'),'Optional empty state missing');

    click(doc.getElementById('savingsAddBtn'));assert(doc.getElementById('savingsGoalModal').classList.contains('open'),'Goal editor did not open');
    doc.getElementById('savingsGoalName').value='Семейный отпуск';doc.getElementById('savingsGoalTarget').value='5000';doc.getElementById('savingsGoalSaved').value='1200';doc.getElementById('savingsGoalDate').value='2027-06-15';
    click(doc.querySelector('[data-savings-help="saved"]'));assert(doc.getElementById('savingsHelpModal').classList.contains('open'),'Saved amount help did not open');assert(doc.getElementById('savingsGoalName').value==='Семейный отпуск','Help cleared the unsaved goal name');assert(doc.getElementById('savingsGoalSaved').value==='1200','Help cleared the unsaved saved amount');click(doc.querySelector('#savingsHelpModal [data-savings-close="savingsHelpModal"]'));
    click(doc.getElementById('savingsGoalSave'));
    let state=api.getState();assert(state.savingsGoals.length===1,'Goal was not created');const goalId=state.savingsGoals[0].id;assert(state.savingsGoals[0].name==='Семейный отпуск','Goal name incorrect');assert(state.savingsGoals[0].targetAmount===5000&&state.savingsGoals[0].savedAmount===1200,'Target and saved amount were not kept distinct');assert(state.savingsGoals[0].targetDate==='2027-06-15','Optional date missing');assert(JSON.stringify(state.operations)===initialOperations,'Goal creation invented or changed operations');assert(api.savings.capital().capital===initialCapital,'Goal creation changed Capital');assert(JSON.stringify(api.savings.ordinaryTotals())===initialOrdinary,'Goal creation changed Income/Expense totals');assert(text(doc.getElementById('savingsGoalList')).includes('Семейный отпуск'),'Created goal card missing');

    click(doc.querySelector('[data-savings-edit]'));assert(doc.getElementById('savingsGoalId').value===goalId,'Editor did not reopen the same goal');doc.getElementById('savingsGoalTarget').value='5500';doc.getElementById('savingsGoalSaved').value='1500';doc.getElementById('savingsGoalDate').value='';click(doc.getElementById('savingsGoalSave'));
    state=api.getState();assert(state.savingsGoals.length===1&&state.savingsGoals[0].id===goalId,'Edit replaced the goal object');assert(state.savingsGoals[0].targetAmount===5500&&state.savingsGoals[0].savedAmount===1500,'Edited values incorrect');assert(state.savingsGoals[0].targetDate===null,'Optional date was not cleared');assert(state.savingsGoals[0].revisions.length>=1,'Goal revision history missing');assert(JSON.stringify(state.operations)===initialOperations,'Goal edit changed operations');assert(api.savings.capital().capital===initialCapital,'Goal edit changed Capital');

    click(doc.querySelector('[data-savings-archive]'));state=api.getState();assert(state.savingsGoals.length===1&&state.savingsGoals[0].id===goalId,'Archive deleted or replaced the goal');assert(state.savingsGoals[0].status==='archived','Goal was not archived');assert(api.savings.active().length===0&&api.savings.archived().length===1,'Active/archive projection incorrect');assert(text(doc.getElementById('savingsGoalList')).includes('Целей пока нет'),'Active empty state missing after archive');click(doc.querySelector('[data-savings-filter="archived"]'));assert(doc.querySelector('.savings-card.archived'),'Archived card missing');assert(!doc.querySelector('.savings-card.archived [data-savings-edit]'),'Archived goal remained editable');

    assert(!doc.getElementById('savingsEmergency'),'Emergency cushion field leaked into M4-01');assert(!doc.getElementById('savingsUnallocated'),'Unallocated savings field leaked into M4-01');assert(!doc.getElementById('savingsTotal'),'Total savings field leaked into M4-01');assert(!doc.getElementById('savingsGoalWallet'),'Personal or wallet-specific goal field leaked into M4-01');
    api.setActiveWallet('wallet-personal-anna');api.savings.openList();assert(api.savings.all().length===1,'Wallet switch duplicated or hid household goals');assert(api.savings.all()[0].scope==='household','Personal goal semantics were introduced');assert(JSON.stringify(api.getState().operations)===initialOperations,'Wallet switch plus goal route changed operations');
    assert(api.debts&&api.obligations,'M2 or M3 test API regressed');assert(runtimeErrors.length===0,'Runtime exceptions: '+runtimeErrors.join(' | '));

    const output={status:'PASS',marker:'${marker}',navigation:'Главная · Операции · План · Ещё',optionalEmptyState:true,createGoal:true,editStableId:true,archivePreservesObject:true,targetAndSavedDistinct:true,contextualHelpPreservesDraft:true,noMoneyMovement:true,capitalUnchanged:true,ordinaryAnalyticsUnchanged:true,householdGoalsOnly:true,emergencyCushionExcluded:true,unallocatedSavingsExcluded:true,overviewExcluded:true,m2Preserved:true,m3Preserved:true,runtimeExceptions:[]};result.textContent=JSON.stringify(output,null,2);document.body.dataset.status='PASS';
  }
  frame.addEventListener('load',()=>run().catch(error=>{result.textContent=String(error&&error.stack||error);document.body.dataset.status='FAIL'}),{once:true});
})();
</script></body></html>`;

writeFileSync(harnessPath,harness);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1'),raw=url.pathname==='/'?'index.html':url.pathname.replace(/^\//,''),target=normalize(resolve(root,raw));if(target!==root&&!target.startsWith(root+sep))throw new Error('Forbidden path');const body=readFileSync(target);res.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream','cache-control':'no-store'});res.end(body)}catch{res.writeHead(404,{'content-type':'text/plain'});res.end('Not found')}});
const chromeCandidates=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'],chrome=chromeCandidates.find(existsSync);if(!chrome)throw new Error('Chrome/Chromium is not installed');
function runChrome(url){return new Promise((resolveRun,reject)=>{const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',`--user-data-dir=${profilePath}`,'--virtual-time-budget=45000','--dump-dom',url],{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.on('error',reject);child.on('close',code=>code===0?resolveRun({stdout,stderr}):reject(new Error(`Chrome exited ${code}\n${stderr}`)))})}
await new Promise((resolveRun,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolveRun)});
try{const address=server.address(),{stdout}=await runChrome(`http://127.0.0.1:${address.port}/${harnessName}`),match=stdout.match(/<pre id="result">([\s\S]*?)<\/pre>/),decoded=(match?.[1]||'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');if(!stdout.includes('data-status="PASS"')||!stdout.includes(marker))throw new Error(`M4 browser smoke did not pass\n${decoded||stdout.slice(-8000)}`);console.log(decoded||JSON.stringify({status:'PASS',marker},null,2))}finally{await new Promise(resolveRun=>server.close(resolveRun));if(existsSync(harnessPath))unlinkSync(harnessPath);rmSync(profilePath,{recursive:true,force:true})}
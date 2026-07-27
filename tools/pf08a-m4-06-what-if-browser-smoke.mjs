import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const root=process.cwd();
const harnessName='.pf08a-m4-06-browser-harness.html';
const harnessPath=join(root,harnessName);
const profilePath=mkdtempSync(join(tmpdir(),'pf08a-m406-chrome-'));
const marker='PF08A_M4_06_WHAT_IF_PASS';
const harness=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>M4-06 smoke</title></head><body data-status="PENDING"><iframe id="app" src="/?test=1&m406=1" style="width:390px;height:844px;border:0"></iframe><pre id="result">PENDING</pre><script>
(()=>{
 const frame=document.getElementById('app'),result=document.getElementById('result'),runtimeErrors=[];
 const assert=(condition,message)=>{if(!condition)throw new Error(message)};
 const text=node=>(node?.textContent||'').replace(/\\s+/g,' ').trim();
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 async function ready(){const end=Date.now()+50000;while(Date.now()<end){const win=frame.contentWindow,api=win&&win.__FP_TEST__;if(api?.whatIf?.create&&win.__FP_M4_06_READY__===true)return api;await wait(100)}const win=frame.contentWindow;throw new Error('M4-06 API not ready '+JSON.stringify({package:win?.__FP_M4_06_PACKAGE_LOADED__,ready:win?.__FP_M4_06_READY__,error:win?.__FP_M4_06_UI_ERROR__,bootstrap:win?.__FP_PACKAGE_BOOTSTRAP_ERROR__}))}
 async function run(){
  const win=frame.contentWindow;win.addEventListener('error',event=>runtimeErrors.push(String(event.error||event.message||'error')));win.addEventListener('unhandledrejection',event=>runtimeErrors.push(String(event.reason||'rejection')));
  const test=await ready(),doc=frame.contentDocument,runtime=win.__FP_RUNTIME__,state=runtime.state,whatIf=test.whatIf,accounts=win.FamilyPilotSavingsAccounts,legacy=win.FamilyPilotSavingsGoals;
  assert(doc.querySelector('meta[content="m4-06-what-if-scenario-foundation-v1"]'),'M4-06 package marker missing');
  assert(doc.getElementById('m406PlanEntry'),'What If plan entry missing');
  assert(doc.getElementById('whatIfScreen'),'What If screen missing');
  let goal=(state.savingsGoals||[]).find(item=>item.status==='active');
  if(!goal){const created=legacy.createGoal(state,{name:'Тестовая цель',targetAmount:1200,savedAmount:0,targetDate:''},state.currentMemberId,Date.now());assert(created.ok,'Could not create test goal');goal=created.goal;const plan=accounts.setPlan(state,goal.id,{planningMode:'fixed_contribution',monthlyContribution:100,contributionDay:1},state.currentMemberId,Date.now());assert(plan.ok,'Could not create test plan');runtime.save();runtime.renderAll()}
  const before=whatIf.fingerprint();
  const a=whatIf.create({name:'Больше свободных денег',horizonDays:90,monthlyExpenseReduction:100,monthlyAdditionalIncome:200,savingsContributionChanges:[{goalId:goal.id,monthlyDelta:50}],notes:'Тестовый сценарий A'});assert(a.ok,'Scenario A creation failed: '+a.error);
  assert(whatIf.fingerprint()===before,'Creating scenario changed actual financial state');
  const evaluated=whatIf.evaluate(a.scenario.id);assert(evaluated.ok,'Scenario A evaluation failed: '+evaluated.error);
  assert(evaluated.actualStateUnchanged,'Scenario evaluation mutated actual state');
  assert(Math.abs(evaluated.monthlyCapitalEffect-300)<.01,'Monthly capital effect is incorrect');
  assert(Math.abs(evaluated.monthlyOperatingEffect-250)<.01,'Monthly operating effect is incorrect');
  assert(Math.abs(evaluated.annualizedCapitalEffect-3600)<.01,'Annualized capital effect is incorrect');
  assert(evaluated.periodCount===3,'90-day scenario did not create three monthly periods');
  assert(Math.abs(evaluated.endingCapitalDifference-900)<.01,'90-day scenario capital difference is incorrect');
  const impact=evaluated.goalImpacts.find(item=>item.goalId===goal.id);assert(impact&&Math.abs((impact.scenarioMonthly-impact.baselineMonthly)-50)<.01,'Savings contribution impact is incorrect');
  const b=whatIf.create({name:'Осторожный вариант',horizonDays:30,monthlyExpenseReduction:50,monthlyAdditionalIncome:0,savingsContributionChanges:[{goalId:goal.id,monthlyDelta:-25}],notes:'Тестовый сценарий B'});assert(b.ok,'Scenario B creation failed: '+b.error);
  const compared=whatIf.compare(a.scenario.id,b.scenario.id);assert(compared.ok,'Scenario comparison failed: '+compared.error);assert(compared.actualStateUnchanged,'Scenario comparison mutated actual state');
  assert(whatIf.list().length===2,'Multiple named scenarios were not stored');
  const copy=whatIf.duplicate(a.scenario.id);assert(copy.ok&&whatIf.list().length===3,'Scenario duplication failed');
  const archived=whatIf.archive(copy.scenario.id);assert(archived.ok&&whatIf.list().length===2,'Scenario archive failed');
  assert(whatIf.fingerprint()===before,'Scenario operations changed actual financial state');
  whatIf.open(a.scenario.id);await wait(50);
  const screenText=text(doc.getElementById('whatIfScreen'));
  assert(screenText.includes('Реальные финансы не изменяются'),'Isolation notice missing');
  assert(screenText.includes('Больше свободных денег'),'Saved scenario missing from UI');
  assert(screenText.includes('Сценарий против сценария'),'Scenario comparison UI missing');
  assert(runtimeErrors.length===0,'Runtime exceptions: '+runtimeErrors.join(' | '));
  result.textContent=JSON.stringify({status:'PASS',marker:'${marker}',multipleNamedScenarios:true,horizons:[30,90],expenseReduction:true,additionalIncome:true,savingsContributionChange:true,capitalInvariant:true,actualStateIsolation:true,baselineComparison:true,scenarioComparison:true,annualizedOrientation:true,runtimeExceptions:[]},null,2);document.body.dataset.status='PASS';
 }
 frame.addEventListener('load',()=>run().catch(error=>{result.textContent=String(error?.stack||error);document.body.dataset.status='FAIL'}),{once:true});
})();</script></body></html>`;
writeFileSync(harnessPath,harness);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1'),raw=url.pathname==='/'?'index.html':url.pathname.replace(/^\//,''),target=normalize(resolve(root,raw));if(target!==root&&!target.startsWith(root+sep))throw new Error('Forbidden');const body=readFileSync(target);res.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream','cache-control':'no-store'});res.end(body)}catch{if(!res.headersSent)res.writeHead(404);res.end('Not found')}});
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);if(!chrome)throw new Error('Chrome/Chromium is not installed');
const runChrome=url=>new Promise((resolveRun,rejectRun)=>{const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',`--user-data-dir=${profilePath}`,'--virtual-time-budget=120000','--dump-dom',url],{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.on('error',rejectRun);child.on('close',code=>code===0?resolveRun(stdout):rejectRun(new Error(`Chrome exited ${code}\n${stderr}`)))});
await new Promise((resolveListen,rejectListen)=>{server.once('error',rejectListen);server.listen(0,'127.0.0.1',resolveListen)});
try{const {port}=server.address(),output=await runChrome(`http://127.0.0.1:${port}/${harnessName}`),match=output.match(/<pre id="result">([\s\S]*?)<\/pre>/),decoded=(match?.[1]||'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');if(!output.includes('data-status="PASS"')||!output.includes(marker))throw new Error(`M4-06 browser smoke failed\n${decoded||output.slice(-16000)}`);console.log(decoded)}finally{await new Promise(resolveClose=>server.close(resolveClose));if(existsSync(harnessPath))unlinkSync(harnessPath);rmSync(profilePath,{recursive:true,force:true})}

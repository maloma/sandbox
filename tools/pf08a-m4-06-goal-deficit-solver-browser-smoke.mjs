import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const root=process.cwd();
const harnessName='.pf08a-m4-06-solver-browser-harness.html';
const harnessPath=join(root,harnessName);
const profilePath=mkdtempSync(join(tmpdir(),'pf08a-m406-solver-chrome-'));
const marker='PF08A_M4_06_GOAL_DEFICIT_SOLVER_PASS';
const harness=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>M4-06 solver smoke</title></head><body data-status="PENDING"><iframe id="app" src="/?test=1&m406solver=1" style="width:390px;height:844px;border:0"></iframe><pre id="result">PENDING</pre><script>
(()=>{
 const frame=document.getElementById('app'),result=document.getElementById('result'),runtimeErrors=[];
 const assert=(condition,message)=>{if(!condition)throw new Error(message)};
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const text=node=>(node?.textContent||'').replace(/\\s+/g,' ').trim();
 async function ready(){const end=Date.now()+55000;while(Date.now()<end){const win=frame.contentWindow,api=win&&win.__FP_TEST__;if(api?.solver?.deficit&&api?.whatIf?.create&&win.__FP_M4_06_SOLVER_READY__===true)return api;await wait(100)}const win=frame.contentWindow;throw new Error('M4-06 solver API not ready '+JSON.stringify({package:win?.__FP_M4_06_SOLVER_PACKAGE_LOADED__,ready:win?.__FP_M4_06_SOLVER_READY__,error:win?.__FP_M4_06_SOLVER_UI_ERROR__,bootstrap:win?.__FP_PACKAGE_BOOTSTRAP_ERROR__}))}
 async function run(){
  const win=frame.contentWindow;win.addEventListener('error',event=>runtimeErrors.push(String(event.error||event.message||'error')));win.addEventListener('unhandledrejection',event=>runtimeErrors.push(String(event.reason||'rejection')));
  const test=await ready(),doc=frame.contentDocument,runtime=win.__FP_RUNTIME__,state=runtime.state,solver=test.solver,whatIf=test.whatIf,legacy=win.FamilyPilotSavingsGoals,accounts=win.FamilyPilotSavingsAccounts,obligations=win.FamilyPilotObligations;
  assert(doc.querySelector('meta[content="m4-06-goal-deficit-solver-v1"]'),'Solver package marker missing');
  assert(doc.getElementById('m406Solver'),'Solver section missing');
  const main=state.wallets.find(item=>item.type==='household_default')||state.wallets[0];assert(main,'Main wallet missing');
  const now=Date.now();
  const obligation=obligations.createRule(state,{name:'Тестовый будущий платёж',amount:50000,dueAt:now+10*86400000,cadence:'once',walletId:main.id,categoryId:'expense-budget-test',currency:'EUR'},state.currentMemberId,now+1);assert(obligation.ok,'Could not create deficit obligation: '+obligation.error);
  const createdGoal=legacy.createGoal(state,{name:'Цель для решателя',targetAmount:1200,savedAmount:0,targetDate:''},state.currentMemberId,now+2);assert(createdGoal.ok,'Could not create goal: '+createdGoal.error);
  const plan=accounts.setPlan(state,createdGoal.goal.id,{planningMode:'fixed_contribution',monthlyContribution:100,contributionDay:1},state.currentMemberId,now+3);assert(plan.ok,'Could not create goal plan: '+plan.error);
  runtime.save();runtime.renderAll();
  const actualBefore=solver.actualFingerprint();
  const saved=whatIf.create({name:'Сценарий с небольшим доходом',horizonDays:30,monthlyExpenseReduction:0,monthlyAdditionalIncome:1000,savingsContributionChanges:[],notes:'Для проверки решателя'});assert(saved.ok,'Could not create source scenario: '+saved.error);
  const actualAfterScenario=solver.actualFingerprint(),scenariosBefore=solver.scenarioFingerprint();assert(actualBefore===actualAfterScenario,'Creating What If scenario changed actual state');
  const deficit=solver.deficit({source:'actual',horizonDays:30,incomeShare:25});assert(deficit.ok,'Deficit solver failed: '+deficit.error);assert(deficit.deficitAmount>0&&deficit.requiredMonthlyRelief>0,'Deficit was not detected');assert(Math.abs(deficit.split.additionalIncome+deficit.split.expenseReduction-deficit.requiredMonthlyRelief)<.01,'Combined split does not equal required relief');assert(Math.abs(deficit.split.additionalIncome-deficit.requiredMonthlyRelief*.25)<.02,'Income split is incorrect');assert(deficit.resultingMinimumOperating>=-.01,'Deficit solver did not reach nonnegative minimum');assert(deficit.actualStateUnchanged&&deficit.savedScenariosUnchanged,'Deficit solver mutated state');assert(deficit.incomeMeaning.includes('дыры в бюджете'),'Income gap meaning is missing');
  const scenarioDeficit=solver.deficit({source:'scenario',scenarioId:saved.scenario.id,horizonDays:30,incomeShare:50});assert(scenarioDeficit.ok,'Saved-scenario deficit solver failed');assert(scenarioDeficit.requiredMonthlyRelief<=deficit.requiredMonthlyRelief,'Helpful source scenario did not reduce required relief');
  const target=new Date(now);target.setMonth(target.getMonth()+6);const targetText=target.toISOString().slice(0,10);
  const goal=solver.goal({source:'actual',goalId:createdGoal.goal.id,targetDate:targetText,incomeShare:40});assert(goal.ok,'Goal solver failed: '+goal.error);assert(goal.requiredMonthlyContribution>0,'Required goal contribution missing');assert(goal.additionalMonthlyContribution>0,'Additional goal contribution was not calculated');assert(Math.abs(goal.split.additionalIncome+goal.split.expenseReduction-goal.requiredMonthlyFundingRelief)<.01,'Goal funding split is incorrect');assert(goal.resultingMinimumOperating>=-.01,'Goal solver did not fund projected deficit');assert(goal.actualStateUnchanged&&goal.savedScenariosUnchanged,'Goal solver mutated state');
  assert(solver.actualFingerprint()===actualBefore,'Solver changed actual financial state');assert(solver.scenarioFingerprint()===scenariosBefore,'Solver changed saved scenarios');
  solver.open();await wait(50);const solverText=text(doc.getElementById('m406Solver'));assert(solverText.includes('Решить задачу'),'Solver heading missing');assert(solverText.includes('Убрать дефицит')&&solverText.includes('Достичь цели к дате'),'Solver modes missing');assert(solverText.includes('Программа не предполагает, что доход можно просто увеличить'),'Income-gap explanation missing');
  assert(runtimeErrors.length===0,'Runtime exceptions: '+runtimeErrors.join(' | '));
  result.textContent=JSON.stringify({status:'PASS',marker:'${marker}',actualBaseline:true,savedScenarioSource:true,horizons:[30,90],deterministicRelief:true,incomeGapInformational:true,expenseReductionInformational:true,combinedSplit:true,goalByDate:true,goalFundingGap:true,actualStateIsolation:true,savedScenarioIsolation:true,noRealPlanMutation:true,runtimeExceptions:[]},null,2);document.body.dataset.status='PASS';
 }
 frame.addEventListener('load',()=>run().catch(error=>{result.textContent=String(error?.stack||error);document.body.dataset.status='FAIL'}),{once:true});
})();</script></body></html>`;
writeFileSync(harnessPath,harness);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1'),raw=url.pathname==='/'?'index.html':url.pathname.replace(/^\//,''),target=normalize(resolve(root,raw));if(target!==root&&!target.startsWith(root+sep))throw new Error('Forbidden');const body=readFileSync(target);res.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream','cache-control':'no-store'});res.end(body)}catch{if(!res.headersSent)res.writeHead(404);res.end('Not found')}});
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);if(!chrome)throw new Error('Chrome/Chromium is not installed');
const runChrome=url=>new Promise((resolveRun,rejectRun)=>{const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',`--user-data-dir=${profilePath}`,'--virtual-time-budget=120000','--dump-dom',url],{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.on('error',rejectRun);child.on('close',code=>code===0?resolveRun(stdout):rejectRun(new Error(`Chrome exited ${code}\n${stderr}`)))});
await new Promise((resolveListen,rejectListen)=>{server.once('error',rejectListen);server.listen(0,'127.0.0.1',resolveListen)});
try{const {port}=server.address(),output=await runChrome(`http://127.0.0.1:${port}/${harnessName}`),match=output.match(/<pre id="result">([\s\S]*?)<\/pre>/),decoded=(match?.[1]||'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');if(!output.includes('data-status="PASS"')||!output.includes(marker))throw new Error(`M4-06 solver browser smoke failed\n${decoded||output.slice(-16000)}`);console.log(decoded)}finally{await new Promise(resolveClose=>server.close(resolveClose));if(existsSync(harnessPath))unlinkSync(harnessPath);rmSync(profilePath,{recursive:true,force:true})}

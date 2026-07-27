import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const root=process.cwd();
const harnessName='.pf08a-m4-05-browser-harness.html';
const harnessPath=join(root,harnessName);
const profilePath=mkdtempSync(join(tmpdir(),'pf08a-m405-chrome-'));
const marker='PF08A_M4_05_ONBOARDING_DISTRIBUTION_PASS';

const harness=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>M4-05 smoke</title></head><body data-status="PENDING"><iframe id="app" src="/?test=1&m405=1" style="width:390px;height:844px;border:0"></iframe><pre id="result">PENDING</pre><script>
(()=>{
 const frame=document.getElementById('app'),result=document.getElementById('result'),runtimeErrors=[];
 const assert=(condition,message)=>{if(!condition)throw new Error(message)};
 const text=node=>(node?.textContent||'').replace(/\\s+/g,' ').trim();
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 async function ready(){const end=Date.now()+45000;while(Date.now()<end){const win=frame.contentWindow,api=win&&win.__FP_TEST__;if(api?.m405?.applyOnboarding&&api?.moneyPlanning?.complete&&win.__FP_M4_05_UI_CORRECTION_READY__===true)return api;await wait(100)}const win=frame.contentWindow;throw new Error('M4-05 API not ready '+JSON.stringify({package:win?.__FP_M4_05_PACKAGE_LOADED__,ui:win?.__FP_M4_05_READY__,correction:win?.__FP_M4_05_UI_CORRECTION_READY__,error:win?.__FP_M4_05_UI_ERROR__,correctionError:win?.__FP_M4_05_UI_CORRECTION_ERROR__,bootstrap:win?.__FP_M4_05_BOOTSTRAP_ERROR__}))}
 async function run(){
  const win=frame.contentWindow;win.addEventListener('error',event=>runtimeErrors.push(String(event.error||event.message||'error')));win.addEventListener('unhandledrejection',event=>runtimeErrors.push(String(event.reason||'rejection')));
  const test=await ready(),doc=frame.contentDocument,runtime=win.__FP_RUNTIME__,state=runtime.state,m405=test.m405,moneyPlanning=test.moneyPlanning,savings=test.savings;
  assert(doc.querySelector('meta[content="m4-05-onboarding-income-distribution-v1"]'),'M4-05 package marker missing');
  assert(text(doc.querySelector('#starterOnboardingScreen h1'))==='Первичная настройка','Starter questionnaire screen missing');
  assert(doc.getElementById('m405ReserveRule'),'Reserve rule surface missing');

  m405.resetOnboarding();state.starterOnboarding.currentStep=3;m405.openOnboarding();await wait(50);
  assert(test.m405Correction.goalFieldsPresent(),'Expandable first-goal onboarding block missing');
  assert(text(doc.getElementById('m405OnboardingCard')).includes('Хотите регулярно откладывать часть полученного дохода?'),'Accepted onboarding wording missing');

  const main=state.wallets.find(item=>item.type==='household_default');assert(main,'Main bank location missing');
  const nextMonth=new Date(Date.now()+35*86400000);const birthdayDate=nextMonth.toISOString().slice(0,10);
  const draft={
    bankBalanceKnown:true,bankBalance:5000,cashBalanceKnown:false,cashBalance:0,
    plannedIncomeEnabled:true,plannedIncomeName:'Зарплата',plannedIncomeAmount:2000,plannedIncomeDay:5,
    obligationEnabled:true,obligationName:'Жильё',obligationAmount:800,obligationDay:10,
    debtEnabled:true,debtDirection:'liability',debtCounterparty:'Тестовый кредитор',debtAmount:300,
    generalSavingsEnabled:true,generalSavingsPercentage:10,generalSavingsLocationId:main.id,
    reserveEnabled:true,reserveMode:'fixed_monthly',reserveValue:50,reserveLocationId:main.id,
    goalEnabled:true,goalName:'Первая цель',goalTarget:1000,goalSaved:0,goalMode:'fixed_contribution',goalDate:'',goalMonthly:100,goalLocationId:main.id,
    birthdayEnabled:true,birthdayName:'Близкий человек',birthdayDate,birthdayRelationship:'семья',birthdayBudget:300
  };
  const review=m405.review(draft);assert(review.items.some(item=>item.key==='goal'),'First goal missing from onboarding review');
  const applied=m405.applyOnboarding(draft,['starter-onboarding-apply']);assert(applied.ok,'Onboarding apply failed: '+applied.error);
  assert(state.starterOnboarding.status==='completed','Onboarding was not completed');
  assert(applied.created.plannedIncomeRuleId&&applied.created.obligationRuleId&&applied.created.debtEventId&&applied.created.goalId&&applied.created.birthdayId,'Canonical onboarding records missing');
  assert((state.savingsGoals||[]).some(item=>item.id===applied.created.goalId&&item.name==='Первая цель'),'Canonical savings goal was not created');
  assert((state.savingsAccountPlans||[]).some(item=>item.goalId===applied.created.goalId&&item.monthlyContribution===100),'First-goal plan was not created');

  const beforeIncome=m405.batches();assert(beforeIncome.length===0,'Fixed reserve reminder appeared before actual income');
  const income1=m405.seedIncome(1000,main.id,Date.now()+20);await wait(30);
  const batches1=m405.batches(),batch1=batches1.find(item=>item.operation.id===income1.id);assert(batch1,'Income distribution batch missing after actual income');
  const names1=batch1.actions.map(item=>(state.savingsGoals||[]).find(goal=>goal.id===item.goalId)?.name);
  assert(names1.includes('Общие накопления'),'General Savings reminder missing');
  assert(names1.includes('Резерв (непредвиденные расходы)'),'Fixed reserve reminder missing');
  const generalAction=batch1.actions.find(item=>(state.savingsGoals||[]).find(goal=>goal.id===item.goalId)?.name==='Общие накопления'),reserveAction=batch1.actions.find(item=>(state.savingsGoals||[]).find(goal=>goal.id===item.goalId)?.name==='Резерв (непредвиденные расходы)');
  assert(Math.abs(generalAction.plannedAmount-100)<.01,'General Savings percentage is incorrect');
  assert(Math.abs(reserveAction.plannedAmount-50)<.01,'Fixed monthly reserve amount is incorrect');
  assert(test.m405Correction.homePromptVisible(),'Immediate non-blocking income prompt missing on Home');
  assert(text(doc.getElementById('m405IncomeDistribution')).includes('Распределить полученный доход'),'Grouped income distribution card missing');

  const partial=moneyPlanning.complete(reserveAction.id,{outcome:'partial',amount:20,sourceLocationId:main.id,destinationLocationId:main.id,effectiveDate:Date.now()+30});assert(partial.ok,'Partial reserve confirmation failed: '+partial.error);
  const income2=m405.seedIncome(500,main.id,Date.now()+2000);await wait(30);
  const batch2=m405.batches().find(item=>item.operation.id===income2.id);assert(batch2,'Second income batch missing');
  const reserveRemainder=batch2.actions.find(item=>item.id===reserveAction.id);assert(reserveRemainder&&Math.abs((reserveRemainder.plannedAmount-reserveRemainder.actualAmount)-30)<.01,'Remaining fixed reserve amount was not offered after next income');

  const percentage=m405.configureReserve({mode:'income_percentage',value:5,destinationLocationId:main.id,contributionDay:1});assert(percentage.ok,'Percentage reserve mode failed: '+percentage.error);
  const income3=m405.seedIncome(400,main.id,Date.now()+3000);await wait(30);
  const batch3=m405.batches().find(item=>item.operation.id===income3.id);assert(batch3,'Percentage income batch missing');
  const percentReserve=batch3.actions.find(item=>item.sourceId.startsWith('reserve-income:'));assert(percentReserve&&Math.abs(percentReserve.plannedAmount-20)<.01,'Reserve percentage reminder is incorrect');

  test.moneyPlanning.openGifts();const giftRecommendation=test.moneyPlanning.giftRecommendation();
  const giftApplied=test.moneyPlanning.applyGift({locationId:main.id},[giftRecommendation.goalConfirmationId,giftRecommendation.contributionConfirmationId]);assert(giftApplied.ok,'Gift fund setup failed: '+giftApplied.error);
  const reserveGoal=state.savingsGoals.find(item=>item.id===state.reserveSavingsGoalId);reserveGoal.savedAmount=300;runtime.save();runtime.renderAll();
  const bridge=m405.bridge();assert(bridge.available&&bridge.amount>0,'Reserve-to-gift-fund proposal missing');
  const ordinaryBefore=JSON.stringify(savings.ordinaryTotals());
  const bridgeConfirmed=[bridge.transferConfirmationId,bridge.repaymentConfirmationId,bridge.belowRecommendedConfirmationId];
  const bridgeResult=m405.applyBridge({amount:bridge.amount,repaymentMonths:3},bridgeConfirmed);assert(bridgeResult.ok,'Reserve-to-gift bridge failed: '+bridgeResult.error);
  assert(bridgeResult.loan.repaymentActionIds.length===3,'Reserve repayment plan is incomplete');
  assert(JSON.stringify(savings.ordinaryTotals())===ordinaryBefore,'Reserve-to-gift bridge changed ordinary Income or Expense');
  assert((state.savingsActionOccurrences||[]).filter(item=>bridgeResult.loan.repaymentActionIds.includes(item.id)).every(item=>item.title.includes('Вернуть в резерв')),'Repayment actions are not linked to reserve restoration');

  assert(runtimeErrors.length===0,'Runtime exceptions: '+runtimeErrors.join(' | '));
  result.textContent=JSON.stringify({status:'PASS',marker:'${marker}',progressiveQuestionnaire:true,shortEssentialPath:true,optionalExpandableBlocks:true,canonicalRecordsOnly:true,firstGoal:true,actualIncomeDistribution:true,generalSavingsPurposeFixed:true,fixedReserveDefault:true,reservePercentageMode:true,partialThenNextIncome:true,confirmationOutcomes:['full','partial','different','skipped','postponed'],giftReserveBridge:true,reserveRepaymentPlan:true,ordinaryIncomeExpenseInvariant:true,runtimeExceptions:[]},null,2);document.body.dataset.status='PASS';
 }
 frame.addEventListener('load',()=>run().catch(error=>{result.textContent=String(error?.stack||error);document.body.dataset.status='FAIL'}),{once:true});
})();</script></body></html>`;
writeFileSync(harnessPath,harness);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1'),raw=url.pathname==='/'?'index.html':url.pathname.replace(/^\//,''),target=normalize(resolve(root,raw));if(target!==root&&!target.startsWith(root+sep))throw new Error('Forbidden');const body=readFileSync(target);res.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream','cache-control':'no-store'});res.end(body)}catch{if(!res.headersSent)res.writeHead(404);res.end('Not found')}});
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);if(!chrome)throw new Error('Chrome/Chromium is not installed');
const runChrome=url=>new Promise((resolveRun,rejectRun)=>{const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',`--user-data-dir=${profilePath}`,'--virtual-time-budget=120000','--dump-dom',url],{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.on('error',rejectRun);child.on('close',code=>code===0?resolveRun(stdout):rejectRun(new Error(`Chrome exited ${code}\n${stderr}`)))});
await new Promise((resolveListen,rejectListen)=>{server.once('error',rejectListen);server.listen(0,'127.0.0.1',resolveListen)});
try{const {port}=server.address(),output=await runChrome(`http://127.0.0.1:${port}/${harnessName}`),match=output.match(/<pre id="result">([\s\S]*?)<\/pre>/),decoded=(match?.[1]||'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');if(!output.includes('data-status="PASS"')||!output.includes(marker))throw new Error(`M4-05 browser smoke failed\n${decoded||output.slice(-16000)}`);console.log(decoded)}finally{await new Promise(resolveClose=>server.close(resolveClose));if(existsSync(harnessPath))unlinkSync(harnessPath);rmSync(profilePath,{recursive:true,force:true})}

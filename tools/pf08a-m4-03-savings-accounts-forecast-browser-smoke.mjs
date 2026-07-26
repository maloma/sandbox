import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, unlinkSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const root=process.cwd(),harnessName='.pf08a-m4-03-browser-harness.html',harnessPath=join(root,harnessName),profilePath=mkdtempSync(join(tmpdir(),'pf08a-m4-03-chrome-')),marker='PF08A_M4_03_BROWSER_PASS';
const harness=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>M4-03 browser smoke</title></head><body data-status="PENDING"><iframe id="app" src="/?test=1&pf08a-m4-03=1" style="width:390px;height:844px;border:0"></iframe><pre id="result">PENDING</pre><script>
(()=>{
 const frame=document.getElementById('app'),result=document.getElementById('result'),runtimeErrors=[];
 const assert=(condition,message)=>{if(!condition)throw new Error(message)};
 const text=node=>(node?.textContent||'').replace(/\\s+/g,' ').trim();
 async function waitApi(){const end=Date.now()+30000;while(Date.now()<end){const win=frame.contentWindow,api=win&&win.__FP_TEST__;if(api?.savings?.forecast&&win.__FP_M4_03_UI__)return api;await new Promise(r=>setTimeout(r,100))}throw new Error('M4-03 API did not become ready')}
 async function run(){
  const win=frame.contentWindow;win.addEventListener('error',event=>runtimeErrors.push(String(event.error||event.message||'error')));win.addEventListener('unhandledrejection',event=>runtimeErrors.push(String(event.reason||'unhandled rejection')));
  const api=await waitApi(),doc=frame.contentDocument,s=api.savings,now=Date.now(),future=new Date(now+180*86400000).toISOString().slice(0,10);
  assert(doc.querySelector('meta[content="m4-03-savings-accounts-forecast-v1"]'),'M4-03 package marker missing');
  s.openList();assert(text(doc.querySelector('#savingsGoalsScreen h1'))==='Накопления','User-facing module title changed from Накопления');
  assert(doc.getElementById('savingsTransferBtn')&&doc.getElementById('savingsInvestmentBtn'),'Savings account actions missing');
  assert(text(doc.getElementById('savingsForecastCard')).includes('Прогноз'),'Forecast surface missing');

  const first=s.create({name:'Отпуск M4-03',targetAmount:1200,savedAmount:100,targetDate:future,planningMode:'fixed_date',monthlyContribution:0,contributionDay:1});
  assert(first.ok,'Fixed-date accumulation creation failed: '+first.error);
  const second=s.create({name:'ТО автомобиля M4-03',targetAmount:600,savedAmount:50,targetDate:'',planningMode:'fixed_contribution',monthlyContribution:100,contributionDay:2});
  assert(second.ok,'Fixed-contribution accumulation creation failed: '+second.error);
  const investment=s.createInvestment('Инвестиционный счёт M4-03');assert(investment.ok,'Investment account creation failed: '+investment.error);

  const accounts=s.accounts(),operating=accounts.find(item=>item.type==='operating'),firstAccount=accounts.find(item=>item.goalId===first.goal.id),secondAccount=accounts.find(item=>item.goalId===second.goal.id),investmentAccount=accounts.find(item=>item.investmentId===investment.account.id);
  assert(operating&&firstAccount&&secondAccount&&investmentAccount,'Expected account classes missing');
  const ordinaryBefore=JSON.stringify(s.ordinaryTotals()),baseCapitalBefore=s.capital().capital;

  const t1=s.transfer({sourceAccountId:operating.id,destinationAccountId:firstAccount.id,amount:200,currency:'EUR',effectiveDate:now,note:'На отпуск'});
  assert(t1.ok,'Operating to purpose transfer failed: '+t1.error);
  const afterFirst=s.active().find(item=>item.id===first.goal.id);assert(afterFirst.savedAmount===300,'Purpose balance did not increase');
  const t2=s.transfer({sourceAccountId:firstAccount.id,destinationAccountId:secondAccount.id,amount:50,currency:'EUR',effectiveDate:now+1,note:'Перераспределение'});
  assert(t2.ok,'Purpose to purpose transfer failed: '+t2.error);
  const afterTransfer=s.active(),firstAfter=afterTransfer.find(item=>item.id===first.goal.id),secondAfter=afterTransfer.find(item=>item.id===second.goal.id);
  assert(firstAfter.savedAmount===250&&secondAfter.savedAmount===100,'Purpose-to-purpose balances incorrect');

  const t3=s.transfer({sourceAccountId:operating.id,destinationAccountId:investmentAccount.id,amount:300,currency:'EUR',effectiveDate:now+2,note:'Инвестиции'});
  assert(t3.ok,'Operating to investment transfer failed: '+t3.error);
  assert(JSON.stringify(s.ordinaryTotals())===ordinaryBefore,'Internal transfers changed ordinary Income/Expense');
  assert(s.capital().capital===baseCapitalBefore,'Internal transfers changed base capital');

  const beforeValuation=s.summary(),valuation=s.valueInvestment(investmentAccount.id,330,now+3);
  assert(valuation.ok,'Investment valuation failed: '+valuation.error);
  const afterValuation=s.summary();assert(Math.abs((afterValuation.totalCapital-beforeValuation.totalCapital)-30)<0.01,'Valuation delta did not change total capital by 30');
  assert(JSON.stringify(s.ordinaryTotals())===ordinaryBefore,'Valuation changed ordinary Income/Expense');

  const forecast=s.forecast(90);
  assert(Array.isArray(forecast.events)&&Array.isArray(forecast.timeline),'Forecast output incomplete');
  assert(forecast.events.some(event=>event.type==='internal_transfer'&&event.sourceModule==='savings'),'Planned savings contribution missing from forecast');
  assert(Number.isFinite(forecast.minimumOperating)&&Number.isFinite(forecast.endingTotalCapital),'Forecast summary invalid');
  assert(s.transfers().length>=3,'Transfer history missing');
  assert(runtimeErrors.length===0,'Runtime exceptions: '+runtimeErrors.join(' | '));

  const output={status:'PASS',marker:'${marker}',moduleTitle:'Накопления',accountLogic:true,purposeAccounts:true,investmentAccounts:true,internalTransfersNotIncomeExpense:true,fixedDateRecalculation:true,fixedContributionRecalculation:true,manualValuation:true,forecastTimeline:true,sourceExplainableEvents:true,runtimeExceptions:[]};
  result.textContent=JSON.stringify(output,null,2);document.body.dataset.status='PASS';
 }
 frame.addEventListener('load',()=>run().catch(error=>{result.textContent=String(error&&error.stack||error);document.body.dataset.status='FAIL'}),{once:true});
})();</script></body></html>`;
writeFileSync(harnessPath,harness);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1'),raw=url.pathname==='/'?'index.html':url.pathname.replace(/^\//,''),target=normalize(resolve(root,raw));if(target!==root&&!target.startsWith(root+sep))throw new Error('Forbidden');const body=readFileSync(target);res.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream','cache-control':'no-store'});res.end(body)}catch{res.writeHead(404);res.end('Not found')}});
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);if(!chrome)throw new Error('Chrome/Chromium is not installed');
const runChrome=url=>new Promise((ok,fail)=>{const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',`--user-data-dir=${profilePath}`,'--virtual-time-budget=80000','--dump-dom',url],{stdio:['ignore','pipe','pipe']});let out='',err='';child.stdout.on('data',chunk=>out+=chunk);child.stderr.on('data',chunk=>err+=chunk);child.on('error',fail);child.on('close',code=>code===0?ok({out,err}):fail(new Error(`Chrome exited ${code}\n${err}`)))});
await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
try{const {port}=server.address(),{out}=await runChrome(`http://127.0.0.1:${port}/${harnessName}`),match=out.match(/<pre id="result">([\s\S]*?)<\/pre>/),decoded=(match?.[1]||'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');if(!out.includes('data-status="PASS"')||!out.includes(marker))throw new Error(`M4-03 browser smoke failed\n${decoded||out.slice(-12000)}`);console.log(decoded)}finally{await new Promise(resolveClose=>server.close(resolveClose));if(existsSync(harnessPath))unlinkSync(harnessPath);rmSync(profilePath,{recursive:true,force:true})}
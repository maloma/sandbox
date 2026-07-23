import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, unlinkSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const root=process.cwd();
const harnessName='.pf08a-m3-03-browser-harness.html';
const harnessPath=join(root,harnessName);
const profilePath=mkdtempSync(join(tmpdir(),'pf08a-m3-03-chrome-'));
const marker='PF08A_M3_03_BROWSER_PASS';

const harness=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>M3-03 browser smoke</title></head>
<body data-status="PENDING"><iframe id="app" src="/?test=1&pf08a-m3-03=1" style="width:390px;height:844px;border:0"></iframe><pre id="result">PENDING</pre>
<script>(()=>{
  const frame=document.getElementById('app'),result=document.getElementById('result'),runtimeErrors=[];
  const assert=(condition,message)=>{if(!condition)throw new Error(message)};
  const click=node=>{assert(node,'Clickable node missing');node.click()};
  const text=node=>(node?.textContent||'').replace(/\\s+/g,' ').trim();

  async function waitApi(){
    const deadline=Date.now()+30000;
    while(Date.now()<deadline){
      const api=frame.contentWindow&&frame.contentWindow.__FP_TEST__;
      if(api?.paymentAttention?.snapshot&&api?.paymentAttentionDemo?.load&&api?.obligations?.createRule&&api?.obligationUx?.render)return api;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    throw new Error('FamilyPilot M3-03 compact UX test API did not become ready');
  }

  async function run(){
    const win=frame.contentWindow,doc=frame.contentDocument;
    win.addEventListener('error',event=>runtimeErrors.push(String(event.error||event.message||'error')));
    win.addEventListener('unhandledrejection',event=>runtimeErrors.push(String(event.reason||'unhandled rejection')));
    const api=await waitApi(),initial=api.getState(),household='wallet-household-main',personal='wallet-personal-anna';
    const category=initial.categories.find(item=>item.kind==='expense'&&!item.archivedAt)?.id;
    assert(category,'Expense category fixture missing');
    api.setActiveWallet(household);

    const make=(name,dueAt,walletId=household,amount=20)=>api.obligations.createRule({name,amount,dueAt,cadence:'once',walletId,categoryId:category,currency:'EUR'});
    const overdue=make('Просроченный интернет',Date.now()-86400000,household,29.90);
    const today=make('Платёж сегодня',Date.now(),household,48);
    const todaySecond=make('Второй платёж сегодня',Date.now()+3600000,household,12);
    const upcoming=make('Оплата заранее',Date.now()+3*86400000,household,30);
    const outside=make('Позже окна',Date.now()+5*86400000,household,9);
    assert(overdue.ok&&today.ok&&todaySecond.ok&&upcoming.ok&&outside.ok,'Household fixtures failed');
    api.paymentAttention.setLeadDays(upcoming.rule.id,3);
    api.paymentAttention.setLeadDays(outside.rule.id,3);

    api.setActiveWallet(personal);
    const privateRule=make('Личный платёж',Date.now(),personal,21);
    assert(privateRule.ok,'Personal fixture failed');
    api.setActiveWallet(household);
    api.paymentAttention.render();
    api.obligationUx.render();

    assert(!doc.getElementById('paymentAttentionCard'),'Large Home payment card must be removed');
    const planNav=doc.querySelector('[data-screen="plans"]'),badge=planNav.querySelector('.plan-attention-badge');
    assert(badge&&!badge.hidden&&badge.classList.contains('overdue'),'Plan navigation overdue indicator missing');
    const planModule=doc.querySelector('[data-plan-module="obligations"]');
    assert(planModule.classList.contains('attention-overdue'),'Obligations plan module is not highlighted');
    assert(text(planModule).includes('просроч'),'Plan module does not explain overdue attention');

    click(planNav);
    click(planModule);
    assert(doc.getElementById('obligationsScreen').classList.contains('active'),'Obligations screen did not open');
    const monthText=text(doc.getElementById('obligationMonthLabel'));
    assert(!monthText.includes('1970'),'Obligations month remained January 1970');
    assert(monthText.includes(String(new Date().getFullYear())),'Obligations month is not current');

    const overdueRow=doc.querySelector('[data-obligation-occurrence="'+overdue.occurrence.id+'"]');
    assert(overdueRow&&overdueRow.classList.contains('obligation-row--overdue'),'Overdue row is not visually distinct');
    const todayRow=doc.querySelector('[data-obligation-occurrence="'+today.occurrence.id+'"]');
    assert(todayRow&&todayRow.classList.contains('obligation-row--due'),'Today row is not visually distinct');
    const dayGroup=todayRow.closest('.obligation-date-group');
    assert(dayGroup.classList.contains('is-multi'),'Multiple payments on one day are not grouped as a multi-payment day');
    assert(text(dayGroup.querySelector('.obligation-date-heading')).includes('Запланировать'),'Day total planning amount is missing');
    assert(!text(todayRow).includes('№'),'Payment row still exposes recurrence sequence');
    assert(!text(todayRow).includes('Повтор'),'Payment row still exposes recurrence wording');
    assert(!doc.querySelector('[data-obligation-occurrence="'+privateRule.occurrence.id+'"]'),'Personal payment leaked into household obligations');

    const earlyCheck=doc.querySelector('[data-m302-quick-pay="'+upcoming.occurrence.id+'"]');
    assert(earlyCheck,'Future payment does not have an early-payment checkbox');
    click(earlyCheck);
    let state=api.getState();
    const paidEarly=state.obligationOccurrences.find(item=>item.id===upcoming.occurrence.id);
    assert(paidEarly.status==='paid','Future occurrence was not marked paid early');
    assert(state.operations.filter(operation=>operation.links?.obligationOccurrenceId===upcoming.occurrence.id).length===1,'Early payment did not create exactly one Expense');
    const paidRow=doc.querySelector('[data-obligation-occurrence="'+upcoming.occurrence.id+'"]');
    assert(paidRow&&paidRow.classList.contains('obligation-row--paid'),'Paid row is not green/complete');

    const ruleCards=[...doc.querySelectorAll('.obligation-rule-card')];
    const overdueRuleCard=ruleCards.find(node=>text(node).includes('Просроченный интернет'));
    assert(overdueRuleCard,'Rule card missing');
    assert(!text(overdueRuleCard).includes('Каждые')&&!text(overdueRuleCard).includes('Повторяется'),'Recurrence leaked into rule list');
    click(overdueRuleCard);
    assert(doc.getElementById('obligationRuleDetailModal').classList.contains('open'),'Rule card did not open its detail');
    assert(text(doc.getElementById('obligationRuleDetailContent')).includes('Правило повторения'),'Recurrence details are missing inside rule card');
    assert(doc.querySelector('[data-ux-rule-edit]')&&doc.querySelector('[data-ux-rule-clone]')&&doc.querySelector('[data-ux-rule-delete]'),'Rule management controls are not inside rule card');
    click(doc.querySelector('[data-ux-rule-close]'));

    api.setActiveWallet(personal);
    api.obligationUx.render();
    assert(doc.querySelector('[data-obligation-occurrence="'+privateRule.occurrence.id+'"]'),'Personal payment is missing in personal scope');
    assert(!doc.querySelector('[data-obligation-occurrence="'+overdue.occurrence.id+'"]'),'Household payment leaked into personal scope');

    const demo=api.paymentAttentionDemo.load();
    assert(demo.ok&&demo.created.length===12,'Comprehensive demo fixtures were not created');
    assert(api.paymentAttentionDemo.records().length===12,'Demo record count is not 12');
    const removed=api.paymentAttentionDemo.remove();
    assert(removed.rules===12,'Demo rules were not fully removed');
    assert(api.paymentAttentionDemo.records().length===0,'Demo records remain after cleanup');

    assert(doc.querySelector('meta[content="planned-payment-attention-v2"]'),'M3-03 compact package marker missing');
    assert(runtimeErrors.length===0,'Runtime exceptions: '+runtimeErrors.join(' | '));

    result.textContent=JSON.stringify({status:'PASS',marker:'${marker}',homeCardRemoved:true,planIndicator:true,overdueHighlighted:true,currentMonth:true,dayGrouping:true,dailyTotal:true,earlyPayment:true,oneLinkedExpense:true,paidGreen:true,ruleCard:true,ruleControlsInside:true,recurrenceHiddenFromList:true,scopeIsolation:true,demoScenarios:12,demoCleanup:true,runtimeExceptions:[]},null,2);
    document.body.dataset.status='PASS';
  }
  frame.addEventListener('load',()=>run().catch(error=>{result.textContent=String(error&&error.stack||error);document.body.dataset.status='FAIL'}),{once:true});
})();</script></body></html>`;

writeFileSync(harnessPath,harness);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1'),raw=url.pathname==='/'?'index.html':url.pathname.replace(/^\//,''),target=normalize(resolve(root,raw));if(target!==root&&!target.startsWith(root+sep))throw new Error('Forbidden path');const body=readFileSync(target);res.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream','cache-control':'no-store'});res.end(body)}catch{res.writeHead(404,{'content-type':'text/plain'});res.end('Not found')}});
const chromeCandidates=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'];
const chrome=chromeCandidates.find(existsSync);if(!chrome)throw new Error('Chrome/Chromium is not installed');
function runChrome(url){return new Promise((resolvePromise,reject)=>{const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',`--user-data-dir=${profilePath}`,'--virtual-time-budget=40000','--dump-dom',url],{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.on('error',reject);child.on('close',code=>code===0?resolvePromise({stdout,stderr}):reject(new Error(`Chrome exited ${code}\n${stderr}`)))})}
await new Promise((resolvePromise,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolvePromise)});
try{const address=server.address(),{stdout}=await runChrome(`http://127.0.0.1:${address.port}/${harnessName}`),match=stdout.match(/<pre id="result">([\s\S]*?)<\/pre>/),decoded=(match?.[1]||'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');if(!stdout.includes('data-status="PASS"')||!stdout.includes(marker))throw new Error(`M3-03 browser smoke did not pass\n${decoded||stdout.slice(-5000)}`);console.log(decoded||JSON.stringify({status:'PASS',marker},null,2))}finally{await new Promise(resolve=>server.close(resolve));if(existsSync(harnessPath))unlinkSync(harnessPath);rmSync(profilePath,{recursive:true,force:true})}

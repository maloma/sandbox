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
      if(api?.paymentAttention?.snapshot&&api?.obligations?.createRule)return api;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    throw new Error('FamilyPilot M3-03 test API did not become ready');
  }

  async function run(){
    const win=frame.contentWindow,doc=frame.contentDocument;
    win.addEventListener('error',event=>runtimeErrors.push(String(event.error||event.message||'error')));
    win.addEventListener('unhandledrejection',event=>runtimeErrors.push(String(event.reason||'unhandled rejection')));
    const api=await waitApi(),initial=api.getState(),household='wallet-household-main',personal='wallet-personal-anna';
    const category=initial.categories.find(item=>item.kind==='expense'&&!item.archivedAt)?.id;
    assert(category,'Expense category fixture missing');
    api.setActiveWallet(household);

    const make=(name,dueAt,walletId=household)=>api.obligations.createRule({name,amount:20,dueAt,cadence:'once',walletId,categoryId:category,currency:'EUR'});
    const overdue=make('Вчерашний платёж',Date.now()-86400000);
    const today=make('Платёж сегодня',Date.now());
    const upcoming=make('Через три дня',Date.now()+3*86400000);
    const later=make('Через четыре дня',Date.now()+4*86400000);
    assert(overdue.ok&&today.ok&&upcoming.ok&&later.ok,'Household attention fixtures failed');
    api.paymentAttention.setLeadDays(later.rule.id,7);

    api.setActiveWallet(personal);
    const privateRule=make('Личный платёж',Date.now(),personal);
    assert(privateRule.ok,'Personal attention fixture failed');
    api.setActiveWallet(household);
    api.paymentAttention.render();

    const card=doc.getElementById('paymentAttentionCard');
    assert(card&&!card.hidden,'Home payment card is missing or hidden');
    assert(doc.querySelector('[data-payment-attention-row="'+overdue.occurrence.id+'"]'),'Overdue payment is missing');
    assert(doc.querySelector('[data-payment-attention-row="'+today.occurrence.id+'"]'),'Today payment is missing');
    assert(doc.querySelector('[data-payment-attention-row="'+upcoming.occurrence.id+'"]'),'Default three-day reminder is missing');
    assert(doc.querySelector('[data-payment-attention-row="'+later.occurrence.id+'"]'),'Custom seven-day reminder is missing');
    assert(!doc.querySelector('[data-payment-attention-row="'+privateRule.occurrence.id+'"]'),'Personal payment leaked into household Home');
    assert(text(card).includes('Вчера и ранее'),'Overdue grouping does not explain persistent arrears');
    assert(text(card).includes('Сегодня'),'Today group missing');
    assert(text(card).includes('Скоро'),'Upcoming group missing');
    const debts=doc.querySelector('.debts');
    assert(debts.compareDocumentPosition(card)&Node.DOCUMENT_POSITION_FOLLOWING,'Payment card is not mounted after debt context');

    click(doc.getElementById('obligationAddBtn'));
    assert(doc.getElementById('obligationReminderLeadDays').value==='3','New rule reminder default is not three days');
    click(doc.querySelector('#obligationRuleModal [data-close="obligationRuleModal"]'));

    click(doc.querySelector('[data-payment-attention-pay="'+today.occurrence.id+'"]'));
    let state=api.getState();
    const paid=state.obligationOccurrences.find(item=>item.id===today.occurrence.id);
    assert(paid.status==='paid','Home quick pay did not mark occurrence paid');
    assert(state.operations.filter(operation=>operation.links?.obligationOccurrenceId===today.occurrence.id).length===1,'Home quick pay did not create exactly one Expense');
    assert(!doc.querySelector('[data-payment-attention-row="'+today.occurrence.id+'"]'),'Paid occurrence remained in attention list');

    click(doc.querySelector('[data-payment-attention-open="'+overdue.occurrence.id+'"]'));
    assert(doc.getElementById('obligationsScreen').classList.contains('active'),'Attention row did not open Obligations');
    assert(doc.getElementById('paymentAttentionDetailModal').classList.contains('open'),'Attention row did not open the exact occurrence');
    assert(text(doc.getElementById('paymentAttentionDetailTitle')).includes('Вчерашний платёж'),'Wrong occurrence detail opened');

    api.paymentAttention.setLeadDays(upcoming.rule.id,0);
    api.paymentAttention.render();
    assert(!doc.querySelector('[data-payment-attention-row="'+upcoming.occurrence.id+'"]'),'Zero-day rule still appears before due day');

    const loaded=api.paymentAttentionDemo.load();
    assert(loaded.ok,'Comprehensive payment demo data did not load');
    api.setActiveWallet(household);
    api.paymentAttention.render();
    const records=api.paymentAttentionDemo.records(),byKey=new Map(records.map(item=>[item.key,item]));
    const firstOccurrence=key=>byKey.get(key)?.occurrences?.[0];
    for(const key of ['overdue','today-0','lead-1','recurring-3','lead-7','lead-14','lead-30','outside-window','paid','skipped','postponed'])assert(byKey.has(key),'Demo scenario missing: '+key);
    assert(byKey.has('personal'),'Personal demo scenario missing');
    assert([0,1,3,7,14,30].every(days=>records.some(item=>item.leadDays===days)),'Not all reminder lead-time modes are represented');
    for(const key of ['overdue','today-0','lead-1','recurring-3','lead-7','lead-14','lead-30','postponed']){
      const occurrence=firstOccurrence(key);
      assert(occurrence&&doc.querySelector('[data-payment-attention-row="'+occurrence.id+'"]'),'Visible demo scenario is missing from Home: '+key);
    }
    for(const key of ['outside-window','paid','skipped','personal']){
      const occurrence=firstOccurrence(key);
      assert(occurrence&&!doc.querySelector('[data-payment-attention-row="'+occurrence.id+'"]'),'Hidden demo scenario leaked into household Home: '+key);
    }
    state=api.getState();
    const paidDemo=state.obligationOccurrences.find(item=>item.id===firstOccurrence('paid').id);
    const skippedDemo=state.obligationOccurrences.find(item=>item.id===firstOccurrence('skipped').id);
    const postponedDemo=state.obligationOccurrences.find(item=>item.id===firstOccurrence('postponed').id);
    assert(paidDemo.status==='paid'&&state.operations.filter(operation=>operation.links?.obligationOccurrenceId===paidDemo.id).length===1,'Paid demo mode is not linked to exactly one Expense');
    assert(skippedDemo.status==='skipped','Skipped demo mode is missing');
    assert(postponedDemo.movedFromDueAt!=null&&postponedDemo.dueAt>postponedDemo.movedFromDueAt,'Postponed demo mode is missing');

    api.setActiveWallet(personal);
    api.paymentAttention.render();
    assert(doc.querySelector('[data-payment-attention-row="'+firstOccurrence('personal').id+'"]'),'Personal demo payment is not visible in the personal wallet');
    assert(!doc.querySelector('[data-payment-attention-row="'+firstOccurrence('overdue').id+'"]'),'Household demo payment leaked into the personal wallet');
    api.setActiveWallet(household);

    const removed=api.paymentAttentionDemo.remove();
    assert(removed.rules>=11,'Demo cleanup removed too few rules');
    state=api.getState();
    assert(!state.obligationRules.some(rule=>String(rule.note||'').includes('marker:m3-03-payment-attention-demo:')),'Demo rules remained after cleanup');
    assert(!state.operations.some(operation=>String(operation.note||'').includes('marker:m3-03-payment-attention-demo:')),'Demo linked operations remained after cleanup');

    assert(doc.querySelector('meta[content="planned-payment-attention-v1"]'),'M3-03 package marker missing');
    assert(doc.querySelector('meta[content="plan-obligations-foundation-v1"]'),'M3 foundation marker missing');
    assert(runtimeErrors.length===0,'Runtime exceptions: '+runtimeErrors.join(' | '));

    result.textContent=JSON.stringify({status:'PASS',marker:'${marker}',homeCard:true,overduePersistent:true,todayVisible:true,defaultReminderDays:3,customReminderDays:true,quickPayFromHome:true,oneLinkedExpense:true,exactOccurrenceOpen:true,paidRemoved:true,scopeIsolation:true,allReminderLeadModes:true,comprehensiveDemoData:true,demoPaidSkippedPostponed:true,demoCleanup:true,noExternalNotificationClaim:true,runtimeExceptions:[]},null,2);
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
try{const address=server.address(),{stdout}=await runChrome(`http://127.0.0.1:${address.port}/${harnessName}`),match=stdout.match(/<pre id="result">([\s\S]*?)<\/pre>/),decoded=(match?.[1]||'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');if(!stdout.includes('data-status="PASS"')||!stdout.includes(marker))throw new Error(`M3-03 browser smoke did not pass\n${decoded||stdout.slice(-5000)}`);console.log(decoded||JSON.stringify({status:'PASS',marker},null,2))}finally{await new Promise(resolvePromise=>server.close(resolvePromise));if(existsSync(harnessPath))unlinkSync(harnessPath);rmSync(profilePath,{recursive:true,force:true})}
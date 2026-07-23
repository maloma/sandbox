import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, unlinkSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const root=process.cwd();
const harnessName='.pf08a-m3-05-browser-harness.html';
const harnessPath=join(root,harnessName);
const profilePath=mkdtempSync(join(tmpdir(),'pf08a-m3-05-chrome-'));
const marker='PF08A_M3_05_BROWSER_PASS';

const harness=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>M3-05 browser smoke</title></head>
<body data-status="PENDING"><iframe id="app" src="/?test=1&pf08a-m3-05=1" style="width:390px;height:844px;border:0"></iframe><pre id="result">PENDING</pre>
<script>(()=>{
  const frame=document.getElementById('app'),result=document.getElementById('result'),runtimeErrors=[];
  const assert=(condition,message)=>{if(!condition)throw new Error(message)};
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const click=node=>{assert(node,'Clickable node missing');node.click()};
  const text=node=>(node?.textContent||'').replace(/\\s+/g,' ').trim();

  async function waitApi(){
    const deadline=Date.now()+30000;
    while(Date.now()<deadline){
      const win=frame.contentWindow,api=win&&win.__FP_TEST__;
      if(win?.__FP_PAYMENT_LINK_LIFECYCLE_READY__&&api?.paymentLinkLifecycle?.restorePrevious&&api?.obligationState?.hideOccurrence&&api?.obligations?.createRule&&api?.getState)return api;
      await wait(100);
    }
    throw new Error('FamilyPilot M3-05 lifecycle API did not become ready');
  }

  async function run(){
    const win=frame.contentWindow,doc=frame.contentDocument;
    win.confirm=()=>true;
    win.addEventListener('error',event=>runtimeErrors.push(String(event.error||event.message||'error')));
    win.addEventListener('unhandledrejection',event=>runtimeErrors.push(String(event.reason||'unhandled rejection')));
    const api=await waitApi();
    const initial=api.getState();
    const wallet='wallet-household-main';
    const category=initial.categories.find(item=>item.kind==='expense'&&!item.archivedAt)?.id;
    assert(category,'Expense category fixture missing');
    api.setActiveWallet(wallet);

    const create=(name,amount,dueAt)=>api.obligations.createRule({name,amount,dueAt,cadence:'once',walletId:wallet,categoryId:category,currency:'EUR'});
    const first=create('Групповой платёж A',21,Date.now());
    const second=create('Групповой платёж B',34,Date.now());
    assert(first.ok&&second.ok,'Same-day fixtures failed');
    api.obligations.openList();
    api.obligationState.render();

    let firstRow=doc.querySelector('[data-obligation-occurrence="'+first.occurrence.id+'"]');
    let secondRow=doc.querySelector('[data-obligation-occurrence="'+second.occurrence.id+'"]');
    assert(firstRow&&secondRow,'Same-day rows missing');
    let group=firstRow.closest('.obligation-date-group');
    assert(group===secondRow.closest('.obligation-date-group'),'Same-day payments were not grouped together');
    assert(text(group.querySelector('.obligation-day-plan')).includes('2 платежа'),'Initial same-day count is not two');

    api.obligationState.hideOccurrence(first.occurrence.id);
    firstRow=doc.querySelector('[data-obligation-occurrence="'+first.occurrence.id+'"]');
    secondRow=doc.querySelector('[data-obligation-occurrence="'+second.occurrence.id+'"]');
    group=secondRow.closest('.obligation-date-group');
    assert(win.getComputedStyle(firstRow).display==='none','Hidden row remains rendered inside a multi-payment day');
    assert(win.getComputedStyle(secondRow).display!=='none','Sibling payment disappeared with hidden row');
    assert(text(group.querySelector('.obligation-day-plan')).includes('1 платёж'),'Same-day count did not decrease after hiding one payment');
    assert(doc.querySelector('[data-hidden-obligation="'+first.occurrence.id+'"]'),'Hidden payment did not appear in the collapsed section');

    click(doc.querySelector('[data-show-obligation="'+first.occurrence.id+'"]'));
    firstRow=doc.querySelector('[data-obligation-occurrence="'+first.occurrence.id+'"]');
    group=firstRow.closest('.obligation-date-group');
    assert(win.getComputedStyle(firstRow).display!=='none','Shown-again payment did not return to the same-day group');
    assert(text(group.querySelector('.obligation-day-plan')).includes('2 платежа'),'Same-day count did not return to two');

    const payment=create('Проверка жизненного цикла оплаты',57,Date.now()+86400000);
    assert(payment.ok,'Lifecycle payment fixture failed');
    api.obligations.openList();
    api.obligationState.render();
    const occurrenceId=payment.occurrence.id;
    const trashBefore=api.getState().operations.filter(op=>op.status==='trash').length;

    const visibleToggle=()=>doc.querySelector('[data-obligation-occurrence="'+occurrenceId+'"] [data-state-payment-toggle]');
    click(visibleToggle());
    let state=api.getState();
    let item=state.obligationOccurrences.find(entry=>entry.id===occurrenceId);
    assert(item.status==='paid','Initial payment toggle did not mark paid');
    const operationId=item.linkedOperationId;
    assert(operationId,'Initial payment has no linked operation');
    assert(state.operations.filter(op=>op.links?.obligationOccurrenceId===occurrenceId).length===1,'Initial payment did not create exactly one operation');

    for(let cycle=0;cycle<3;cycle+=1){
      click(visibleToggle());
      const modal=doc.getElementById('paymentUnpayModal');
      assert(modal.classList.contains('open'),'Paid toggle did not open the three-choice unlink dialog');
      click(modal.querySelector('[data-payment-unpay-action="remove"]'));
      state=api.getState();
      item=state.obligationOccurrences.find(entry=>entry.id===occurrenceId);
      assert(item.status==='planned','Remove-both choice did not clear paid state');
      assert(state.operations.find(op=>op.id===operationId)?.status==='voided','Removed payment operation entered user Trash instead of internal history');
      assert(state.operations.filter(op=>op.status==='trash').length===trashBefore,'User Trash changed after removing a payment mark');
      click(visibleToggle());
      state=api.getState();
      item=state.obligationOccurrences.find(entry=>entry.id===occurrenceId);
      assert(item.status==='paid'&&item.linkedOperationId===operationId,'Repeated payment did not reuse the same operation');
      assert(state.operations.filter(op=>op.links?.obligationOccurrenceId===occurrenceId).length===1,'Repeated toggle created duplicate linked operations');
    }

    click(visibleToggle());
    click(doc.querySelector('#paymentUnpayModal [data-payment-unpay-action="keep"]'));
    state=api.getState();
    item=state.obligationOccurrences.find(entry=>entry.id===occurrenceId);
    const kept=state.operations.find(op=>op.id===operationId);
    assert(item.status==='planned','Keep-operation choice did not clear paid state');
    assert(kept.status==='active'&&!kept.links?.obligationOccurrenceId,'Kept operation was not left as an ordinary active expense');
    click(visibleToggle());
    state=api.getState();
    item=state.obligationOccurrences.find(entry=>entry.id===occurrenceId);
    assert(item.status==='paid'&&item.linkedOperationId===operationId,'Formerly kept operation was not re-linked without a duplicate question');
    assert(state.operations.filter(op=>op.status==='trash').length===trashBefore,'User Trash changed during repeated keep/re-link cycles');

    const runtimeState=win.__FP_RUNTIME__.state;
    const legacyId='op-legacy-technical-trash';
    const userTrashId='op-user-trash-control';
    runtimeState.operations.push({id:legacyId,kind:'expense',amount:9,categoryId:category,walletId:wallet,note:'legacy technical',occurredAt:Date.now(),createdAt:Date.now(),status:'trash',deletedAt:Date.now(),deletedByMemberId:'member-anna',trashExpiresAt:Date.now()+86400000,links:{sourceModule:'obligations',obligationRuleId:payment.rule.id,obligationOccurrenceId:occurrenceId,relation:'fulfills_occurrence'},revisions:[{source:'obligation_payment_unchecked'}]});
    runtimeState.operations.push({id:userTrashId,kind:'expense',amount:10,categoryId:category,walletId:wallet,note:'user trash',occurredAt:Date.now(),createdAt:Date.now(),status:'trash',deletedAt:Date.now(),deletedByMemberId:'member-anna',trashExpiresAt:Date.now()+86400000,links:{},revisions:[{source:'user'}]});
    runtimeState.config.obligationPaymentLinkLifecycleVersion=0;
    const migrated=api.paymentLinkLifecycle.migrateTechnicalTrash();
    assert(migrated===1,'Legacy technical-trash migration count is wrong');
    assert(runtimeState.operations.find(op=>op.id===legacyId).status==='voided','Legacy technical cancellation remains in user Trash');
    assert(runtimeState.operations.find(op=>op.id===userTrashId).status==='trash','Real user-deleted operation was removed from user Trash');

    assert(runtimeErrors.length===0,'Runtime exceptions: '+runtimeErrors.join(' | '));
    result.textContent=JSON.stringify({status:'PASS',marker:'${marker}',multiPaymentHide:true,showAgainSameGroup:true,userTrashClean:true,repeatedToggleReusesOperation:true,threeChoiceUnpay:true,keepOperation:true,legacyTechnicalTrashMigrated:true,userTrashPreserved:true,runtimeExceptions:[]},null,2);
    document.body.dataset.status='PASS';
  }

  frame.addEventListener('load',()=>run().catch(error=>{result.textContent=String(error&&error.stack||error);document.body.dataset.status='FAIL'}),{once:true});
})();</script></body></html>`;

writeFileSync(harnessPath,harness);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1'),raw=url.pathname==='/'?'index.html':url.pathname.replace(/^\//,''),target=normalize(resolve(root,raw));if(target!==root&&!target.startsWith(root+sep))throw new Error('Forbidden path');const body=readFileSync(target);res.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream','cache-control':'no-store'});res.end(body)}catch{res.writeHead(404,{'content-type':'text/plain'});res.end('Not found')}});
const chromeCandidates=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'];
const chrome=chromeCandidates.find(existsSync);if(!chrome)throw new Error('Chrome/Chromium is not installed');
function runChrome(url){return new Promise((resolvePromise,reject)=>{const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--user-data-dir='+profilePath,'--virtual-time-budget=50000','--dump-dom',url],{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';const timeout=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('Chrome smoke timed out: '+stderr.slice(-2000)))},80000);child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.once('error',error=>{clearTimeout(timeout);reject(error)});child.once('close',code=>{clearTimeout(timeout);if(code!==0)reject(new Error('Chrome exited '+code+': '+stderr.slice(-3000)));else resolvePromise(stdout)})})}

let serverAddress;
try{
  await new Promise((resolvePromise,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{serverAddress=server.address();resolvePromise()})});
  const dom=await runChrome(`http://127.0.0.1:${serverAddress.port}/${harnessName}`);
  const detail=(dom.match(/<pre id="result">([\s\S]*?)<\/pre>/)||[])[1]||dom.slice(-2000);
  if(!dom.includes('data-status="PASS"')||!dom.includes(marker))throw new Error('M3-05 browser smoke did not pass: '+detail.replace(/<[^>]+>/g,' ').slice(-2200));
  console.log(marker);
}finally{
  if(server.listening)await new Promise(resolvePromise=>server.close(resolvePromise));
  if(existsSync(harnessPath))unlinkSync(harnessPath);
  rmSync(profilePath,{recursive:true,force:true});
}

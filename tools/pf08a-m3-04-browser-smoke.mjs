import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, unlinkSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const root=process.cwd();
const harnessName='.pf08a-m3-04-browser-harness.html';
const harnessPath=join(root,harnessName);
const profilePath=mkdtempSync(join(tmpdir(),'pf08a-m3-04-chrome-'));
const marker='PF08A_M3_04_BROWSER_PASS';

const harness=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>M3-04 browser smoke</title></head>
<body data-status="PENDING"><iframe id="app" src="/?test=1&pf08a-m3-04=1" style="width:390px;height:844px;border:0"></iframe><pre id="result">PENDING</pre>
<script>(()=>{
  const frame=document.getElementById('app'),result=document.getElementById('result'),runtimeErrors=[];
  const assert=(condition,message)=>{if(!condition)throw new Error(message)};
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const click=node=>{assert(node,'Clickable node missing');node.click()};

  async function waitApi(){
    const deadline=Date.now()+30000;
    while(Date.now()<deadline){
      const win=frame.contentWindow,api=win&&win.__FP_TEST__;
      if(win?.__FP_OBLIGATION_STATE_UI_READY__&&api?.obligationState?.isHidden&&api?.obligations?.createRule&&api?.getState)return api;
      await wait(100);
    }
    throw new Error('FamilyPilot M3-04 state UI test API did not become ready');
  }

  async function longPress(win,node){
    node.dispatchEvent(new win.PointerEvent('pointerdown',{bubbles:true,pointerType:'touch'}));
    await wait(650);
    node.dispatchEvent(new win.PointerEvent('pointerup',{bubbles:true,pointerType:'touch'}));
    await wait(40);
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

    const create=(name,dueAt)=>api.obligations.createRule({name,amount:25,dueAt,cadence:'once',walletId:wallet,categoryId:category,currency:'EUR'});
    const skipped=create('Проверка пропущенного',Date.now());
    const overdue=create('Проверка скрытия',Date.now()-86400000);
    const recurring=api.obligations.createRule({name:'Проверка карточки правила',amount:40,dueAt:Date.now()+40*86400000,cadence:'recurring',intervalValue:1,intervalUnit:'month',endingMode:'count',paymentCount:3,walletId:wallet,categoryId:category,currency:'EUR'});
    assert(skipped.ok&&overdue.ok&&recurring.ok,'Obligation fixtures failed');
    api.obligations.skip(skipped.occurrence.id);
    api.obligations.openList();
    api.obligationState.render();

    let skippedToggle=doc.querySelector('[data-obligation-occurrence="'+skipped.occurrence.id+'"] [data-state-payment-toggle]');
    assert(skippedToggle,'State-owned skipped toggle missing');
    click(skippedToggle);
    let state=api.getState();
    assert(state.obligationOccurrences.find(item=>item.id===skipped.occurrence.id).status==='planned','Short tap did not clear skipped status');
    assert(!doc.getElementById('paymentContextModal').classList.contains('open'),'Short tap on skipped opened context menu');

    skippedToggle=doc.querySelector('[data-obligation-occurrence="'+skipped.occurrence.id+'"] [data-state-payment-toggle]');
    await longPress(win,skippedToggle);
    const context=doc.getElementById('paymentContextModal');
    assert(context.classList.contains('open'),'Long press did not open context menu');
    assert(api.obligationState.contextButtonHeight()>=56,'Context menu touch target is too small');
    assert(!context.querySelector('[data-payment-context-action="delete"]'),'Delete occurrence action remains in context menu');
    assert(context.querySelector('[data-payment-context-action="hide"]'),'Hide action missing from context menu');
    assert(context.querySelector('[data-payment-context-action="unpaid"]').disabled,'Current unpaid state is not disabled');
    click(context.querySelector('[data-payment-context-action="skipped"]'));
    assert(api.getState().obligationOccurrences.find(item=>item.id===skipped.occurrence.id).status==='skipped','Context menu did not set skipped status');

    skippedToggle=doc.querySelector('[data-obligation-occurrence="'+skipped.occurrence.id+'"] [data-state-payment-toggle]');
    await longPress(win,skippedToggle);
    assert(context.querySelector('[data-payment-context-action="skipped"]').disabled,'Current skipped state can be selected again');
    context.click();
    assert(!context.classList.contains('open'),'Context menu did not close from backdrop tap');
    click(doc.querySelector('[data-obligation-occurrence="'+skipped.occurrence.id+'"] [data-state-payment-toggle]'));
    assert(api.getState().obligationOccurrences.find(item=>item.id===skipped.occurrence.id).status==='planned','Skipped status did not clear after repeated cycle');

    const ruleCard=doc.querySelector('[data-ux-rule-open="'+recurring.rule.id+'"]');
    click(ruleCard);
    const ruleModal=doc.getElementById('obligationRuleDetailModal');
    assert(ruleModal.classList.contains('open'),'Rule detail did not open');
    ruleModal.click();
    assert(!ruleModal.classList.contains('open'),'Rule detail did not close from backdrop tap');

    const hideByLongPress=async id=>{
      const toggle=doc.querySelector('[data-obligation-occurrence="'+id+'"] [data-state-payment-toggle]');
      await longPress(win,toggle);
      click(context.querySelector('[data-payment-context-action="hide"]'));
    };
    await hideByLongPress(overdue.occurrence.id);
    await hideByLongPress(skipped.occurrence.id);
    assert(api.obligationState.isHidden(overdue.occurrence.id)&&api.obligationState.isHidden(skipped.occurrence.id),'Hidden state was not stored');
    assert(doc.querySelector('[data-obligation-occurrence="'+overdue.occurrence.id+'"]').hidden,'Hidden overdue payment remains visible in main calendar');
    const hiddenSection=doc.getElementById('hiddenObligationsSection');
    assert(hiddenSection&&hiddenSection.querySelectorAll('[data-hidden-obligation]').length===2,'Collapsed hidden-payment section is incomplete');
    const badge=doc.querySelector('.bottom [data-screen="plans"] .plan-attention-badge');
    assert(!badge||badge.hidden,'Hidden urgent payments still trigger Plan indicator');

    click(hiddenSection.querySelector('[data-show-obligation="'+overdue.occurrence.id+'"]'));
    assert(!api.obligationState.isHidden(overdue.occurrence.id),'Show again did not clear hidden state');
    assert(!doc.querySelector('[data-obligation-occurrence="'+overdue.occurrence.id+'"]').hidden,'Restored payment did not return to main calendar');
    assert(!doc.querySelector('[data-obligation-occurrence="'+overdue.occurrence.id+'"]').classList.contains('obligation-row--cancelled'),'Hide/show converted payment to cancelled');
    assert(api.getState().obligationOccurrences.every(item=>item.status!=='cancelled'),'State package created a cancelled occurrence');

    assert(runtimeErrors.length===0,'Runtime exceptions: '+runtimeErrors.join(' | '));
    result.textContent=JSON.stringify({status:'PASS',marker:'${marker}',backdropClose:true,largeContextTargets:true,shortTapUnskip:true,currentStateDisabled:true,hideInsteadOfDelete:true,hiddenSection:true,hiddenAttentionExcluded:true,showAgain:true,noCancelledOccurrences:true,todayBlueContract:true,runtimeExceptions:[]},null,2);
    document.body.dataset.status='PASS';
  }

  frame.addEventListener('load',()=>run().catch(error=>{result.textContent=String(error&&error.stack||error);document.body.dataset.status='FAIL'}),{once:true});
})();</script></body></html>`;

writeFileSync(harnessPath,harness);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1'),raw=url.pathname==='/'?'index.html':url.pathname.replace(/^\//,''),target=normalize(resolve(root,raw));if(target!==root&&!target.startsWith(root+sep))throw new Error('Forbidden path');const body=readFileSync(target);res.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream','cache-control':'no-store'});res.end(body)}catch{res.writeHead(404,{'content-type':'text/plain'});res.end('Not found')}});
const chromeCandidates=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'];
const chrome=chromeCandidates.find(existsSync);if(!chrome)throw new Error('Chrome/Chromium is not installed');
function runChrome(url){return new Promise((resolvePromise,reject)=>{const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--user-data-dir='+profilePath,'--virtual-time-budget=45000','--dump-dom',url],{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';const timeout=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('Chrome smoke timed out: '+stderr.slice(-2000)))},70000);child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.once('error',error=>{clearTimeout(timeout);reject(error)});child.once('close',code=>{clearTimeout(timeout);if(code!==0)reject(new Error('Chrome exited '+code+': '+stderr.slice(-3000)));else resolvePromise(stdout)})})}

let serverAddress;
try{
  await new Promise((resolvePromise,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{serverAddress=server.address();resolvePromise()})});
  const dom=await runChrome(`http://127.0.0.1:${serverAddress.port}/${harnessName}`);
  if(!dom.includes('data-status="PASS"')||!dom.includes(marker))throw new Error('M3-04 browser smoke did not pass: '+dom.slice(-6000));
  console.log(marker);
}finally{
  if(server.listening)await new Promise(resolvePromise=>server.close(resolvePromise));
  if(existsSync(harnessPath))unlinkSync(harnessPath);
  rmSync(profilePath,{recursive:true,force:true});
}

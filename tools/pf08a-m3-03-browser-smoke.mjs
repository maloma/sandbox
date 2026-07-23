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
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  async function waitApi(){
    const deadline=Date.now()+30000;
    while(Date.now()<deadline){
      const api=frame.contentWindow&&frame.contentWindow.__FP_TEST__;
      if(api?.paymentAttention?.snapshot&&api?.paymentAttentionDemo?.load&&api?.obligations?.createRule&&api?.obligationUx?.render&&api?.obligationUx?.addManualExpense)return api;
      await wait(100);
    }
    throw new Error('FamilyPilot M3-03 interaction UX test API did not become ready');
  }

  async function run(){
    const win=frame.contentWindow,doc=frame.contentDocument;
    win.confirm=()=>true;
    win.addEventListener('error',event=>runtimeErrors.push(String(event.error||event.message||'error')));
    win.addEventListener('unhandledrejection',event=>runtimeErrors.push(String(event.reason||'unhandled rejection')));
    const api=await waitApi(),initial=api.getState(),household='wallet-household-main',personal='wallet-personal-anna';
    const category=initial.categories.find(item=>item.kind==='expense'&&!item.archivedAt)?.id;
    assert(category,'Expense category fixture missing');
    api.setActiveWallet(household);

    const make=(name,dueAt,walletId=household,amount=20,input={})=>api.obligations.createRule({name,amount,dueAt,cadence:'once',walletId,categoryId:category,currency:'EUR',...input});
    const overdue=make('Просроченный интернет',Date.now()-86400000,household,29.90);
    const today=make('Платёж сегодня',Date.now(),household,48);
    const todaySecond=make('Второй платёж сегодня',Date.now()+3600000,household,12);
    const early=make('Оплата заранее',Date.now()+3*86400000,household,30);
    const manualTarget=make('Ручная оплата заранее',Date.now()+4*86400000,household,41.25);
    const disposable=make('Удаляемый платёж',Date.now()+2*86400000,household,19.50);
    assert(overdue.ok&&today.ok&&todaySecond.ok&&early.ok&&manualTarget.ok&&disposable.ok,'Household fixtures failed');
    api.paymentAttention.setLeadDays(early.rule.id,3);
    api.paymentAttention.setLeadDays(manualTarget.rule.id,7);

    api.setActiveWallet(personal);
    const privateRule=make('Личный платёж',Date.now(),personal,21);
    assert(privateRule.ok,'Personal fixture failed');
    api.setActiveWallet(household);
    api.obligationUx.render();

    assert(!doc.getElementById('paymentAttentionCard'),'Large Home payment card must remain removed');
    assert(api.obligationUx.actionOrder().join('|')==='Приход|Перевод|Расход','Home action order is not Income, Transfer, Expense');

    const planNav=doc.querySelector('[data-screen="plans"]'),badge=planNav.querySelector('.plan-attention-badge');
    assert(badge&&!badge.hidden&&badge.classList.contains('overdue'),'Plan navigation overdue indicator missing');
    const planModule=doc.querySelector('[data-plan-module="obligations"]');
    assert(planModule.classList.contains('attention-overdue'),'Obligations Plan module is not highlighted');
    click(planNav);click(planModule);
    assert(doc.getElementById('obligationsScreen').classList.contains('active'),'Obligations screen did not open');
    assert(!text(doc.getElementById('obligationMonthLabel')).includes('1970'),'Obligations month remained January 1970');

    const overdueRow=doc.querySelector('[data-obligation-occurrence="'+overdue.occurrence.id+'"]');
    assert(overdueRow&&overdueRow.classList.contains('obligation-row--overdue'),'Overdue row is not visually distinct');
    const todayRow=doc.querySelector('[data-obligation-occurrence="'+today.occurrence.id+'"]');
    assert(todayRow&&todayRow.classList.contains('obligation-row--due'),'Today row is not visually distinct');
    const dayGroup=todayRow.closest('.obligation-date-group');
    assert(dayGroup.classList.contains('is-multi'),'Same-day payments are not grouped');
    assert(text(dayGroup.querySelector('.obligation-date-heading')).includes('Запланировать'),'Daily planning total is missing');
    assert(!doc.querySelector('[data-obligation-occurrence="'+privateRule.occurrence.id+'"]'),'Personal payment leaked into household scope');

    const earlyRow=doc.querySelector('[data-obligation-occurrence="'+early.occurrence.id+'"]');
    const earlyToggle=earlyRow?.querySelector('[data-ux-payment-toggle]');
    assert(earlyToggle&&earlyRow.lastElementChild===earlyToggle,'Payment checkbox is not positioned on the right');
    click(earlyToggle);
    let state=api.getState(),earlyOccurrence=state.obligationOccurrences.find(item=>item.id===early.occurrence.id);
    assert(earlyOccurrence.status==='paid','Short tap did not mark future payment paid');
    const generated=state.operations.find(operation=>operation.links?.obligationOccurrenceId===early.occurrence.id);
    assert(generated&&generated.status==='active','Generated linked Expense missing');
    const earlyPaidToggle=doc.querySelector('[data-obligation-occurrence="'+early.occurrence.id+'"] [data-ux-payment-toggle]');
    click(earlyPaidToggle);
    state=api.getState();earlyOccurrence=state.obligationOccurrences.find(item=>item.id===early.occurrence.id);
    assert(earlyOccurrence.status==='planned'&&!earlyOccurrence.linkedOperationId,'Second short tap did not remove paid status');
    assert(state.operations.find(operation=>operation.id===generated.id)?.status==='trash','Generated Expense was not moved to Trash after unchecking');

    const manual=api.obligationUx.addManualExpense({amount:41.25,walletId:household,categoryId:category,note:'Оплатил заранее вручную',occurredAt:Date.now()});
    const manualToggle=doc.querySelector('[data-obligation-occurrence="'+manualTarget.occurrence.id+'"] [data-ux-payment-toggle]');
    click(manualToggle);
    assert(doc.getElementById('paymentReconcileModal').classList.contains('open'),'Matching manual Expense did not open duplicate-prevention choice');
    assert(api.getState().operations.filter(operation=>operation.status==='active'&&operation.amount===41.25).length===1,'Duplicate Expense was created before user choice');
    click(doc.querySelector('[data-payment-link-existing="'+manual.id+'"]'));
    state=api.getState();
    const linkedOccurrence=state.obligationOccurrences.find(item=>item.id===manualTarget.occurrence.id);
    assert(linkedOccurrence.status==='paid'&&linkedOccurrence.linkedOperationId===manual.id,'Existing manual Expense was not linked');
    assert(state.operations.filter(operation=>operation.status==='active'&&operation.amount===41.25).length===1,'Linking existing Expense created a duplicate');
    assert(api.obligationUx.operationHtml(manual.id).includes('Обязательство · срок'),'Operations row does not explain linked obligation due date');
    click(doc.querySelector('[data-obligation-occurrence="'+manualTarget.occurrence.id+'"] [data-ux-payment-toggle]'));
    state=api.getState();
    assert(state.operations.find(item=>item.id===manual.id)?.status==='active','Unchecking deleted a manually recorded Expense');
    assert(!state.operations.find(item=>item.id===manual.id)?.links?.obligationOccurrenceId,'Manual Expense remained linked after unchecking');

    const longToggle=doc.querySelector('[data-obligation-occurrence="'+todaySecond.occurrence.id+'"] [data-ux-payment-toggle]');
    longToggle.dispatchEvent(new win.PointerEvent('pointerdown',{bubbles:true,pointerType:'touch'}));
    await wait(650);
    longToggle.dispatchEvent(new win.PointerEvent('pointerup',{bubbles:true,pointerType:'touch'}));
    assert(doc.getElementById('paymentContextModal').classList.contains('open'),'Long press did not open payment context menu');
    for(const label of ['Оплачено','Не оплачено','Пропущено','Изменить','Удалить платёж'])assert(text(doc.getElementById('paymentContextModal')).includes(label),'Context action missing: '+label);
    click(doc.querySelector('[data-payment-context-action="skipped"]'));
    assert(api.getState().obligationOccurrences.find(item=>item.id===todaySecond.occurrence.id).status==='skipped','Context menu did not set skipped status');
    doc.querySelector('[data-obligation-occurrence="'+todaySecond.occurrence.id+'"] [data-ux-payment-toggle]').dispatchEvent(new win.MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
    click(doc.querySelector('[data-payment-context-action="unpaid"]'));
    assert(api.getState().obligationOccurrences.find(item=>item.id===todaySecond.occurrence.id).status==='planned','Context menu did not restore unpaid status');

    doc.querySelector('[data-obligation-occurrence="'+disposable.occurrence.id+'"] [data-ux-payment-toggle]').dispatchEvent(new win.MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
    click(doc.querySelector('[data-payment-context-action="delete"]'));
    assert(api.getState().obligationOccurrences.find(item=>item.id===disposable.occurrence.id).status==='cancelled','Delete did not cancel only the selected occurrence');
    assert(!doc.querySelector('[data-obligation-occurrence="'+disposable.occurrence.id+'"]'),'Deleted occurrence remains in active calendar');

    const recurring=make('Ежемесячная подписка',new Date(new Date().getFullYear(),new Date().getMonth()-2,5).getTime(),household,77.77,{cadence:'recurring',intervalValue:1,intervalUnit:'month',endingMode:'count',paymentCount:5});
    assert(recurring.ok&&recurring.occurrences.length===5,'Recurring fixture failed');
    const recurringItems=[...recurring.occurrences].sort((a,b)=>a.sequence-b.sequence);
    api.obligationUx.togglePayment(recurringItems[0].id);
    api.obligationUx.contextAction(recurringItems[1].id,'skipped');
    api.obligationUx.togglePayment(recurringItems[2].id);
    api.obligationUx.openRule(recurring.rule.id);
    const ruleDetail=text(doc.getElementById('obligationRuleDetailContent'));
    assert(ruleDetail.includes('Дата начала'),'Recurring rule start date missing');
    assert(ruleDetail.includes('Выполнено')&&ruleDetail.includes('2 из 5'),'Recurring completed count is unclear');
    assert(ruleDetail.includes('Последний выполненный'),'Last completed payment date missing');
    assert(ruleDetail.includes('Пропущено до последней оплаты')&&ruleDetail.includes('1'),'Skipped count is unclear');
    assert(getComputedStyle(doc.getElementById('obligationArchiveBtn')).display==='none','Archive control remains buried inside Edit');
    click(doc.querySelector('[data-ux-rule-close]'));
    api.obligationUx.toggleRule(recurring.rule.id);
    assert(doc.querySelector('.disabled-rules [data-ux-rule-open="'+recurring.rule.id+'"]'),'Disabled rule is not separated below active rules');
    assert(!doc.querySelector('.active-rules [data-ux-rule-open="'+recurring.rule.id+'"]'),'Disabled rule remains mixed with active rules');

    api.setActiveWallet(personal);api.obligationUx.render();
    assert(doc.querySelector('[data-obligation-occurrence="'+privateRule.occurrence.id+'"]'),'Personal payment missing in personal scope');
    assert(!doc.querySelector('[data-obligation-occurrence="'+overdue.occurrence.id+'"]'),'Household payment leaked into personal scope');

    const demo=api.paymentAttentionDemo.load();
    assert(demo.ok&&demo.created.length===12,'Comprehensive demo fixtures were not created');
    assert(api.paymentAttentionDemo.records().length===12,'Demo record count is not 12');
    const removed=api.paymentAttentionDemo.remove();
    assert(removed.rules===12&&api.paymentAttentionDemo.records().length===0,'Demo cleanup failed');

    assert(doc.querySelector('meta[content="planned-payment-attention-v3"]'),'M3-03 interaction package marker missing');
    assert(runtimeErrors.length===0,'Runtime exceptions: '+runtimeErrors.join(' | '));

    result.textContent=JSON.stringify({status:'PASS',marker:'${marker}',rightThumbToggle:true,shortTapPayUnpay:true,longPressContext:true,skipAndRestore:true,deleteOccurrence:true,duplicatePrevention:true,manualExpensePreserved:true,generatedExpenseTrashed:true,operationDueLink:true,transferBetweenIncomeExpense:true,activeDisabledRulesSeparated:true,archiveHiddenFromEdit:true,recurringProgressStats:true,scopeIsolation:true,demoScenarios:12,demoCleanup:true,runtimeExceptions:[]},null,2);
    document.body.dataset.status='PASS';
  }
  frame.addEventListener('load',()=>run().catch(error=>{result.textContent=String(error&&error.stack||error);document.body.dataset.status='FAIL'}),{once:true});
})();</script></body></html>`;

writeFileSync(harnessPath,harness);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1'),raw=url.pathname==='/'?'index.html':url.pathname.replace(/^\//,''),target=normalize(resolve(root,raw));if(target!==root&&!target.startsWith(root+sep))throw new Error('Forbidden path');const body=readFileSync(target);res.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream','cache-control':'no-store'});res.end(body)}catch{res.writeHead(404,{'content-type':'text/plain'});res.end('Not found')}});
const chromeCandidates=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'];
const chrome=chromeCandidates.find(existsSync);if(!chrome)throw new Error('Chrome/Chromium is not installed');
function runChrome(url){return new Promise((resolvePromise,reject)=>{const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',`--user-data-dir=${profilePath}`,'--virtual-time-budget=50000','--dump-dom',url],{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.on('error',reject);child.on('close',code=>code===0?resolvePromise({stdout,stderr}):reject(new Error(`Chrome exited ${code}\n${stderr}`)))})}
await new Promise((resolvePromise,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolvePromise)});
try{const address=server.address(),{stdout}=await runChrome(`http://127.0.0.1:${address.port}/${harnessName}`),match=stdout.match(/<pre id="result">([\s\S]*?)<\/pre>/),decoded=(match?.[1]||'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');if(!stdout.includes('data-status="PASS"')||!stdout.includes(marker))throw new Error(`M3-03 browser smoke did not pass\n${decoded||stdout.slice(-5000)}`);console.log(decoded||JSON.stringify({status:'PASS',marker},null,2))}finally{await new Promise(resolve=>server.close(resolve));if(existsSync(harnessPath))unlinkSync(harnessPath);rmSync(profilePath,{recursive:true,force:true})}

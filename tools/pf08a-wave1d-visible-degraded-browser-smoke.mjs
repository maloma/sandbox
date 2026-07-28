import {createServer} from 'node:http';
import {existsSync,mkdtempSync,readFileSync,rmSync,unlinkSync,writeFileSync} from 'node:fs';
import {extname,join,normalize,resolve,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';

const root=process.cwd();
const name='.pf08a-wave1d-visible-harness.html';
const path=join(root,name);
const profile=mkdtempSync(join(tmpdir(),'pf08a-wave1d-visible-'));
const marker='PF08A_WAVE1D_VISIBLE_DEGRADED_PASS';
const token='wave1d-'+Date.now();
const wait=ms=>new Promise(resolveWait=>setTimeout(resolveWait,ms));
let reportResult;
const reportPromise=new Promise(resolveReport=>{reportResult=resolveReport});
let lastProgress='not_started';

const harness=`<!doctype html><html lang="ru"><body data-status="PENDING"><iframe id="app" style="width:390px;height:844px;border:0"></iframe><iframe id="ordinary" style="display:none"></iframe><iframe id="timeout" style="display:none"></iframe><pre id="result">PENDING</pre><script>(()=>{
const out=document.getElementById('result'),app=document.getElementById('app'),ordinary=document.getElementById('ordinary'),timeout=document.getElementById('timeout');
const wait=ms=>new Promise(r=>setTimeout(r,ms)),assert=(v,m)=>{if(!v)throw Error(m)};
const progress=phase=>fetch('/__wave1d_progress',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phase})}).catch(()=>{});
const load=(frame,src,label,ms=120000)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(label+' load timed out')),ms);frame.addEventListener('load',()=>{clearTimeout(timer);progress(label+' loaded');resolve()},{once:true});progress(label+' start');frame.src=src});
const until=async(check,label,ms=110000)=>{const end=Date.now()+ms;let last;while(Date.now()<end){try{last=check();if(last)return last}catch(e){last=String(e)}await wait(100)}throw Error(label+' timed out: '+JSON.stringify(last))};
const fingerprintDiff=(left,right)=>{const before=JSON.parse(left),after=JSON.parse(right),keys=[...new Set([...Object.keys(before),...Object.keys(after)])];return keys.filter(key=>JSON.stringify(before[key])!==JSON.stringify(after[key])).map(key=>({key,before:before[key],after:after[key]}))};
const report=async(status,payload)=>{out.textContent=JSON.stringify(payload,null,2);document.body.dataset.status=status;try{await fetch('/__wave1d_result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({status,payload})})}catch{}};
(async()=>{try{
 await load(app,'/?test=1&persistenceTest=${token}-root&moduleFailure=what_if&moduleFailureStage=script_load&wave1d=1','injected app');
 await progress('injected app readiness');
 const w=app.contentWindow;
 let baselineFingerprint='',baselineStableCount=0;
 await until(()=>{const registry=w.FamilyPilotModuleRegistry,r=registry?.get?.('what_if'),learning=registry?.get?.('learning'),ui=w.__FP_TEST__?.moduleRegistry,catalogue=registry?.snapshot?.().catalogue||[];const ready=w.__FP_MODULE_REGISTRY_UI_READY__&&w.__FP_MODULE_ENTRY_BRIDGE_READY__&&w.__FP_PERSISTENCE_READY__===true&&r?.state==='degraded'&&learning?.state==='degraded'&&learning?.rootDiagnosticId===r?.rootDiagnosticId&&learning?.blockedByModuleId==='what_if'&&ui&&catalogue.every(item=>item.moduleId==='what_if'?item.state==='degraded':item.moduleId==='learning'?item.state==='degraded':item.state==='ready');if(!ready)return false;const current=ui.financialFingerprint();if(current===baselineFingerprint)baselineStableCount+=1;else{baselineFingerprint=current;baselineStableCount=0}return baselineStableCount>=2},'stable script failure and dependent propagation',120000);
 const registry=w.FamilyPilotModuleRegistry,ui=w.__FP_TEST__.moduleRegistry,before=ui.financialFingerprint(),rootRecord=registry.get('what_if'),learning=registry.get('learning');
 const failedEntry=()=>[...w.document.querySelectorAll('#m406PlanEntry,[data-m406-open],[data-fp-fallback-entry="what_if"]')].find(node=>!node.hidden&&getComputedStyle(node).display!=='none');
 await until(()=>failedEntry(),'failed module entry visibility');
 assert(rootRecord.failureStage==='script_load','Wrong root failure stage');
 assert(rootRecord.retryClass==='script_only','Script-only retry class missing');
 assert(/^FP-MOD-[A-Z0-9]{4}$/.test(rootRecord.diagnosticId),'Diagnostic ID invalid');
 assert(learning.state==='degraded'&&learning.rootDiagnosticId===rootRecord.rootDiagnosticId,'Dependent root cause not propagated');
 assert(learning.blockedByModuleId==='what_if','Dependent blocker missing');
 ui.render();await wait(100);
 assert(Boolean(failedEntry()),'Failed module entry is not visible');
 assert(failedEntry()?.dataset.fpModuleState==='degraded','Failed entry state is not degraded');
 const summary=ui.summaryText();
 assert(summary.includes('Некоторые разделы временно недоступны'),'Global degraded summary missing');
 assert(summary.includes('Сохранённые данные не удалены из-за этой ошибки'),'Data-preservation wording missing');
 assert(summary.includes('Что если'),'Failed module name missing');
 assert(summary.includes(rootRecord.diagnosticId),'Diagnostic ID missing from summary');
 assert(summary.includes('Как пользоваться FamilyPilot'),'Dependent module not grouped under root');
 assert(ui.open('what_if')===true,'Local degraded screen did not open');await wait(50);
 const detail=ui.degradedText();
 assert(detail.includes('Что если')&&detail.includes('Сохранённые данные не удалены из-за этой ошибки'),'Local degraded card incomplete');
 assert(!detail.includes('Error:')&&!detail.includes(' at '),'Stack text leaked to UI');
 w.__FP_RUNTIME__.showScreen('home');
 assert(w.document.getElementById('homeScreen').classList.contains('active'),'Unaffected home route unavailable');
 assert(!ui.shellDegraded(),'Module failure incorrectly degraded whole shell');
 assert(ui.financialFingerprint()===before,'Failure UI changed financial state');
 registry.test.clearFailure();
 const attempt1=registry.retry('what_if'),attempt2=registry.retry('what_if');
 assert(attempt1&&attempt1===attempt2,'Repeated retry did not collapse to one attempt');
 await progress('safe retry recovery');
 await until(()=>{const snapshot=registry.snapshot();return registry.get('what_if')?.state==='ready'&&registry.get('learning')?.state==='ready'&&w.__FP_M4_07_LEARNING_READY__===true&&snapshot.catalogue.every(item=>item.state==='ready')},'safe retry recovery',120000);
 ui.render();await wait(150);
 assert(!ui.summaryText().includes('Некоторые разделы временно недоступны'),'Global degraded summary remained after recovery');
 assert(w.document.querySelectorAll('#m406PlanEntry').length===1,'Duplicate What If entry after retry');
 assert(w.document.querySelectorAll('#whatIfScreen').length===1,'Duplicate What If screen after retry');
 assert(w.document.querySelectorAll('meta[content="m4-06-what-if-scenario-foundation-v1"]').length===1,'Duplicate What If package marker after retry');
 assert(w.document.querySelectorAll('[data-fp-fallback-entry="what_if"]').length===0,'Fallback entry remained after recovery');
 const afterRecovery=ui.financialFingerprint();
 if(afterRecovery!==before)throw Error('Recovery changed financial state: '+JSON.stringify(fingerprintDiff(before,afterRecovery)));
 const errors=[w.__FP_PACKAGE_BOOTSTRAP_ERROR__,w.__FP_M4_05_BOOTSTRAP_ERROR__,w.__FP_M4_06_UI_ERROR__,w.__FP_M4_07_LEARNING_UI_ERROR__].filter(Boolean);
 assert(errors.length===0,'Runtime bootstrap errors after recovery: '+errors.join(' | '));

 registry.test.forceUnavailable('persistence','persistence_recovery_locked');registry.reconcile();ui.render();await wait(80);
 assert(ui.shellDegraded(),'Persistence critical failure did not degrade application shell');
 assert(getComputedStyle(w.document.getElementById('actionDock')).display==='none','Financial mutation dock remained visible during shell degradation');
 const barrier=w.__FP_TEST__?.moduleRegistryCorrection;
 assert(barrier,'Shell mutation barrier test API missing in browser runtime');
 await until(()=>barrier.shellDegraded()&&barrier.blockedControls().length>0,'browser shell mutation barrier activation');
 const blockedNodes=[...w.document.querySelectorAll('[data-fp-shell-mutation-blocked="true"]')];
 const outsideDock=blockedNodes.find(node=>!node.closest('#actionDock'));
 assert(outsideDock,'No financial mutation control outside actionDock was blocked');
 assert(outsideDock.disabled===true,'Outside-dock financial mutation control was not disabled');
 const blockedBefore=barrier.blockedCount();
 const mutationEvent=new w.MouseEvent('click',{bubbles:true,cancelable:true});
 const mutationDispatch=outsideDock.dispatchEvent(mutationEvent);
 assert(mutationEvent.defaultPrevented||mutationDispatch===false,'Outside-dock mutation event was not intercepted');
 assert(barrier.blockedCount()===blockedBefore+1,'Browser mutation block counter did not increment');
 const readOnlyNav=w.document.querySelector('.nav');
 assert(readOnlyNav&&!readOnlyNav.disabled,'Read-only navigation was disabled by shell barrier');
 assert(barrier.readOnlyControl('.nav')===true,'Read-only navigation was not classified by shell barrier');
 w.__FP_RUNTIME__.showScreen('more');
 assert(w.document.getElementById('moreScreen').classList.contains('active'),'Unaffected read-only route unavailable during shell degradation');
 assert(registry.get('persistence').retryClass==='never','Persistence lock exposed unsafe retry');
 assert(ui.financialFingerprint()===before,'Persistence containment changed financial state');

 await progress('ordinary app load');
 await load(ordinary,'/?persistenceTest=${token}-ordinary&moduleFailure=what_if&moduleFailureStage=script_load','ordinary app');
 const o=ordinary.contentWindow;
 await until(()=>o.FamilyPilotModuleRegistry?.get?.('what_if')?.state==='ready'&&o.__FP_M4_07_LEARNING_READY__===true,'ordinary route readiness',120000);
 assert(!o.FamilyPilotModuleRegistry.test,'Registry test API leaked to ordinary route');
 assert(o.FamilyPilotModuleRegistry.get('what_if').state==='ready','Ordinary route honored failure parameters');

 await progress('readiness-timeout app load');
 await load(timeout,'/?test=1&persistenceTest=${token}-timeout&moduleFailure=what_if&moduleFailureStage=readiness_timeout','readiness-timeout app');
 const t=timeout.contentWindow;
 await until(()=>t.__FP_MODULE_REGISTRY_UI_READY__&&t.FamilyPilotModuleRegistry?.get?.('what_if')?.state==='degraded','readiness timeout degraded state',120000);
 const timeoutRecord=t.FamilyPilotModuleRegistry.get('what_if'),timeoutUi=t.__FP_TEST__.moduleRegistry,timeoutBefore=timeoutUi.financialFingerprint();
 assert(timeoutRecord.failureStage==='readiness_timeout','Readiness timeout stage missing');
 assert(timeoutRecord.installStarted===true,'Partial installation was not recorded');
 assert(timeoutRecord.retryClass==='reload_required','Partial installation did not require reload');
 timeoutUi.open('what_if');await wait(60);
 assert(timeoutUi.degradedText().includes('Перезагрузить FamilyPilot'),'Reload-required action missing');
 assert(timeoutUi.financialFingerprint()===timeoutBefore,'Readiness-timeout card changed financial state');

 const eventSafe=registry.snapshot().events.every(e=>!('amount' in e)&&!('note' in e)&&!('stack' in e));
 assert(eventSafe,'Registry safe event history contains financial or stack payload');
 assert(registry.snapshot().events.length<=50,'Registry event history exceeded bound');
 try{w.__FP_TEST__?.persistence?.testApi?.()?.cleanup?.();o.__FP_TEST__?.persistence?.testApi?.()?.cleanup?.();t.__FP_TEST__?.persistence?.testApi?.()?.cleanup?.()}catch{}
 await report('PASS',{status:'PASS',marker:'${marker}',visible_global_card:true,visible_local_card:true,failed_entry_preserved:true,precise_data_wording:true,diagnostic_id:true,root_cause_grouping:true,unaffected_routes:true,one_active_attempt:true,safe_retry:true,no_duplicate_ui:true,financial_isolation:true,persistence_priority:true,shell_mutation_barrier:true,outside_action_dock_disabled:true,mutation_intercepted:true,read_only_navigation_preserved:true,injection_isolated:true,partial_install_reload_required:true,safe_events:true});
}catch(error){await report('FAIL',{status:'FAIL',error:String(error.stack||error)})}})();})();
</script></body></html>`;
writeFileSync(path,harness,'utf8');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const server=createServer((req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    if((url.pathname==='/__wave1d_result'||url.pathname==='/__wave1d_progress')&&req.method==='POST'){
      let body='';
      req.setEncoding('utf8');
      req.on('data',chunk=>body+=chunk);
      req.on('end',()=>{
        try{const parsed=JSON.parse(body);if(url.pathname==='/__wave1d_progress'){lastProgress=String(parsed.phase||'unknown')}else{reportResult(parsed)}}catch(error){if(url.pathname==='/__wave1d_result')reportResult({status:'FAIL',payload:{error:String(error)}})}
        res.writeHead(204);res.end();
      });
      return;
    }
    const raw=url.pathname==='/'?'index.html':url.pathname.replace(/^\//,''),target=normalize(resolve(root,raw));
    if(target!==root&&!target.startsWith(root+sep))throw Error('forbidden');
    res.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream','cache-control':'no-store'});
    res.end(readFileSync(target));
  }catch{
    if(!res.headersSent)res.writeHead(404);
    if(!res.writableEnded)res.end('Not found');
  }
});
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
if(!chrome)throw Error('Chrome unavailable');
await new Promise((resolveListen,rejectListen)=>{server.once('error',rejectListen);server.listen(0,'127.0.0.1',resolveListen)});
let child=null,stderr='',primaryError=null;
try{
  const port=server.address().port;
  child=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/${name}`],{stdio:['ignore','ignore','pipe']});
  child.stderr.on('data',chunk=>stderr+=chunk);
  const childExit=new Promise(resolveExit=>child.once('close',code=>resolveExit({type:'exit',code})));
  const timeoutResult=new Promise(resolveTimeout=>setTimeout(()=>resolveTimeout({type:'timeout'}),420000));
  const outcome=await Promise.race([reportPromise.then(report=>({type:'report',report})),childExit,timeoutResult]);
  if(outcome.type==='timeout')throw Error('Browser timeout at '+lastProgress+'\n'+stderr.slice(-12000));
  if(outcome.type==='exit')throw Error(`Browser exited before reporting (${outcome.code})\n${stderr.slice(-12000)}`);
  if(outcome.report.status!=='PASS')throw Error(outcome.report.payload?.error||JSON.stringify(outcome.report));
  console.log(JSON.stringify(outcome.report.payload,null,2));
  console.log(marker);
}catch(error){
  primaryError=error;
  throw error;
}finally{
  if(child&&!child.killed){child.kill('SIGTERM');await wait(200);if(!child.killed)child.kill('SIGKILL')}
  await new Promise(resolveClose=>server.close(resolveClose));
  if(existsSync(path))unlinkSync(path);
  try{rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100})}catch(cleanupError){if(!primaryError)throw cleanupError;console.error('Profile cleanup failed after primary error:',String(cleanupError))}
}

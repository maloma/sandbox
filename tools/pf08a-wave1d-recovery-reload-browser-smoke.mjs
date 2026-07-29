import {createServer} from 'node:http';
import {existsSync,mkdtempSync,readFileSync,rmSync,unlinkSync,writeFileSync} from 'node:fs';
import {extname,join,normalize,resolve,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';

const root=process.cwd();
const name='.pf08a-wave1d-recovery-reload-harness.html';
const path=join(root,name);
const profile=mkdtempSync(join(tmpdir(),'pf08a-wave1d-recovery-reload-'));
const marker='PF08A_WAVE1D_RECOVERY_RELOAD_PASS';
const token='wave1d-recovery-reload-'+Date.now();
const wait=ms=>new Promise(resolveWait=>setTimeout(resolveWait,ms));
let reportResult;
const reportPromise=new Promise(resolveReport=>{reportResult=resolveReport});
let lastProgress='not_started';

const browserInstrumentation=`<script>(()=>{
  const events=[];
  const registrations=[];
  const targets=new WeakMap();
  let targetSequence=0;
  const watchedSources=['familypilot-module-registry-retry-correction.js','familypilot-module-registry-ui.js','familypilot-module-entry-bridge.js'];
  const describe=value=>{try{return String(value?.stack||value?.message||value||'unknown')}catch{return 'unprintable'}};
  const targetLabel=target=>{
    if(target===window)return'window';
    if(target===document)return'document';
    if(target?.id)return'#'+target.id;
    if(!targets.has(target))targets.set(target,'target-'+(++targetSequence));
    return targets.get(target);
  };
  const callsite=()=>{
    const stack=String(new Error().stack||'').split('\\n');
    return stack.map(line=>line.trim()).find(line=>watchedSources.some(source=>line.includes(source)))||'';
  };
  const nativeAdd=EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener=function(type,listener,options){
    const callsiteValue=callsite();
    if(callsiteValue){
      const capture=typeof options==='boolean'?options:Boolean(options?.capture);
      const source=watchedSources.find(name=>callsiteValue.includes(name))||'';
      registrations.push({target:targetLabel(this),type:String(type),capture,source,callsite:callsiteValue});
    }
    return nativeAdd.call(this,type,listener,options);
  };
  const duplicateRegistrations=()=>{
    const counts=new Map();
    for(const item of registrations){
      const key=[item.target,item.type,item.capture,item.source,item.callsite].join('|');
      counts.set(key,(counts.get(key)||0)+1);
    }
    return [...counts.entries()].filter(([,count])=>count>1).map(([key,count])=>({key,count}));
  };
  const sourceCounts=()=>Object.fromEntries(watchedSources.map(source=>[source,registrations.filter(item=>item.source===source).length]));
  Object.defineProperty(window,'__FP_BROWSER_EVENTS__',{value:events,configurable:false});
  Object.defineProperty(window,'__FP_LISTENER_SENTINEL__',{value:Object.freeze({registrations:()=>registrations.map(item=>({...item})),duplicates:duplicateRegistrations,sourceCounts}),configurable:false});
  window.addEventListener('error',event=>events.push({type:'error',message:String(event.message||'unknown'),source:String(event.filename||''),line:Number(event.lineno||0),column:Number(event.colno||0),detail:describe(event.error)}));
  window.addEventListener('unhandledrejection',event=>events.push({type:'unhandledrejection',detail:describe(event.reason)}));
})();</script>`;
const instrumentIndex=body=>{const text=body.toString('utf8'),match=text.match(/<head[^>]*>/i);return match?text.replace(match[0],match[0]+browserInstrumentation):browserInstrumentation+text};

const harness=`<!doctype html><html lang="ru"><body data-status="PENDING"><iframe id="app" style="width:390px;height:844px;border:0"></iframe><pre id="result">PENDING</pre><script>(()=>{
const frame=document.getElementById('app'),out=document.getElementById('result');
const wait=ms=>new Promise(r=>setTimeout(r,ms)),assert=(value,message)=>{if(!value)throw Error(message)};
const progress=phase=>fetch('/__wave1d_progress',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phase})}).catch(()=>{});
const load=(src,label,ms=120000)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(label+' load timed out')),ms);frame.addEventListener('load',()=>{clearTimeout(timer);progress(label+' loaded');resolve()},{once:true});progress(label+' start');frame.src=src});
const nextLoad=(label,ms=120000)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(label+' load timed out')),ms);frame.addEventListener('load',()=>{clearTimeout(timer);progress(label+' loaded');resolve()},{once:true})});
const until=async(check,label,ms=120000)=>{const end=Date.now()+ms;let last;while(Date.now()<end){try{last=check();if(last)return last}catch(error){last=String(error)}await wait(100)}throw Error(label+' timed out: '+JSON.stringify(last))};
const report=async(status,payload)=>{out.textContent=JSON.stringify(payload,null,2);document.body.dataset.status=status;try{await fetch('/__wave1d_result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({status,payload})})}catch{}};
const stateOf=w=>{try{return w.__FP_TEST__?.getState?.()||w.__FP_RUNTIME__?.state||{}}catch{return w.__FP_RUNTIME__?.state||{}}};
const duplicateValues=values=>{const counts=new Map();for(const value of values)counts.set(value,(counts.get(value)||0)+1);return[...counts.entries()].filter(([,count])=>count>1).map(([value,count])=>({value,count}))};
const requiredListenerSignatures=[
  ['familypilot-module-registry-retry-correction.js','document','click',true],
  ['familypilot-module-registry-retry-correction.js','document','submit',true],
  ['familypilot-module-registry-retry-correction.js','document','beforeinput',true],
  ['familypilot-module-registry-retry-correction.js','document','input',true],
  ['familypilot-module-registry-retry-correction.js','document','change',true],
  ['familypilot-module-registry-retry-correction.js','document','keydown',true],
  ['familypilot-module-registry-retry-correction.js','window','familypilot:module-state',false],
  ['familypilot-module-registry-ui.js','document','click',true],
  ['familypilot-module-registry-ui.js','window','familypilot:module-state',false],
  ['familypilot-module-entry-bridge.js','window','familypilot:module-state',false],
].map(([source,target,type,capture])=>({source,target,type,capture}));
const listenerSignature=item=>[item.source,item.target,item.type,String(item.capture)].join('|');
const listenerContract=(sentinel,label)=>{
  const registrations=sentinel.registrations();
  const longLived=registrations.filter(item=>item.type!=='DOMContentLoaded').map(listenerSignature).sort();
  const counts=new Map();for(const signature of longLived)counts.set(signature,(counts.get(signature)||0)+1);
  const missing=requiredListenerSignatures.map(listenerSignature).filter(signature=>(counts.get(signature)||0)!==1);
  assert(missing.length===0,label+' required production listener signatures missing or non-unique: '+JSON.stringify({missing,counts:Object.fromEntries(counts)}));
  const duplicates=sentinel.duplicates();
  assert(duplicates.length===0,label+' duplicate production handlers: '+JSON.stringify(duplicates));
  return longLived;
};
const structuralSnapshot=w=>{
  const scriptPaths=[...w.document.scripts].map(node=>{if(!node.src)return'';try{return new URL(node.src,w.location.href).pathname}catch{return''}}).filter(Boolean);
  const screenIds=[...w.document.querySelectorAll('.screen[id]')].map(node=>node.id).filter(Boolean);
  const state=stateOf(w),operations=Array.isArray(state.operations)?state.operations:[];
  return{
    scriptPaths,
    duplicateScripts:duplicateValues(scriptPaths),
    duplicateScreenIds:duplicateValues(screenIds),
    operationCount:operations.length,
    operationIds:operations.map(item=>String(item?.id||'')),
    duplicateOperationIds:duplicateValues(operations.map(item=>String(item?.id||'')).filter(Boolean)),
    fallbackEntries:w.document.querySelectorAll('[data-fp-fallback-entry]').length,
    staticFallbackHidden:w.document.getElementById('fpStaticFallback')?.hidden===true,
  };
};
(async()=>{try{
  await load('/?test=1&persistenceTest=${token}&moduleFailure=what_if&moduleFailureStage=readiness_timeout&wave1d=1','readiness-timeout app');
  let w=frame.contentWindow;
  await until(()=>{const registry=w.FamilyPilotModuleRegistry,record=registry?.get?.('what_if');return w.__FP_MODULE_REGISTRY_UI_READY__&&w.__FP_MODULE_ENTRY_BRIDGE_READY__&&w.__FP_PERSISTENCE_READY__===true&&record?.state==='degraded'&&record?.failureStage==='readiness_timeout'&&record?.retryClass==='reload_required'&&w.__FP_TEST__?.moduleRegistry},'readiness-timeout degraded state');
  const registryBefore=w.FamilyPilotModuleRegistry,uiBefore=w.__FP_TEST__.moduleRegistry;
  const activeWalletId=stateOf(w).activeWalletId||stateOf(w).wallets?.[0]?.id;
  assert(activeWalletId,'No active wallet available for reload fixture');
  const fixtureId=w.__FP_TEST__?.walletManagement?.seedOperation?.(activeWalletId,'income',17);
  assert(fixtureId,'Financial reload fixture was not created');
  await until(()=>stateOf(w).operations?.some(item=>item.id===fixtureId),'financial fixture persistence');
  const fingerprintBefore=uiBefore.financialFingerprint();
  const structureBefore=structuralSnapshot(w);
  const browserEventsBefore=[...(w.__FP_BROWSER_EVENTS__||[])];
  const listenerBefore=w.__FP_LISTENER_SENTINEL__;
  assert(listenerBefore,'Listener sentinel missing before reload');
  const listenerContractBefore=listenerContract(listenerBefore,'Before reload');
  const sourceCountsBefore=listenerBefore.sourceCounts();
  assert(sourceCountsBefore['familypilot-module-registry-retry-correction.js']>0,'Correction production listeners were not observed');
  assert(sourceCountsBefore['familypilot-module-registry-ui.js']>0,'Registry UI production listeners were not observed');
  assert(sourceCountsBefore['familypilot-module-entry-bridge.js']>0,'Entry bridge production listeners were not observed');
  assert(browserEventsBefore.length===0,'Browser runtime events before reload: '+JSON.stringify(browserEventsBefore));
  assert(structureBefore.duplicateScripts.length===0,'Duplicate scripts before reload: '+JSON.stringify(structureBefore.duplicateScripts));
  assert(structureBefore.duplicateScreenIds.length===0,'Duplicate screens before reload: '+JSON.stringify(structureBefore.duplicateScreenIds));
  assert(structureBefore.duplicateOperationIds.length===0,'Duplicate operations before reload: '+JSON.stringify(structureBefore.duplicateOperationIds));

  registryBefore.test.clearFailure();
  const reloaded=nextLoad('production recovery reload');
  const attemptId=registryBefore.retry('what_if');
  assert(attemptId,'Reload-required recovery did not start');
  await reloaded;
  w=frame.contentWindow;
  await until(()=>{const registry=w.FamilyPilotModuleRegistry,snapshot=registry?.snapshot?.(),status=w.FamilyPilotPersistence?.currentStatus?.()?.status||'';return w.__FP_MODULE_REGISTRY_UI_READY__&&w.__FP_MODULE_ENTRY_BRIDGE_READY__&&w.__FP_PERSISTENCE_READY__===true&&snapshot?.catalogue?.length===11&&snapshot.catalogue.every(item=>item.state==='ready')&&(status==='healthy'||status.startsWith('recovered_'))},'healthy state after real reload');
  const registryAfter=w.FamilyPilotModuleRegistry,uiAfter=w.__FP_TEST__.moduleRegistry,snapshotAfter=registryAfter.snapshot();
  const fingerprintAfter=uiAfter.financialFingerprint();
  const structureAfter=structuralSnapshot(w);
  const browserEventsAfter=[...(w.__FP_BROWSER_EVENTS__||[])];
  const listenerAfter=w.__FP_LISTENER_SENTINEL__;
  assert(fingerprintAfter===fingerprintBefore,'Financial fingerprint changed across recovery reload');
  assert(stateOf(w).operations?.some(item=>item.id===fixtureId),'Persisted fixture missing after reload');
  assert(structureAfter.operationCount===structureBefore.operationCount,'Operation count changed across recovery reload');
  assert(structureAfter.duplicateOperationIds.length===0,'Duplicate operations after reload: '+JSON.stringify(structureAfter.duplicateOperationIds));
  assert(structureAfter.duplicateScripts.length===0,'Duplicate scripts after reload: '+JSON.stringify(structureAfter.duplicateScripts));
  assert(structureAfter.duplicateScreenIds.length===0,'Duplicate screens after reload: '+JSON.stringify(structureAfter.duplicateScreenIds));
  assert(structureAfter.fallbackEntries===0,'Fallback entries remained after healthy reload');
  assert(structureAfter.staticFallbackHidden,'Static fallback visible after healthy reload');
  assert(snapshotAfter.catalogue.length===11&&new Set(snapshotAfter.catalogue.map(item=>item.moduleId)).size===11,'Duplicate registry modules after reload');
  assert(listenerAfter,'Listener sentinel missing after reload');
  const listenerContractAfter=listenerContract(listenerAfter,'After reload');
  const sourceCountsAfter=listenerAfter.sourceCounts();
  assert(sourceCountsAfter['familypilot-module-registry-retry-correction.js']>0,'Correction production listeners missing after reload');
  assert(sourceCountsAfter['familypilot-module-registry-ui.js']>0,'Registry UI production listeners missing after reload');
  assert(sourceCountsAfter['familypilot-module-entry-bridge.js']>0,'Entry bridge production listeners missing after reload');
  assert(JSON.stringify(listenerContractAfter)===JSON.stringify(listenerContractBefore),'Production listener contract changed across reload: '+JSON.stringify({before:listenerContractBefore,after:listenerContractAfter}));
  assert(browserEventsAfter.length===0,'Browser runtime events after reload: '+JSON.stringify(browserEventsAfter));
  try{w.__FP_TEST__?.persistence?.testApi?.()?.cleanup?.()}catch{}
  await report('PASS',{status:'PASS',marker:'${marker}',scenario_g:'recovery_reload_healthy',real_reload:true,all_modules_ready:true,persistence_healthy:true,no_duplicate_scripts:true,no_duplicate_screens:true,no_duplicate_operations:true,no_duplicate_handlers:true,no_duplicate_fallback_entries:true,financial_fingerprint_unchanged:true,browser_runtime_events:[],listener_sources:sourceCountsAfter,all_production_listener_sources_observed:true,required_listener_signatures_unique:true,listener_contract_stable_across_reload:true});
}catch(error){await report('FAIL',{status:'FAIL',error:String(error.stack||error)})}})();
})();</script></body></html>`;
writeFileSync(path,harness,'utf8');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
const server=createServer((req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    if((url.pathname==='/__wave1d_result'||url.pathname==='/__wave1d_progress')&&req.method==='POST'){
      let body='';req.setEncoding('utf8');req.on('data',chunk=>body+=chunk);req.on('end',()=>{try{const parsed=JSON.parse(body);if(url.pathname==='/__wave1d_progress')lastProgress=String(parsed.phase||'unknown');else reportResult(parsed)}catch(error){if(url.pathname==='/__wave1d_result')reportResult({status:'FAIL',payload:{error:String(error)}})}res.writeHead(204);res.end()});return;
    }
    const raw=url.pathname==='/'?'index.html':url.pathname.replace(/^\//,''),target=normalize(resolve(root,raw));
    if(target!==root&&!target.startsWith(root+sep))throw Error('forbidden');
    res.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream','cache-control':'no-store'});
    const body=readFileSync(target);res.end(raw==='index.html'?instrumentIndex(body):body);
  }catch{if(!res.headersSent)res.writeHead(404);if(!res.writableEnded)res.end('Not found')}
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

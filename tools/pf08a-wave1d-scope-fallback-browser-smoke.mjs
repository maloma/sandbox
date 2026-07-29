import {createServer} from 'node:http';
import {existsSync,mkdtempSync,readFileSync,rmSync,unlinkSync,writeFileSync} from 'node:fs';
import {extname,join,normalize,resolve,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';

const root=process.cwd();
const name='.pf08a-wave1d-scope-fallback-harness.html';
const path=join(root,name);
const profile=mkdtempSync(join(tmpdir(),'pf08a-wave1d-scope-fallback-'));
const marker='PF08A_WAVE1D_SCOPE_FALLBACK_PASS';
const wait=ms=>new Promise(resolveWait=>setTimeout(resolveWait,ms));
const requests=[];
let reportResult;
const reportPromise=new Promise(resolveReport=>{reportResult=resolveReport});

const browserCollector=`<script>(()=>{const events=[];const describe=value=>{try{return String(value?.stack||value?.message||value||'unknown')}catch{return'unprintable'}};Object.defineProperty(window,'__FP_BROWSER_EVENTS__',{value:events,configurable:false});window.addEventListener('error',event=>{if(event instanceof ErrorEvent)events.push({type:'error',message:String(event.message||'unknown'),source:String(event.filename||''),line:Number(event.lineno||0),column:Number(event.colno||0),detail:describe(event.error)})});window.addEventListener('unhandledrejection',event=>events.push({type:'unhandledrejection',detail:describe(event.reason)}));})();</script>`;
const instrumentIndex=body=>{const text=body.toString('utf8'),match=text.match(/<head[^>]*>/i);return match?text.replace(match[0],match[0]+browserCollector):browserCollector+text};

const harness=`<!doctype html><html lang="en"><body data-status="PENDING"><iframe id="app" style="width:390px;height:844px;border:0"></iframe><pre id="result">PENDING</pre><script>(()=>{
const frame=document.getElementById('app'),out=document.getElementById('result');
const wait=ms=>new Promise(r=>setTimeout(r,ms)),assert=(value,message)=>{if(!value)throw Error(message)};
const report=async(status,payload)=>{out.textContent=JSON.stringify(payload,null,2);document.body.dataset.status=status;try{await fetch('/__wave1d_result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({status,payload})})}catch{}};
(async()=>{try{
  const navigationStarted=performance.now();
  frame.src='/?scopeFallback=1';
  const deadline=navigationStarted+10000;
  let fallback,visibleAt=0;
  while(performance.now()<deadline){
    try{
      fallback=frame.contentDocument?.getElementById('fpStaticFallback');
      if(fallback&&fallback.hidden===false&&frame.contentWindow.getComputedStyle(fallback).display!=='none'){visibleAt=performance.now();break}
    }catch{}
    await wait(25);
  }
  assert(visibleAt>0,'Static fallback was not visible within 10 seconds');
  const w=frame.contentWindow,elapsedMs=Math.round(visibleAt-navigationStarted);
  assert(elapsedMs<=10000,'Direct fallback exceeded 10-second threshold: '+elapsedMs);
  assert(!('FamilyPilotPersistence' in w),'FamilyPilotPersistence executed despite scope resource failure');
  assert(!('FamilyPilotScope' in w),'FamilyPilotScope executed despite scope resource failure');
  const title=fallback.querySelector('[data-fp-fallback-title]');
  const message=fallback.querySelector('[data-fp-fallback-message]');
  const buttons=[...fallback.querySelectorAll('button')];
  assert(title?.textContent.trim()==='FamilyPilot не удалось запустить полностью','Exact fallback title missing');
  assert(message?.textContent.trim()==='Сохранённые данные не удалены из-за этой ошибки. Перезагрузите страницу.','Precise data-preservation wording missing');
  assert(buttons.length===1&&buttons[0].textContent.trim()==='Перезагрузить FamilyPilot','Exact reload control missing');
  assert(fallback.querySelectorAll('input,select,textarea,[contenteditable="true"]').length===0,'Financial mutation input exists inside fallback');
  assert(!fallback.querySelector('[data-action],[data-save],[data-delete],[data-trash-purge],[data-wallet-management-save]'),'Financial mutation control exists inside fallback');
  const runtimeEvents=[...(w.__FP_BROWSER_EVENTS__||[])];
  assert(runtimeEvents.length===0,'Unexpected browser runtime events: '+JSON.stringify(runtimeEvents));
  const failure=await fetch('/__wave1d_scope_failure').then(response=>response.json());
  assert(failure.scopeFailures===1,'Expected exactly one failed familypilot-scope.js request: '+JSON.stringify(failure));
  assert(failure.otherMissing.length===0,'Unexpected missing application resources: '+JSON.stringify(failure.otherMissing));
  await report('PASS',{status:'PASS',marker:'${marker}',real_scope_resource_failure:true,scope_runtime_absent:true,static_fallback_visible:true,direct_fallback_before_timeout:true,fallback_latency_ms:elapsedMs,precise_data_wording:true,reload_control_present:true,no_financial_mutation_controls:true,unexpected_runtime_events:[]});
}catch(error){await report('FAIL',{status:'FAIL',error:String(error.stack||error)})}})();
})();</script></body></html>`;
writeFileSync(path,harness,'utf8');

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const server=createServer((req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname==='/__wave1d_result'&&req.method==='POST'){
      let body='';req.setEncoding('utf8');req.on('data',chunk=>body+=chunk);req.on('end',()=>{try{reportResult(JSON.parse(body))}catch(error){reportResult({status:'FAIL',payload:{error:String(error)}})}res.writeHead(204);res.end()});return;
    }
    if(url.pathname==='/__wave1d_scope_failure'){
      res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});
      res.end(JSON.stringify({scopeFailures:requests.filter(item=>item.path==='/familypilot-scope.js'&&item.status===503).length,otherMissing:requests.filter(item=>item.status===404).map(item=>item.path)}));return;
    }
    if(url.pathname==='/familypilot-scope.js'){
      requests.push({path:url.pathname,status:503});
      res.writeHead(503,{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'});
      res.end('Intentional scope resource failure');return;
    }
    const raw=url.pathname==='/'?'index.html':url.pathname.replace(/^\//,''),target=normalize(resolve(root,raw));
    if(target!==root&&!target.startsWith(root+sep))throw Error('forbidden');
    if(!existsSync(target)){requests.push({path:url.pathname,status:404});res.writeHead(404);res.end('Not found');return}
    res.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream','cache-control':'no-store'});
    const body=readFileSync(target);res.end(raw==='index.html'?instrumentIndex(body):body);
  }catch{
    requests.push({path:req.url||'',status:404});
    if(!res.headersSent)res.writeHead(404);
    if(!res.writableEnded)res.end('Not found');
  }
});

const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
if(!chrome)throw Error('Chrome unavailable');
await new Promise((resolveListen,rejectListen)=>{server.once('error',rejectListen);server.listen(0,'127.0.0.1',resolveListen)});
let child=null,stderr='',primaryError=null,timeoutHandle=null;
try{
  const port=server.address().port;
  child=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/${name}`],{stdio:['ignore','ignore','pipe']});
  child.stderr.on('data',chunk=>stderr+=chunk);
  const childExit=new Promise(resolveExit=>child.once('close',code=>resolveExit({type:'exit',code})));
  const timeoutResult=new Promise(resolveTimeout=>{timeoutHandle=setTimeout(()=>resolveTimeout({type:'timeout'}),30000)});
  const outcome=await Promise.race([reportPromise.then(report=>({type:'report',report})),childExit,timeoutResult]);
  if(outcome.type==='timeout')throw Error('Browser timeout\\n'+stderr.slice(-12000));
  if(outcome.type==='exit')throw Error(`Browser exited before reporting (${outcome.code})\\n${stderr.slice(-12000)}`);
  if(outcome.report.status!=='PASS')throw Error(outcome.report.payload?.error||JSON.stringify(outcome.report));
  console.log(JSON.stringify(outcome.report.payload,null,2));
  console.log(marker);
}catch(error){
  primaryError=error;
  throw error;
}finally{
  if(timeoutHandle!==null)clearTimeout(timeoutHandle);
  if(child&&child.exitCode===null&&child.signalCode===null){
    child.kill('SIGTERM');
    await Promise.race([new Promise(resolveExit=>child.once('close',resolveExit)),wait(1000)]);
    if(child.exitCode===null&&child.signalCode===null){
      child.kill('SIGKILL');
      await Promise.race([new Promise(resolveExit=>child.once('close',resolveExit)),wait(1000)]);
    }
  }
  server.closeAllConnections?.();
  await new Promise(resolveClose=>server.close(resolveClose));
  if(existsSync(path))unlinkSync(path);
  try{rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100})}catch(cleanupError){if(!primaryError)throw cleanupError;console.error('Profile cleanup failed after primary error:',String(cleanupError))}
}

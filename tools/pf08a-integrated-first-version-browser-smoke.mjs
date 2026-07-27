import {createServer} from'node:http';
import {existsSync,mkdtempSync,readFileSync,rmSync,unlinkSync,writeFileSync} from'node:fs';
import {extname,join,normalize,resolve,sep} from'node:path';
import {tmpdir} from'node:os';
import {spawn} from'node:child_process';

const root=process.cwd();
const name='.pf08a-integrated-first-version.html';
const path=join(root,name);
const profile=mkdtempSync(join(tmpdir(),'pf08a-integrated-'));
const marker='PF08A_FIRST_VERSION_INTEGRATED_GATE_PASS';

const harness=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>PF-08A integrated gate</title></head><body data-status="PENDING"><iframe id="app" src="/?test=1&pf08aintegrated=1" style="width:390px;height:844px;border:0"></iframe><pre id="result">PENDING</pre><script>(()=>{
const frame=document.getElementById('app'),out=document.getElementById('result'),errors=[];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const assert=(value,message)=>{if(!value)throw Error(message)};
function attach(windowRef){windowRef.addEventListener('error',event=>errors.push(String(event.error||event.message)));windowRef.addEventListener('unhandledrejection',event=>errors.push(String(event.reason)))}
async function ready(){const deadline=Date.now()+70000;while(Date.now()<deadline){const w=frame.contentWindow;if(w?.__FP_RUNTIME__&&w?.__FP_TEST__?.learning&&w?.__FP_TEST__?.savingsTruth&&w.__FP_M4_07_LEARNING_READY__===true&&w.__FP_SAVINGS_TRUTH_READY__===true)return{w,api:w.__FP_TEST__.learning,truth:w.__FP_TEST__.savingsTruth};await wait(100)}throw Error('Integrated runtime did not become ready')}
async function reload(){const loaded=new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}));frame.contentWindow.location.reload();await loaded;const next=await ready();attach(next.w);return next}
frame.addEventListener('load',async()=>{try{
 let current=await ready();attach(current.w);
 const firstWindow=current.w,firstApi=current.api;
 const requiredScreens={home:'homeScreen',operations:'operationsScreen',plans:'plansScreen',more:'moreScreen',obligations:'obligationsScreen',savingsGoals:'savingsGoalsScreen',plannedIncome:'plannedIncomeScreen',budgetDesigner:'budgetDesignerScreen',giftPlanning:'giftPlanningScreen',whatIf:'whatIfScreen',learningMode:'learningModeScreen'};
 for(const[id]of Object.entries(requiredScreens)){const element=firstWindow.document.getElementById(requiredScreens[id]);assert(element,'Missing primary screen '+requiredScreens[id]);firstApi.openScreen(id);await wait(30);assert(element.classList.contains('active'),'Screen did not activate '+id)}
 const lesson=firstApi.lessons().find(item=>item.id==='minimum_start');assert(lesson,'minimum_start lesson missing');assert(lesson.title==='Начните с минимума информации','Learning title not corrected');assert(!firstApi.lessons().some(item=>item.title==='Начните с минимальной картины'),'Superseded Learning title remains');
 assert(current.truth.audit().singleTruth===true,'Competing savings truth remains');assert(current.truth.hasDirectSavedEditor()===false,'Direct saved-amount editor remains');
 const financialBefore=firstApi.financialFingerprint();firstApi.open('minimum_start');await wait(40);const learningText=firstApi.screenText();assert(learningText.includes('Начните с минимума информации'),'Corrected title not rendered');assert(!learningText.includes('Начните с минимальной картины'),'Superseded title rendered');
 firstApi.openScreen('whatIf');await wait(40);firstApi.openScreen('learningMode');await wait(40);assert(firstApi.financialFingerprint()===financialBefore,'Hypothetical or learning navigation changed financial state');
 firstApi.select('minimum_start');assert(firstApi.state().currentLessonId==='minimum_start','Learning selection was not saved before reload');
 current=await reload();assert(current.api.state().currentLessonId==='minimum_start','Learning selection did not persist after reload');assert(current.api.lessons().find(item=>item.id==='minimum_start')?.title==='Начните с минимума информации','Corrected title missing after reload');assert(current.truth.audit().singleTruth===true,'Savings truth mismatch after reload');assert(current.truth.hasDirectSavedEditor()===false,'Direct saved editor returned after reload');
 const bootstrapErrors=Object.keys(current.w).filter(key=>/ERROR$/.test(key)&&current.w[key]).map(key=>key+': '+String(current.w[key]));
 assert(bootstrapErrors.length===0,'Bootstrap errors '+bootstrapErrors.join('|'));assert(errors.length===0,'Runtime errors '+errors.join('|'));
 const result={status:'PASS',marker:'${marker}',primary_navigation:true,learning_copy_corrected:true,reload_persistence:true,hypothetical_isolation:true,runtime_exceptions:[],single_savings_truth:true,direct_saved_editor_absent:true,visible_module_failure_surface:false,readiness_verdict:'NOT_READY'};
 out.textContent=JSON.stringify(result,null,2);document.body.dataset.status='PASS';
}catch(error){out.textContent=String(error.stack||error);document.body.dataset.status='FAIL'}},{once:true});
})();</script></body></html>`;

writeFileSync(path,harness,'utf8');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
const server=createServer((request,response)=>{try{const url=new URL(request.url,'http://127.0.0.1');const raw=url.pathname==='/'?'index.html':url.pathname.replace(/^\//,'');const file=normalize(resolve(root,raw));if(file!==root&&!file.startsWith(root+sep))throw Error('Path outside root');response.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});response.end(readFileSync(file));}catch{if(!response.headersSent)response.writeHead(404,{'content-type':'text/plain; charset=utf-8'});if(!response.writableEnded)response.end('Not found')}});
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
if(!chrome)throw Error('Chrome missing');
await new Promise((resolveListen,rejectListen)=>{server.once('error',rejectListen);server.listen(0,'127.0.0.1',resolveListen)});
try{
 const port=server.address().port;
 const output=await new Promise((resolveRun,rejectRun)=>{const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',`--user-data-dir=${profile}`,'--virtual-time-budget=160000','--dump-dom',`http://127.0.0.1:${port}/${name}`],{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.once('error',rejectRun);child.once('close',code=>code?rejectRun(Error(stderr)):resolveRun(stdout))});
 const match=output.match(/<pre id="result">([\s\S]*?)<\/pre>/);const decoded=(match?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
 if(!output.includes('data-status="PASS"')||!output.includes(marker))throw Error(decoded||output.slice(-12000));
 console.log(decoded);
}finally{await new Promise(resolveClose=>server.close(resolveClose));if(existsSync(path))unlinkSync(path);rmSync(profile,{recursive:true,force:true})}

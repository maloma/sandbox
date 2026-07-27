import{cpSync,existsSync,mkdtempSync,readFileSync,rmSync,writeFileSync}from'node:fs';
import{tmpdir}from'node:os';
import{join,resolve,sep}from'node:path';
import{spawn}from'node:child_process';

const publicUrl=process.env.PUBLIC_URL||'https://maloma.github.io/sandbox/';
const expectedRuntime=process.env.EXPECTED_RUNTIME_PF08A_WAVE1D||'';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const root=process.cwd();
const publicPaths=[
  'index.html',
  'familypilot-module-registry.js',
  'familypilot-module-registry-retry-correction.js',
  'familypilot-module-registry-ui.js',
  'familypilot-module-entry-bridge.js',
  'familypilot-persistence-runtime.js',
  'familypilot-wallet-management.js',
];
const smokes=[
  ['tools/pf08a-wave1d-module-registry-domain-smoke.mjs','PF08A_WAVE1D_MODULE_REGISTRY_DOMAIN_PASS'],
  ['tools/pf08a-wave1d-integrated-browser-smoke.mjs','PF08A_WAVE1D_INTEGRATED_PASS'],
  ['tools/pf08a-wave1d-visible-degraded-browser-smoke.mjs','PF08A_WAVE1D_VISIBLE_DEGRADED_PASS'],
];
function run(script,cwd,marker,timeout=480000){return new Promise((resolveRun,rejectRun)=>{const child=spawn(process.execPath,[script],{cwd,stdio:['ignore','pipe','pipe']});let out='',err='';const timer=setTimeout(()=>{child.kill('SIGKILL');rejectRun(Error('Smoke timed out '+marker+'\n'+err.slice(-12000)))},timeout);child.stdout.on('data',x=>out+=x);child.stderr.on('data',x=>err+=x);child.once('error',rejectRun);child.once('close',code=>{clearTimeout(timer);if(code)rejectRun(Error(err.slice(-20000)+'\n'+out.slice(-20000)));else if(!out.includes(marker))rejectRun(Error('Marker missing '+marker+'\n'+out.slice(-12000)));else resolveRun(out)})})}
async function fetchPublished(){let last={};for(let attempt=1;attempt<=60;attempt++){
  const token=`${expectedRuntime||'runtime'}-${attempt}-${Date.now()}`;
  try{
    const responses=await Promise.all(publicPaths.map(path=>fetch(new URL(`${path}?v=${encodeURIComponent(token)}`,publicUrl),{cache:'no-store',redirect:'follow'})));
    const bodies=await Promise.all(responses.map(response=>response.text()));
    const mismatches=[];
    for(let index=0;index<publicPaths.length;index++){
      const path=publicPaths[index],local=readFileSync(resolve(root,path),'utf8');
      if(responses[index].status!==200||bodies[index]!==local)mismatches.push({path,status:responses[index].status,publishedLength:bodies[index].length,localLength:local.length});
    }
    last={mismatches};
    if(mismatches.length===0)return{attempt,bodies};
  }catch(error){last={error:String(error)}}
  await sleep(5000);
}throw Error('Published Wave 1D package did not match exact runtime files: '+JSON.stringify(last))}
const published=await fetchPublished();
const directory=mkdtempSync(join(tmpdir(),'pf08a-wave1d-public-'));
try{
  cpSync(root,directory,{recursive:true,filter:source=>!source.split(sep).includes('.git')});
  for(let index=0;index<publicPaths.length;index++)writeFileSync(join(directory,publicPaths[index]),published.bodies[index],'utf8');
  const outputs=[];
  for(const[script,marker]of smokes){const target=resolve(directory,script);if(!existsSync(target))throw Error('Smoke missing '+script);outputs.push(await run(target,directory,marker))}
  console.log(JSON.stringify({status:'PASS',marker:'PF08A_WAVE1D_PUBLIC_PASS',public_url:publicUrl,expected_runtime_main:expectedRuntime,publication_attempts:published.attempt,exact_public_paths:publicPaths,registry_domain:true,normal_integrated_load:true,visible_degraded_mode:true,safe_recovery:true,financial_isolation:true,persistence_priority:true,persistence_recovery:true,single_savings_truth:true,visible_module_failure_surface:true,readiness_verdict:'NOT_READY',runtime_exceptions:[]},null,2));
  for(const output of outputs)console.log(output.trim());
  console.log('PF08A_WAVE1D_PUBLIC_PASS');
}finally{rmSync(directory,{recursive:true,force:true})}

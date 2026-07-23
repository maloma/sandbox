import { readFileSync, writeFileSync } from 'node:fs';

const sourceFile='src/familypilot.html';
const publishedFile='index.html';
const scopeFile='familypilot-scope.js';
const domainFile='familypilot-wallet-transfers.js';
const uiFile='familypilot-wallet-transfers-ui.js';
let source=readFileSync(sourceFile,'utf8');
const published=readFileSync(publishedFile,'utf8');
const scope=readFileSync(scopeFile,'utf8');
const domain=readFileSync(domainFile,'utf8');
const ui=readFileSync(uiFile,'utf8');

if(source!==published)throw new Error('Published and source runtime artifacts differ before WF-02 generation');

const bridgeStart='/* pf08a-wf02-runtime-bridge:start */';
const bridgeEnd='/* pf08a-wf02-runtime-bridge:end */';
const bridge=`${bridgeStart}
const wf02RuntimeState=new Proxy({}, {
  get:(_,property)=>state[property],
  set:(_,property,value)=>(state[property]=value,true)
});
window.__FP_RUNTIME__=Object.freeze({
  version:'base-currency-wallet-transfers-v1',
  state:wf02RuntimeState,
  members:MEMBERS,
  scopeApi,
  $,esc,isoLocal,open,close,money,formatDateTime,save,showScreen,toast,ensureAccessibleActiveWallet,now,
  renderAll:()=>renderAll(),
  getOperationRow:()=>operationRow,
  setOperationRow:next=>{if(typeof next!=='function')throw new TypeError('operationRow extension must be a function');operationRow=next},
  getOpenDetail:()=>openDetail,
  setOpenDetail:next=>{if(typeof next!=='function')throw new TypeError('openDetail extension must be a function');openDetail=next},
  getAnalyticsPeriodOperations:()=>analyticsPeriodOperations,
  setAnalyticsPeriodOperations:next=>{if(typeof next!=='function')throw new TypeError('analyticsPeriodOperations extension must be a function');analyticsPeriodOperations=next},
  getRenderAll:()=>renderAll,
  setRenderAll:next=>{if(typeof next!=='function')throw new TypeError('renderAll extension must be a function');renderAll=next}
});
${bridgeEnd}`;
const anchor='/* pf08a-wf01-inline-ui:end */\n\nsyncCategoryVisualViewport();';
if(!source.includes(bridgeStart)){
  if(source.split(anchor).length!==2)throw new Error('WF-02 runtime bridge anchor is not unique');
  source=source.replace(anchor,`/* pf08a-wf01-inline-ui:end */\n\n${bridge}\n\nsyncCategoryVisualViewport();`);
}
if(source.split(bridgeStart).length!==2||source.split(bridgeEnd).length!==2)throw new Error('WF-02 runtime bridge markers are not unique');
writeFileSync(sourceFile,source);
writeFileSync(publishedFile,source);

if(!source.includes('familypilot-scope.js'))throw new Error('FamilyPilot scope bootstrap anchor is missing');
for(const required of ['__FP_WF02_BOOTSTRAP__','base-currency-wallet-transfers-v1','familypilot-wallet-transfers.js','familypilot-wallet-transfers-ui.js','DOMContentLoaded']){
  if(!scope.includes(required))throw new Error(`WF-02 external bootstrap marker missing: ${required}`);
}
if(!domain.includes("TRANSFER_KIND='transfer'"))throw new Error('WF-02 domain module is invalid');
for(const required of ['const runtime=window.__FP_RUNTIME__','runtime.setOperationRow','runtime.setOpenDetail','runtime.setAnalyticsPeriodOperations','runtime.setRenderAll']){
  if(!ui.includes(required))throw new Error(`WF-02 runtime extension contract missing: ${required}`);
}

console.log(JSON.stringify({
  status:'PASS',
  sourceFile,
  publishedFile,
  sourcePublishedIdentical:true,
  runtimeMode:'external-ui-through-bounded-runtime-bridge',
  generatedRuntimeFiles:2,
  packageMarkerMountedAtRuntime:true,
  runtimeBridge:true,
  domainFile,
  uiFile,
  bytes:Buffer.byteLength(source)
},null,2));

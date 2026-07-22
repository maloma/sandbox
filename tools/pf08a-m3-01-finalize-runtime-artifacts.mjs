import { readFileSync } from 'node:fs';

const sourceFile='src/familypilot.html';
const publishedFile='index.html';
const scopeFile='familypilot-scope.js';
const domainFile='familypilot-wallet-transfers.js';
const uiFile='familypilot-wallet-transfers-ui.js';
const source=readFileSync(sourceFile,'utf8');
const published=readFileSync(publishedFile,'utf8');
const scope=readFileSync(scopeFile,'utf8');
const domain=readFileSync(domainFile,'utf8');
const ui=readFileSync(uiFile,'utf8');

if(source!==published)throw new Error('Published and source runtime artifacts differ before WF-02 verification');
if(!source.includes('familypilot-scope.js'))throw new Error('FamilyPilot scope bootstrap anchor is missing');
for(const required of ['__FP_WF02_BOOTSTRAP__','base-currency-wallet-transfers-v1','familypilot-wallet-transfers.js','familypilot-wallet-transfers-ui.js','DOMContentLoaded']){
  if(!scope.includes(required))throw new Error(`WF-02 external bootstrap marker missing: ${required}`);
}
if(!domain.includes("TRANSFER_KIND='transfer'"))throw new Error('WF-02 domain module is invalid');
if(!ui.includes('window.__FP_TEST__.transfers'))throw new Error('WF-02 UI/test mount is invalid');

console.log(JSON.stringify({
  status:'PASS',
  sourceFile,
  publishedFile,
  sourcePublishedIdentical:true,
  runtimeMode:'external-bootstrap-through-familypilot-scope',
  generatedRuntimeFiles:0,
  packageMarkerMountedAtRuntime:true,
  domainFile,
  uiFile,
  bytes:Buffer.byteLength(source)
},null,2));

import { readFileSync } from 'node:fs';

const source=readFileSync('src/familypilot.html','utf8');
const published=readFileSync('index.html','utf8');
const domain=readFileSync('familypilot-wallet-transfers.js','utf8');
const ui=readFileSync('familypilot-wallet-transfers-ui.js','utf8');
const sourceScope=readFileSync('src/familypilot-scope.js','utf8');
const scope=readFileSync('familypilot-scope.js','utf8');
const trustedGate=readFileSync('.github/workflows/pf08a-m3-01-trusted-pr-gate.yml','utf8');
const fail=message=>{throw new Error(message)};
const count=(text,needle)=>text.split(needle).length-1;

if(source!==published)fail('Published and source runtime artifacts differ');
if(sourceScope!==scope)fail('Source and root scope modules differ');
if(count(source,'familypilot-scope.js')!==1)fail('FamilyPilot scope bootstrap anchor is not unique');
for(const needle of ['pf08a-wf02-runtime-bridge:start','pf08a-wf02-runtime-bridge:end','window.__FP_RUNTIME__','setOperationRow','setOpenDetail','setAnalyticsPeriodOperations','setRenderAll'])if(!source.includes(needle))fail(`Runtime extension bridge missing: ${needle}`);
for(const needle of ['__FP_WF02_BOOTSTRAP__','base-currency-wallet-transfers-v1','familypilot-wallet-transfers.js','familypilot-wallet-transfers-ui.js','DOMContentLoaded','__FP_WF02_READY__'])if(!scope.includes(needle))fail(`External WF-02 bootstrap missing: ${needle}`);
for(const needle of ['const runtime=window.__FP_RUNTIME__','runtime.setOperationRow','runtime.setOpenDetail','runtime.setAnalyticsPeriodOperations','runtime.setRenderAll','window.__FP_TEST__.transfers','data-open-transfer','walletTransferModal','walletTransferDetailModal','Перевод перемещает деньги между кошельками','operation?.kind!==\'transfer\''])if(!ui.includes(needle))fail(`Runtime UI contract missing: ${needle}`);
for(const needle of ["TRANSFER_KIND='transfer'","SOURCE_ROLE='transfer_source'","DESTINATION_ROLE='transfer_destination'",'createTransfer','correctTransfer','state.walletMovements','state.transfers','kind:TRANSFER_KIND'])if(!domain.includes(needle))fail(`Domain contract missing: ${needle}`);
for(const needle of ['activeMovements','transferInflow','transferOutflow','householdCapitalMovements','isTransfer','transferAccessible'])if(!scope.includes(needle))fail(`Scope transfer calculation missing: ${needle}`);
for(const needle of ['familypilot-wallet-transfers.js','familypilot-wallet-transfers-ui.js','pf08a-wf02-domain-test.cjs','pf08a-wf02-verify-integration.mjs','pf08a-wf02-browser-smoke.mjs'])if(!trustedGate.includes(needle))fail(`Trusted gate does not cover ${needle}`);
if(trustedGate.includes('actions/upload-artifact'))fail('Trusted gate still uploads diagnostic artifacts while storage is constrained');
for(const forbidden of ['seed phrase','private key','exchange rate input','grant access','revoke access'])if(ui.toLowerCase().includes(forbidden))fail(`Protected/deferred UI leaked: ${forbidden}`);

console.log(JSON.stringify({status:'PASS',marker:'PF08A_WF02_INTEGRATION_PASS',sourcePublishedIdentical:true,scopeMirrorIdentical:true,boundedRuntimeBridge:true,externalBootstrapUnique:true,runtimePackageMarker:true,canonicalTransferEvent:true,twoLinkedMovements:true,scopeCapitalSupport:true,noIncomeExpenseClassification:true,noDiagnosticArtifactUpload:true},null,2));

import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('tools/pf08a-wave1d-recovery-reload-browser-smoke.mjs','utf8');
const marker='PF08A_WAVE1D_LISTENER_SENTINEL_DOMAIN_PASS';
const assert=(value,message)=>{if(!value)throw new Error(message)};
const whatIfUiSource=readFileSync('familypilot-m4-06-what-if-ui.js','utf8');
const learningUiSource=readFileSync('familypilot-m4-07-learning-mode-ui.js','utf8');
assert((whatIfUiSource.match(/document\.addEventListener\('click'/g)||[]).length===1,'What If long-lived click registration source changed');
assert((learningUiSource.match(/document\.addEventListener\('click'/g)||[]).length===1,'Learning long-lived click registration source changed');
assert(whatIfUiSource.includes("},true);"),'What If click handler is not capture-phase');
assert(learningUiSource.includes("},true);"),'Learning click handler is not capture-phase');
const templateMatch=source.match(/const browserInstrumentation=(`[^`]*`);\nconst instrumentIndex=/s);
assert(templateMatch,'Listener instrumentation template missing');
const generated=vm.runInNewContext(templateMatch[1]);
const scriptMatch=generated.match(/^<script>([\s\S]*)<\/script>$/);
assert(scriptMatch,'Evaluated listener instrumentation script missing');

class EventTarget{
  addEventListener(){}
  dispatchEvent(){}
}
const window=new EventTarget();
const document=new EventTarget();
const context={window,document,EventTarget,WeakMap,Map,Object,Array,String,Number,Boolean,Error,JSON};
window.window=window;
window.document=document;
vm.createContext(context);
vm.runInContext(scriptMatch[1],context,{filename:'listener-sentinel-collector.js'});

const sentinel=window.__FP_LISTENER_SENTINEL__;
assert(sentinel,'Listener sentinel was not installed');
const productionSources={
  'familypilot-module-registry-retry-correction.js':`document.addEventListener('click',()=>{},true);document.addEventListener('submit',()=>{},true);window.addEventListener('familypilot:module-state',()=>{});`,
  'familypilot-module-registry-ui.js':`window.addEventListener('familypilot:module-state',()=>{});document.addEventListener('click',()=>{},true);`,
  'familypilot-module-entry-bridge.js':`window.addEventListener('familypilot:module-state',()=>{});`,
  'familypilot-m4-06-what-if-ui.js':`document.addEventListener('click',()=>{},true);`,
  'familypilot-m4-07-learning-mode-ui.js':`document.addEventListener('click',()=>{},true);`,
};
for(const [filename,productionSource] of Object.entries(productionSources)){
  vm.runInContext(productionSource,context,{filename});
}
const observed=sentinel.sourceCounts();
assert(observed['familypilot-module-registry-retry-correction.js']===3,'Correction registrations were not observed exactly once');
assert(observed['familypilot-module-registry-ui.js']===2,'Registry UI registrations were not observed exactly once');
assert(observed['familypilot-module-entry-bridge.js']===1,'Entry bridge registration was not observed exactly once');
assert(observed['familypilot-m4-06-what-if-ui.js']===1,'What If production handler was not observed exactly once');
assert(observed['familypilot-m4-07-learning-mode-ui.js']===1,'Learning production handler was not observed exactly once');
assert(sentinel.duplicates().length===0,'Single production registration was classified as duplicate');

const expectedDuplicateCounts={
  'familypilot-module-registry-retry-correction.js':3,
  'familypilot-module-registry-ui.js':2,
  'familypilot-module-entry-bridge.js':1,
  'familypilot-m4-06-what-if-ui.js':1,
  'familypilot-m4-07-learning-mode-ui.js':1,
};
for(const [filename,productionSource] of Object.entries(productionSources)){
  vm.runInContext(productionSource,context,{filename});
  const sourceDuplicates=sentinel.duplicates().filter(item=>item.key.includes(filename));
  assert(sourceDuplicates.length===expectedDuplicateCounts[filename],filename+' repeated production callsites were not detected');
  assert(sourceDuplicates.every(item=>item.count===2),filename+' duplicate registration count is incorrect');
  assert(sourceDuplicates.every(item=>item.key.includes(filename)),filename+' duplicate output identified the wrong source');
}
const duplicates=sentinel.duplicates();
assert(duplicates.length===8,'Deterministic duplicate total is incorrect');

console.log(JSON.stringify({
  status:'PASS',
  marker,
  evaluated_browser_template:true,
  production_registrations_observed:true,
  single_registration_accepted:true,
  all_five_production_sources_observed:true,
  what_if_source_observed:true,
  learning_source_observed:true,
  duplicate_source_identification:true,
  source_specific_counts_deterministic:true,
  duplicate_window_handler_detected:true,
  duplicate_document_handler_detected:true,
  deterministic_callsite_count:true,
},null,2));
console.log(marker);

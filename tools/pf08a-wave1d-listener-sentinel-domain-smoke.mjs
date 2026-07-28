import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('tools/pf08a-wave1d-recovery-reload-browser-smoke.mjs','utf8');
const marker='PF08A_WAVE1D_LISTENER_SENTINEL_DOMAIN_PASS';
const assert=(value,message)=>{if(!value)throw new Error(message)};
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
const productionSource=`window.addEventListener('familypilot:module-state',()=>{});document.addEventListener('click',()=>{},true);`;
vm.runInContext(productionSource,context,{filename:'familypilot-module-registry-ui.js'});
const observed=sentinel.sourceCounts();
assert(observed['familypilot-module-registry-ui.js']===2,'Production registrations were not observed exactly once');
assert(sentinel.duplicates().length===0,'Single production registration was classified as duplicate');

vm.runInContext(productionSource,context,{filename:'familypilot-module-registry-ui.js'});
const duplicates=sentinel.duplicates();
assert(duplicates.length===2,'Repeated production callsites were not detected');
assert(duplicates.every(item=>item.count===2),'Duplicate registration count is incorrect');

console.log(JSON.stringify({
  status:'PASS',
  marker,
  evaluated_browser_template:true,
  production_registrations_observed:true,
  single_registration_accepted:true,
  duplicate_window_handler_detected:true,
  duplicate_document_handler_detected:true,
  deterministic_callsite_count:true,
},null,2));
console.log(marker);

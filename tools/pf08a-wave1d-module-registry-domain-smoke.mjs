import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('familypilot-module-registry.js','utf8');
const marker='PF08A_WAVE1D_MODULE_REGISTRY_DOMAIN_PASS';
const assert=(value,message)=>{if(!value)throw new Error(message)};

function createContext(search='?test=1'){
  const listeners=new Map();
  const selectorCounts=new Map([
    ['#homeScreen',1],
    ['#operationsScreen',1],
    ['#analyticsScreen',1],
  ]);
  const head={
    __fpRegistryAppendInstalled:false,
    appendChild(node){return node},
  };
  const document={
    head,
    addEventListener(){},
    getElementById(id){return selectorCounts.get(`#${id}`)===1?{id}:null},
    querySelectorAll(selector){return Array.from({length:selectorCounts.get(selector)||0},()=>({selector}))},
  };
  function Event(type){this.type=type}
  function CustomEvent(type,init={}){this.type=type;this.detail=init.detail}
  const context={
    console,
    URL,
    URLSearchParams,
    Math,
    Date,
    JSON,
    Map,
    Set,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Error,
    Event,
    CustomEvent,
    document,
    location:{search,href:`https://example.test/${search}`,reload(){}},
    history:{replaceState(){}},
    setInterval(){return 1},
    clearInterval(){},
    setTimeout(){return 1},
    queueMicrotask(fn){fn()},
    dispatchEvent(event){for(const fn of listeners.get(event.type)||[])fn(event);return true},
    addEventListener(type,fn){const list=listeners.get(type)||[];list.push(fn);listeners.set(type,list)},
    __FP_RUNTIME__:{state:{operations:[],wallets:[{id:'w1'}],savingsGoals:[],purposeAllocations:[]}},
    __selectorCounts:selectorCounts,
  };
  context.window=context;
  context.globalThis=context;
  vm.runInNewContext(source,context,{filename:'familypilot-module-registry.js'});
  return context;
}

const testContext=createContext('?test=1');
const registry=testContext.FamilyPilotModuleRegistry;
assert(registry,'Registry API missing');
assert(testContext.__FP_MODULE_REGISTRY_READY__===true,'Ready marker missing');
const initial=registry.snapshot();
assert(initial.catalogue.length===11,'Unexpected catalogue size');
assert(new Set(initial.catalogue.map(item=>item.moduleId)).size===11,'Duplicate module records');
assert(initial.catalogue.every(item=>item.ownershipContract&&Array.isArray(item.ownershipContract.packageMarkers)),'Ownership contract missing');
assert(initial.events.length<=50,'Initial event history exceeded bound');
assert(registry.moduleForPath('/familypilot-m4-06-what-if.js')==='what_if','Path mapping failed');
assert(registry.moduleForPath('/familypilot-persistence-runtime.js')==='persistence','Persistence path mapping failed');
assert(registry.get('base_finance').state==='ready','Base ownership contract did not pass');

const fingerprint=registry.financialFingerprint();
registry.markDegraded('what_if',{reasonCode:'script_unavailable',failureStage:'script_load',retryClass:'script_only'});
registry.reconcile();
const root=registry.get('what_if'),dependent=registry.get('learning');
assert(root.state==='degraded','Root module did not degrade');
assert(dependent.state==='degraded','Dependent module did not degrade');
assert(dependent.rootDiagnosticId===root.rootDiagnosticId,'Root diagnostic was not propagated');
assert(dependent.blockedByModuleId==='what_if','Direct dependency was not recorded');
assert(registry.financialFingerprint()===fingerprint,'Registry changed financial state');

const firstAttempt=registry.beginLoad('what_if');
const secondAttempt=registry.beginLoad('what_if');
assert(firstAttempt&&firstAttempt===secondAttempt,'Repeated beginLoad did not collapse');

for(let index=0;index<70;index+=1){
  registry.markDegraded('what_if',{reasonCode:'script_unavailable',failureStage:'script_load',retryClass:'script_only',diagnosticId:`FP-MOD-${String(index).padStart(4,'0')}`});
  registry.beginLoad('what_if');
}
assert(registry.snapshot().events.length<=50,'Safe event history is not bounded');
assert(registry.test&&typeof registry.test.setFailure==='function','Test API missing in test mode');
assert(registry.test.setFailure('what_if','readiness_timeout')===true,'Test failure injection rejected valid module');
assert(registry.test.currentInjection().stage==='readiness_timeout','Test injection was not stored');
registry.test.clearFailure();
assert(registry.test.currentInjection()===null,'Test injection did not clear');

const ordinaryContext=createContext('?moduleFailure=what_if&moduleFailureStage=script_load');
assert(!ordinaryContext.FamilyPilotModuleRegistry.test,'Test API leaked to ordinary route');
assert(ordinaryContext.FamilyPilotModuleRegistry.get('what_if').state!=='degraded','Ordinary route activated test injection');
const zeroContext=createContext('?test=0&moduleFailure=what_if&moduleFailureStage=script_load');
assert(!zeroContext.FamilyPilotModuleRegistry.test,'test=0 enabled test API');
assert(zeroContext.FamilyPilotModuleRegistry.get('what_if').state!=='degraded','test=0 activated failure injection');
const emptyContext=createContext('?test=&moduleFailure=what_if&moduleFailureStage=script_load');
assert(!emptyContext.FamilyPilotModuleRegistry.test,'empty test value enabled test API');
assert(emptyContext.FamilyPilotModuleRegistry.get('what_if').state!=='degraded','empty test value activated failure injection');

const probeContract={
  navigationSelectors:['[data-probe-entry]'],
  screenSelectors:['#probeScreen'],
  packageMarkers:['global:__PROBE_READY__'],
  listenerSentinel:null,
};
testContext.__PROBE_READY__=true;
testContext.__selectorCounts.set('[data-probe-entry]',2);
testContext.__selectorCounts.set('#probeScreen',1);
registry.register({
  moduleId:'contract_probe', userName:'Contract probe', criticality:'supporting',
  containmentLevel:'module_degraded', retryClass:'reload_required', dependencies:[], routes:[], unaffectedRoutes:[],
  ownershipContract:probeContract,
});
registry.beginLoad('contract_probe');
const rejected=registry.markReady('contract_probe');
assert(rejected.state==='degraded','Ownership collision did not reject ready');
assert(rejected.failureStage==='contract_validation','Ownership collision used wrong failure stage');
assert(rejected.reasonCode==='module_contract_failed','Ownership collision used wrong reason code');
testContext.__selectorCounts.set('[data-probe-entry]',1);
registry.beginLoad('contract_probe');
const accepted=registry.markReady('contract_probe');
assert(accepted.state==='ready','Valid ownership contract did not reach ready');

console.log(JSON.stringify({
  status:'PASS',
  marker,
  catalogue_single_authority:true,
  one_active_attempt:true,
  root_cause_propagation:true,
  financial_isolation:true,
  bounded_safe_events:true,
  injection_isolated:true,
  exact_test_mode:true,
  ownership_contract_enforced:true,
},null,2));
console.log(marker);

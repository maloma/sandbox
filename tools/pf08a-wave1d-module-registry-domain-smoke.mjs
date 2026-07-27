import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('familypilot-module-registry.js','utf8');
const marker='PF08A_WAVE1D_MODULE_REGISTRY_DOMAIN_PASS';
const assert=(value,message)=>{if(!value)throw new Error(message)};

function createContext(search='?test=1'){
  const listeners=new Map();
  const head={
    __fpRegistryAppendInstalled:false,
    appendChild(node){return node},
  };
  const document={
    head,
    addEventListener(){},
    getElementById(){return null},
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
assert(initial.events.length<=50,'Initial event history exceeded bound');
assert(registry.moduleForPath('/familypilot-m4-06-what-if.js')==='what_if','Path mapping failed');
assert(registry.moduleForPath('/familypilot-persistence-runtime.js')==='persistence','Persistence path mapping failed');

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

console.log(JSON.stringify({
  status:'PASS',
  marker,
  catalogue_single_authority:true,
  one_active_attempt:true,
  root_cause_propagation:true,
  financial_isolation:true,
  bounded_safe_events:true,
  injection_isolated:true,
},null,2));
console.log(marker);

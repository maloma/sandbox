import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('familypilot-module-registry.js','utf8');
const correctionSource=readFileSync('familypilot-module-registry-retry-correction.js','utf8');
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

function createBarrierContext(){
  const documentListeners=new Map();
  const windowListeners=new Map();
  const bodyClasses=new Set();
  let moduleState='degraded';

  function control({id,readOnly=false,disabled=false}){
    const attributes=new Map();
    return {
      id,tagName:'BUTTON',type:'button',disabled,dataset:{},
      getAttribute(name){return attributes.has(name)?attributes.get(name):null},
      setAttribute(name,value){attributes.set(name,String(value))},
      removeAttribute(name){attributes.delete(name)},
      closest(selector){
        if(selector==='#actionDock')return null;
        if(readOnly&&selector.includes('.nav'))return this;
        if(selector.startsWith('button,input,select,textarea'))return this;
        return null;
      },
    };
  }

  const mutationControl=control({id:'mutationOutsideDock'});
  const readOnlyNavigation=control({id:'readOnlyNavigation',readOnly:true});
  const preDisabledControl=control({id:'preDisabledControl',disabled:true});
  const controls=[mutationControl,readOnlyNavigation,preDisabledControl];
  const snapshot=()=>({catalogue:[{
    moduleId:'base_finance',state:moduleState,containmentLevel:'application_shell_degraded',
    retryClass:'reload_required',blockedByModuleId:null,lastRetryAt:null,attempt:1,
  }]});
  const registry={snapshot,moduleForPath(){return null},markDegraded(){throw new Error('Unexpected terminal restoration')}};
  const document={
    documentElement:{},
    body:{classList:{toggle(name,active){active?bodyClasses.add(name):bodyClasses.delete(name)}}},
    addEventListener(type,fn){const list=documentListeners.get(type)||[];list.push(fn);documentListeners.set(type,list)},
    querySelectorAll(selector){
      if(selector==='button,input,select,textarea')return controls;
      if(selector==='[data-fp-shell-mutation-blocked="true"]')return controls.filter(item=>item.dataset.fpShellMutationBlocked==='true');
      return [];
    },
    querySelector(selector){
      if(selector==='#readOnlyNavigation')return readOnlyNavigation;
      if(selector==='#mutationOutsideDock')return mutationControl;
      return null;
    },
  };
  class MutationObserver{constructor(fn){this.fn=fn}observe(){}}
  const context={
    console,URLSearchParams,Map,WeakMap,Number,String,Boolean,Array,Object,JSON,
    location:{search:'?test=1'},document,MutationObserver,FamilyPilotModuleRegistry:registry,
    addEventListener(type,fn){const list=windowListeners.get(type)||[];list.push(fn);windowListeners.set(type,list)},
    dispatchEvent(event){for(const fn of windowListeners.get(event.type)||[])fn(event);return true},
    __setModuleState(value){moduleState=value},
    __documentListeners:documentListeners,
    __bodyClasses:bodyClasses,
    __mutationControl:mutationControl,
    __readOnlyNavigation:readOnlyNavigation,
    __preDisabledControl:preDisabledControl,
    __snapshot:snapshot,
  };
  context.window=context;
  context.globalThis=context;
  vm.runInNewContext(correctionSource,context,{filename:'familypilot-module-registry-retry-correction.js'});
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

const barrierContext=createBarrierContext();
const barrier=barrierContext.__FP_TEST__?.moduleRegistryCorrection;
assert(barrier,'Shell mutation barrier test API missing');
assert(barrier.shellDegraded()===true,'Shell degradation was not detected');
assert(barrierContext.__bodyClasses.has('fp-shell-mutation-barrier'),'Shell mutation body marker missing');
assert(barrierContext.__mutationControl.closest('#actionDock')===null,'Mutation probe is not outside action dock');
assert(barrierContext.__mutationControl.disabled===true,'Outside-dock mutation control was not disabled');
assert(barrierContext.__mutationControl.dataset.fpShellMutationBlocked==='true','Outside-dock mutation marker missing');
assert(barrierContext.__readOnlyNavigation.disabled===false,'Read-only navigation was disabled');
assert(barrier.readOnlyControl('#readOnlyNavigation')===true,'Read-only navigation was not classified');
assert(barrier.blockedControls().some(item=>item.id==='mutationOutsideDock'),'Blocked-control report omitted outside-dock mutation');
const blockedBefore=barrier.blockedCount();
const mutationEvent={target:barrierContext.__mutationControl,prevented:false,stopped:false,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true}};
barrierContext.__documentListeners.get('click')[0](mutationEvent);
assert(mutationEvent.prevented&&mutationEvent.stopped,'Mutation event was not intercepted');
assert(barrier.blockedCount()===blockedBefore+1,'Mutation block counter did not increment');
const navigationEvent={target:barrierContext.__readOnlyNavigation,prevented:false,stopped:false,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true}};
barrierContext.__documentListeners.get('click')[0](navigationEvent);
assert(!navigationEvent.prevented&&!navigationEvent.stopped,'Read-only navigation was intercepted');
barrierContext.__setModuleState('ready');
barrierContext.dispatchEvent({type:'familypilot:module-state',detail:barrierContext.__snapshot()});
assert(barrier.shellDegraded()===false,'Shell mutation barrier did not recover');
assert(barrierContext.__mutationControl.disabled===false,'Mutation control was not restored after recovery');
assert(!('fpShellMutationBlocked' in barrierContext.__mutationControl.dataset),'Mutation marker remained after recovery');
assert(barrierContext.__preDisabledControl.disabled===true,'Pre-disabled state was not preserved');
assert(barrierContext.__readOnlyNavigation.disabled===false,'Read-only navigation changed after recovery');

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
  shell_mutation_barrier:true,
  outside_action_dock_disabled:true,
  mutation_intercepted:true,
  read_only_navigation_preserved:true,
  recovery_restored_controls:true,
},null,2));
console.log(marker);

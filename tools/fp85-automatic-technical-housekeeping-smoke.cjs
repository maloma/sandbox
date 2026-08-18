const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.join(__dirname,'..');
const scopeSource=fs.readFileSync(path.join(root,'familypilot-scope.js'),'utf8');
const runtimeSource=fs.readFileSync(path.join(root,'familypilot-persistence-runtime.js'),'utf8');

class StorageMock{
  constructor(){this.data=new Map();}
  getItem(key){key=String(key);return this.data.has(key)?this.data.get(key):null;}
  setItem(key,value){this.data.set(String(key),String(value));}
  removeItem(key){this.data.delete(String(key));}
  clear(){this.data.clear();}
  key(index){return[...this.data.keys()][index]||null;}
  get length(){return this.data.size;}
}

function createDocument(){
  const nodesById=new Map();
  const allNodes=new Set();
  const scripts=[];
  const makeNode=(tagName='div')=>{
    const node={tagName:tagName.toLowerCase(),children:[],dataset:{},style:{},_innerHTML:'',_textContent:'',className:'',id:''};
    allNodes.add(node);
    node.appendChild=(child)=>{
      if(!child)return;
      node.children.push(child);
      if(child.id)nodesById.set(child.id,child);
      if(tagName==='head'&&child.tagName==='script')scripts.push(child);
    };
    node.setAttribute=(name,value)=>{if(name==='id'){node.id=String(value);nodesById.set(node.id,node)};node[name]=String(value);};
    node.addEventListener=()=>{};
    node.querySelector=(selector)=>{
      const [nodeSelector,nodeContentSelector]=selector.split('[content=');
      const nameMatch=nodeSelector.match(/^meta\[name="([^"]+)"\]$/);
      if(nameMatch&&node.tagName==='head'){
        return node.children.find(child=>(
          child.tagName==='meta'&&child.name===nameMatch[1]&&(
            !nodeContentSelector||`${nodeContentSelector}`.replace(/"]$/,'')===child.content
          )
        ))||null;
      }
      return null;
    };
    node.querySelectorAll=()=>[];
    Object.defineProperty(node,'innerHTML',{get:()=>node._innerHTML,set:(value)=>{node._innerHTML=String(value);}});
    Object.defineProperty(node,'textContent',{get:()=>node._textContent,set:(value)=>{node._textContent=String(value);}});
    return node;
  };
  const head=makeNode('head');
  const body=makeNode('body');
  return{
    _nodes:allNodes,
    head,
    body,
    createElement:(tagName)=>makeNode(tagName),
    getElementById:(id)=>nodesById.get(id)||null,
    querySelector:()=>null,
    querySelectorAll:()=>[],
    scripts,
    addEventListener:()=>{},
    readyState:'complete',
    _registry:nodesById,
  };
}

function buildContext({missingModule,dependencyFailureMode,locked,finalizeFailure,saveMode='success',cleanupMode='success'}){
  const storage=new StorageMock();
  const events=new Map();
  const calls={setInterval:0,fetch:0,webSocket:0,save:0,cleanup:0,dom:0};
  const addEventListener=(type,handler)=>{events.set(type,events.get(type)||[]).push(handler);};
  const dispatchEvent=(type)=>{for(const handler of events.get(type)||[])handler({type});};
  const nowState={members:[{id:'member-1'}],wallets:[{id:'wallet-household-main',type:'household_default',openingBalance:0,name:'Главный'}]};
  const runtimeState=structuredClone(Object.assign({
    schemaVersion:22,household:{id:'h',baseCurrency:'EUR',openingCapital:0},
    config:{trashRetentionEnabled:true,trashRetentionDays:45,quickCategoryIds:{expense:[],income:[]}},
    currentMemberId:'member-1',activeWalletId:null,members:[],wallets:[],operations:[],transfers:[],walletMovements:[],categories:[],purposeAllocations:[],purposeAllocationEvents:[],
    savingsGoals:[],savingsPlans:[],savingsTransfers:[],obligationRules:[],obligationOccurrences:[],debtChains:[],debtCounterparties:[],debtEvents:[],incomeDistributionRules:[],plannedIncomeRules:[],plannedIncomeOccurrences:[],savingsActionOccurrences:[],whatIfScenarios:[],whatIfInterestSimulations:[],scenarioPlanConversions:[],investmentAccounts:[],investmentLocationAssignments:[],savingsLegacyReconciliationIssues:[],savingsPurposeMigrationResults:[]
  },nowState));

  const now=()=>1700000000000;
  const baseNow=Date.now();
  let nowCalls=0;
  const dateNow=()=>dependencyFailureMode&&nowCalls++>0?baseNow+90001:baseNow;
  class DateNow extends Date{static now(){return dateNow();}}
  const fetchGuard=()=>{calls.fetch++; throw new Error('network call forbidden in this assignment slice');};
  const webSocketGuard=()=>{calls.webSocket++; throw new Error('network call forbidden in this assignment slice');};
  const setIntervalGuard=()=>{calls.setInterval++; throw new Error('setInterval forbidden in this assignment slice');};
  const doc=createDocument();
  const context={
    console,
    localStorage:storage,
    location:{search:'?test=1&persistenceTest=housekeeping-housekeeping'},
    document:doc,
    URLSearchParams,
    TextEncoder,
    window:null,
    globalThis:null,
    console,
    setTimeout:(handler)=>{try{handler();}catch(error){dispatchEvent('error',error);}},
    clearTimeout:()=>{},
    queueMicrotask:globalThis.queueMicrotask,
    addEventListener:()=>{},
    setInterval:setIntervalGuard,
    fetch:fetchGuard,
    WebSocket:webSocketGuard,
    XMLHttpRequest:webSocketGuard,
    Promise,
    Date:DateNow,
  };
  context.window=context;
  context.globalThis=context;
  context.__FP_RUNTIME__={
    state:runtimeState,
    $:(id)=>{calls.dom++;return doc.getElementById?doc.getElementById(id):null;},
    scopeApi:{},
    save:()=>{
      calls.save++;
      if(saveMode==='throw')throw new Error('runtime_save_failed');
      if(saveMode==='promise-reject')return Promise.reject(new Error('runtime_save_rejected'));
      if(saveMode==='promise-resolve')return Promise.resolve({ok:true});
      return {ok:true};
    },
    showScreen:()=>{},
    toast:()=>{},
    esc:(value)=>String(value),
    now,
  };
  context.__FP_M4_05_PACKAGE_LOADED__=true;
  context.__FP_SAVINGS_TRUTH_READY__=true;
  context.FamilyPilotScope={
    migrateState:(state)=>{
      if(!Array.isArray(state.members))state.members=[];
      if(!Array.isArray(state.wallets))state.wallets=[];
      return state;
    },
  };
  context.FamilyPilotObligations={};
  context.FamilyPilotDebts={};
  context.FamilyPilotWalletManagement={};
  context.FamilyPilotSavingsGoals={};
  context.FamilyPilotSavingsAccounts={};
  context.FamilyPilotSavingsTruth={
    normalizeState:()=>{},
    audit:()=>({singleTruth:true}),
  };
  context.FamilyPilotMoneyPlanning={};
  context.FamilyPilotPlannedIncome={};

  vm.createContext(context);
  vm.runInContext(scopeSource,context);
  if(locked){
    context.FamilyPilotPersistence.test.seedMalformedCompatibilityPayload();
    context.FamilyPilotPersistence.test.retryRecovery();
  }
  const wrapCleanup=(original)=>{
    return (...args)=>{
      calls.cleanup++;
      return original(...args);
    };
  };
  const wrapCleanupThrow=(original)=>{
    return (...args)=>{
      calls.cleanup++;
      if(saveMode==='success')throw new Error('housekeeping_failed_by_smoke');
      return original(...args);
    };
  };
  if(cleanupMode==='throw'){
    context.FamilyPilotPersistence={...context.FamilyPilotPersistence,cleanupNonCanonicalArtifacts:wrapCleanupThrow(context.FamilyPilotPersistence.cleanupNonCanonicalArtifacts)};
  }else{
    context.FamilyPilotPersistence={...context.FamilyPilotPersistence,cleanupNonCanonicalArtifacts:wrapCleanup(context.FamilyPilotPersistence.cleanupNonCanonicalArtifacts)};
  }
  if(finalizeFailure){
    context.FamilyPilotPersistence={...context.FamilyPilotPersistence,finalizeBootstrap:()=>({ok:false,error:'forced_finalize_failure'})};
  }
  if(missingModule){
    context.__FP_M4_05_PACKAGE_LOADED__=true;
    delete context.FamilyPilotObligations;
  }
  vm.runInContext(runtimeSource,context);
  dispatchEvent('familypilot:persistence-status');
  return {context,storage,calls};
}

(async()=>{
  const run=(name,options={})=>{
    const {context,calls}=buildContext(options);
    return {name,context,calls};
  };

  const healthy=await run('healthy',{cleanupMode:'success'});
  await Promise.resolve();
  assert(healthy.context.__FP_PERSISTENCE_RUNTIME__===true,'persistence runtime did not install');
  assert(healthy.context.__FP_PERSISTENCE_PACKAGE_LOADED__===true,'persistence package did not load');
  assert.strictEqual(healthy.calls.save,1,'healthy bootstrap must call save exactly once');
  assert.strictEqual(healthy.calls.cleanup,1,'healthy bootstrap must run cleanup exactly once');
  assert.strictEqual(healthy.context.__FP_PERSISTENCE_RUNTIME_ERROR__,undefined,'healthy bootstrap must not set runtime error');

  const locked=await run('recovery_locked',{locked:true});
  await Promise.resolve();
  assert.strictEqual(locked.context.__FP_PERSISTENCE_RUNTIME__===true,true,'recovery-locked bootstrap should still install runtime');
  assert.strictEqual(locked.context.__FP_PERSISTENCE_PACKAGE_LOADED__,true,'recovery-locked package loading should still happen');
  assert.strictEqual(locked.calls.save,0,'recovery-locked bootstrap must not save');
  assert.strictEqual(locked.calls.cleanup,0,'recovery-locked bootstrap must not run cleanup');

  const dependencyFailure=await run('dependency_failure',{missingModule:true,dependencyFailureMode:true});
  await Promise.resolve();
  assert.strictEqual(dependencyFailure.calls.save,0,'dependency failure bootstrap must not call save');
  assert.strictEqual(dependencyFailure.calls.cleanup,0,'dependency failure bootstrap must not run cleanup');

  const finalizeFailure=await run('finalize_failure',{finalizeFailure:true});
  await Promise.resolve();
  assert.strictEqual(finalizeFailure.calls.save,0,'finalization failure should prevent save');
  assert.strictEqual(finalizeFailure.calls.cleanup,0,'finalization failure should prevent cleanup');

  const saveFailure=await run('save_failure',{saveMode:'throw'});
  await Promise.resolve();
  assert.strictEqual(saveFailure.calls.save,1,'save failure path must still invoke save');
  assert.strictEqual(saveFailure.calls.cleanup,0,'save failure must not run cleanup');

  const asyncSaveReject=await run('save_promise_rejection',{saveMode:'promise-reject'});
  await Promise.resolve();
  await Promise.resolve();
  assert.strictEqual(asyncSaveReject.calls.save,1,'save rejection path must invoke save');
  assert.strictEqual(asyncSaveReject.calls.cleanup,0,'promise-based save rejection must not run cleanup');

  const cleanupFailure=await run('cleanup_failure',{cleanupMode:'throw'});
  await Promise.resolve();
  assert.strictEqual(cleanupFailure.calls.save,1,'cleanup failure path must call save');
  assert.strictEqual(cleanupFailure.calls.cleanup,1,'cleanup failure must be contained to one attempt');

  const noHousekeepingUi=await run('no_ui_intent');
  await Promise.resolve();
  assert.strictEqual([...noHousekeepingUi.context.document._nodes].filter(node=>node.tagName==='button'&&/cleanup|очист/.test(`${node.textContent} ${node.id} ${JSON.stringify(node.dataset)}`)).length,0,'no housekeeping UI controls should be introduced');
  assert.strictEqual(noHousekeepingUi.calls.setInterval,0,'no setInterval allowed in this slice');
  assert.strictEqual(noHousekeepingUi.calls.fetch,0,'no network calls allowed in this slice');
  assert.strictEqual(noHousekeepingUi.calls.webSocket,0,'no network calls allowed in this slice');

  console.log('FP85_AUTOMATIC_TECHNICAL_HOUSEKEEPING_PASS');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});

(()=>{
  'use strict';
  if(window.__FP_MODULE_REGISTRY_RETRY_CORRECTION__)return;
  window.__FP_MODULE_REGISTRY_RETRY_CORRECTION__=true;

  const registry=window.FamilyPilotModuleRegistry;
  if(!registry)return;

  const financialObjectKeys=Object.freeze([
    'household','config','giftFund','onboardingState',
  ]);
  const financialCollectionKeys=Object.freeze([
    'members','wallets','categories','operations','transfers','walletMovements',
    'obligationRules','obligationOccurrences','debts','debtEvents',
    'savingsGoals','savingsPlans','savingsTransfers','purposeAllocations','purposeAllocationEvents',
    'savingsLegacyReconciliationIssues','savingsPurposeMigrationResults',
    'walletTransfers','investmentAccounts','balanceAdjustments',
    'plannedIncomeRules','plannedIncomeOccurrences','incomeDistributionRules','savingsActionOccurrences',
    'birthdays','whatIfScenarios','scenarioPlanConversions','whatIfInterestSimulations',
  ]);
  const financialKeys=Object.freeze([...financialObjectKeys,...financialCollectionKeys].sort());
  const unorderedFinancialCollections=new Set(financialCollectionKeys);
  const excludedFinancialStateKeys=Object.freeze([
    'schemaVersion','currentMemberId','activeWalletId','learningModeByMember',
  ]);
  const identityKeys=Object.freeze([
    'id','eventId','ruleId','occurrenceId','transferId','walletId','memberId','goalId','scenarioId',
  ]);
  const financialContract=Object.freeze({
    version:2,
    stateOwner:'window.__FP_RUNTIME__.state',
    persistenceOwner:'FamilyPilotPersistence',
    keys:financialKeys,
    unorderedCollections:Object.freeze([...financialCollectionKeys].sort()),
    excludedStateKeys:excludedFinancialStateKeys,
    missingCollectionDefault:'empty_array',
    missingObjectDefault:'empty_object',
    recordTimestampsAndAuditMetadata:'included_without_normalization',
    persistenceEnvelopeMetadata:'excluded',
  });

  function canonicalValue(value){
    if(value===undefined)return null;
    if(value===null||typeof value!=='object')return value;
    if(Array.isArray(value))return value.map(canonicalValue);
    const output={};
    for(const key of Object.keys(value).sort())output[key]=canonicalValue(value[key]);
    return output;
  }

  function compareText(left,right){
    return left<right?-1:left>right?1:0;
  }

  function collectionItemKey(item){
    const payload=JSON.stringify(item);
    if(item&&typeof item==='object'&&!Array.isArray(item)){
      for(const key of identityKeys){
        if(item[key]!==undefined&&item[key]!==null)return `${key}:${String(item[key])}\u0000${payload}`;
      }
    }
    return `payload:\u0000${payload}`;
  }

  function canonicalCollection(value){
    const items=Array.isArray(value)?value:[];
    return items.map(canonicalValue).sort((left,right)=>compareText(collectionItemKey(left),collectionItemKey(right)));
  }

  function financialState(){
    try{
      const testState=window.__FP_TEST__?.getState?.();
      if(testState&&typeof testState==='object'&&!Array.isArray(testState))return testState;
    }catch{}
    return window.__FP_RUNTIME__?.state||{};
  }

  function financialFingerprint(){
    const state=financialState();
    const output={contractVersion:financialContract.version};
    for(const key of financialKeys){
      if(unorderedFinancialCollections.has(key))output[key]=canonicalCollection(state[key]);
      else output[key]=canonicalValue(state[key]===undefined?{}:state[key]);
    }
    return JSON.stringify(canonicalValue(output));
  }

  function financialFingerprintContract(){
    return JSON.parse(JSON.stringify(financialContract));
  }

  window.FamilyPilotModuleRegistry=Object.freeze({
    ...registry,
    financialFingerprint,
    financialFingerprintContract,
  });

  const terminalUnavailable=new Map();
  const shellControlState=new WeakMap();
  let shellMutationBlockCount=0;
  const mutationControlSelector='button,input,select,textarea,[role="button"],[contenteditable="true"],form';
  const readOnlyControlSelector=[
    'a[href]',
    '.nav',
    '.nav-btn',
    '.back',
    '.close',
    '.link',
    '.analytics-link',
    '.filter-button',
    '.trash-button',
    '.wallet-context',
    '.info',
    '.round',
    '.debt',
    '.filters button',
    '.range button',
    '.period-nav button',
    '[data-screen]',
    '[data-plan-module]',
    '[data-fp-module]',
    '[data-fp-module-back]',
    '[data-fp-module-details]',
    '[data-fp-module-retry]',
    '[data-persistence-open]',
    '[data-persistence-diagnostic]',
  ].join(',');

  function clearGeneric(moduleId){
    const value=String(window.__FP_PACKAGE_BOOTSTRAP_ERROR__||'');
    if(value&&registry.moduleForPath(value)===moduleId)window.__FP_PACKAGE_BOOTSTRAP_ERROR__=null;
  }

  function clearSpecific(moduleId){
    if(moduleId==='onboarding')window.__FP_M4_05_BOOTSTRAP_ERROR__=null;
    if(moduleId==='what_if'){
      window.__FP_M4_06_UI_ERROR__=null;
      window.__FP_M4_06_SOLVER_UI_ERROR__=null;
      window.__FP_M4_06_CONVERSION_UI_ERROR__=null;
      window.__FP_M4_06_INTEREST_UI_ERROR__=null;
    }
    if(moduleId==='learning')window.__FP_M4_07_LEARNING_UI_ERROR__=null;
    if(moduleId==='persistence')window.__FP_PERSISTENCE_RUNTIME_ERROR__=null;
  }

  function reconcileCompatibilityErrors(snapshot=registry.snapshot()){
    for(const record of snapshot.catalogue||[]){
      const retrying=record.state==='loading'&&Number(record.lastRetryAt)>0;
      const recovered=record.state==='ready'&&Number(record.attempt)>1;
      if(!retrying&&!recovered)continue;
      clearGeneric(record.moduleId);
      clearSpecific(record.moduleId);
    }
  }

  function preserveTerminalUnavailable(snapshot=registry.snapshot()){
    for(const record of snapshot.catalogue||[]){
      const terminal=record.state==='unavailable'&&record.retryClass==='never'&&!record.blockedByModuleId;
      if(terminal){
        terminalUnavailable.set(record.moduleId,{
          reasonCode:record.reasonCode,
          failureStage:record.failureStage,
          diagnosticId:record.diagnosticId,
          installStarted:record.installStarted,
          rootFailureModuleId:record.rootFailureModuleId,
          rootDiagnosticId:record.rootDiagnosticId,
        });
        continue;
      }
      const held=terminalUnavailable.get(record.moduleId);
      if(held&&record.state==='ready')registry.markDegraded(record.moduleId,{...held,retryClass:'never',unavailable:true});
    }
  }

  function shellDegraded(snapshot=registry.snapshot()){
    return Boolean((snapshot.catalogue||[]).some(record=>
      ['degraded','unavailable'].includes(record.state)&&record.containmentLevel==='application_shell_degraded'
    ));
  }

  function readOnlyControl(target){
    return Boolean(target?.closest?.(readOnlyControlSelector));
  }

  function restoreControl(control,held){
    control.disabled=held.disabled;
    if(held.ariaDisabled===null)control.removeAttribute('aria-disabled');
    else control.setAttribute('aria-disabled',held.ariaDisabled);
    delete control.dataset.fpShellMutationBlocked;
    shellControlState.delete(control);
  }

  function syncShellMutationBarrier(snapshot=registry.snapshot()){
    const active=shellDegraded(snapshot);
    document.body?.classList.toggle('fp-shell-mutation-barrier',active);
    for(const control of document.querySelectorAll('button,input,select,textarea')){
      const held=shellControlState.get(control);
      if(active&&!readOnlyControl(control)){
        if(!held)shellControlState.set(control,{
          disabled:Boolean(control.disabled),
          ariaDisabled:control.getAttribute('aria-disabled'),
        });
        control.disabled=true;
        control.setAttribute('aria-disabled','true');
        control.dataset.fpShellMutationBlocked='true';
      }else if(held){
        restoreControl(control,held);
      }
    }
    return active;
  }

  function blockShellMutation(event){
    if(!shellDegraded()||readOnlyControl(event.target)||!event.target?.closest?.(mutationControlSelector))return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    shellMutationBlockCount+=1;
    return true;
  }

  for(const type of ['click','submit','beforeinput','input','change']){
    document.addEventListener(type,blockShellMutation,true);
  }
  document.addEventListener('keydown',event=>{
    if((event.key==='Enter'||event.key===' ')&&blockShellMutation(event))return;
  },true);

  window.addEventListener('familypilot:module-state',event=>{
    reconcileCompatibilityErrors(event.detail);
    preserveTerminalUnavailable(event.detail);
    syncShellMutationBarrier(event.detail);
  });
  new MutationObserver(()=>syncShellMutationBarrier()).observe(document.documentElement,{subtree:true,childList:true});
  reconcileCompatibilityErrors();
  preserveTerminalUnavailable();
  syncShellMutationBarrier();

  if(new URLSearchParams(location.search).get('test')==='1'){
    const test=window.__FP_TEST__=window.__FP_TEST__||{};
    test.moduleRegistryCorrection={
      shellDegraded,
      syncShellMutationBarrier,
      blockedCount:()=>shellMutationBlockCount,
      blockedControls:()=>[...document.querySelectorAll('[data-fp-shell-mutation-blocked="true"]')].map(control=>({
        id:control.id||'',
        tag:control.tagName,
        type:control.type||'',
      })),
      readOnlyControl:selector=>readOnlyControl(document.querySelector(selector)),
      financialFingerprint,
      financialFingerprintContract,
    };
  }
})();

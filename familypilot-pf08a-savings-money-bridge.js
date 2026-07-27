(()=>{
  'use strict';
  if(window.__FP_SAVINGS_TRUTH_MONEY_BRIDGE__)return;
  const original=window.FamilyPilotMoneyPlanning,truth=window.FamilyPilotSavingsTruth,accounts=window.FamilyPilotSavingsAccounts,runtime=window.__FP_RUNTIME__;
  if(!original||!truth||!accounts||!runtime){window.__FP_SAVINGS_TRUTH_MONEY_BRIDGE_ERROR__='Savings truth money dependencies are unavailable';return}
  window.__FP_SAVINGS_TRUTH_MONEY_BRIDGE__=true;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const round=value=>Math.round((Number(value)||0)*100)/100;
  const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const makeId=(prefix='id',at=Date.now())=>`${prefix}-${Number(at).toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const deps=extra=>({wallets:window.FamilyPilotWalletManagement,transfers:window.FamilyPilotWalletTransfers,savings:window.FamilyPilotSavingsGoals,accounts,scope:runtime.scopeApi,...extra});
  const stateKeys=['purposeAllocations','purposeAllocationEvents','savingsLegacyReconciliationIssues','savingsPurposeMigrationResults','savingsPurposeMigrationSnapshots','savingsTransfers','walletTransfers','savingsActionOccurrences','purposeLocationAssignments'];
  function snapshot(state){const data={};for(const key of stateKeys)data[key]=clone(state[key]||[]);data.goalCaches=(state.savingsGoals||[]).map(goal=>({id:goal.id,savedAmount:goal.savedAmount}));return data}
  function restore(state,data){for(const key of stateKeys)state[key]=data[key];for(const cache of data.goalCaches){const goal=(state.savingsGoals||[]).find(item=>item.id===cache.id);if(goal)goal.savedAmount=cache.savedAmount}}
  function normalizeState(state,inputDeps={},at=Date.now()){
    truth.captureLegacyPreflight(state,{scope:inputDeps.scope||runtime.scopeApi},at);
    const before=new Set((state.purposeLocationAssignments||[]).map(item=>`${item.goalId}|${item.locationId}`));
    original.normalizeState(state,deps(inputDeps),at);
    for(const item of state.purposeLocationAssignments||[]){if(!item.provenance)item.provenance=before.has(`${item.goalId}|${item.locationId}`)?'unknown':'auto_fallback'}
    truth.syncGoalCaches(state);return state;
  }
  function setPurposeLocation(state,goalId,locationId,actorId='member-anna',inputDeps={},at=Date.now()){
    const result=original.setPurposeLocation(state,goalId,locationId,actorId,deps(inputDeps),at);if(result.ok){truth.markAssignment(state,goalId,locationId,'user_confirmed',actorId,at);result.assignment.provenance='user_confirmed'}return result;
  }
  function configureIncomeSavingsRule(state,input,legacy,actorId='member-anna',inputDeps={},at=Date.now()){
    const result=original.configureIncomeSavingsRule(state,input,legacy,actorId,deps(inputDeps),at);if(result.ok)truth.markAssignment(state,result.goal.id,result.rule.destinationLocationId,'user_confirmed',actorId,at);return result;
  }
  function applyGiftFundPlan(state,input,confirmed,legacy,actorId='member-anna',inputDeps={},at=Date.now()){
    const result=original.applyGiftFundPlan(state,input,confirmed,legacy,actorId,deps(inputDeps),at);if(result.ok)truth.markAssignment(state,result.goal.id,result.settings.locationId,'user_confirmed',actorId,at);return result;
  }
  function completeAction(state,actionId,input,actorId='member-anna',inputDeps={},at=Date.now()){
    const d=deps(inputDeps);normalizeState(state,d,at);
    const action=(state.savingsActionOccurrences||[]).find(item=>item.id===actionId&&['planned','partial','postponed'].includes(item.status));if(!action)return{ok:false,error:'Плановый перевод не найден или уже закрыт.'};
    const remaining=round(Math.max(0,action.plannedAmount-action.actualAmount)),outcome=String(input?.outcome||'full');
    if(outcome==='skipped'){action.status='skipped';action.updatedAt=at;action.updatedByMemberId=actorId;return{ok:true,action}}
    if(outcome==='postponed'){const dueAt=finite(input?.dueAt,NaN);if(!Number.isFinite(dueAt))return{ok:false,error:'Укажите новую дату.'};action.dueAt=dueAt;action.status='postponed';action.updatedAt=at;action.updatedByMemberId=actorId;return{ok:true,action}}
    const amount=round(outcome==='full'?remaining:finite(input?.amount,NaN));if(!Number.isFinite(amount)||amount<=0||amount>truth.MAX_AMOUNT)return{ok:false,error:'Укажите фактически переведённую сумму больше нуля.'};
    const sourceLocationId=String(input?.sourceLocationId||action.sourceLocationId),destinationLocationId=String(input?.destinationLocationId||action.destinationLocationId),source=original.activeWallets(state).find(item=>item.id===sourceLocationId),destination=original.activeWallets(state).find(item=>item.id===destinationLocationId),targetGoal=(state.savingsGoals||[]).find(item=>item.id===action.goalId&&item.status==='active');
    if(!source||!destination)return{ok:false,error:'Выберите реальные места хранения денег.'};if(!targetGoal)return{ok:false,error:'Накопление для перевода не найдено.'};
    if(sourceLocationId!==destinationLocationId){const available=d.scope?.walletCapitalSnapshot?.(state,sourceLocationId)?.capital||0;if(amount>available+.005)return{ok:false,error:`В месте «${source.name}» недостаточно денег.`};const validation=d.transfers?.validation?.(state,{sourceWalletId:sourceLocationId,destinationWalletId:destinationLocationId,amount,effectiveDate:finite(input?.effectiveDate,at),note:`${action.title} · ${targetGoal.name}`},actorId);if(validation&&!validation.ok)return validation}
    const data=snapshot(state),economicEventId=makeId('savings-execution',at);
    try{
      const purposeResult=accounts.createTransfer(state,{sourceAccountId:accounts.OPERATING_ACCOUNT_ID,destinationAccountId:`purpose:${targetGoal.id}`,amount,effectiveDate:finite(input?.effectiveDate,at),note:action.title,economicEventId,sourceLocationId,destinationLocationId,reason:'savings_execution'},d.scope?.capitalSnapshot?.(state)?.capital||0,actorId,at);if(!purposeResult.ok)return purposeResult;
      let physicalResult=null;
      if(sourceLocationId!==destinationLocationId){physicalResult=d.transfers.createTransfer(state,{sourceWalletId:sourceLocationId,destinationWalletId:destinationLocationId,amount,effectiveDate:finite(input?.effectiveDate,at),note:`${action.title} · ${targetGoal.name}`},actorId,at);if(!physicalResult.ok){restore(state,data);return physicalResult}physicalResult.transfer.economicEventId=economicEventId;physicalResult.transfer.actionOccurrenceId=action.id;physicalResult.transfer.purposeGoalId=targetGoal.id;for(const event of purposeResult.purposeAllocationEvents||[])event.linkedWalletTransferId=physicalResult.transfer.id}
      original.setPurposeLocation(state,targetGoal.id,destinationLocationId,actorId,d,at);truth.markAssignment(state,targetGoal.id,destinationLocationId,'execution_confirmed',actorId,at);
      action.actualAmount=round(action.actualAmount+amount);action.sourceLocationId=sourceLocationId;action.destinationLocationId=destinationLocationId;action.savingsTransferIds=Array.isArray(action.savingsTransferIds)?action.savingsTransferIds:[];action.walletTransferIds=Array.isArray(action.walletTransferIds)?action.walletTransferIds:[];action.savingsTransferIds.push(purposeResult.transfer.id);if(physicalResult?.transfer?.id)action.walletTransferIds.push(physicalResult.transfer.id);action.status=action.actualAmount+.005>=action.plannedAmount?'completed':'partial';action.updatedAt=at;action.updatedByMemberId=actorId;truth.syncGoalCaches(state);return{ok:true,action,purposeTransfer:purposeResult.transfer,walletTransfer:physicalResult?.transfer||null,economicEventId,purposeAllocationEvents:purposeResult.purposeAllocationEvents||[]};
    }catch(error){restore(state,data);return{ok:false,error:String(error?.message||error)}}
  }
  const api=Object.freeze({...original,normalizeState,setPurposeLocation,configureIncomeSavingsRule,applyGiftFundPlan,completeAction,truth});
  window.FamilyPilotMoneyPlanning=api;
})();

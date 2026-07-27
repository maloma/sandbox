(()=>{
  'use strict';
  if(window.__FP_M4_05_INCOME_ACTIVATION_CORRECTION__)return;
  window.__FP_M4_05_INCOME_ACTIVATION_CORRECTION__=true;

  const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const round=value=>Math.round((Number(value)||0)*100)/100;
  const monthStart=value=>{const date=new Date(value);return new Date(date.getFullYear(),date.getMonth(),1).getTime()};
  const monthKey=value=>{const date=new Date(value);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`};

  function operationId(action){
    if(action?.sourceId?.startsWith('income:')||action?.sourceId?.startsWith('reserve-income:'))return action.sourceId.split(':').pop();
    if(action?.incomeTriggerOperationId)return action.incomeTriggerOperationId;
    if(action?.note?.startsWith('income-trigger:'))return action.note.slice('income-trigger:'.length);
    return'';
  }

  function snapshotFor(state,ruleId,kind,mode,incomes){
    let snapshot=state.incomeRuleActivationSnapshots.find(item=>item.ruleId===ruleId&&item.kind===kind);
    if(!snapshot||String(snapshot.mode||'')!==String(mode||'')){
      if(snapshot)state.incomeRuleActivationSnapshots=state.incomeRuleActivationSnapshots.filter(item=>item!==snapshot);
      snapshot={ruleId,kind,mode:mode||null,excludedOperationIds:incomes.map(item=>item.id),capturedAt:Date.now()};
      state.incomeRuleActivationSnapshots.push(snapshot);
    }
    return snapshot;
  }

  function correctFixedReserve(state,api,rule,snapshot,at){
    if(rule.mode!==api.RESERVE_FIXED)return;
    const action=(state.savingsActionOccurrences||[]).find(item=>item.goalId===rule.goalId&&item.sourceId===`monthly:${rule.goalId}:${monthKey(at)}`&&!['completed','skipped'].includes(item.status));
    if(!action||action.status==='postponed')return;
    const excluded=new Set(snapshot.excludedOperationIds||[]),eligible=(state.operations||[]).filter(item=>item?.status==='active'&&item.kind==='income'&&number(item.occurredAt)>=monthStart(at)&&number(item.createdAt,item.occurredAt)>=number(rule.createdAt)&&!excluded.has(item.id)).sort((a,b)=>a.occurredAt-b.occurredAt||a.createdAt-b.createdAt);
    if(!eligible.length){
      if(!action.actualAmount){action.status='inactive';action.note='waiting-for-actual-income';action.incomeTriggerOperationId=null}
      return;
    }
    const currentId=operationId(action),current=eligible.find(item=>item.id===currentId),later=current?eligible.find(item=>item.id!==current.id&&(number(item.occurredAt)>number(current.occurredAt)||(number(item.occurredAt)===number(current.occurredAt)&&number(item.createdAt)>number(current.createdAt)))):null;
    const income=action.status==='partial'?(later||current||eligible[0]):(current||eligible[0]);
    action.status=action.status==='inactive'?'planned':action.status;
    action.dueAt=number(income.occurredAt,at);action.sourceLocationId=income.walletId||action.sourceLocationId;action.destinationLocationId=rule.destinationLocationId||action.destinationLocationId;action.incomeTriggerOperationId=income.id;action.note=`income-trigger:${income.id}`;
  }

  function enforce(state,api,at=Date.now()){
    state.incomeRuleActivationSnapshots=Array.isArray(state.incomeRuleActivationSnapshots)?state.incomeRuleActivationSnapshots:[];
    const incomes=(state.operations||[]).filter(item=>item?.status==='active'&&item.kind==='income');
    for(const rule of(state.savingsRules||[]).filter(item=>item.status==='active')){
      const snapshot=snapshotFor(state,rule.id,'general','income_percentage',incomes),excluded=new Set(snapshot.excludedOperationIds||[]);
      for(const action of state.savingsActionOccurrences||[]){const id=operationId(action);if(id&&excluded.has(id)&&action.sourceId?.startsWith(`income:${rule.id}:`))action.status='inactive'}
    }
    for(const rule of(state.reserveContributionRules||[]).filter(item=>item.status==='active')){
      const snapshot=snapshotFor(state,rule.id,'reserve',rule.mode,incomes),excluded=new Set(snapshot.excludedOperationIds||[]);
      if(rule.mode===api.RESERVE_PERCENT){for(const action of state.savingsActionOccurrences||[]){const id=operationId(action);if(id&&excluded.has(id)&&action.sourceId?.startsWith(`reserve-income:${rule.id}:`))action.status='inactive'}}
      else correctFixedReserve(state,api,rule,snapshot,at);
    }
    return state;
  }

  function buildBatches(state){
    const groups=new Map();
    for(const action of state.savingsActionOccurrences||[]){
      if(!['planned','partial','postponed'].includes(action.status))continue;
      const id=operationId(action);if(!id)continue;
      const operation=(state.operations||[]).find(item=>item.id===id&&item.status==='active'&&item.kind==='income');if(!operation)continue;
      if(!groups.has(id))groups.set(id,{id:`income-distribution:${id}`,operation,actions:[]});
      groups.get(id).actions.push(action);
    }
    return[...groups.values()].sort((a,b)=>b.operation.occurredAt-a.operation.occurredAt).map(batch=>({...batch,totalPlanned:round(batch.actions.reduce((sum,item)=>sum+Math.max(0,number(item.plannedAmount)-number(item.actualAmount)),0))}));
  }

  function wrap(original){
    if(!original||original.__m405IncomeActivationCorrection)return original;
    const normalized=(state,inputDeps={},at=Date.now())=>{original.normalizeState(state,inputDeps,at);return enforce(state,wrapped,at)};
    const configured=(state,input,actorId='member-anna',inputDeps={},at=Date.now())=>{const previous=original.currentReserveRule(state),previousMode=previous?.mode,result=original.configureReserveRule(state,input,actorId,inputDeps,at);if(result.ok&&previousMode&&previousMode!==result.rule.mode)state.incomeRuleActivationSnapshots=(state.incomeRuleActivationSnapshots||[]).filter(item=>!(item.kind==='reserve'&&item.ruleId===result.rule.id));if(result.ok)enforce(state,wrapped,at);return result};
    const batches=(state,inputDeps={},at=Date.now())=>{normalized(state,inputDeps,at);return buildBatches(state)};
    const applied=(state,draft,confirmed,actorId='member-anna',inputDeps={},at=Date.now())=>{const result=original.applyOnboarding(state,draft,confirmed,actorId,inputDeps,at);if(result.ok)enforce(state,wrapped,at);return result};
    const wrapped=Object.freeze({...original,normalizeState:normalized,configureReserveRule:configured,incomeDistributionBatches:batches,applyOnboarding:applied,__m405IncomeActivationCorrection:true});
    return wrapped;
  }

  const existing=window.FamilyPilotOnboardingDistribution;
  let current=wrap(existing);
  Object.defineProperty(window,'FamilyPilotOnboardingDistribution',{configurable:true,enumerable:true,get(){return current},set(value){current=wrap(value)}});
})();

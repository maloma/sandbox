(()=>{
  'use strict';
  if(window.__FP_M4_05_INCOME_ACTIVATION_CORRECTION__)return;
  window.__FP_M4_05_INCOME_ACTIVATION_CORRECTION__=true;

  function operationId(action){
    if(action?.sourceId?.startsWith('income:')||action?.sourceId?.startsWith('reserve-income:'))return action.sourceId.split(':').pop();
    if(action?.incomeTriggerOperationId)return action.incomeTriggerOperationId;
    if(action?.note?.startsWith('income-trigger:'))return action.note.slice('income-trigger:'.length);
    return'';
  }

  function enforce(state,api){
    state.incomeRuleActivationSnapshots=Array.isArray(state.incomeRuleActivationSnapshots)?state.incomeRuleActivationSnapshots:[];
    const incomes=(state.operations||[]).filter(item=>item?.status==='active'&&item.kind==='income');
    const rules=[
      ...(state.savingsRules||[]).filter(item=>item.status==='active').map(item=>({id:item.id,kind:'general'})),
      ...(state.reserveContributionRules||[]).filter(item=>item.status==='active'&&item.mode===api.RESERVE_PERCENT).map(item=>({id:item.id,kind:'reserve'})),
    ];
    for(const rule of rules){
      let snapshot=state.incomeRuleActivationSnapshots.find(item=>item.ruleId===rule.id&&item.kind===rule.kind);
      if(!snapshot){snapshot={ruleId:rule.id,kind:rule.kind,excludedOperationIds:incomes.map(item=>item.id),capturedAt:Date.now()};state.incomeRuleActivationSnapshots.push(snapshot)}
      const excluded=new Set(snapshot.excludedOperationIds||[]);
      for(const action of state.savingsActionOccurrences||[]){
        const id=operationId(action);if(!id||!excluded.has(id))continue;
        if(rule.kind==='general'&&action.sourceId?.startsWith(`income:${rule.id}:`))action.status='inactive';
        if(rule.kind==='reserve'&&action.sourceId?.startsWith(`reserve-income:${rule.id}:`))action.status='inactive';
      }
    }
    return state;
  }

  function wrap(original){
    if(!original||original.__m405IncomeActivationCorrection)return original;
    const normalized=(state,inputDeps={},at=Date.now())=>{original.normalizeState(state,inputDeps,at);return enforce(state,wrapped)};
    const configured=(state,input,actorId='member-anna',inputDeps={},at=Date.now())=>{const result=original.configureReserveRule(state,input,actorId,inputDeps,at);if(result.ok)enforce(state,wrapped);return result};
    const batches=(state,inputDeps={},at=Date.now())=>{normalized(state,inputDeps,at);return original.incomeDistributionBatches(state,inputDeps,at).filter(batch=>batch.actions.some(item=>item.status!=='inactive')).map(batch=>({...batch,actions:batch.actions.filter(item=>item.status!=='inactive')}))};
    const applied=(state,draft,confirmed,actorId='member-anna',inputDeps={},at=Date.now())=>{const result=original.applyOnboarding(state,draft,confirmed,actorId,inputDeps,at);if(result.ok)enforce(state,wrapped);return result};
    const wrapped=Object.freeze({...original,normalizeState:normalized,configureReserveRule:configured,incomeDistributionBatches:batches,applyOnboarding:applied,__m405IncomeActivationCorrection:true});
    return wrapped;
  }

  const existing=window.FamilyPilotOnboardingDistribution;
  let current=wrap(existing);
  Object.defineProperty(window,'FamilyPilotOnboardingDistribution',{configurable:true,enumerable:true,get(){return current},set(value){current=wrap(value)}});
})();

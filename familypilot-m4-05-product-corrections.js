(()=>{
  'use strict';
  if(window.__FP_M4_05_PRODUCT_CORRECTIONS__)return;
  window.__FP_M4_05_PRODUCT_CORRECTIONS__=true;

  const round=value=>Math.round((Number(value)||0)*100)/100;
  const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const clean=value=>String(value||'').trim().replace(/\s+/g,' ');
  const clone=value=>JSON.parse(JSON.stringify(value));
  const monthStart=value=>{const date=new Date(value);return new Date(date.getFullYear(),date.getMonth(),1).getTime()};
  const monthKey=value=>{const date=new Date(value);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`};
  const nextMonthlyDate=(value,day)=>{const date=new Date(value),candidate=new Date(date.getFullYear(),date.getMonth(),Math.max(1,Math.min(28,Math.trunc(number(day,1))))).getTime();return candidate>=new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime()?candidate:new Date(date.getFullYear(),date.getMonth()+1,Math.max(1,Math.min(28,Math.trunc(number(day,1))))).getTime()};

  function deps(input={}){
    return{
      money:input.money||window.FamilyPilotMoneyPlanning,
      wallets:input.wallets||window.FamilyPilotWalletManagement,
      transfers:input.transfers||window.FamilyPilotWalletTransfers,
      savings:input.savings||window.FamilyPilotSavingsGoals,
      accounts:input.accounts||window.FamilyPilotSavingsAccounts,
      budget:input.budget||window.FamilyPilotBudgetDesigner,
      plannedIncome:input.plannedIncome||window.FamilyPilotPlannedIncome,
      obligations:input.obligations||window.FamilyPilotObligations,
      debts:input.debts||window.FamilyPilotDebts,
      scope:input.scope||window.FamilyPilotScope,
    };
  }

  function extendedDraft(raw={},state){
    const current=state?.starterOnboarding?.draft||{};
    return{
      goalEnabled:Boolean(raw.goalEnabled??current.goalEnabled),
      goalName:clean(raw.goalName??current.goalName),
      goalTarget:Math.max(0,round(raw.goalTarget??current.goalTarget)),
      goalSaved:Math.max(0,round(raw.goalSaved??current.goalSaved)),
      goalMode:(raw.goalMode??current.goalMode)==='fixed_contribution'?'fixed_contribution':'fixed_date',
      goalDate:String(raw.goalDate??current.goalDate??''),
      goalMonthly:Math.max(0,round(raw.goalMonthly??current.goalMonthly)),
      goalLocationId:String(raw.goalLocationId??current.goalLocationId??''),
    };
  }

  function correctFixedReserveTiming(state,api,at=Date.now()){
    const rule=api.currentReserveRule(state);
    if(!rule||rule.mode!==api.RESERVE_FIXED)return;
    const key=monthKey(at),action=(state.savingsActionOccurrences||[]).find(item=>item.goalId===rule.goalId&&item.sourceId===`monthly:${rule.goalId}:${key}`&&item.status!=='completed'&&item.status!=='skipped');
    if(!action)return;
    if(action.status==='postponed')return;
    const start=monthStart(at),incomes=(state.operations||[]).filter(item=>item?.status==='active'&&item.kind==='income'&&number(item.occurredAt)>=start).sort((a,b)=>a.occurredAt-b.occurredAt);
    if(!incomes.length){
      if(!action.actualAmount){action.status='inactive';action.note='waiting-for-actual-income'}
      return;
    }
    let income;
    if(action.status==='partial')income=incomes.find(item=>number(item.occurredAt)>number(action.updatedAt))||incomes.find(item=>item.id===action.incomeTriggerOperationId)||incomes[0];
    else income=incomes.find(item=>item.id===action.incomeTriggerOperationId)||incomes[0];
    action.status=action.status==='inactive'?'planned':action.status;
    action.dueAt=number(income.occurredAt,at);
    action.sourceLocationId=income.walletId||action.sourceLocationId;
    action.destinationLocationId=rule.destinationLocationId||action.destinationLocationId;
    action.incomeTriggerOperationId=income.id;
    action.note=`income-trigger:${income.id}`;
  }

  function customBatches(state,api,inputDeps={},at=Date.now()){
    api.normalizeState(state,inputDeps,at);
    const groups=new Map();
    for(const action of state.savingsActionOccurrences||[]){
      if(!['planned','partial','postponed'].includes(action.status))continue;
      let operationId='';
      if(action.sourceId?.startsWith('income:')||action.sourceId?.startsWith('reserve-income:'))operationId=action.sourceId.split(':').pop();
      else if(action.incomeTriggerOperationId)operationId=action.incomeTriggerOperationId;
      else if(action.note?.startsWith('income-trigger:'))operationId=action.note.slice('income-trigger:'.length);
      if(!operationId)continue;
      const operation=(state.operations||[]).find(item=>item.id===operationId&&item.status==='active'&&item.kind==='income');if(!operation)continue;
      if(!groups.has(operationId))groups.set(operationId,{id:`income-distribution:${operationId}`,operation,actions:[]});
      groups.get(operationId).actions.push(action);
    }
    return[...groups.values()].sort((a,b)=>b.operation.occurredAt-a.operation.occurredAt).map(batch=>({...batch,totalPlanned:round(batch.actions.reduce((sum,item)=>sum+Math.max(0,item.plannedAmount-item.actualAmount),0))}));
  }

  function wrap(original){
    if(!original||original.__m405ProductCorrections)return original;

    const correctedNormalize=(state,inputDeps={},at=Date.now())=>{
      original.normalizeState(state,inputDeps,at);
      state.starterOnboarding=state.starterOnboarding||{};
      state.starterOnboarding.draft={...(state.starterOnboarding.draft||{}),...extendedDraft(state.starterOnboarding.draft,state)};
      correctFixedReserveTiming(state,wrapped,at);
      return state;
    };

    const correctedConfigureReserve=(state,input,actorId='member-anna',inputDeps={},at=Date.now())=>{
      const result=original.configureReserveRule(state,input,actorId,inputDeps,at);
      if(result.ok)correctFixedReserveTiming(state,wrapped,at);
      return result;
    };

    const correctedRefresh=(state,inputDeps={},at=Date.now())=>{
      original.refreshReserveActions(state,inputDeps,at);
      correctFixedReserveTiming(state,wrapped,at);
      return state.savingsActionOccurrences||[];
    };

    const correctedSaveDraft=(state,draft,step=0,inputDeps={},at=Date.now())=>{
      const extra=extendedDraft(draft,state),result=original.saveOnboardingDraft(state,draft,step,inputDeps,at);
      state.starterOnboarding.draft={...state.starterOnboarding.draft,...extra};
      return result;
    };

    const correctedDraft=(state,inputDeps={},at=Date.now())=>{correctedNormalize(state,inputDeps,at);return clone(state.starterOnboarding.draft)};

    const correctedReview=(state,draft,inputDeps={},at=Date.now())=>{
      const extra=extendedDraft(draft,state),result=original.onboardingReview(state,draft,inputDeps,at);
      result.draft={...result.draft,...extra};
      if(extra.goalEnabled&&extra.goalName&&extra.goalTarget>0){
        const detail=extra.goalMode==='fixed_date'?`цель ${extra.goalTarget} € к ${extra.goalDate||'указанной дате'}`:`цель ${extra.goalTarget} €, по ${extra.goalMonthly} € в месяц`;
        result.items.splice(Math.max(1,result.items.length-2),0,{key:'goal',title:'Первое накопление',summary:`${extra.goalName}: ${detail}`});
      }
      return result;
    };

    const correctedApply=(state,draft,confirmed,actorId='member-anna',inputDeps={},at=Date.now())=>{
      const d=deps(inputDeps),extra=extendedDraft(draft,state);
      if(extra.goalEnabled){
        if(!extra.goalName)return{ok:false,error:'Введите название первого накопления.'};
        if(extra.goalTarget<=0)return{ok:false,error:'Укажите целевую сумму первого накопления.'};
        if(extra.goalSaved>extra.goalTarget)return{ok:false,error:'Уже накопленная сумма не может превышать цель.'};
        if(extra.goalMode==='fixed_date'&&!/^\d{4}-\d{2}-\d{2}$/.test(extra.goalDate))return{ok:false,error:'Укажите дату первого накопления.'};
        if(extra.goalMode==='fixed_contribution'&&extra.goalMonthly<=0)return{ok:false,error:'Укажите ежемесячный взнос первого накопления.'};
      }
      const result=original.applyOnboarding(state,draft,confirmed,actorId,inputDeps,at);if(!result.ok)return result;
      if(extra.goalEnabled){
        const created=d.savings.createGoal(state,{name:extra.goalName,targetAmount:extra.goalTarget,savedAmount:extra.goalSaved,targetDate:extra.goalMode==='fixed_date'?extra.goalDate:''},actorId,at);
        if(!created.ok)return created;
        const plan=d.accounts.setPlan(state,created.goal.id,{planningMode:extra.goalMode,monthlyContribution:extra.goalMode==='fixed_contribution'?extra.goalMonthly:0,contributionDay:1},actorId,at);
        if(!plan.ok)return plan;
        const destination=(state.wallets||[]).find(item=>item.id===extra.goalLocationId&&!item.archivedAt)||d.money.defaultLocation(state);
        if(destination)d.money.setPurposeLocation(state,created.goal.id,destination.id,actorId,d,at);
        result.created.goalId=created.goal.id;state.starterOnboarding.createdRecordIds.goalId=created.goal.id;
      }
      const incomeRuleId=result.created.plannedIncomeRuleId,obligationRuleId=result.created.obligationRuleId;
      if(incomeRuleId){
        const rule=(state.plannedIncomeRules||[]).find(item=>item.id===incomeRuleId);
        if(rule&&rule.firstDueAt<new Date(new Date(at).getFullYear(),new Date(at).getMonth(),new Date(at).getDate()).getTime())d.plannedIncome.updateRule(state,rule.id,{name:rule.name,amount:rule.amount,dueAt:nextMonthlyDate(at,result.onboarding.draft.plannedIncomeDay),cadence:'recurring',intervalValue:1,intervalUnit:'month',endingMode:'unlimited',walletId:rule.walletId,categoryId:rule.categoryId,currency:rule.currency,note:rule.note},actorId,at);
      }
      if(obligationRuleId){
        const rule=(state.obligationRules||[]).find(item=>item.id===obligationRuleId);
        if(rule&&rule.firstDueAt<new Date(new Date(at).getFullYear(),new Date(at).getMonth(),new Date(at).getDate()).getTime())d.obligations.updateRule(state,rule.id,{name:rule.name,amount:rule.amount,dueAt:nextMonthlyDate(at,result.onboarding.draft.obligationDay),cadence:'recurring',intervalValue:1,intervalUnit:'month',endingMode:'unlimited',walletId:rule.walletId,categoryId:rule.categoryId,currency:rule.currency,note:rule.note},actorId,at);
      }
      state.starterOnboarding.draft={...state.starterOnboarding.draft,...extra};
      correctedNormalize(state,inputDeps,at);
      return result;
    };

    const wrapped=Object.freeze({...original,normalizeState:correctedNormalize,configureReserveRule:correctedConfigureReserve,refreshReserveActions:correctedRefresh,incomeDistributionBatches:(state,inputDeps={},at=Date.now())=>customBatches(state,wrapped,inputDeps,at),onboardingDraft:correctedDraft,saveOnboardingDraft:correctedSaveDraft,onboardingReview:correctedReview,applyOnboarding:correctedApply,__m405ProductCorrections:true});
    return wrapped;
  }

  let current;
  const descriptor=Object.getOwnPropertyDescriptor(window,'FamilyPilotOnboardingDistribution');
  if(descriptor?.value)current=wrap(descriptor.value);
  Object.defineProperty(window,'FamilyPilotOnboardingDistribution',{configurable:true,enumerable:true,get(){return current},set(value){current=wrap(value)}});
  if(descriptor?.value)window.FamilyPilotOnboardingDistribution=descriptor.value;
})();

(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FamilyPilotScenarioPlanConversion=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const round=value=>Math.round((Number(value)||0)*100)/100;
  const clean=value=>String(value||'').trim().replace(/\s+/g,' ');
  const clone=value=>JSON.parse(JSON.stringify(value));
  const makeId=(prefix='conversion',at=Date.now())=>`${prefix}-${Number(at).toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
  const dateText=value=>{const date=new Date(value);return Number.isFinite(date.getTime())?date.toISOString().slice(0,10):null};

  function normalizeItem(raw){
    const status=['pending','applied','skipped','rolled_back'].includes(raw?.status)?raw.status:'pending';
    return{id:String(raw?.id||makeId('conversion-item')),kind:String(raw?.kind||'informational'),title:clean(raw?.title)||'Изменение',actionable:raw?.actionable===true,status,before:raw?.before?clone(raw.before):null,after:raw?.after?clone(raw.after):null,details:raw?.details?clone(raw.details):{},blockingReason:clean(raw?.blockingReason),appliedAt:number(raw?.appliedAt,0)||null,appliedByMemberId:String(raw?.appliedByMemberId||''),rolledBackAt:number(raw?.rolledBackAt,0)||null,rolledBackByMemberId:String(raw?.rolledBackByMemberId||'')};
  }
  function normalizeConversion(raw,at=Date.now()){
    const createdAt=number(raw?.createdAt,at);
    return{id:String(raw?.id||makeId('plan-conversion',at)),sourceType:['scenario','goal_solver'].includes(raw?.sourceType)?raw.sourceType:'scenario',sourceId:String(raw?.sourceId||''),sourceTitle:clean(raw?.sourceTitle)||'Что если',sourceUpdatedAt:number(raw?.sourceUpdatedAt,0)||null,status:raw?.status==='archived'?'archived':'active',items:(Array.isArray(raw?.items)?raw.items:[]).map(normalizeItem),createdAt,createdByMemberId:String(raw?.createdByMemberId||'member-anna'),updatedAt:number(raw?.updatedAt,createdAt),updatedByMemberId:String(raw?.updatedByMemberId||raw?.createdByMemberId||'member-anna')};
  }
  function normalizeState(state,at=Date.now()){
    if(!state||typeof state!=='object')throw new Error('FamilyPilot state is required');
    state.schemaVersion=Math.max(18,number(state.schemaVersion));
    state.whatIfPlanConversions=(Array.isArray(state.whatIfPlanConversions)?state.whatIfPlanConversions:[]).filter(Boolean).map(item=>normalizeConversion(item,at));
    return state;
  }
  function dependencies(input={}){
    const accounts=input.accounts||globalThis.FamilyPilotSavingsAccounts,goals=input.goals||globalThis.FamilyPilotSavingsGoals,whatIf=input.whatIf||globalThis.FamilyPilotWhatIf,solver=input.solver||globalThis.FamilyPilotWhatIfSolver;
    return{accounts,goals,whatIf,solver};
  }
  function goalFor(state,goalId){return(state.savingsGoals||[]).find(item=>String(item.id)===String(goalId)&&item.status==='active')||null}
  function snapshot(state,goalId,accounts){
    const goal=goalFor(state,goalId),plan=accounts?.planFor?.(state,goalId);
    if(!goal||!plan)return null;
    return{goal:{id:String(goal.id),name:String(goal.name),targetAmount:round(goal.targetAmount),savedAmount:round(goal.savedAmount),targetDate:goal.targetDate||null,status:goal.status},plan:{goalId:String(plan.goalId),planningMode:plan.planningMode,monthlyContribution:round(plan.monthlyContribution),contributionDay:number(plan.contributionDay,1)}};
  }
  function listConversions(state){normalizeState(state);return state.whatIfPlanConversions.filter(item=>item.status==='active').sort((a,b)=>b.updatedAt-a.updatedAt)}
  function addConversion(state,data,actorId,at){normalizeState(state,at);const conversion=normalizeConversion({...data,id:makeId('plan-conversion',at),createdAt:at,createdByMemberId:actorId,updatedAt:at,updatedByMemberId:actorId},at);state.whatIfPlanConversions.push(conversion);return conversion}
  function aggregateChanges(changes){const map=new Map();for(const item of changes||[]){const goalId=String(item?.goalId||'');if(!goalId)continue;map.set(goalId,round(number(map.get(goalId))+number(item?.monthlyDelta)))}return[...map.entries()].map(([goalId,monthlyDelta])=>({goalId,monthlyDelta})).filter(item=>Math.abs(item.monthlyDelta)>=.005)}
  function informationalItem(kind,title,details,reason,at){return normalizeItem({id:makeId('conversion-item',at),kind,title,actionable:false,status:'pending',details,blockingReason:reason})}
  function prepareScenarioConversion(state,scenarioId,inputDeps={},actorId='member-anna',at=Date.now()){
    normalizeState(state,at);const{accounts,whatIf}=dependencies(inputDeps);
    if(!accounts?.planFor||!whatIf?.activeScenarios)return{ok:false,error:'Модули накоплений или сценариев недоступны.'};
    const scenario=whatIf.activeScenarios(state).find(item=>item.id===scenarioId);
    if(!scenario)return{ok:false,error:'Сценарий не найден.'};
    const items=[];
    for(const change of aggregateChanges(scenario.savingsContributionChanges)){
      const before=snapshot(state,change.goalId,accounts),goal=goalFor(state,change.goalId);
      if(!before||!goal){items.push(informationalItem('missing_goal','Накопление больше недоступно',{goalId:change.goalId,monthlyDelta:change.monthlyDelta},'Подготовьте новый сценарий после проверки накоплений.',at));continue}
      const proposed=Math.max(0,round(before.plan.monthlyContribution+change.monthlyDelta));
      let actionable=before.plan.planningMode==='fixed_contribution'&&proposed>0,reason='';
      if(before.plan.planningMode!=='fixed_contribution')reason='У цели фиксированная дата. Месячную разницу нельзя применить без отдельного решения о дате.';
      else if(proposed<=0)reason='Нулевой взнос требует отдельного режима паузы, которого пока нет.';
      const after=clone(before);after.plan.planningMode='fixed_contribution';after.plan.monthlyContribution=proposed;
      items.push(normalizeItem({id:makeId('conversion-item',at+items.length+1),kind:'savings_fixed_contribution',title:`Изменить взнос: ${goal.name}`,actionable,status:'pending',before,after,details:{goalId:goal.id,monthlyDelta:change.monthlyDelta,currentMonthly:before.plan.monthlyContribution,proposedMonthly:proposed},blockingReason:reason}));
    }
    if(number(scenario.monthlyAdditionalIncome)>0)items.push(informationalItem('income_gap','Дополнительный доход',{monthlyAmount:round(scenario.monthlyAdditionalIncome)},'Это информационная гипотеза. FamilyPilot не создаёт из неё плановый доход.',at+100));
    if(number(scenario.monthlyExpenseReduction)>0)items.push(informationalItem('expense_reduction','Сокращение расходов',{monthlyAmount:round(scenario.monthlyExpenseReduction)},'Не выбрана конкретная категория расходов, поэтому реальный план нельзя менять автоматически.',at+101));
    const conversion=addConversion(state,{sourceType:'scenario',sourceId:scenario.id,sourceTitle:scenario.name,sourceUpdatedAt:scenario.updatedAt,items},actorId,at);
    return{ok:true,conversion};
  }
  function prepareGoalConversion(state,input={},inputDeps={},actorId='member-anna',at=Date.now()){
    normalizeState(state,at);const{accounts,goals,solver}=dependencies(inputDeps);
    if(!accounts?.planFor||!goals?.updateGoal||!solver?.solveGoal)return{ok:false,error:'Модули цели или решателя недоступны.'};
    const result=solver.solveGoal(state,{source:'actual',goalId:input.goalId,targetDate:input.targetDate,incomeShare:number(input.incomeShare,50)},inputDeps,{from:at});
    if(!result.ok)return result;
    const before=snapshot(state,result.goalId,accounts),goal=goalFor(state,result.goalId);
    if(!before||!goal)return{ok:false,error:'Накопление не найдено.'};
    const after=clone(before);after.goal.targetDate=dateText(result.targetDate);after.plan.planningMode='fixed_date';after.plan.monthlyContribution=0;
    const items=[normalizeItem({id:makeId('conversion-item',at+1),kind:'goal_fixed_date',title:`Достичь цели к дате: ${goal.name}`,actionable:true,status:'pending',before,after,details:{goalId:goal.id,currentDerivedMonthly:round(accounts.planSnapshot(state,goal,at).requiredMonthly),proposedDerivedMonthly:round(result.requiredMonthlyContribution),targetDate:after.goal.targetDate,fundingGap:round(result.requiredMonthlyFundingRelief)}})];
    if(result.requiredMonthlyFundingRelief>0)items.push(informationalItem('funding_gap','Недостающее финансирование',{monthlyAmount:round(result.requiredMonthlyFundingRelief),incomePart:round(result.split.additionalIncome),expensePart:round(result.split.expenseReduction)},'Разрыв остаётся информационным и не создаёт доход или сокращение расходов.',at+2));
    const conversion=addConversion(state,{sourceType:'goal_solver',sourceId:goal.id,sourceTitle:`${goal.name} к ${after.goal.targetDate}`,sourceUpdatedAt:goal.updatedAt,items},actorId,at);
    return{ok:true,conversion,solverResult:result};
  }
  function findItem(state,conversionId,itemId){normalizeState(state);const conversion=state.whatIfPlanConversions.find(item=>item.id===conversionId&&item.status==='active');return{conversion,item:conversion?.items.find(item=>item.id===itemId)||null}}
  function goalInput(snapshotValue){return{name:snapshotValue.goal.name,targetAmount:snapshotValue.goal.targetAmount,savedAmount:snapshotValue.goal.savedAmount,targetDate:snapshotValue.goal.targetDate||''}}
  function applySnapshot(state,snapshotValue,kind,deps,actorId,at){const{accounts,goals}=deps;if(kind==='savings_fixed_contribution')return accounts.setPlan(state,snapshotValue.goal.id,snapshotValue.plan,actorId,at);if(kind==='goal_fixed_date'){
      const current=snapshot(state,snapshotValue.goal.id,accounts);if(!current)return{ok:false,error:'Накопление не найдено.'};
      const goalResult=goals.updateGoal(state,snapshotValue.goal.id,goalInput(snapshotValue),actorId,at);if(!goalResult.ok)return goalResult;
      const planResult=accounts.setPlan(state,snapshotValue.goal.id,snapshotValue.plan,actorId,at+1);if(!planResult.ok){goals.updateGoal(state,current.goal.id,goalInput(current),actorId,at+2);return planResult}
      return{ok:true,goal:goalResult.goal,plan:planResult.plan};
    }
    return{ok:false,error:'Этот пункт нельзя применить.'};
  }
  function applyItem(state,conversionId,itemId,inputDeps={},actorId='member-anna',at=Date.now()){
    const deps=dependencies(inputDeps),{conversion,item}=findItem(state,conversionId,itemId);
    if(!conversion||!item)return{ok:false,error:'Пункт переноса не найден.'};
    if(!item.actionable)return{ok:false,error:item.blockingReason||'Этот пункт информационный.'};
    if(item.status==='applied')return{ok:true,item,unchanged:true};
    if(item.status!=='pending')return{ok:false,error:'Пункт уже закрыт.'};
    const current=snapshot(state,item.before.goal.id,deps.accounts);
    if(!current||!same(current,item.before))return{ok:false,error:'Реальный план изменился после подготовки. Создайте новое предложение.',stale:true};
    const result=applySnapshot(state,item.after,item.kind,deps,actorId,at);if(!result.ok)return result;
    item.status='applied';item.appliedAt=at;item.appliedByMemberId=actorId;conversion.updatedAt=at;conversion.updatedByMemberId=actorId;
    return{ok:true,item,result};
  }
  function skipItem(state,conversionId,itemId,actorId='member-anna',at=Date.now()){
    const{conversion,item}=findItem(state,conversionId,itemId);if(!conversion||!item)return{ok:false,error:'Пункт переноса не найден.'};
    if(item.status==='skipped')return{ok:true,item,unchanged:true};
    if(item.status!=='pending')return{ok:false,error:'Пункт уже обработан.'};
    item.status='skipped';conversion.updatedAt=at;conversion.updatedByMemberId=actorId;return{ok:true,item};
  }
  function rollbackItem(state,conversionId,itemId,inputDeps={},actorId='member-anna',at=Date.now()){
    const deps=dependencies(inputDeps),{conversion,item}=findItem(state,conversionId,itemId);
    if(!conversion||!item)return{ok:false,error:'Пункт переноса не найден.'};
    if(item.status==='rolled_back')return{ok:true,item,unchanged:true};
    if(item.status!=='applied')return{ok:false,error:'Отменить можно только применённый пункт.'};
    const current=snapshot(state,item.after.goal.id,deps.accounts);
    if(!current||!same(current,item.after))return{ok:false,error:'После применения реальный план изменился. Автоматическая отмена остановлена, чтобы не потерять новые правки.',stale:true};
    const result=applySnapshot(state,item.before,item.kind,deps,actorId,at);if(!result.ok)return result;
    item.status='rolled_back';item.rolledBackAt=at;item.rolledBackByMemberId=actorId;conversion.updatedAt=at;conversion.updatedByMemberId=actorId;
    return{ok:true,item,result};
  }
  function moneyFingerprint(state){
    const value={operations:clone(state.operations||[]),obligationRules:clone(state.obligationRules||[]),obligationOccurrences:clone(state.obligationOccurrences||[]),plannedIncomeRules:clone(state.plannedIncomeRules||[]),plannedIncomeOccurrences:clone(state.plannedIncomeOccurrences||[]),debtEvents:clone(state.debtEvents||[]),savingsBalances:(state.savingsGoals||[]).map(item=>({id:item.id,savedAmount:round(item.savedAmount),status:item.status})),savingsTransfers:clone(state.savingsTransfers||[]),walletTransfers:clone(state.walletTransfers||[]),investmentAccounts:clone(state.investmentAccounts||[]),investmentValuations:clone(state.investmentValuations||[]),balanceAdjustments:clone(state.balanceAdjustments||[]),wallets:clone(state.wallets||[])};
    return JSON.stringify(value);
  }
  return Object.freeze({normalizeState,listConversions,prepareScenarioConversion,prepareGoalConversion,applyItem,skipItem,rollbackItem,moneyFingerprint,snapshot});
});

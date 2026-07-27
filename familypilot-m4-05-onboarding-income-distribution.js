(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FamilyPilotOnboardingDistribution=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const DAY=86400000;
  const MAX_AMOUNT=9999999.99;
  const RESERVE_FIXED='fixed_monthly';
  const RESERVE_PERCENT='income_percentage';
  const round=value=>Math.round((Number(value)||0)*100)/100;
  const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const clean=value=>String(value||'').trim().replace(/\s+/g,' ');
  const uid=(prefix='id',at=Date.now())=>`${prefix}-${Number(at).toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const monthStart=value=>{const date=new Date(value);return new Date(date.getFullYear(),date.getMonth(),1).getTime()};
  const monthKey=value=>{const date=new Date(value);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`};
  const addMonths=(value,count)=>{const date=new Date(value);return new Date(date.getFullYear(),date.getMonth()+count,1).getTime()};
  const dateAtDay=(value,day)=>{const date=new Date(value);return new Date(date.getFullYear(),date.getMonth(),Math.max(1,Math.min(28,Math.trunc(number(day,1))))).getTime()};

  function dependencies(input={}){
    return{
      money:input.money||globalThis.FamilyPilotMoneyPlanning,
      wallets:input.wallets||globalThis.FamilyPilotWalletManagement,
      transfers:input.transfers||globalThis.FamilyPilotWalletTransfers,
      savings:input.savings||globalThis.FamilyPilotSavingsGoals,
      accounts:input.accounts||globalThis.FamilyPilotSavingsAccounts,
      budget:input.budget||globalThis.FamilyPilotBudgetDesigner,
      plannedIncome:input.plannedIncome||globalThis.FamilyPilotPlannedIncome,
      obligations:input.obligations||globalThis.FamilyPilotObligations,
      debts:input.debts||globalThis.FamilyPilotDebts,
      scope:input.scope||globalThis.FamilyPilotScope,
    };
  }

  function activeWallets(state){return(state.wallets||[]).filter(item=>item&&!item.archivedAt&&item.includedInHouseholdCapital===true)}
  function defaultLocation(state){return activeWallets(state).find(item=>item.type==='household_default')||activeWallets(state)[0]||null}
  function wallet(state,id){return activeWallets(state).find(item=>item.id===id)||null}
  function reserveGoal(state){return(state.savingsGoals||[]).find(item=>item.id===state.reserveSavingsGoalId&&item.status==='active')||null}
  function giftGoal(state){return(state.savingsGoals||[]).find(item=>item.id===state.specialPurposeGoalIds?.giftFund&&item.status==='active')||null}

  function normalizeReserveRule(raw,state,at=Date.now()){
    const destination=wallet(state,raw?.destinationLocationId)||defaultLocation(state);
    const mode=raw?.mode===RESERVE_PERCENT?RESERVE_PERCENT:RESERVE_FIXED;
    return{
      id:String(raw?.id||uid('reserve-contribution-rule',at)),
      mode,
      monthlyAmount:mode===RESERVE_FIXED?Math.max(.01,round(raw?.monthlyAmount||50)):0,
      percentage:mode===RESERVE_PERCENT?Math.max(.01,Math.min(100,round(raw?.percentage||5))):0,
      contributionDay:Math.max(1,Math.min(28,Math.trunc(number(raw?.contributionDay,1)))),
      goalId:String(raw?.goalId||state.reserveSavingsGoalId||''),
      destinationLocationId:String(destination?.id||''),
      status:raw?.status==='inactive'?'inactive':'active',
      createdAt:number(raw?.createdAt,at),
      createdByMemberId:String(raw?.createdByMemberId||'member-anna'),
      updatedAt:number(raw?.updatedAt,raw?.createdAt||at),
      updatedByMemberId:String(raw?.updatedByMemberId||raw?.createdByMemberId||'member-anna'),
    };
  }

  function normalizeBridge(raw,at=Date.now()){
    return{
      id:String(raw?.id||uid('gift-reserve-bridge',at)),
      reserveGoalId:String(raw?.reserveGoalId||''),
      giftFundGoalId:String(raw?.giftFundGoalId||''),
      amount:Math.max(0,round(raw?.amount)),
      repaymentMonths:Math.max(1,Math.min(24,Math.trunc(number(raw?.repaymentMonths,3)))),
      repaymentActionIds:Array.isArray(raw?.repaymentActionIds)?raw.repaymentActionIds.map(String):[],
      purposeTransferId:String(raw?.purposeTransferId||''),
      walletTransferId:String(raw?.walletTransferId||''),
      economicEventId:String(raw?.economicEventId||''),
      status:['active','repaid','cancelled'].includes(raw?.status)?raw.status:'active',
      createdAt:number(raw?.createdAt,at),
      createdByMemberId:String(raw?.createdByMemberId||'member-anna'),
    };
  }

  function normalizeOnboarding(raw={}){
    const draft=raw.draft&&typeof raw.draft==='object'?raw.draft:{};
    return{
      status:['not_started','draft','completed'].includes(raw.status)?raw.status:'not_started',
      currentStep:Math.max(0,Math.min(5,Math.trunc(number(raw.currentStep,0)))),
      draft:{
        bankBalanceKnown:Boolean(draft.bankBalanceKnown),
        bankBalance:Math.max(0,round(draft.bankBalance)),
        cashBalanceKnown:Boolean(draft.cashBalanceKnown),
        cashBalance:Math.max(0,round(draft.cashBalance)),
        plannedIncomeEnabled:Boolean(draft.plannedIncomeEnabled),
        plannedIncomeName:clean(draft.plannedIncomeName)||'Основной доход',
        plannedIncomeAmount:Math.max(0,round(draft.plannedIncomeAmount)),
        plannedIncomeDay:Math.max(1,Math.min(28,Math.trunc(number(draft.plannedIncomeDay,1)))),
        obligationEnabled:Boolean(draft.obligationEnabled),
        obligationName:clean(draft.obligationName)||'Основные обязательные расходы',
        obligationAmount:Math.max(0,round(draft.obligationAmount)),
        obligationDay:Math.max(1,Math.min(28,Math.trunc(number(draft.obligationDay,5)))),
        debtEnabled:Boolean(draft.debtEnabled),
        debtDirection:draft.debtDirection==='receivable'?'receivable':'liability',
        debtCounterparty:clean(draft.debtCounterparty),
        debtAmount:Math.max(0,round(draft.debtAmount)),
        generalSavingsEnabled:draft.generalSavingsEnabled!==false,
        generalSavingsPercentage:Math.max(.01,Math.min(100,round(draft.generalSavingsPercentage||10))),
        generalSavingsLocationId:String(draft.generalSavingsLocationId||''),
        reserveEnabled:Boolean(draft.reserveEnabled),
        reserveMode:draft.reserveMode===RESERVE_PERCENT?RESERVE_PERCENT:RESERVE_FIXED,
        reserveValue:Math.max(.01,round(draft.reserveValue||50)),
        reserveLocationId:String(draft.reserveLocationId||''),
        birthdayEnabled:Boolean(draft.birthdayEnabled),
        birthdayName:clean(draft.birthdayName),
        birthdayDate:String(draft.birthdayDate||''),
        birthdayRelationship:clean(draft.birthdayRelationship),
        birthdayBudget:Math.max(0,round(draft.birthdayBudget)),
      },
      completedAt:raw.completedAt==null?null:number(raw.completedAt,null),
      completedByMemberId:raw.completedByMemberId||null,
      createdRecordIds:raw.createdRecordIds&&typeof raw.createdRecordIds==='object'?raw.createdRecordIds:{},
    };
  }

  function normalizeState(state,inputDeps={},at=Date.now()){
    if(!state||typeof state!=='object')throw new Error('FamilyPilot state is required');
    const deps=dependencies(inputDeps);
    deps.money?.normalizeState?.(state,deps,at);
    state.schemaVersion=Math.max(15,number(state.schemaVersion));
    state.reserveContributionRules=(Array.isArray(state.reserveContributionRules)?state.reserveContributionRules:[]).filter(Boolean).map(item=>normalizeReserveRule(item,state,at));
    state.giftFundReserveBridges=(Array.isArray(state.giftFundReserveBridges)?state.giftFundReserveBridges:[]).filter(Boolean).map(item=>normalizeBridge(item,at));
    state.starterOnboarding=normalizeOnboarding(state.starterOnboarding||{});
    refreshReserveActions(state,deps,at);
    syncBridgeStatus(state);
    return state;
  }

  function currentReserveRule(state){return(state.reserveContributionRules||[]).find(item=>item.status==='active')||null}

  function ensureReserveGoal(state,input,actorId,deps,at){
    let goal=reserveGoal(state);
    if(goal)return{ok:true,goal,existing:true};
    const proposal=deps.budget?.reserveProposal?.(state,deps.accounts,{baseCapital:deps.scope?.capitalSnapshot?.(state)?.capital||0,asOf:at});
    const target=Math.max(.01,Math.min(MAX_AMOUNT,round(input?.targetAmount||proposal?.recommendedTargetAmount||proposal?.targetAmount||1000)));
    const created=deps.savings?.createGoal?.(state,{name:deps.money?.RESERVE_NAME||'Резерв (непредвиденные расходы)',targetAmount:target,savedAmount:0,targetDate:''},actorId,at);
    if(!created?.ok)return created||{ok:false,error:'Не удалось создать резерв.'};
    state.reserveSavingsGoalId=created.goal.id;
    state.specialPurposeGoalIds=state.specialPurposeGoalIds||{};
    state.specialPurposeGoalIds.reserve=created.goal.id;
    return{ok:true,goal:created.goal,existing:false};
  }

  function configureReserveRule(state,input,actorId='member-anna',inputDeps={},at=Date.now()){
    const deps=dependencies(inputDeps);normalizeState(state,deps,at);
    const mode=input?.mode===RESERVE_PERCENT?RESERVE_PERCENT:RESERVE_FIXED;
    const value=round(number(input?.value,NaN));
    if(!Number.isFinite(value)||value<=0||value>1000000)return{ok:false,error:'Укажите корректную сумму или процент.'};
    if(mode===RESERVE_PERCENT&&value>100)return{ok:false,error:'Процент не может быть больше 100.'};
    const destination=wallet(state,input?.destinationLocationId);if(!destination)return{ok:false,error:'Выберите место хранения резерва.'};
    const ensured=ensureReserveGoal(state,input,actorId,deps,at);if(!ensured.ok)return ensured;
    const goal=ensured.goal;
    deps.money?.setPurposeLocation?.(state,goal.id,destination.id,actorId,deps,at);
    let rule=currentReserveRule(state);
    if(!rule){rule=normalizeReserveRule({id:uid('reserve-contribution-rule',at),createdAt:at,createdByMemberId:actorId},state,at);state.reserveContributionRules.push(rule)}
    Object.assign(rule,{mode,monthlyAmount:mode===RESERVE_FIXED?value:0,percentage:mode===RESERVE_PERCENT?value:0,contributionDay:Math.max(1,Math.min(28,Math.trunc(number(input?.contributionDay,1)))),goalId:goal.id,destinationLocationId:destination.id,status:'active',updatedAt:at,updatedByMemberId:actorId});
    const plan=(state.savingsAccountPlans||[]).find(item=>item.goalId===goal.id);
    if(mode===RESERVE_FIXED){
      const result=deps.accounts?.setPlan?.(state,goal.id,{planningMode:'fixed_contribution',monthlyContribution:value,contributionDay:rule.contributionDay},actorId,at);
      if(result&&!result.ok)return result;
    }else if(plan){
      plan.planningMode='fixed_contribution';plan.monthlyContribution=0;plan.contributionDay=rule.contributionDay;plan.updatedAt=at;plan.updatedByMemberId=actorId;
      for(const action of state.savingsActionOccurrences||[])if(action.goalId===goal.id&&action.sourceId?.startsWith('monthly:')&&['planned','partial','postponed'].includes(action.status))action.status='inactive';
    }
    deps.money?.refreshActionOccurrences?.(state,deps,at);
    refreshReserveActions(state,deps,at);
    return{ok:true,rule,goal};
  }

  function disableReserveRule(state,actorId='member-anna',inputDeps={},at=Date.now()){
    normalizeState(state,inputDeps,at);const rule=currentReserveRule(state);if(!rule)return{ok:true,unchanged:true};
    rule.status='inactive';rule.updatedAt=at;rule.updatedByMemberId=actorId;
    return{ok:true,rule};
  }

  function incomeOperationIdFromAction(action){
    if(action.sourceId?.startsWith('income:'))return action.sourceId.split(':').pop();
    if(action.sourceId?.startsWith('reserve-income:'))return action.sourceId.split(':').pop();
    if(action.note?.startsWith('income-trigger:'))return action.note.slice('income-trigger:'.length);
    return'';
  }

  function ensureReservePercentageActions(state,rule,at){
    for(const operation of (state.operations||[]).filter(item=>item?.status==='active'&&item.kind==='income'&&number(item.occurredAt)>=number(rule.createdAt))){
      const sourceId=`reserve-income:${rule.id}:${operation.id}`;
      let action=(state.savingsActionOccurrences||[]).find(item=>item.sourceId===sourceId);
      const plannedAmount=round(number(operation.amount)*rule.percentage/100);
      if(!action){
        action={id:uid('savings-action',at),sourceType:'monthly_plan',sourceId,goalId:rule.goalId,title:`Резерв (непредвиденные расходы) — ${rule.percentage}% с дохода`,plannedAmount,actualAmount:0,dueAt:number(operation.occurredAt,at),sourceLocationId:operation.walletId,destinationLocationId:rule.destinationLocationId,status:'planned',savingsTransferIds:[],walletTransferIds:[],createdAt:at,createdByMemberId:state.currentMemberId,updatedAt:at,updatedByMemberId:state.currentMemberId,note:''};
        state.savingsActionOccurrences.push(action);
      }else if(['planned','partial','postponed'].includes(action.status)){
        action.plannedAmount=plannedAmount;action.sourceLocationId=operation.walletId;action.destinationLocationId=rule.destinationLocationId;action.goalId=rule.goalId;action.updatedAt=at;
      }
    }
  }

  function anchorFixedMonthlyActionToIncome(state,rule,at){
    const key=monthKey(at),start=monthStart(at),action=(state.savingsActionOccurrences||[]).find(item=>item.goalId===rule.goalId&&item.sourceId===`monthly:${rule.goalId}:${key}`&&['planned','partial'].includes(item.status));
    if(!action)return;
    const incomes=(state.operations||[]).filter(item=>item?.status==='active'&&item.kind==='income'&&number(item.occurredAt)>=start).sort((a,b)=>a.occurredAt-b.occurredAt);
    const income=action.status==='partial'?(incomes.find(item=>number(item.occurredAt)>number(action.updatedAt))||null):incomes[0];
    if(!income)return;
    action.dueAt=number(income.occurredAt,at);
    action.sourceLocationId=income.walletId||action.sourceLocationId;
    action.destinationLocationId=rule.destinationLocationId||action.destinationLocationId;
    action.note=`income-trigger:${income.id}`;
  }

  function refreshReserveActions(state,inputDeps={},at=Date.now()){
    const deps=dependencies(inputDeps);const rule=currentReserveRule(state);if(!rule)return state.savingsActionOccurrences||[];
    if(rule.mode===RESERVE_PERCENT)ensureReservePercentageActions(state,rule,at);
    else anchorFixedMonthlyActionToIncome(state,rule,at);
    return state.savingsActionOccurrences||[];
  }

  function incomeDistributionBatches(state,inputDeps={},at=Date.now()){
    normalizeState(state,inputDeps,at);
    const byOperation=new Map();
    for(const action of state.savingsActionOccurrences||[]){
      if(!['planned','partial','postponed'].includes(action.status))continue;
      const operationId=incomeOperationIdFromAction(action);if(!operationId)continue;
      const operation=(state.operations||[]).find(item=>item.id===operationId&&item.status==='active'&&item.kind==='income');if(!operation)continue;
      if(!byOperation.has(operationId))byOperation.set(operationId,{id:`income-distribution:${operationId}`,operation,actions:[]});
      byOperation.get(operationId).actions.push(action);
    }
    return[...byOperation.values()].sort((a,b)=>b.operation.occurredAt-a.operation.occurredAt).map(batch=>({...batch,totalPlanned:round(batch.actions.reduce((sum,item)=>sum+Math.max(0,item.plannedAmount-item.actualAmount),0))}));
  }

  function bridgeShortage(state,money,asOf){
    const recommendation=money.giftFundRecommendation(state,{},asOf),current=round(recommendation.currentBalance),base=round(recommendation.baseContribution);let cumulative=0,maxShortage=0,criticalDate=null;
    for(const event of recommendation.events){
      cumulative=round(cumulative+event.budget);
      const start=new Date(monthStart(asOf)),end=new Date(event.nextDate),months=Math.max(1,(end.getFullYear()-start.getFullYear())*12+(end.getMonth()-start.getMonth())+1),shortage=round(Math.max(0,cumulative-current-base*months));
      if(shortage>maxShortage){maxShortage=shortage;criticalDate=event.nextDate}
    }
    return{recommendation,shortage:maxShortage,criticalDate};
  }

  function giftReserveBridgeProposal(state,inputDeps={},asOf=Date.now()){
    const deps=dependencies(inputDeps);normalizeState(state,deps,asOf);
    const reserve=reserveGoal(state),gift=giftGoal(state),shortage=bridgeShortage(state,deps.money,asOf),available=Math.max(0,round(reserve?.savedAmount||0)),amount=round(Math.min(shortage.shortage,available)),repaymentMonths=3,installment=amount?round(amount/repaymentMonths):0,reserveTarget=Math.max(0,round(reserve?.targetAmount||0)),afterReserve=round(Math.max(0,available-amount)),belowRecommended=Boolean(amount>0&&afterReserve<reserveTarget);
    return{available:Boolean(reserve&&gift&&amount>0),reserveGoalId:reserve?.id||null,giftFundGoalId:gift?.id||null,reserveBalance:available,reserveTarget,afterReserve,belowRecommended,shortage:shortage.shortage,criticalDate:shortage.criticalDate,amount,repaymentMonths,installment,transferConfirmationId:'gift-reserve-transfer',repaymentConfirmationId:'gift-reserve-repayment',belowRecommendedConfirmationId:'gift-reserve-below-recommended',requiresPerItemConfirmation:true};
  }

  function rollbackPurposeTransfer(state,result,amount){
    if(!result?.transfer)return;result.transfer.status='inactive';
    const sourceId=result.transfer.sourceAccountId?.startsWith('purpose:')?result.transfer.sourceAccountId.slice(8):'',destinationId=result.transfer.destinationAccountId?.startsWith('purpose:')?result.transfer.destinationAccountId.slice(8):'',source=(state.savingsGoals||[]).find(item=>item.id===sourceId),destination=(state.savingsGoals||[]).find(item=>item.id===destinationId);
    if(source)source.savedAmount=round(source.savedAmount+amount);if(destination)destination.savedAmount=round(Math.max(0,destination.savedAmount-amount));
  }

  function applyGiftReserveBridge(state,input,confirmed,actorId='member-anna',inputDeps={},at=Date.now()){
    const deps=dependencies(inputDeps);normalizeState(state,deps,at);const proposal=giftReserveBridgeProposal(state,deps,at),confirmedSet=new Set(confirmed||[]);
    if(!proposal.available)return{ok:false,error:'Сейчас резерв не может покрыть временную нехватку фонда подарков.'};
    if(!confirmedSet.has(proposal.transferConfirmationId))return{ok:false,error:'Отдельно подтвердите перевод из резерва в фонд подарков.'};
    if(!confirmedSet.has(proposal.repaymentConfirmationId))return{ok:false,error:'Отдельно подтвердите план возврата в резерв.'};
    if(proposal.belowRecommended&&!confirmedSet.has(proposal.belowRecommendedConfirmationId))return{ok:false,error:'Отдельно подтвердите временное снижение резерва ниже рекомендуемого уровня.'};
    const amount=round(Math.min(number(input?.amount,proposal.amount),proposal.reserveBalance));if(!amount)return{ok:false,error:'Укажите сумму временного перевода.'};
    const repaymentMonths=Math.max(1,Math.min(24,Math.trunc(number(input?.repaymentMonths,proposal.repaymentMonths))));
    const baseCapital=deps.scope?.capitalSnapshot?.(state)?.capital||0,economicEventId=uid('gift-reserve-bridge',at),purpose=deps.accounts.createTransfer(state,{sourceAccountId:`purpose:${proposal.reserveGoalId}`,destinationAccountId:`purpose:${proposal.giftFundGoalId}`,amount,effectiveDate:at,note:'Временное покрытие фонда подарков из резерва'},baseCapital,actorId,at);
    if(!purpose.ok)return purpose;
    purpose.transfer.economicEventId=economicEventId;
    const reserveAssignment=deps.money.assignmentFor(state,proposal.reserveGoalId,deps,at),giftAssignment=deps.money.assignmentFor(state,proposal.giftFundGoalId,deps,at);let physical=null;
    if(reserveAssignment?.locationId&&giftAssignment?.locationId&&reserveAssignment.locationId!==giftAssignment.locationId){
      physical=deps.transfers.createTransfer(state,{sourceWalletId:reserveAssignment.locationId,destinationWalletId:giftAssignment.locationId,amount,effectiveDate:at,note:'Резерв → Фонд подарков'},actorId,at);
      if(!physical.ok){rollbackPurposeTransfer(state,purpose,amount);return physical}
      physical.transfer.economicEventId=economicEventId;physical.transfer.purposeGoalId=proposal.giftFundGoalId;
    }
    const loan=normalizeBridge({id:uid('gift-reserve-bridge',at),reserveGoalId:proposal.reserveGoalId,giftFundGoalId:proposal.giftFundGoalId,amount,repaymentMonths,purposeTransferId:purpose.transfer.id,walletTransferId:physical?.transfer?.id||'',economicEventId,createdAt:at,createdByMemberId:actorId},at),installment=round(amount/repaymentMonths),sourceLocationId=state.defaultOperatingLocationId||defaultLocation(state)?.id||'',destinationLocationId=reserveAssignment?.locationId||sourceLocationId;
    let remaining=amount;
    for(let index=1;index<=repaymentMonths;index++){
      const planned=index===repaymentMonths?round(remaining):round(Math.min(remaining,installment));remaining=round(remaining-planned);const dueAt=dateAtDay(addMonths(monthStart(at),index),1),action={id:uid('savings-action',at+index),sourceType:'monthly_plan',sourceId:`gift-reserve-repayment:${loan.id}:${index}`,goalId:proposal.reserveGoalId,title:'Вернуть в резерв после фонда подарков',plannedAmount:planned,actualAmount:0,dueAt,sourceLocationId,destinationLocationId,status:'planned',savingsTransferIds:[],walletTransferIds:[],createdAt:at,createdByMemberId:actorId,updatedAt:at,updatedByMemberId:actorId,note:`gift-reserve-loan:${loan.id}`};state.savingsActionOccurrences.push(action);loan.repaymentActionIds.push(action.id)
    }
    state.giftFundReserveBridges.push(loan);return{ok:true,loan,purposeTransfer:purpose.transfer,walletTransfer:physical?.transfer||null};
  }

  function syncBridgeStatus(state){
    for(const bridge of state.giftFundReserveBridges||[]){if(bridge.status!=='active')continue;const actions=(state.savingsActionOccurrences||[]).filter(item=>bridge.repaymentActionIds.includes(item.id));if(actions.length&&actions.every(item=>item.status==='completed'))bridge.status='repaid'}return state.giftFundReserveBridges||[];
  }

  function ensureCategory(state,kind,name,at){
    state.categories=Array.isArray(state.categories)?state.categories:[];let category=state.categories.find(item=>item.kind===kind&&!item.archivedAt);if(category)return category;
    category={id:uid(`category-${kind}`,at),name,kind,parentId:null,archivedAt:null,createdAt:at,createdByMemberId:state.currentMemberId||'member-anna'};state.categories.push(category);return category;
  }

  function onboardingDraft(state,inputDeps={},at=Date.now()){
    normalizeState(state,inputDeps,at);return JSON.parse(JSON.stringify(state.starterOnboarding.draft));
  }

  function saveOnboardingDraft(state,draft,step=0,inputDeps={},at=Date.now()){
    normalizeState(state,inputDeps,at);state.starterOnboarding.status='draft';state.starterOnboarding.currentStep=Math.max(0,Math.min(5,Math.trunc(number(step,0))));state.starterOnboarding.draft=normalizeOnboarding({draft}).draft;return{ok:true,onboarding:state.starterOnboarding};
  }

  function onboardingReview(state,draft,inputDeps={},at=Date.now()){
    normalizeState(state,inputDeps,at);const value=normalizeOnboarding({draft}).draft,items=[];
    items.push({key:'money',title:'Стартовые деньги',summary:`Банк ${value.bankBalanceKnown?`${round(value.bankBalance)} €`:'не указан'}, наличные ${value.cashBalanceKnown?`${round(value.cashBalance)} €`:'не указаны'}`});
    if(value.plannedIncomeEnabled&&value.plannedIncomeAmount>0)items.push({key:'income',title:'Плановый доход',summary:`${value.plannedIncomeName}: ${value.plannedIncomeAmount} € в месяц`});
    if(value.obligationEnabled&&value.obligationAmount>0)items.push({key:'obligation',title:'Обязательные расходы',summary:`${value.obligationName}: ${value.obligationAmount} € в месяц`});
    if(value.debtEnabled&&value.debtAmount>0)items.push({key:'debt',title:'Долг',summary:`${value.debtDirection==='liability'?'Я должен':'Мне должны'} ${value.debtAmount} €`});
    if(value.generalSavingsEnabled)items.push({key:'generalSavings',title:'Общие накопления',summary:`${value.generalSavingsPercentage}% с фактического дохода`});
    if(value.reserveEnabled)items.push({key:'reserve',title:'Резерв (непредвиденные расходы)',summary:value.reserveMode===RESERVE_FIXED?`${value.reserveValue} € в месяц`:`${value.reserveValue}% с фактического дохода`});
    if(value.birthdayEnabled&&value.birthdayName)items.push({key:'birthday',title:'День рождения',summary:`${value.birthdayName}, бюджет ${value.birthdayBudget} €`});
    return{draft:value,items,confirmationId:'starter-onboarding-apply',canonicalRecordsOnly:true};
  }

  function setActualLocationBalance(state,locationId,balance,actorId,deps,at){
    if(balance<0)return{ok:false,error:'Остаток не может быть отрицательным.'};
    const current=deps.scope?.walletCapitalSnapshot?.(state,locationId)?.capital||0;if(Math.abs(current-balance)<.005)return{ok:true,unchanged:true};
    return deps.money.createBalanceAdjustment(state,{walletId:locationId,newBalance:balance,occurredAt:at,note:'Стартовая настройка'},actorId,deps,at);
  }

  function applyOnboarding(state,draft,confirmed,actorId='member-anna',inputDeps={},at=Date.now()){
    const deps=dependencies(inputDeps);normalizeState(state,deps,at);const review=onboardingReview(state,draft,deps,at),confirmedSet=new Set(confirmed||[]);if(!confirmedSet.has(review.confirmationId))return{ok:false,error:'Подтвердите итог первичной настройки.'};
    if(state.starterOnboarding.status==='completed')return{ok:false,error:'Первичная настройка уже завершена.'};
    const value=review.draft,created={};let bank=defaultLocation(state);if(!bank)return{ok:false,error:'Основной банковский счёт не найден.'};
    if(value.bankBalanceKnown){const bankResult=setActualLocationBalance(state,bank.id,value.bankBalance,actorId,deps,at);if(!bankResult.ok)return bankResult}created.bankLocationId=bank.id;
    let cash=activeWallets(state).find(item=>item.moneyForm==='cash'&&item.name==='Наличные');
    if(value.cashBalanceKnown&&value.cashBalance>0&&!cash){const result=deps.wallets.createLocation(state,state.members||[],{name:'Наличные',locationKind:'cash_wallet',openingBalance:value.cashBalance},actorId,at);if(!result.ok)return result;cash=result.wallet}
    else if(value.cashBalanceKnown&&cash&&value.cashBalance>=0){const result=setActualLocationBalance(state,cash.id,value.cashBalance,actorId,deps,at);if(!result.ok)return result}
    if(cash)created.cashLocationId=cash.id;
    const incomeCategory=ensureCategory(state,'income','Доход',at),expenseCategory=ensureCategory(state,'expense','Обязательные расходы',at);
    if(value.plannedIncomeEnabled&&value.plannedIncomeAmount>0){deps.plannedIncome.normalizeState(state,at);const dueAt=dateAtDay(at,value.plannedIncomeDay),result=deps.plannedIncome.createRule(state,{name:value.plannedIncomeName,amount:value.plannedIncomeAmount,dueAt,cadence:'recurring',intervalValue:1,intervalUnit:'month',endingMode:'unlimited',walletId:bank.id,categoryId:incomeCategory.id,currency:'EUR',note:'Создано первичной настройкой'},actorId,at);if(!result.ok)return result;created.plannedIncomeRuleId=result.rule.id}
    if(value.obligationEnabled&&value.obligationAmount>0){deps.obligations.normalizeState(state,at);const dueAt=dateAtDay(at,value.obligationDay),result=deps.obligations.createRule(state,{name:value.obligationName,amount:value.obligationAmount,dueAt,cadence:'recurring',intervalValue:1,intervalUnit:'month',endingMode:'unlimited',walletId:bank.id,categoryId:expenseCategory.id,currency:'EUR',note:'Создано первичной настройкой'},actorId,at);if(!result.ok)return result;created.obligationRuleId=result.rule.id}
    if(value.debtEnabled&&value.debtAmount>0&&value.debtCounterparty){deps.debts.normalizeState(state,at);const result=deps.debts.createSourceEvent(state,{counterpartyName:value.debtCounterparty,counterpartyKind:'person',action:value.debtDirection==='liability'?'opening_liability':'opening_receivable',amount:value.debtAmount,occurredAt:at,walletId:bank.id,currency:'EUR',comment:'Стартовая настройка'},actorId,at);if(!result.ok)return result;created.debtEventId=result.event?.id||''}
    const chosenGeneral=wallet(state,value.generalSavingsLocationId)||activeWallets(state).find(item=>item.locationKind==='bank_savings')||bank;
    if(value.generalSavingsEnabled){const result=deps.money.configureIncomeSavingsRule(state,{percentage:value.generalSavingsPercentage,destinationLocationId:chosenGeneral.id},deps.savings,actorId,deps,at);if(!result.ok)return result;created.generalSavingsRuleId=result.rule.id}
    const chosenReserve=wallet(state,value.reserveLocationId)||activeWallets(state).find(item=>item.locationKind==='bank_savings')||bank;
    if(value.reserveEnabled){const result=configureReserveRule(state,{mode:value.reserveMode,value:value.reserveValue,destinationLocationId:chosenReserve.id,contributionDay:1},actorId,deps,at);if(!result.ok)return result;created.reserveRuleId=result.rule.id}
    if(value.birthdayEnabled&&value.birthdayName&&value.birthdayDate){const result=deps.money.createBirthday(state,{name:value.birthdayName,birthDate:value.birthdayDate,relationship:value.birthdayRelationship,budget:value.birthdayBudget,leadDays:30,notes:'Создано первичной настройкой'},actorId,deps,at);if(!result.ok)return result;created.birthdayId=result.event.id}
    state.starterOnboarding={status:'completed',currentStep:5,draft:value,completedAt:at,completedByMemberId:actorId,createdRecordIds:created};
    normalizeState(state,deps,at);return{ok:true,onboarding:state.starterOnboarding,created};
  }

  return Object.freeze({DAY,RESERVE_FIXED,RESERVE_PERCENT,normalizeState,currentReserveRule,configureReserveRule,disableReserveRule,refreshReserveActions,incomeDistributionBatches,giftReserveBridgeProposal,applyGiftReserveBridge,syncBridgeStatus,onboardingDraft,saveOnboardingDraft,onboardingReview,applyOnboarding});
});
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FamilyPilotMoneyPlanning=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const DAY=86400000;
  const GENERAL_SAVINGS_NAME='Общие накопления';
  const RESERVE_NAME='Резерв (непредвиденные расходы)';
  const GIFT_FUND_NAME='Фонд подарков';
  const MAX_AMOUNT=9999999.99;
  const round=value=>Math.round((Number(value)||0)*100)/100;
  const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const clean=value=>String(value||'').trim().replace(/\s+/g,' ');
  const makeId=(prefix='id',at=Date.now())=>`${prefix}-${Number(at).toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const dateText=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:''};
  const startOfDay=value=>{const d=new Date(value);return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()};
  const monthKey=value=>{const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`};
  const monthStart=value=>{const d=new Date(value);return new Date(d.getFullYear(),d.getMonth(),1).getTime()};
  const addMonths=(value,count)=>{const d=new Date(value);return new Date(d.getFullYear(),d.getMonth()+count,1).getTime()};
  const endOfMonth=value=>addMonths(monthStart(value),1)-1;

  function dependencies(input={}){
    return{
      wallets:input.wallets||globalThis.FamilyPilotWalletManagement,
      transfers:input.transfers||globalThis.FamilyPilotWalletTransfers,
      savings:input.savings||globalThis.FamilyPilotSavingsGoals,
      accounts:input.accounts||globalThis.FamilyPilotSavingsAccounts,
      scope:input.scope||globalThis.FamilyPilotScope,
    };
  }

  function activeWallets(state){return(Array.isArray(state?.wallets)?state.wallets:[]).filter(item=>item&&!item.archivedAt&&item.includedInHouseholdCapital===true)}
  function defaultLocation(state){return activeWallets(state).find(item=>item.type==='household_default')||activeWallets(state)[0]||null}
  function goal(state,id){return(Array.isArray(state?.savingsGoals)?state.savingsGoals:[]).find(item=>item.id===id&&item.status==='active')||null}
  function location(state,id){return activeWallets(state).find(item=>item.id===id)||null}

  function normalizeAssignment(raw,state,at=Date.now()){
    const wallet=location(state,raw?.locationId)||defaultLocation(state);
    return{
      goalId:String(raw?.goalId||''),
      locationId:String(wallet?.id||''),
      protectionMode:wallet?.psychologicalProtection==='separate'?'separate':'logical',
      status:raw?.status==='inactive'?'inactive':'active',
      updatedAt:number(raw?.updatedAt,at),
      updatedByMemberId:String(raw?.updatedByMemberId||'member-anna')
    };
  }

  function normalizeRule(raw,state,at=Date.now()){
    const wallet=location(state,raw?.destinationLocationId)||defaultLocation(state);
    return{
      id:String(raw?.id||makeId('savings-income-rule',at)),
      type:'income_percentage',
      percentage:Math.max(.01,Math.min(100,round(number(raw?.percentage,10)))),
      goalId:String(raw?.goalId||state?.specialPurposeGoalIds?.generalSavings||''),
      destinationLocationId:String(wallet?.id||''),
      status:raw?.status==='inactive'?'inactive':'active',
      createdAt:number(raw?.createdAt,at),
      createdByMemberId:String(raw?.createdByMemberId||'member-anna'),
      updatedAt:number(raw?.updatedAt,raw?.createdAt||at),
      updatedByMemberId:String(raw?.updatedByMemberId||raw?.createdByMemberId||'member-anna')
    };
  }

  function normalizeAction(raw,state,at=Date.now()){
    const status=['planned','partial','completed','skipped','postponed','inactive'].includes(raw?.status)?raw.status:'planned';
    const source=location(state,raw?.sourceLocationId)||defaultLocation(state);
    const destination=location(state,raw?.destinationLocationId)||source||defaultLocation(state);
    return{
      id:String(raw?.id||makeId('savings-action',at)),
      sourceType:raw?.sourceType==='income_rule'?'income_rule':'monthly_plan',
      sourceId:String(raw?.sourceId||''),
      goalId:String(raw?.goalId||''),
      title:clean(raw?.title)||'Перевод в накопления',
      plannedAmount:Math.max(0,round(raw?.plannedAmount)),
      actualAmount:Math.max(0,round(raw?.actualAmount)),
      dueAt:number(raw?.dueAt,at),
      sourceLocationId:String(source?.id||''),
      destinationLocationId:String(destination?.id||''),
      status,
      savingsTransferIds:Array.isArray(raw?.savingsTransferIds)?raw.savingsTransferIds.map(String):[],
      walletTransferIds:Array.isArray(raw?.walletTransferIds)?raw.walletTransferIds.map(String):[],
      createdAt:number(raw?.createdAt,at),
      createdByMemberId:String(raw?.createdByMemberId||'member-anna'),
      updatedAt:number(raw?.updatedAt,raw?.createdAt||at),
      updatedByMemberId:String(raw?.updatedByMemberId||raw?.createdByMemberId||'member-anna'),
      note:clean(raw?.note)
    };
  }

  function normalizeAdjustment(raw,state,at=Date.now()){
    const wallet=location(state,raw?.walletId)||defaultLocation(state);
    return{
      id:String(raw?.id||makeId('balance-adjustment',at)),
      walletId:String(wallet?.id||''),
      previousBalance:round(raw?.previousBalance),
      newBalance:round(raw?.newBalance),
      delta:round(raw?.delta),
      occurredAt:number(raw?.occurredAt,at),
      note:clean(raw?.note),
      status:raw?.status==='inactive'?'inactive':'active',
      createdAt:number(raw?.createdAt,at),
      createdByMemberId:String(raw?.createdByMemberId||'member-anna')
    };
  }

  function normalizeBirthday(raw,at=Date.now()){
    return{
      id:String(raw?.id||makeId('birthday',at)),
      name:clean(raw?.name),
      birthDate:String(raw?.birthDate||''),
      relationship:clean(raw?.relationship),
      budget:Math.max(0,round(raw?.budget)),
      leadDays:Math.max(0,Math.min(180,Math.trunc(number(raw?.leadDays,30)))),
      notes:clean(raw?.notes),
      giftPurchased:Boolean(raw?.giftPurchased),
      linkedExpenseOperationId:String(raw?.linkedExpenseOperationId||''),
      status:raw?.status==='archived'?'archived':'active',
      createdAt:number(raw?.createdAt,at),
      createdByMemberId:String(raw?.createdByMemberId||'member-anna'),
      updatedAt:number(raw?.updatedAt,raw?.createdAt||at),
      updatedByMemberId:String(raw?.updatedByMemberId||raw?.createdByMemberId||'member-anna')
    };
  }

  function normalizeState(state,inputDeps={},at=Date.now()){
    if(!state||typeof state!=='object')throw new Error('FamilyPilot state is required');
    const deps=dependencies(inputDeps);
    deps.wallets?.normalizeState?.(state,state.members||[],at);
    deps.accounts?.normalizeState?.(state,at);
    state.schemaVersion=Math.max(14,number(state.schemaVersion));
    state.specialPurposeGoalIds=state.specialPurposeGoalIds&&typeof state.specialPurposeGoalIds==='object'?state.specialPurposeGoalIds:{};
    state.purposeLocationAssignments=(Array.isArray(state.purposeLocationAssignments)?state.purposeLocationAssignments:[]).filter(Boolean).map(item=>normalizeAssignment(item,state,at));
    state.savingsRules=(Array.isArray(state.savingsRules)?state.savingsRules:[]).filter(Boolean).map(item=>normalizeRule(item,state,at));
    state.savingsActionOccurrences=(Array.isArray(state.savingsActionOccurrences)?state.savingsActionOccurrences:[]).filter(Boolean).map(item=>normalizeAction(item,state,at));
    state.balanceAdjustments=(Array.isArray(state.balanceAdjustments)?state.balanceAdjustments:[]).filter(Boolean).map(item=>normalizeAdjustment(item,state,at));
    state.birthdayEvents=(Array.isArray(state.birthdayEvents)?state.birthdayEvents:[]).filter(Boolean).map(item=>normalizeBirthday(item,at));
    state.giftFundSettings=state.giftFundSettings&&typeof state.giftFundSettings==='object'?state.giftFundSettings:{};
    state.investmentLocationAssignments=Array.isArray(state.investmentLocationAssignments)?state.investmentLocationAssignments:[];
    const activeGoalIds=new Set((state.savingsGoals||[]).filter(item=>item.status==='active').map(item=>String(item.id)));
    const walletIds=new Set(activeWallets(state).map(item=>String(item.id)));
    state.purposeLocationAssignments=state.purposeLocationAssignments.filter(item=>activeGoalIds.has(item.goalId)&&walletIds.has(item.locationId)&&item.status==='active');
    const fallback=defaultLocation(state)?.id||'';
    for(const goalId of activeGoalIds)if(!state.purposeLocationAssignments.some(item=>item.goalId===goalId))state.purposeLocationAssignments.push(normalizeAssignment({goalId,locationId:fallback},state,at));
    const reserve=goal(state,state.reserveSavingsGoalId);
    if(reserve&&['Резерв на покрытие дефицита','Резерв на непредвиденный случай'].includes(reserve.name))reserve.name=RESERVE_NAME;
    refreshActionOccurrences(state,deps,at);
    return state;
  }

  function assignmentFor(state,goalId,inputDeps={},at=Date.now()){
    normalizeState(state,inputDeps,at);
    return state.purposeLocationAssignments.find(item=>item.goalId===goalId&&item.status==='active')||null;
  }

  function setPurposeLocation(state,goalId,locationId,actorId='member-anna',inputDeps={},at=Date.now()){
    normalizeState(state,inputDeps,at);
    if(!goal(state,goalId))return{ok:false,error:'Накопление не найдено.'};
    const wallet=location(state,locationId);if(!wallet)return{ok:false,error:'Место хранения не найдено.'};
    let item=state.purposeLocationAssignments.find(entry=>entry.goalId===goalId&&entry.status==='active');
    if(!item){item=normalizeAssignment({goalId,locationId},state,at);state.purposeLocationAssignments.push(item)}
    item.locationId=locationId;item.protectionMode=wallet.psychologicalProtection==='separate'?'separate':'logical';item.updatedAt=at;item.updatedByMemberId=actorId;
    return{ok:true,assignment:item,warning:item.protectionMode==='logical'?'Деньги остаются видимыми в общем остатке. Отдельный счёт или конверт защищает накопление лучше.':''};
  }

  function ensureSpecialGoal(state,key,name,targetAmount,legacy,actorId='member-anna',at=Date.now()){
    state.specialPurposeGoalIds=state.specialPurposeGoalIds||{};
    let existing=goal(state,state.specialPurposeGoalIds[key]);
    if(existing){if(existing.name!==name)existing.name=name;return{ok:true,goal:existing,existing:true}}
    const byName=(state.savingsGoals||[]).find(item=>item.status==='active'&&item.name===name);
    if(byName){state.specialPurposeGoalIds[key]=byName.id;return{ok:true,goal:byName,existing:true}}
    const created=legacy.createGoal(state,{name,targetAmount:Math.max(.01,Math.min(MAX_AMOUNT,targetAmount||MAX_AMOUNT)),savedAmount:0,targetDate:''},actorId,at);
    if(!created.ok)return created;
    state.specialPurposeGoalIds[key]=created.goal.id;
    return created;
  }

  function ensureGeneralSavingsGoal(state,legacy,actorId='member-anna',inputDeps={},at=Date.now()){
    normalizeState(state,inputDeps,at);
    const result=ensureSpecialGoal(state,'generalSavings',GENERAL_SAVINGS_NAME,MAX_AMOUNT,legacy,actorId,at);
    if(result.ok&&!assignmentFor(state,result.goal.id,inputDeps,at))setPurposeLocation(state,result.goal.id,defaultLocation(state)?.id,actorId,inputDeps,at);
    return result;
  }

  function configureIncomeSavingsRule(state,input,legacy,actorId='member-anna',inputDeps={},at=Date.now()){
    const deps=dependencies(inputDeps);normalizeState(state,deps,at);
    const percentage=round(number(input?.percentage,NaN));
    if(!Number.isFinite(percentage)||percentage<=0||percentage>100)return{ok:false,error:'Укажите процент от 0,01 до 100.'};
    const destination=location(state,input?.destinationLocationId);if(!destination)return{ok:false,error:'Выберите, где будут храниться общие накопления.'};
    const general=ensureGeneralSavingsGoal(state,legacy,actorId,deps,at);if(!general.ok)return general;
    setPurposeLocation(state,general.goal.id,destination.id,actorId,deps,at);
    let rule=state.savingsRules.find(item=>item.type==='income_percentage'&&item.status==='active');
    if(!rule){rule=normalizeRule({id:makeId('savings-income-rule',at),percentage,goalId:general.goal.id,destinationLocationId:destination.id,createdAt:at,createdByMemberId:actorId},state,at);state.savingsRules.push(rule)}
    else Object.assign(rule,{percentage,goalId:general.goal.id,destinationLocationId:destination.id,updatedAt:at,updatedByMemberId:actorId,status:'active'});
    refreshActionOccurrences(state,deps,at);
    return{ok:true,rule,goal:general.goal};
  }

  function disableIncomeSavingsRule(state,actorId='member-anna',inputDeps={},at=Date.now()){
    normalizeState(state,inputDeps,at);
    const rule=state.savingsRules.find(item=>item.type==='income_percentage'&&item.status==='active');
    if(!rule)return{ok:true,unchanged:true};
    rule.status='inactive';rule.updatedAt=at;rule.updatedByMemberId=actorId;
    return{ok:true,rule};
  }

  function ensureIncomeOccurrences(state,deps,at){
    for(const rule of state.savingsRules.filter(item=>item.status==='active'&&item.type==='income_percentage')){
      for(const operation of (state.operations||[]).filter(item=>item?.status==='active'&&item?.kind==='income'&&number(item.occurredAt)>=number(rule.createdAt))){
        const key=`income:${rule.id}:${operation.id}`;
        let occurrence=state.savingsActionOccurrences.find(item=>item.sourceType==='income_rule'&&item.sourceId===key);
        const plannedAmount=round(number(operation.amount)*rule.percentage/100);
        if(!occurrence){
          occurrence=normalizeAction({id:makeId('savings-action',at),sourceType:'income_rule',sourceId:key,goalId:rule.goalId,title:`Отложить ${rule.percentage}% с полученного дохода`,plannedAmount,dueAt:number(operation.occurredAt,at),sourceLocationId:operation.walletId,destinationLocationId:rule.destinationLocationId,createdAt:at,createdByMemberId:state.currentMemberId},state,at);
          state.savingsActionOccurrences.push(occurrence);
        }else if(['planned','partial','postponed'].includes(occurrence.status)){
          occurrence.plannedAmount=plannedAmount;occurrence.sourceLocationId=operation.walletId;occurrence.destinationLocationId=rule.destinationLocationId;occurrence.goalId=rule.goalId;occurrence.updatedAt=at;
        }
      }
      for(const occurrence of state.savingsActionOccurrences.filter(item=>item.sourceType==='income_rule'&&item.sourceId.startsWith(`income:${rule.id}:`))){
        const operationId=occurrence.sourceId.slice(`income:${rule.id}:`.length),operation=(state.operations||[]).find(item=>item.id===operationId&&item.status==='active'&&item.kind==='income');
        if(!operation&&['planned','partial','postponed'].includes(occurrence.status))occurrence.status='inactive';
      }
    }
  }

  function ensureMonthlyOccurrences(state,deps,at){
    const currentMonth=monthKey(at),currentStart=monthStart(at),currentEnd=endOfMonth(at),generalId=state.specialPurposeGoalIds?.generalSavings;
    for(const item of (state.savingsGoals||[]).filter(entry=>entry.status==='active'&&entry.id!==generalId)){
      const plan=deps.accounts?.planFor?.(state,item.id),snapshot=deps.accounts?.planSnapshot?.(state,item,currentStart);
      if(!plan||!snapshot||snapshot.missing||snapshot.remaining<=0||snapshot.requiredMonthly<=0)continue;
      const sourceId=`monthly:${item.id}:${currentMonth}`;
      const dueAt=new Date(new Date(currentStart).getFullYear(),new Date(currentStart).getMonth(),Math.max(1,Math.min(28,plan.contributionDay||1))).getTime();
      if(dueAt<currentStart||dueAt>currentEnd)continue;
      const assigned=state.purposeLocationAssignments.find(entry=>entry.goalId===item.id&&entry.status==='active');
      let occurrence=state.savingsActionOccurrences.find(entry=>entry.sourceType==='monthly_plan'&&entry.sourceId===sourceId);
      if(!occurrence){
        occurrence=normalizeAction({id:makeId('savings-action',at),sourceType:'monthly_plan',sourceId,goalId:item.id,title:`Пополнить: ${item.name}`,plannedAmount:snapshot.requiredMonthly,dueAt,sourceLocationId:state.defaultOperatingLocationId||defaultLocation(state)?.id,destinationLocationId:assigned?.locationId||defaultLocation(state)?.id,createdAt:at,createdByMemberId:state.currentMemberId},state,at);
        state.savingsActionOccurrences.push(occurrence);
      }else if(['planned','postponed'].includes(occurrence.status)&&occurrence.actualAmount===0){occurrence.plannedAmount=round(snapshot.requiredMonthly);occurrence.destinationLocationId=assigned?.locationId||occurrence.destinationLocationId}
    }
  }

  function refreshActionOccurrences(state,inputDeps={},at=Date.now()){
    const deps=dependencies(inputDeps);
    if(!Array.isArray(state.savingsActionOccurrences))state.savingsActionOccurrences=[];
    ensureIncomeOccurrences(state,deps,at);
    ensureMonthlyOccurrences(state,deps,at);
    return state.savingsActionOccurrences;
  }

  function pendingActions(state,inputDeps={},at=Date.now()){
    normalizeState(state,inputDeps,at);
    return state.savingsActionOccurrences.filter(item=>['planned','partial','postponed'].includes(item.status)).sort((a,b)=>a.dueAt-b.dueAt||a.createdAt-b.createdAt);
  }

  function rollbackPurposeTransfer(state,result,amount){
    if(!result?.transfer)return;
    result.transfer.status='inactive';
    const goalId=result.transfer.destinationAccountId?.startsWith('purpose:')?result.transfer.destinationAccountId.slice(8):'';
    const target=goal(state,goalId);if(target)target.savedAmount=round(Math.max(0,target.savedAmount-amount));
  }

  function completeAction(state,actionId,input,actorId='member-anna',inputDeps={},at=Date.now()){
    const deps=dependencies(inputDeps);normalizeState(state,deps,at);
    const action=state.savingsActionOccurrences.find(item=>item.id===actionId&&['planned','partial','postponed'].includes(item.status));
    if(!action)return{ok:false,error:'Плановый перевод не найден или уже закрыт.'};
    const remaining=round(Math.max(0,action.plannedAmount-action.actualAmount));
    const outcome=String(input?.outcome||'full');
    if(outcome==='skipped'){action.status='skipped';action.updatedAt=at;action.updatedByMemberId=actorId;return{ok:true,action}}
    if(outcome==='postponed'){
      const dueAt=number(input?.dueAt,NaN);if(!Number.isFinite(dueAt))return{ok:false,error:'Укажите новую дату.'};
      action.dueAt=dueAt;action.status='postponed';action.updatedAt=at;action.updatedByMemberId=actorId;return{ok:true,action};
    }
    const amount=round(outcome==='full'?remaining:number(input?.amount,NaN));
    if(!Number.isFinite(amount)||amount<=0||amount>MAX_AMOUNT)return{ok:false,error:'Укажите фактически переведённую сумму больше нуля.'};
    const sourceLocationId=String(input?.sourceLocationId||action.sourceLocationId),destinationLocationId=String(input?.destinationLocationId||action.destinationLocationId);
    const source=location(state,sourceLocationId),destination=location(state,destinationLocationId);
    if(!source||!destination)return{ok:false,error:'Выберите реальные места хранения денег.'};
    const targetGoal=goal(state,action.goalId);if(!targetGoal)return{ok:false,error:'Накопление для перевода не найдено.'};
    const baseCapital=deps.scope?.capitalSnapshot?.(state)?.capital||0;
    if(sourceLocationId!==destinationLocationId){
      const available=deps.scope?.walletCapitalSnapshot?.(state,sourceLocationId)?.capital||0;
      if(amount>available+.005)return{ok:false,error:`В месте «${source.name}» недостаточно денег.`};
      const validation=deps.transfers?.validation?.(state,{sourceWalletId:sourceLocationId,destinationWalletId:destinationLocationId,amount,effectiveDate:number(input?.effectiveDate,at),note:`${action.title} · ${targetGoal.name}`},actorId);
      if(validation&&!validation.ok)return validation;
    }
    const economicEventId=makeId('savings-execution',at);
    const purposeResult=deps.accounts.createTransfer(state,{sourceAccountId:deps.accounts.OPERATING_ACCOUNT_ID,destinationAccountId:`purpose:${targetGoal.id}`,amount,effectiveDate:number(input?.effectiveDate,at),note:action.title},baseCapital,actorId,at);
    if(!purposeResult.ok)return purposeResult;
    purposeResult.transfer.economicEventId=economicEventId;purposeResult.transfer.actionOccurrenceId=action.id;purposeResult.transfer.sourceLocationId=sourceLocationId;purposeResult.transfer.destinationLocationId=destinationLocationId;
    let physicalResult=null;
    if(sourceLocationId!==destinationLocationId){
      physicalResult=deps.transfers.createTransfer(state,{sourceWalletId:sourceLocationId,destinationWalletId:destinationLocationId,amount,effectiveDate:number(input?.effectiveDate,at),note:`${action.title} · ${targetGoal.name}`},actorId,at);
      if(!physicalResult.ok){rollbackPurposeTransfer(state,purposeResult,amount);return physicalResult}
      physicalResult.transfer.economicEventId=economicEventId;physicalResult.transfer.actionOccurrenceId=action.id;physicalResult.transfer.purposeGoalId=targetGoal.id;
    }
    setPurposeLocation(state,targetGoal.id,destinationLocationId,actorId,deps,at);
    action.actualAmount=round(action.actualAmount+amount);
    action.sourceLocationId=sourceLocationId;action.destinationLocationId=destinationLocationId;
    action.savingsTransferIds.push(purposeResult.transfer.id);if(physicalResult?.transfer?.id)action.walletTransferIds.push(physicalResult.transfer.id);
    action.status=action.actualAmount+0.005>=action.plannedAmount?'completed':'partial';action.updatedAt=at;action.updatedByMemberId=actorId;
    return{ok:true,action,purposeTransfer:purposeResult.transfer,walletTransfer:physicalResult?.transfer||null,economicEventId};
  }

  function createBalanceAdjustment(state,input,actorId='member-anna',inputDeps={},at=Date.now()){
    const deps=dependencies(inputDeps);normalizeState(state,deps,at);
    const wallet=location(state,input?.walletId);if(!wallet)return{ok:false,error:'Место хранения не найдено.'};
    const current=round(deps.scope?.walletCapitalSnapshot?.(state,wallet.id)?.capital||0),next=round(number(input?.newBalance,NaN));
    if(!Number.isFinite(next)||next<0||next>MAX_AMOUNT)return{ok:false,error:'Укажите корректный фактический остаток.'};
    const delta=round(next-current);if(Math.abs(delta)<.005)return{ok:true,unchanged:true,currentBalance:current};
    const adjustment=normalizeAdjustment({id:makeId('balance-adjustment',at),walletId:wallet.id,previousBalance:current,newBalance:next,delta,occurredAt:number(input?.occurredAt,at),note:input?.note,createdAt:at,createdByMemberId:actorId},state,at);
    state.balanceAdjustments.push(adjustment);
    return{ok:true,adjustment};
  }

  function createBirthday(state,input,actorId='member-anna',inputDeps={},at=Date.now()){
    normalizeState(state,inputDeps,at);
    const name=clean(input?.name),birthDate=String(input?.birthDate||''),budget=round(number(input?.budget,NaN));
    if(!name)return{ok:false,error:'Введите имя.'};
    if(!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)||!Number.isFinite(new Date(`${birthDate}T00:00:00`).getTime()))return{ok:false,error:'Укажите дату рождения.'};
    if(!Number.isFinite(budget)||budget<0||budget>MAX_AMOUNT)return{ok:false,error:'Укажите корректный бюджет подарка.'};
    const event=normalizeBirthday({id:makeId('birthday',at),name,birthDate,relationship:input?.relationship,budget,leadDays:input?.leadDays,notes:input?.notes,createdAt:at,createdByMemberId:actorId},at);
    state.birthdayEvents.push(event);return{ok:true,event};
  }

  function updateBirthday(state,eventId,input,actorId='member-anna',inputDeps={},at=Date.now()){
    normalizeState(state,inputDeps,at);const item=state.birthdayEvents.find(event=>event.id===eventId&&event.status==='active');if(!item)return{ok:false,error:'Событие не найдено.'};
    const name=clean(input?.name),birthDate=String(input?.birthDate||''),budget=round(number(input?.budget,NaN));
    if(!name||!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)||!Number.isFinite(budget)||budget<0)return{ok:false,error:'Проверьте имя, дату и бюджет.'};
    Object.assign(item,{name,birthDate,relationship:clean(input?.relationship),budget,leadDays:Math.max(0,Math.min(180,Math.trunc(number(input?.leadDays,30)))),notes:clean(input?.notes),updatedAt:at,updatedByMemberId:actorId});
    return{ok:true,event:item};
  }

  function nextBirthdayDate(birthDate,asOf=Date.now()){
    const parsed=new Date(`${birthDate}T00:00:00`);if(!Number.isFinite(parsed.getTime()))return null;
    const today=startOfDay(asOf),month=parsed.getMonth(),dayOfMonth=parsed.getDate(),year=new Date(today).getFullYear();
    let result=new Date(year,month,dayOfMonth).getTime();if(result<today)result=new Date(year+1,month,dayOfMonth).getTime();return result;
  }

  function upcomingBirthdays(state,asOf=Date.now()){
    const end=asOf+366*DAY;
    return(state.birthdayEvents||[]).filter(item=>item.status==='active').map(item=>({...item,nextDate:nextBirthdayDate(item.birthDate,asOf)})).filter(item=>item.nextDate!=null&&item.nextDate<=end).sort((a,b)=>a.nextDate-b.nextDate||a.name.localeCompare(b.name,'ru'));
  }

  function monthsAvailable(asOf,eventDate){
    const start=new Date(monthStart(asOf)),event=new Date(eventDate);
    return Math.max(1,(event.getFullYear()-start.getFullYear())*12+(event.getMonth()-start.getMonth())+1);
  }

  function giftFundRecommendation(state,inputDeps={},asOf=Date.now()){
    normalizeState(state,inputDeps,asOf);
    const events=upcomingBirthdays(state,asOf),annualTotal=round(events.reduce((sum,item)=>sum+item.budget,0)),baseContribution=round(annualTotal/12),fundGoal=goal(state,state.specialPurposeGoalIds?.giftFund),currentBalance=round(fundGoal?.savedAmount||0);
    let cumulative=0,catchupContribution=0,catchupUntil=null;
    for(const event of events){
      cumulative=round(cumulative+event.budget);const months=monthsAvailable(asOf,event.nextDate),shortage=round(Math.max(0,cumulative-currentBalance-baseContribution*months)),needed=round(shortage/months);
      if(needed>catchupContribution){catchupContribution=needed;catchupUntil=event.nextDate}
    }
    const monthlyContribution=round(baseContribution+catchupContribution),locationId=state.giftFundSettings?.locationId||defaultLocation(state)?.id||'';
    return{events,annualTotal,baseContribution,catchupContribution,catchupUntil,monthlyContribution,currentBalance,locationId,goalId:fundGoal?.id||null,requiresPerItemConfirmation:true,goalConfirmationId:'gift-fund-goal',contributionConfirmationId:'gift-fund-contribution'};
  }

  function applyGiftFundPlan(state,input,confirmed,legacy,actorId='member-anna',inputDeps={},at=Date.now()){
    const deps=dependencies(inputDeps);normalizeState(state,deps,at);const recommendation=giftFundRecommendation(state,deps,at),confirmedSet=new Set(confirmed||[]);
    if(!confirmedSet.has(recommendation.goalConfirmationId))return{ok:false,error:'Отдельно подтвердите создание или обновление фонда подарков.'};
    if(!confirmedSet.has(recommendation.contributionConfirmationId))return{ok:false,error:'Отдельно подтвердите ежемесячный взнос.'};
    const selectedLocation=location(state,input?.locationId||recommendation.locationId);if(!selectedLocation)return{ok:false,error:'Выберите место хранения фонда подарков.'};
    const target=Math.max(.01,recommendation.annualTotal,recommendation.currentBalance);
    let result=ensureSpecialGoal(state,'giftFund',GIFT_FUND_NAME,target,legacy,actorId,at);if(!result.ok)return result;
    const fund=result.goal;
    if(Math.abs(fund.targetAmount-target)>.005){const updated=legacy.updateGoal(state,fund.id,{name:GIFT_FUND_NAME,targetAmount:target,savedAmount:fund.savedAmount,targetDate:''},actorId,at);if(!updated.ok)return updated;result={...result,goal:updated.goal}}
    const plan=deps.accounts.setPlan(state,result.goal.id,{planningMode:'fixed_contribution',monthlyContribution:recommendation.monthlyContribution||.01,contributionDay:Math.max(1,Math.min(28,Math.trunc(number(input?.contributionDay,1))))},actorId,at);if(!plan.ok)return plan;
    setPurposeLocation(state,result.goal.id,selectedLocation.id,actorId,deps,at);
    state.giftFundSettings={goalId:result.goal.id,locationId:selectedLocation.id,baseContribution:recommendation.baseContribution,catchupContribution:recommendation.catchupContribution,catchupUntil:recommendation.catchupUntil,monthlyContribution:recommendation.monthlyContribution,confirmedAt:at,confirmedByMemberId:actorId};
    refreshActionOccurrences(state,deps,at);
    return{ok:true,goal:result.goal,plan:plan.plan,settings:state.giftFundSettings,recommendation};
  }

  function capitalView(state,inputDeps={},at=Date.now()){
    normalizeState(state,inputDeps,at);return dependencies(inputDeps).scope?.capitalBreakdown?.(state)||{cash:0,bank:0,investments:0,total:0,reservedPurpose:0,freelyAvailable:0,locations:[]};
  }

  return Object.freeze({DAY,GENERAL_SAVINGS_NAME,RESERVE_NAME,GIFT_FUND_NAME,normalizeState,activeWallets,defaultLocation,assignmentFor,setPurposeLocation,ensureGeneralSavingsGoal,configureIncomeSavingsRule,disableIncomeSavingsRule,refreshActionOccurrences,pendingActions,completeAction,createBalanceAdjustment,createBirthday,updateBirthday,nextBirthdayDate,upcomingBirthdays,giftFundRecommendation,applyGiftFundPlan,capitalView,monthKey});
});
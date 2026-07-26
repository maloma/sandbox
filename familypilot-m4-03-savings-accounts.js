(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FamilyPilotSavingsAccounts=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const MAX_AMOUNT=9999999.99;
  const DAY=86400000;
  const OPERATING_ACCOUNT_ID='savings-operating-household';
  const ACTIVE='active';
  const terminalObligation=new Set(['paid','skipped','cancelled']);
  const id=(prefix='id',at=Date.now())=>`${prefix}-${Number(at).toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const round=value=>Math.round((Number(value)||0)*100)/100;
  const clean=value=>String(value||'').trim().replace(/\s+/g,' ');
  const day=value=>{const date=new Date(value);return new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime()};
  const endDay=value=>day(value)+DAY-1;
  const addMonths=(value,count)=>{const source=new Date(value),sourceDay=source.getDate(),target=new Date(source.getFullYear(),source.getMonth()+count,1),last=new Date(target.getFullYear(),target.getMonth()+1,0).getDate();target.setDate(Math.min(sourceDay,last));return target.getTime()};
  const dateText=value=>{const date=new Date(value);if(!Number.isFinite(date.getTime()))return null;return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`};
  const dateValue=value=>{const text=String(value||'').trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(text))return null;const parsed=new Date(`${text}T00:00:00`);return dateText(parsed)===text?parsed.getTime():null};

  function normalizePlan(raw,goalId){
    return{
      goalId:String(raw?.goalId||goalId||''),
      planningMode:raw?.planningMode==='fixed_contribution'?'fixed_contribution':'fixed_date',
      monthlyContribution:Math.max(0,round(raw?.monthlyContribution)),
      contributionDay:Math.max(1,Math.min(28,Math.trunc(number(raw?.contributionDay,1)))),
      updatedAt:number(raw?.updatedAt,Date.now()),
      updatedByMemberId:String(raw?.updatedByMemberId||'member-anna')
    };
  }

  function normalizeInvestment(raw,state,at=Date.now()){
    const createdAt=number(raw?.createdAt,at),bookAmount=Math.max(0,round(raw?.bookAmount));
    return{
      id:String(raw?.id||id('investment-account',at)),
      name:clean(raw?.name)||'Инвестиционный счёт',
      bookAmount,
      currentValue:Math.max(0,round(raw?.currentValue??bookAmount)),
      valuationAt:number(raw?.valuationAt,createdAt),
      currency:String(raw?.currency||state?.household?.baseCurrency||'EUR'),
      status:raw?.status==='archived'?'archived':'active',
      createdAt,
      createdByMemberId:String(raw?.createdByMemberId||'member-anna'),
      updatedAt:number(raw?.updatedAt,createdAt),
      updatedByMemberId:String(raw?.updatedByMemberId||raw?.createdByMemberId||'member-anna'),
      revisions:Array.isArray(raw?.revisions)?raw.revisions:[]
    };
  }

  function normalizeTransfer(raw,state,at=Date.now()){
    const createdAt=number(raw?.createdAt,at);
    return{
      id:String(raw?.id||id('savings-transfer',at)),
      sourceAccountId:String(raw?.sourceAccountId||''),
      destinationAccountId:String(raw?.destinationAccountId||''),
      amount:Math.max(0,round(raw?.amount)),
      currency:String(raw?.currency||state?.household?.baseCurrency||'EUR'),
      effectiveDate:number(raw?.effectiveDate,createdAt),
      note:String(raw?.note||'').trim(),
      status:raw?.status==='inactive'?'inactive':'active',
      createdAt,
      createdByMemberId:String(raw?.createdByMemberId||'member-anna')
    };
  }

  function normalizeState(state,at=Date.now()){
    if(!state||typeof state!=='object')throw new Error('FamilyPilot state is required');
    state.schemaVersion=Math.max(11,number(state.schemaVersion,0));
    state.savingsAccountPlans=(Array.isArray(state.savingsAccountPlans)?state.savingsAccountPlans:[]).filter(Boolean).map(item=>normalizePlan(item,item?.goalId));
    state.investmentAccounts=(Array.isArray(state.investmentAccounts)?state.investmentAccounts:[]).filter(Boolean).map(item=>normalizeInvestment(item,state,at));
    state.savingsTransfers=(Array.isArray(state.savingsTransfers)?state.savingsTransfers:[]).filter(Boolean).map(item=>normalizeTransfer(item,state,at));
    state.investmentValuations=Array.isArray(state.investmentValuations)?state.investmentValuations.filter(Boolean):[];
    const activeGoalIds=new Set((Array.isArray(state.savingsGoals)?state.savingsGoals:[]).map(goal=>String(goal.id)));
    state.savingsAccountPlans=state.savingsAccountPlans.filter(plan=>activeGoalIds.has(plan.goalId));
    for(const goalId of activeGoalIds)if(!state.savingsAccountPlans.some(plan=>plan.goalId===goalId))state.savingsAccountPlans.push(normalizePlan({goalId},goalId));
    return state;
  }

  function planFor(state,goalId){normalizeState(state);return state.savingsAccountPlans.find(plan=>plan.goalId===goalId)||null}

  function setPlan(state,goalId,input,actorId='member-anna',at=Date.now()){
    normalizeState(state,at);
    const goal=(state.savingsGoals||[]).find(item=>item.id===goalId&&item.status==='active');
    if(!goal)return{ok:false,error:'Накопление не найдено.'};
    const planningMode=input?.planningMode==='fixed_contribution'?'fixed_contribution':'fixed_date';
    const monthlyContribution=round(number(input?.monthlyContribution,0));
    const contributionDay=Math.max(1,Math.min(28,Math.trunc(number(input?.contributionDay,1))));
    if(planningMode==='fixed_contribution'&&monthlyContribution<=0)return{ok:false,error:'Укажите ежемесячную сумму больше нуля.'};
    const plan=planFor(state,goalId);
    Object.assign(plan,{planningMode,monthlyContribution:planningMode==='fixed_contribution'?monthlyContribution:Math.max(0,monthlyContribution),contributionDay,updatedAt:at,updatedByMemberId:actorId});
    return{ok:true,plan};
  }

  function progress(goal){
    const target=Math.max(0,round(goal?.targetAmount)),saved=Math.max(0,round(goal?.savedAmount)),remaining=Math.max(0,round(target-saved));
    return{target,saved,remaining,percent:target?Math.min(100,Math.max(0,saved/target*100)):0};
  }

  function planSnapshot(state,goal,asOf=Date.now()){
    normalizeState(state,asOf);
    const plan=planFor(state,goal?.id),result=progress(goal);
    if(result.remaining<=0)return{...result,planningMode:plan?.planningMode||'fixed_date',status:'completed',requiredMonthly:0,monthsRemaining:0,expectedCompletionDate:dateValue(goal?.targetDate)||day(asOf),missing:false,atRisk:false};
    if(plan?.planningMode==='fixed_contribution'){
      if(plan.monthlyContribution<=0)return{...result,planningMode:'fixed_contribution',status:'missing',requiredMonthly:0,monthsRemaining:null,expectedCompletionDate:null,missing:true,atRisk:false};
      const months=Math.max(1,Math.ceil(result.remaining/plan.monthlyContribution));
      return{...result,planningMode:'fixed_contribution',status:'active',requiredMonthly:plan.monthlyContribution,monthsRemaining:months,expectedCompletionDate:addMonths(day(asOf),months),missing:false,atRisk:false};
    }
    const targetDate=dateValue(goal?.targetDate);
    if(!targetDate)return{...result,planningMode:'fixed_date',status:'missing',requiredMonthly:0,monthsRemaining:null,expectedCompletionDate:null,missing:true,atRisk:false};
    if(endDay(targetDate)<day(asOf))return{...result,planningMode:'fixed_date',status:'overdue',requiredMonthly:result.remaining,monthsRemaining:0,expectedCompletionDate:targetDate,missing:false,atRisk:true};
    const from=new Date(asOf),to=new Date(targetDate);let months=(to.getFullYear()-from.getFullYear())*12+(to.getMonth()-from.getMonth());if(to.getDate()>=from.getDate())months+=1;months=Math.max(1,months);
    return{...result,planningMode:'fixed_date',status:'active',requiredMonthly:round(result.remaining/months),monthsRemaining:months,expectedCompletionDate:targetDate,missing:false,atRisk:false};
  }

  function createInvestment(state,input,actorId='member-anna',at=Date.now()){
    normalizeState(state,at);const name=clean(input?.name);
    if(!name)return{ok:false,error:'Введите название инвестиционного счёта.'};
    if(name.length>80)return{ok:false,error:'Название — не более 80 символов.'};
    const account=normalizeInvestment({id:id('investment-account',at),name,bookAmount:0,currentValue:0,valuationAt:at,createdAt:at,createdByMemberId:actorId,updatedAt:at,updatedByMemberId:actorId},state,at);
    state.investmentAccounts.push(account);return{ok:true,account};
  }

  function updateValuation(state,accountId,value,effectiveDate=Date.now(),actorId='member-anna',at=Date.now()){
    normalizeState(state,at);const account=state.investmentAccounts.find(item=>item.id===accountId&&item.status===ACTIVE);
    if(!account)return{ok:false,error:'Инвестиционный счёт не найден.'};
    const currentValue=round(number(value,NaN)),valuationAt=number(effectiveDate,NaN);
    if(!Number.isFinite(currentValue)||currentValue<0||currentValue>MAX_AMOUNT)return{ok:false,error:'Укажите корректную стоимость.'};
    if(!Number.isFinite(valuationAt))return{ok:false,error:'Укажите дату оценки.'};
    const previousValue=account.currentValue;
    account.currentValue=currentValue;account.valuationAt=valuationAt;account.updatedAt=at;account.updatedByMemberId=actorId;
    account.revisions.push({id:id('investment-revision',at),changedAt:at,changedByMemberId:actorId,field:'currentValue',oldValue:previousValue,newValue:currentValue});
    state.investmentValuations.push({id:id('investment-valuation',at),accountId,previousValue,currentValue,effectiveDate:valuationAt,createdAt:at,createdByMemberId:actorId});
    return{ok:true,account,change:round(currentValue-previousValue)};
  }

  const activeGoals=state=>(state.savingsGoals||[]).filter(goal=>goal.status==='active');
  const activeInvestments=state=>(state.investmentAccounts||[]).filter(account=>account.status==='active');

  function capitalSnapshot(state,baseCapital=0){
    normalizeState(state);
    const purpose=activeGoals(state).reduce((sum,goal)=>sum+Math.max(0,round(goal.savedAmount)),0);
    const investmentBook=activeInvestments(state).reduce((sum,account)=>sum+account.bookAmount,0);
    const investmentValue=activeInvestments(state).reduce((sum,account)=>sum+account.currentValue,0);
    return{baseCapital:round(baseCapital),operating:round(baseCapital-purpose-investmentBook),purpose:round(purpose),investmentBook:round(investmentBook),investmentValue:round(investmentValue),valuationDelta:round(investmentValue-investmentBook),totalCapital:round(baseCapital+investmentValue-investmentBook)};
  }

  function accounts(state,baseCapital=0){
    const snapshot=capitalSnapshot(state,baseCapital);
    return[
      {id:OPERATING_ACCOUNT_ID,type:'operating',name:'Основные деньги',balance:snapshot.operating,currentValue:snapshot.operating},
      ...activeGoals(state).map(goal=>({id:`purpose:${goal.id}`,type:'purpose',name:goal.name,balance:round(goal.savedAmount),currentValue:round(goal.savedAmount),goalId:goal.id})),
      ...activeInvestments(state).map(account=>({id:`investment:${account.id}`,type:'investment',name:account.name,balance:account.bookAmount,currentValue:account.currentValue,investmentId:account.id}))
    ];
  }

  const accountById=(state,accountId,baseCapital=0)=>accounts(state,baseCapital).find(account=>account.id===accountId)||null;

  function applyDelta(state,accountId,delta,actorId,at){
    if(accountId===OPERATING_ACCOUNT_ID)return true;
    if(accountId.startsWith('purpose:')){
      const goal=state.savingsGoals.find(item=>item.id===accountId.slice(8));if(!goal)return false;
      goal.savedAmount=round(goal.savedAmount+delta);goal.updatedAt=at;goal.updatedByMemberId=actorId;return true;
    }
    if(accountId.startsWith('investment:')){
      const account=state.investmentAccounts.find(item=>item.id===accountId.slice(11));if(!account)return false;
      if(delta>=0){account.bookAmount=round(account.bookAmount+delta);account.currentValue=round(account.currentValue+delta)}
      else{const amount=Math.abs(delta),bookReduction=Math.min(account.bookAmount,amount);account.bookAmount=round(account.bookAmount-bookReduction);account.currentValue=round(Math.max(0,account.currentValue-amount))}
      account.updatedAt=at;account.updatedByMemberId=actorId;return true;
    }
    return false;
  }

  function createTransfer(state,input,baseCapital=0,actorId='member-anna',at=Date.now()){
    normalizeState(state,at);
    const sourceAccountId=String(input?.sourceAccountId||''),destinationAccountId=String(input?.destinationAccountId||''),amount=round(number(input?.amount,NaN)),effectiveDate=number(input?.effectiveDate,NaN);
    if(!sourceAccountId||!destinationAccountId)return{ok:false,error:'Выберите оба счёта.'};
    if(sourceAccountId===destinationAccountId)return{ok:false,error:'Счета должны отличаться.'};
    if(!Number.isFinite(amount)||amount<=0||amount>MAX_AMOUNT)return{ok:false,error:'Укажите сумму больше нуля.'};
    if(!Number.isFinite(effectiveDate))return{ok:false,error:'Укажите дату перевода.'};
    const source=accountById(state,sourceAccountId,baseCapital),destination=accountById(state,destinationAccountId,baseCapital);
    if(!source||!destination)return{ok:false,error:'Один из счетов не найден.'};
    const available=source.type==='investment'?Math.min(source.balance,source.currentValue):source.balance;
    if(amount>available+0.005)return{ok:false,error:`На счёте «${source.name}» недостаточно средств.`};
    if(!applyDelta(state,sourceAccountId,-amount,actorId,at)||!applyDelta(state,destinationAccountId,amount,actorId,at))return{ok:false,error:'Не удалось применить перевод.'};
    const transfer=normalizeTransfer({id:id('savings-transfer',at),sourceAccountId,destinationAccountId,amount,effectiveDate,note:input?.note,createdAt:at,createdByMemberId:actorId},state,at);
    state.savingsTransfers.push(transfer);return{ok:true,transfer};
  }

  const transferHistory=state=>(state.savingsTransfers||[]).filter(item=>item.status===ACTIVE).sort((a,b)=>b.effectiveDate-a.effectiveDate||b.createdAt-a.createdAt);

  function linkedAmount(state,occurrenceId,kind){
    return(state.operations||[]).filter(operation=>operation.status===ACTIVE&&operation.kind===kind&&(operation.links?.obligationOccurrenceId===occurrenceId||operation.links?.plannedIncomeOccurrenceId===occurrenceId)).reduce((sum,operation)=>sum+Math.max(0,number(operation.amount)),0);
  }

  function contributionDates(plan,from,to){
    const result=[],contributionDay=Math.max(1,Math.min(28,plan.contributionDay));let cursor=new Date(from);cursor=new Date(cursor.getFullYear(),cursor.getMonth(),contributionDay);if(cursor.getTime()<day(from))cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,contributionDay);
    while(cursor.getTime()<=to){result.push(cursor.getTime());cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,contributionDay)}return result;
  }

  function forecast(state,{baseCapital=0,from=Date.now(),horizonDays=30}={}){
    normalizeState(state,from);const start=day(from),to=endDay(start+Math.max(1,Math.min(366,Math.trunc(horizonDays)))*DAY),initial=capitalSnapshot(state,baseCapital),events=[],missing=[];
    for(const occurrence of state.obligationOccurrences||[]){
      if(terminalObligation.has(occurrence.status))continue;const eventDate=day(number(occurrence.dueAt,NaN));if(!Number.isFinite(eventDate)||eventDate<start||eventDate>to)continue;
      const expected=Math.max(0,number(occurrence.expectedAmountOverride,occurrence.expectedAmount)),amount=round(Math.max(0,expected-linkedAmount(state,occurrence.id,'expense')));if(!amount)continue;
      const rule=(state.obligationRules||[]).find(item=>item.id===occurrence.ruleId);events.push({id:`obligation:${occurrence.id}`,date:eventDate,type:'external_outflow',title:rule?.name||'Обязательный платёж',amount,sourceModule:'obligations',sourceId:occurrence.id,certainty:'planned'});
    }
    for(const occurrence of state.plannedIncomeOccurrences||[]){
      if(occurrence.status==='received'||occurrence.hidden===true)continue;const eventDate=day(number(occurrence.dueAt,NaN));if(!Number.isFinite(eventDate)||eventDate<start||eventDate>to)continue;
      const amount=round(Math.max(0,number(occurrence.expectedAmount)-linkedAmount(state,occurrence.id,'income')));if(!amount)continue;
      const rule=(state.plannedIncomeRules||[]).find(item=>item.id===occurrence.ruleId);events.push({id:`planned-income:${occurrence.id}`,date:eventDate,type:'external_inflow',title:rule?.name||'Плановый приход',amount,sourceModule:'planned_income',sourceId:occurrence.id,certainty:'expected'});
    }
    for(const goal of activeGoals(state)){
      const plan=planFor(state,goal.id),snapshot=planSnapshot(state,goal,start);if(snapshot.missing){missing.push({sourceModule:'savings',sourceId:goal.id,title:goal.name,reason:snapshot.planningMode==='fixed_date'?'Не указана дата цели.':'Не указана сумма в месяц.'});continue}if(snapshot.remaining<=0||snapshot.requiredMonthly<=0)continue;
      let remaining=snapshot.remaining;for(const eventDate of contributionDates(plan,start,to)){if(remaining<=0)break;const amount=round(Math.min(snapshot.requiredMonthly,remaining));remaining=round(remaining-amount);events.push({id:`goal-transfer:${goal.id}:${eventDate}`,date:eventDate,type:'internal_transfer',title:`В накопления: ${goal.name}`,amount,sourceModule:'savings',sourceId:goal.id,sourceAccountId:OPERATING_ACCOUNT_ID,destinationAccountId:`purpose:${goal.id}`,certainty:'planned'})}
    }
    const rank={external_outflow:0,internal_transfer:1,external_inflow:2};events.sort((a,b)=>a.date-b.date||(rank[a.type]??9)-(rank[b.type]??9)||a.title.localeCompare(b.title,'ru'));
    let operating=initial.operating,totalCapital=initial.totalCapital,purpose=initial.purpose,minimumOperating=operating,minimumOperatingDate=start,currentDate=null,currentIds=[];
    const timeline=[{date:start,operating,totalCapital,purpose,eventIds:[]}];
    const closeDate=()=>{if(currentDate==null)return;timeline.push({date:currentDate,operating:round(operating),totalCapital:round(totalCapital),purpose:round(purpose),eventIds:[...currentIds]});if(operating<minimumOperating){minimumOperating=operating;minimumOperatingDate=currentDate}};
    for(const event of events){if(currentDate!==event.date){closeDate();currentDate=event.date;currentIds=[]}currentIds.push(event.id);if(event.type==='external_inflow'){operating=round(operating+event.amount);totalCapital=round(totalCapital+event.amount)}else if(event.type==='external_outflow'){operating=round(operating-event.amount);totalCapital=round(totalCapital-event.amount)}else{operating=round(operating-event.amount);purpose=round(purpose+event.amount)}}closeDate();
    const ending=timeline[timeline.length-1];return{from:start,to,horizonDays,initial,events,timeline,missing,minimumOperating:round(minimumOperating),minimumOperatingDate,endingOperating:ending.operating,endingTotalCapital:ending.totalCapital,deficit:minimumOperating<0};
  }

  return Object.freeze({MAX_AMOUNT,OPERATING_ACCOUNT_ID,normalizeState,planFor,setPlan,progress,planSnapshot,createInvestment,updateValuation,capitalSnapshot,accounts,accountById,createTransfer,transferHistory,forecast});
});

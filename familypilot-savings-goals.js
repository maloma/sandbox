(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FamilyPilotSavingsGoals=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const MAX_AMOUNT=9999999.99;
  const OPERATING_ACCOUNT_ID='savings-operating-household';
  const DAY=86400000;
  const TERMINAL_OBLIGATION=new Set(['paid','skipped','cancelled']);

  const makeId=(prefix='id',at=Date.now())=>`${prefix}-${Number(at).toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const asNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const rounded=value=>Math.round((Number(value)||0)*100)/100;
  const cleanName=value=>String(value||'').trim().replace(/\s+/g,' ');
  const revisions=value=>Array.isArray(value)?value:[];
  const startOfDay=value=>{const d=new Date(value);return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()};
  const endOfDay=value=>startOfDay(value)+DAY-1;
  const isoDate=value=>{const d=new Date(value);if(!Number.isFinite(d.getTime()))return null;const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`};
  const normalizeDate=value=>{
    const text=String(value||'').trim();
    if(!text)return null;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(text))return null;
    const parsed=new Date(`${text}T00:00:00`);
    return Number.isFinite(parsed.getTime())&&isoDate(parsed)===text?text:null;
  };
  const dateValue=value=>{const text=normalizeDate(value);return text?new Date(`${text}T00:00:00`).getTime():null};
  const addMonths=(value,count)=>{
    const source=new Date(value),day=source.getDate(),target=new Date(source.getFullYear(),source.getMonth()+count,1),last=new Date(target.getFullYear(),target.getMonth()+1,0).getDate();
    target.setDate(Math.min(day,last));return target.getTime();
  };
  const accountRevision=(target,changes,actorId='member-anna',at=Date.now(),source='user')=>{
    const actual=changes.filter(change=>String(change.oldValue??'')!==String(change.newValue??''));
    if(!actual.length)return null;
    const item={id:makeId('savings-rev',at),sequence:revisions(target.revisions).length+1,changedAt:at,changedByMemberId:actorId,source,changes:actual};
    target.revisions=revisions(target.revisions);target.revisions.push(item);target.updatedAt=at;target.updatedByMemberId=actorId;return item;
  };

  function normalizeGoal(raw,householdId='household-demo',at=Date.now()){
    const createdAt=asNumber(raw?.createdAt,at),status=raw?.status==='archived'?'archived':'active';
    const planningMode=raw?.planningMode==='fixed_contribution'?'fixed_contribution':'fixed_date';
    return{
      id:String(raw?.id||makeId('savings-goal',at)),
      accountId:String(raw?.accountId||`purpose:${raw?.id||makeId('savings-goal-account',at)}`),
      accountType:'purpose',
      scope:'household',
      householdId:String(raw?.householdId||householdId),
      name:cleanName(raw?.name)||'Цель',
      targetAmount:Math.max(0,rounded(raw?.targetAmount??raw?.target)),
      savedAmount:Math.max(0,rounded(raw?.savedAmount??raw?.saved)),
      targetDate:normalizeDate(raw?.targetDate??raw?.deadline),
      planningMode,
      monthlyContribution:Math.max(0,rounded(raw?.monthlyContribution)),
      contributionDay:Math.max(1,Math.min(28,Math.trunc(asNumber(raw?.contributionDay,1)))),
      status,
      archivedAt:status==='archived'?asNumber(raw?.archivedAt,raw?.updatedAt||at):null,
      createdAt,
      createdByMemberId:raw?.createdByMemberId||'member-anna',
      updatedAt:asNumber(raw?.updatedAt,createdAt),
      updatedByMemberId:raw?.updatedByMemberId||raw?.createdByMemberId||'member-anna',
      revisions:revisions(raw?.revisions)
    };
  }

  function normalizeInvestment(raw,householdId='household-demo',at=Date.now()){
    const createdAt=asNumber(raw?.createdAt,at),status=raw?.status==='archived'?'archived':'active';
    const bookAmount=Math.max(0,rounded(raw?.bookAmount??raw?.contributedAmount));
    return{
      id:String(raw?.id||makeId('investment-account',at)),
      accountId:String(raw?.accountId||raw?.id||makeId('investment-account',at)),
      accountType:'investment',
      scope:'household',
      householdId:String(raw?.householdId||householdId),
      name:cleanName(raw?.name)||'Инвестиционный счёт',
      bookAmount,
      currentValue:Math.max(0,rounded(raw?.currentValue??bookAmount)),
      valuationAt:asNumber(raw?.valuationAt,createdAt),
      status,
      archivedAt:status==='archived'?asNumber(raw?.archivedAt,raw?.updatedAt||at):null,
      createdAt,
      createdByMemberId:raw?.createdByMemberId||'member-anna',
      updatedAt:asNumber(raw?.updatedAt,createdAt),
      updatedByMemberId:raw?.updatedByMemberId||raw?.createdByMemberId||'member-anna',
      revisions:revisions(raw?.revisions)
    };
  }

  function normalizeTransfer(raw,at=Date.now()){
    const createdAt=asNumber(raw?.createdAt,at);
    return{
      id:String(raw?.id||makeId('savings-transfer',at)),
      sourceAccountId:String(raw?.sourceAccountId||''),
      destinationAccountId:String(raw?.destinationAccountId||''),
      amount:Math.max(0,rounded(raw?.amount)),
      currency:String(raw?.currency||'EUR'),
      effectiveDate:asNumber(raw?.effectiveDate,at),
      note:String(raw?.note||'').trim(),
      status:raw?.status==='inactive'?'inactive':'active',
      createdAt,
      createdByMemberId:String(raw?.createdByMemberId||'member-anna'),
      updatedAt:asNumber(raw?.updatedAt,createdAt),
      updatedByMemberId:String(raw?.updatedByMemberId||raw?.createdByMemberId||'member-anna'),
      revisions:revisions(raw?.revisions)
    };
  }

  function normalizeState(state,at=Date.now()){
    if(!state||typeof state!=='object')throw new Error('FamilyPilot state is required');
    state.schemaVersion=Math.max(11,asNumber(state.schemaVersion,2));
    const householdId=String(state.household?.id||'household-demo');
    state.savingsGoals=(Array.isArray(state.savingsGoals)?state.savingsGoals:[]).filter(Boolean).map(item=>normalizeGoal(item,householdId,at));
    state.investmentAccounts=(Array.isArray(state.investmentAccounts)?state.investmentAccounts:[]).filter(Boolean).map(item=>normalizeInvestment(item,householdId,at));
    state.savingsTransfers=(Array.isArray(state.savingsTransfers)?state.savingsTransfers:[]).filter(Boolean).map(item=>normalizeTransfer(item,at));
    state.investmentValuations=Array.isArray(state.investmentValuations)?state.investmentValuations.filter(Boolean):[];
    const goalIds=new Set();
    for(const goal of state.savingsGoals){
      if(goalIds.has(goal.id))goal.id=makeId('savings-goal',at+goalIds.size);
      goalIds.add(goal.id);
      if(!goal.accountId)goal.accountId=`purpose:${goal.id}`;
    }
    return state;
  }

  function validateInput(input,{creating=false}={}){
    const name=cleanName(input?.name),targetAmount=rounded(asNumber(input?.targetAmount,NaN)),savedAmount=rounded(asNumber(input?.savedAmount,creating?0:NaN));
    const rawDate=String(input?.targetDate||'').trim(),targetDate=normalizeDate(rawDate);
    const planningMode=input?.planningMode==='fixed_contribution'?'fixed_contribution':'fixed_date';
    const monthlyContribution=rounded(asNumber(input?.monthlyContribution,0));
    const contributionDay=Math.max(1,Math.min(28,Math.trunc(asNumber(input?.contributionDay,1))));
    if(!name)return{ok:false,error:'Введите название цели.'};
    if(name.length>80)return{ok:false,error:'Название цели должно быть не длиннее 80 символов.'};
    if(!Number.isFinite(targetAmount)||targetAmount<=0||targetAmount>MAX_AMOUNT)return{ok:false,error:'Целевая сумма должна быть от 0,01 до 9 999 999,99.'};
    if(!Number.isFinite(savedAmount)||savedAmount<0||savedAmount>MAX_AMOUNT)return{ok:false,error:'Накопленная сумма должна быть от 0 до 9 999 999,99.'};
    if(rawDate&&!targetDate)return{ok:false,error:'Укажите корректную желаемую дату.'};
    if(planningMode==='fixed_contribution'&&(!Number.isFinite(monthlyContribution)||monthlyContribution<=0))return{ok:false,error:'Для фиксированной суммы укажите ежемесячный взнос больше нуля.'};
    return{ok:true,value:{name,targetAmount,savedAmount,targetDate,planningMode,monthlyContribution:planningMode==='fixed_contribution'?monthlyContribution:Math.max(0,monthlyContribution),contributionDay}};
  }

  function createGoal(state,input,actorId='member-anna',at=Date.now()){
    normalizeState(state,at);const validated=validateInput(input,{creating:true});if(!validated.ok)return validated;
    const id=makeId('savings-goal',at);
    const goal=normalizeGoal({...validated.value,id,accountId:`purpose:${id}`,householdId:state.household?.id,createdAt:at,createdByMemberId:actorId,updatedAt:at,updatedByMemberId:actorId},state.household?.id,at);
    state.savingsGoals.push(goal);return{ok:true,goal};
  }

  function updateGoal(state,goalId,input,actorId='member-anna',at=Date.now()){
    normalizeState(state,at);const goal=state.savingsGoals.find(item=>item.id===goalId);if(!goal)return{ok:false,error:'Цель не найдена.'};
    if(goal.status==='archived')return{ok:false,error:'Архивная цель доступна только для чтения.'};
    const validated=validateInput({...input,savedAmount:input?.savedAmount??goal.savedAmount});if(!validated.ok)return validated;
    const changes=Object.entries(validated.value).map(([field,newValue])=>({field,oldValue:goal[field],newValue}));
    accountRevision(goal,changes,actorId,at);Object.assign(goal,validated.value,{updatedAt:at,updatedByMemberId:actorId});return{ok:true,goal};
  }

  function archiveGoal(state,goalId,actorId='member-anna',at=Date.now()){
    normalizeState(state,at);const goal=state.savingsGoals.find(item=>item.id===goalId);if(!goal)return{ok:false,error:'Цель не найдена.'};
    if(goal.status==='archived')return{ok:true,goal,unchanged:true};
    accountRevision(goal,[{field:'status',oldValue:goal.status,newValue:'archived'}],actorId,at,'archive');
    goal.status='archived';goal.archivedAt=at;goal.updatedAt=at;goal.updatedByMemberId=actorId;return{ok:true,goal};
  }

  function createInvestment(state,input,actorId='member-anna',at=Date.now()){
    normalizeState(state,at);const name=cleanName(input?.name);
    if(!name)return{ok:false,error:'Введите название инвестиционного счёта.'};
    if(name.length>80)return{ok:false,error:'Название счёта должно быть не длиннее 80 символов.'};
    const id=makeId('investment-account',at);
    const account=normalizeInvestment({id,accountId:id,name,householdId:state.household?.id,bookAmount:0,currentValue:0,valuationAt:at,createdAt:at,createdByMemberId:actorId,updatedAt:at,updatedByMemberId:actorId},state.household?.id,at);
    state.investmentAccounts.push(account);return{ok:true,account};
  }

  function updateValuation(state,accountId,value,valuationAt=Date.now(),actorId='member-anna',at=Date.now()){
    normalizeState(state,at);const account=state.investmentAccounts.find(item=>item.accountId===accountId||item.id===accountId);
    if(!account)return{ok:false,error:'Инвестиционный счёт не найден.'};
    const next=rounded(asNumber(value,NaN));if(!Number.isFinite(next)||next<0||next>MAX_AMOUNT)return{ok:false,error:'Укажите корректную текущую стоимость.'};
    const effective=asNumber(valuationAt,NaN);if(!Number.isFinite(effective))return{ok:false,error:'Укажите дату оценки.'};
    const previous=account.currentValue;
    accountRevision(account,[{field:'currentValue',oldValue:previous,newValue:next},{field:'valuationAt',oldValue:account.valuationAt,newValue:effective}],actorId,at,'valuation');
    account.currentValue=next;account.valuationAt=effective;account.updatedAt=at;account.updatedByMemberId=actorId;
    state.investmentValuations.push({id:makeId('investment-valuation',at),accountId:account.accountId,previousValue:previous,currentValue:next,effectiveDate:effective,createdAt:at,createdByMemberId:actorId});
    return{ok:true,account,change:rounded(next-previous)};
  }

  const activeGoals=state=>(Array.isArray(state?.savingsGoals)?state.savingsGoals:[]).filter(goal=>goal.status==='active').sort((a,b)=>b.updatedAt-a.updatedAt||a.name.localeCompare(b.name,'ru'));
  const archivedGoals=state=>(Array.isArray(state?.savingsGoals)?state.savingsGoals:[]).filter(goal=>goal.status==='archived').sort((a,b)=>(b.archivedAt||b.updatedAt)-(a.archivedAt||a.updatedAt)||a.name.localeCompare(b.name,'ru'));
  const activeInvestments=state=>(Array.isArray(state?.investmentAccounts)?state.investmentAccounts:[]).filter(account=>account.status==='active').sort((a,b)=>a.name.localeCompare(b.name,'ru'));

  function progress(goal){
    const target=Math.max(0,rounded(goal?.targetAmount)),saved=Math.max(0,rounded(goal?.savedAmount)),remaining=Math.max(0,rounded(target-saved)),percent=target?Math.min(100,Math.max(0,saved/target*100)):0;
    return{target,saved,remaining,percent};
  }

  function planSnapshot(goal,asOf=Date.now()){
    const p=progress(goal),mode=goal?.planningMode==='fixed_contribution'?'fixed_contribution':'fixed_date';
    if(p.remaining<=0)return{...p,mode,status:'completed',requiredMonthly:0,monthsRemaining:0,expectedCompletionDate:goal?.targetDate?dateValue(goal.targetDate):startOfDay(asOf),atRisk:false,missing:false};
    if(mode==='fixed_contribution'){
      const monthly=Math.max(0,rounded(goal?.monthlyContribution));
      if(!monthly)return{...p,mode,status:'missing',requiredMonthly:0,monthsRemaining:null,expectedCompletionDate:null,atRisk:false,missing:true};
      const months=Math.max(1,Math.ceil(p.remaining/monthly));
      return{...p,mode,status:'active',requiredMonthly:monthly,monthsRemaining:months,expectedCompletionDate:addMonths(startOfDay(asOf),months),atRisk:false,missing:false};
    }
    const target=dateValue(goal?.targetDate);
    if(!target)return{...p,mode,status:'missing',requiredMonthly:0,monthsRemaining:null,expectedCompletionDate:null,atRisk:false,missing:true};
    if(endOfDay(target)<startOfDay(asOf))return{...p,mode,status:'overdue',requiredMonthly:p.remaining,monthsRemaining:0,expectedCompletionDate:target,atRisk:true,missing:false};
    const a=new Date(asOf),t=new Date(target);
    let months=(t.getFullYear()-a.getFullYear())*12+(t.getMonth()-a.getMonth());
    if(t.getDate()>=a.getDate())months+=1;
    months=Math.max(1,months);
    return{...p,mode,status:'active',requiredMonthly:rounded(p.remaining/months),monthsRemaining:months,expectedCompletionDate:target,atRisk:false,missing:false};
  }

  function capitalSnapshot(state,baseCapital=0){
    normalizeState(state);
    const purpose=activeGoals(state).reduce((sum,goal)=>sum+Math.max(0,rounded(goal.savedAmount)),0);
    const investmentBook=activeInvestments(state).reduce((sum,account)=>sum+Math.max(0,rounded(account.bookAmount)),0);
    const investmentValue=activeInvestments(state).reduce((sum,account)=>sum+Math.max(0,rounded(account.currentValue)),0);
    const operating=rounded(asNumber(baseCapital)-purpose-investmentBook);
    const totalCapital=rounded(asNumber(baseCapital)+(investmentValue-investmentBook));
    return{baseCapital:rounded(baseCapital),operating,purpose:rounded(purpose),investmentBook:rounded(investmentBook),investmentValue:rounded(investmentValue),valuationDelta:rounded(investmentValue-investmentBook),totalCapital};
  }

  function accountDescriptors(state,baseCapital=0){
    const snap=capitalSnapshot(state,baseCapital);
    return[
      {id:OPERATING_ACCOUNT_ID,type:'operating',name:'Основные деньги',balance:snap.operating,currentValue:snap.operating,status:'active'},
      ...activeGoals(state).map(goal=>({id:goal.accountId,type:'purpose',name:goal.name,balance:rounded(goal.savedAmount),currentValue:rounded(goal.savedAmount),goalId:goal.id,status:goal.status})),
      ...activeInvestments(state).map(account=>({id:account.accountId,type:'investment',name:account.name,balance:rounded(account.bookAmount),currentValue:rounded(account.currentValue),investmentId:account.id,status:account.status}))
    ];
  }

  function accountById(state,id,baseCapital=0){return accountDescriptors(state,baseCapital).find(account=>account.id===id)||null}

  function applyAccountDelta(state,accountId,delta,actorId,at){
    if(accountId===OPERATING_ACCOUNT_ID)return true;
    const goal=state.savingsGoals.find(item=>item.accountId===accountId);
    if(goal){
      const next=rounded(goal.savedAmount+delta);
      accountRevision(goal,[{field:'savedAmount',oldValue:goal.savedAmount,newValue:next}],actorId,at,'transfer');
      goal.savedAmount=next;goal.updatedAt=at;goal.updatedByMemberId=actorId;return true;
    }
    const investment=state.investmentAccounts.find(item=>item.accountId===accountId);
    if(investment){
      const nextBook=rounded(investment.bookAmount+delta),nextValue=rounded(Math.max(0,investment.currentValue+delta));
      accountRevision(investment,[{field:'bookAmount',oldValue:investment.bookAmount,newValue:nextBook},{field:'currentValue',oldValue:investment.currentValue,newValue:nextValue}],actorId,at,'transfer');
      investment.bookAmount=nextBook;investment.currentValue=nextValue;investment.updatedAt=at;investment.updatedByMemberId=actorId;return true;
    }
    return false;
  }

  function createTransfer(state,input,baseCapital=0,actorId='member-anna',at=Date.now()){
    normalizeState(state,at);
    const sourceAccountId=String(input?.sourceAccountId||''),destinationAccountId=String(input?.destinationAccountId||''),amount=rounded(asNumber(input?.amount,NaN)),effectiveDate=asNumber(input?.effectiveDate,NaN);
    if(!sourceAccountId||!destinationAccountId)return{ok:false,error:'Выберите счёт-источник и счёт назначения.'};
    if(sourceAccountId===destinationAccountId)return{ok:false,error:'Счета должны отличаться.'};
    if(!Number.isFinite(amount)||amount<=0||amount>MAX_AMOUNT)return{ok:false,error:'Укажите сумму перевода больше нуля.'};
    if(!Number.isFinite(effectiveDate))return{ok:false,error:'Укажите дату перевода.'};
    const source=accountById(state,sourceAccountId,baseCapital),destination=accountById(state,destinationAccountId,baseCapital);
    if(!source||!destination)return{ok:false,error:'Один из счетов не найден.'};
    const sourceAvailable=source.type==='investment'?Math.min(source.balance,source.currentValue):source.balance;
    if(amount>sourceAvailable+0.005)return{ok:false,error:`На счёте «${source.name}» недостаточно средств.`};
    applyAccountDelta(state,sourceAccountId,-amount,actorId,at);applyAccountDelta(state,destinationAccountId,amount,actorId,at);
    const transfer=normalizeTransfer({id:makeId('savings-transfer',at),sourceAccountId,destinationAccountId,amount,currency:String(input?.currency||'EUR'),effectiveDate,note:String(input?.note||''),createdAt:at,createdByMemberId:actorId,updatedAt:at,updatedByMemberId:actorId},at);
    state.savingsTransfers.push(transfer);return{ok:true,transfer,source,destination};
  }

  function transferHistory(state){return(Array.isArray(state?.savingsTransfers)?state.savingsTransfers:[]).filter(item=>item.status==='active').sort((a,b)=>b.effectiveDate-a.effectiveDate||b.createdAt-a.createdAt)}

  function linkedAmount(state,occurrenceId,kind){
    return(Array.isArray(state?.operations)?state.operations:[]).filter(op=>op?.status==='active'&&op?.kind===kind&&(op?.links?.obligationOccurrenceId===occurrenceId||op?.links?.plannedIncomeOccurrenceId===occurrenceId)).reduce((sum,op)=>sum+Math.max(0,asNumber(op.amount)),0);
  }

  function contributionDates(goal,from,to){
    const dates=[],day=Math.max(1,Math.min(28,Math.trunc(asNumber(goal?.contributionDay,1))));
    let cursor=new Date(from);cursor=new Date(cursor.getFullYear(),cursor.getMonth(),day);
    if(cursor.getTime()<startOfDay(from))cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,day);
    while(cursor.getTime()<=to){dates.push(cursor.getTime());cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,day)}
    return dates;
  }

  function forecast(state,{baseCapital=0,from=Date.now(),horizonDays=30}={}){
    normalizeState(state,from);
    const start=startOfDay(from),end=endOfDay(start+Math.max(1,Math.min(366,Math.trunc(horizonDays)))*DAY);
    const initial=capitalSnapshot(state,baseCapital),events=[],missing=[];
    const rules=Array.isArray(state.obligationRules)?state.obligationRules:[];
    for(const occurrence of Array.isArray(state.obligationOccurrences)?state.obligationOccurrences:[]){
      if(TERMINAL_OBLIGATION.has(occurrence?.status))continue;
      const date=startOfDay(asNumber(occurrence?.dueAt,NaN));if(!Number.isFinite(date)||date<start||date>end)continue;
      const expected=Math.max(0,asNumber(occurrence?.expectedAmountOverride,occurrence?.expectedAmount));
      const paid=linkedAmount(state,occurrence.id,'expense'),amount=rounded(Math.max(0,expected-paid));if(!amount)continue;
      const rule=rules.find(item=>item.id===occurrence.ruleId);
      events.push({id:`obligation:${occurrence.id}`,date,type:'external_outflow',title:rule?.name||'Обязательный платёж',amount,sourceModule:'obligations',sourceId:occurrence.id,certainty:'planned'});
    }
    const incomeRules=Array.isArray(state.plannedIncomeRules)?state.plannedIncomeRules:[];
    for(const occurrence of Array.isArray(state.plannedIncomeOccurrences)?state.plannedIncomeOccurrences:[]){
      if(occurrence?.status==='received'||occurrence?.hidden===true)continue;
      const date=startOfDay(asNumber(occurrence?.dueAt,NaN));if(!Number.isFinite(date)||date<start||date>end)continue;
      const expected=Math.max(0,asNumber(occurrence?.expectedAmount)),received=linkedAmount(state,occurrence.id,'income'),amount=rounded(Math.max(0,expected-received));if(!amount)continue;
      const rule=incomeRules.find(item=>item.id===occurrence.ruleId);
      events.push({id:`planned-income:${occurrence.id}`,date,type:'external_inflow',title:rule?.name||'Плановый приход',amount,sourceModule:'planned_income',sourceId:occurrence.id,certainty:'expected'});
    }
    for(const goal of activeGoals(state)){
      const plan=planSnapshot(goal,start);
      if(plan.missing){missing.push({sourceModule:'savings',sourceId:goal.id,title:goal.name,reason:plan.mode==='fixed_date'?'Не указана дата цели.':'Не указана ежемесячная сумма.'});continue}
      if(plan.remaining<=0||plan.requiredMonthly<=0)continue;
      let remaining=plan.remaining;
      for(const date of contributionDates(goal,start,end)){
        if(remaining<=0)break;
        const amount=rounded(Math.min(plan.requiredMonthly,remaining));remaining=rounded(remaining-amount);
        events.push({id:`goal-transfer:${goal.id}:${date}`,date,type:'internal_transfer',title:`В накопления: ${goal.name}`,amount,sourceModule:'savings',sourceId:goal.id,sourceAccountId:OPERATING_ACCOUNT_ID,destinationAccountId:goal.accountId,certainty:'planned'});
      }
    }
    const rank={external_outflow:0,internal_transfer:1,external_inflow:2};
    events.sort((a,b)=>a.date-b.date||(rank[a.type]??9)-(rank[b.type]??9)||a.title.localeCompare(b.title,'ru'));
    let operating=initial.operating,totalCapital=initial.totalCapital,purpose=initial.purpose,investmentValue=initial.investmentValue,minOperating=operating,minDate=start;
    const timeline=[{date:start,operating:rounded(operating),totalCapital:rounded(totalCapital),purpose:rounded(purpose),investmentValue:rounded(investmentValue),eventIds:[]}];
    let currentDate=null,currentIds=[];
    const closeDate=()=>{if(currentDate==null)return;timeline.push({date:currentDate,operating:rounded(operating),totalCapital:rounded(totalCapital),purpose:rounded(purpose),investmentValue:rounded(investmentValue),eventIds:[...currentIds]});if(operating<minOperating){minOperating=operating;minDate=currentDate}};
    for(const event of events){
      if(currentDate!==event.date){closeDate();currentDate=event.date;currentIds=[]}
      currentIds.push(event.id);
      if(event.type==='external_inflow'){operating=rounded(operating+event.amount);totalCapital=rounded(totalCapital+event.amount)}
      if(event.type==='external_outflow'){operating=rounded(operating-event.amount);totalCapital=rounded(totalCapital-event.amount)}
      if(event.type==='internal_transfer'){operating=rounded(operating-event.amount);purpose=rounded(purpose+event.amount)}
    }
    closeDate();
    const endPoint=timeline[timeline.length-1]||timeline[0];
    return{from:start,to:end,horizonDays,initial,events,timeline,missing,minimumOperating:rounded(minOperating),minimumOperatingDate:minDate,endingOperating:endPoint.operating,endingTotalCapital:endPoint.totalCapital,deficit:minOperating<0};
  }

  function summary(state,baseCapital=0){
    const snap=capitalSnapshot(state,baseCapital);
    return{active:activeGoals(state).length,archived:archivedGoals(state).length,investments:activeInvestments(state).length,status:snap.operating<0?'red':'green',optional:true,...snap};
  }

  return Object.freeze({
    MAX_AMOUNT,OPERATING_ACCOUNT_ID,normalizeDate,normalizeGoal,normalizeInvestment,normalizeTransfer,normalizeState,validateInput,
    createGoal,updateGoal,archiveGoal,createInvestment,updateValuation,createTransfer,transferHistory,
    activeGoals,archivedGoals,activeInvestments,progress,planSnapshot,capitalSnapshot,accountDescriptors,accountById,forecast,summary
  });
});

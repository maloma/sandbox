(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FamilyPilotManualInterest=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const MAX_AMOUNT=9999999.99,MAX_RATE=1000,MAX_MONTHS=600;
  const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const round=value=>Math.round((Number(value)||0)*100)/100;
  const clean=value=>String(value||'').trim().replace(/\s+/g,' ');
  const clone=value=>JSON.parse(JSON.stringify(value));
  const makeId=(prefix='interest-simulation',at=Date.now())=>`${prefix}-${Number(at).toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const dateText=value=>{const date=new Date(value);return Number.isFinite(date.getTime())?`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`:null};
  const dateValue=value=>{const text=String(value||'').trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(text))return null;const date=new Date(`${text}T00:00:00`);return dateText(date)===text?date.getTime():null};
  const addMonths=(value,count)=>{const source=new Date(value),day=source.getDate(),target=new Date(source.getFullYear(),source.getMonth()+count,1),last=new Date(target.getFullYear(),target.getMonth()+1,0).getDate();target.setDate(Math.min(day,last));return target.getTime()};

  function normalizeSimulation(raw,at=Date.now()){
    const createdAt=number(raw?.createdAt,at);
    return{id:String(raw?.id||makeId('interest-simulation',at)),name:clean(raw?.name)||'Проценты на накопления',sourceMode:raw?.sourceMode==='custom'?'custom':'goal',goalId:String(raw?.goalId||''),contributionSource:raw?.contributionSource==='scenario'?'scenario':'actual',scenarioId:String(raw?.scenarioId||''),inputs:clone(raw?.inputs||{}),result:clone(raw?.result||{}),sourceFingerprint:String(raw?.sourceFingerprint||''),status:raw?.status==='archived'?'archived':'active',createdAt,createdByMemberId:String(raw?.createdByMemberId||'member-anna'),updatedAt:number(raw?.updatedAt,createdAt),updatedByMemberId:String(raw?.updatedByMemberId||raw?.createdByMemberId||'member-anna')};
  }
  function normalizeState(state,at=Date.now()){
    if(!state||typeof state!=='object')throw new Error('FamilyPilot state is required');
    state.schemaVersion=Math.max(19,number(state.schemaVersion));
    state.whatIfInterestSimulations=(Array.isArray(state.whatIfInterestSimulations)?state.whatIfInterestSimulations:[]).filter(Boolean).map(item=>normalizeSimulation(item,at));
    return state;
  }
  function deps(input={}){return{accounts:input.accounts||globalThis.FamilyPilotSavingsAccounts,whatIf:input.whatIf||globalThis.FamilyPilotWhatIf}}
  function activeGoal(state,goalId){return(state?.savingsGoals||[]).find(item=>item.id===goalId&&item.status==='active')||null}
  function scenarioFor(state,id,whatIf){return whatIf?.activeScenarios?.(state).find(item=>item.id===id)||null}
  function scenarioDelta(scenario,goalId){return round((scenario?.savingsContributionChanges||[]).filter(item=>String(item.goalId)===String(goalId)).reduce((sum,item)=>sum+number(item.monthlyDelta),0))}
  function sourceSnapshot(state,input,inputDeps={},at=Date.now()){
    const{accounts,whatIf}=deps(inputDeps),sourceMode=input?.sourceMode==='custom'?'custom':'goal';
    if(sourceMode==='custom')return{ok:true,sourceMode:'custom',fingerprint:'',defaults:null};
    const goal=activeGoal(state,String(input?.goalId||''));if(!goal)return{ok:false,error:'Накопление не найдено.'};
    if(!accounts?.planSnapshot||!accounts?.planFor)return{ok:false,error:'Модуль накоплений недоступен.'};
    const plan=accounts.planFor(state,goal.id),snapshot=accounts.planSnapshot(state,goal,at),contributionSource=input?.contributionSource==='scenario'?'scenario':'actual';
    let scenario=null,delta=0;
    if(contributionSource==='scenario'){
      scenario=scenarioFor(state,String(input?.scenarioId||''),whatIf);if(!scenario)return{ok:false,error:'Сценарий не найден.'};
      delta=scenarioDelta(scenario,goal.id);
    }
    const defaultMonthly=Math.max(0,round(snapshot.requiredMonthly+delta));
    const value={goal:{id:goal.id,name:goal.name,targetAmount:round(goal.targetAmount),savedAmount:round(goal.savedAmount),targetDate:goal.targetDate||null,status:goal.status},plan:{planningMode:plan?.planningMode||'fixed_date',monthlyContribution:round(plan?.monthlyContribution),contributionDay:number(plan?.contributionDay,1),requiredMonthly:round(snapshot.requiredMonthly)},contributionSource,scenario:scenario?{id:scenario.id,updatedAt:scenario.updatedAt,monthlyDelta:delta}:null};
    return{ok:true,sourceMode:'goal',goal,scenario,delta,defaults:{startingAmount:round(goal.savedAmount),monthlyContribution:defaultMonthly,targetAmount:round(goal.targetAmount),stalled:defaultMonthly<=0&&round(goal.targetAmount-goal.savedAmount)>0},fingerprint:JSON.stringify(value)};
  }
  function validate(input){
    const name=clean(input?.name),sourceMode=input?.sourceMode==='custom'?'custom':'goal',startingAmount=number(input?.startingAmount,NaN),monthlyContribution=number(input?.monthlyContribution,NaN),annualRate=number(input?.annualRate,NaN),termMonths=Math.trunc(number(input?.termMonths,NaN)),targetRaw=input?.targetAmount;
    const targetAmount=targetRaw===''||targetRaw==null?null:number(targetRaw,NaN),calculationDate=dateValue(input?.calculationDate||dateText(Date.now()));
    if(!name||name.length>80)return{ok:false,error:'Название должно содержать от 1 до 80 символов.'};
    if(!Number.isFinite(startingAmount)||startingAmount<0||startingAmount>MAX_AMOUNT)return{ok:false,error:'Проверьте начальную сумму.'};
    if(!Number.isFinite(monthlyContribution)||monthlyContribution<0||monthlyContribution>MAX_AMOUNT)return{ok:false,error:'Проверьте ежемесячный взнос.'};
    if(!Number.isFinite(annualRate)||annualRate<0||annualRate>MAX_RATE)return{ok:false,error:'Годовая ставка должна быть от 0% до 1000%.'};
    if(!Number.isFinite(termMonths)||termMonths<1||termMonths>MAX_MONTHS)return{ok:false,error:'Срок должен быть от 1 до 600 месяцев.'};
    if(targetAmount!=null&&(!Number.isFinite(targetAmount)||targetAmount<=0||targetAmount>MAX_AMOUNT))return{ok:false,error:'Проверьте целевую сумму.'};
    if(!calculationDate)return{ok:false,error:'Проверьте дату расчёта.'};
    return{ok:true,value:{name,sourceMode,goalId:String(input?.goalId||''),contributionSource:input?.contributionSource==='scenario'?'scenario':'actual',scenarioId:String(input?.scenarioId||''),startingAmount,monthlyContribution,annualRate,termMonths,targetAmount,calculationDate:dateText(calculationDate),calculatedAt:number(input?.calculatedAt,Date.now())}};
  }
  function calculate(state,input,inputDeps={},options={}){
    const source=sourceSnapshot(state,input,inputDeps,options.at||Date.now());if(!source.ok)return source;
    const merged={...input};
    if(source.sourceMode==='goal'){
      if(input?.startingAmount==null)merged.startingAmount=source.defaults.startingAmount;
      if(input?.monthlyContribution==null)merged.monthlyContribution=source.defaults.monthlyContribution;
      if(input?.targetAmount==null)merged.targetAmount=source.defaults.targetAmount;
    }
    const check=validate({...merged,calculatedAt:options.at||Date.now()});if(!check.ok)return check;
    const normalized=check.value,monthlyRate=normalized.annualRate/12/100,effectiveAnnualYield=(Math.pow(1+monthlyRate,12)-1)*100,start=dateValue(normalized.calculationDate);
    let balance=normalized.startingAmount,baseline=normalized.startingAmount,targetMonthWithInterest=normalized.targetAmount!=null&&balance>=normalized.targetAmount?0:null,targetMonthWithoutInterest=normalized.targetAmount!=null&&baseline>=normalized.targetAmount?0:null;
    const timeline=[];
    for(let month=1;month<=normalized.termMonths;month++){
      const opening=balance,interest=opening*monthlyRate,closing=opening+interest+normalized.monthlyContribution,baselineClosing=baseline+normalized.monthlyContribution;
      if(![opening,interest,closing,baselineClosing].every(Number.isFinite))return{ok:false,error:'Выбранная ставка, сумма или срок дают число вне поддерживаемого диапазона.'};
      balance=closing;baseline=baselineClosing;
      if(normalized.targetAmount!=null&&targetMonthWithInterest==null&&balance>=normalized.targetAmount)targetMonthWithInterest=month;
      if(normalized.targetAmount!=null&&targetMonthWithoutInterest==null&&baseline>=normalized.targetAmount)targetMonthWithoutInterest=month;
      timeline.push({month,monthDate:dateText(addMonths(start,month)),openingBalance:round(opening),interest:round(interest),contribution:round(normalized.monthlyContribution),closingBalance:round(balance),zeroInterestClosingBalance:round(baseline)});
    }
    const ownMoney=normalized.startingAmount+normalized.monthlyContribution*normalized.termMonths,endingWithInterest=balance,endingWithoutInterest=baseline,interestEarned=endingWithInterest-ownMoney;
    const warnings=[];if(normalized.annualRate>50)warnings.push('Высокая ставка: результат особенно чувствителен к предположению о доходности.');if(normalized.termMonths>120)warnings.push('Долгий срок: сложный процент сильно усиливает небольшие изменения ставки.');if(normalized.monthlyContribution<=0&&normalized.targetAmount!=null&&normalized.startingAmount<normalized.targetAmount)warnings.push('Ежемесячный взнос равен нулю: цель растёт только за счёт гипотетических процентов.');
    const result={calculatedAt:normalized.calculatedAt,calculationDate:normalized.calculationDate,monthlyRatePercent:monthlyRate*100,effectiveAnnualYieldPercent:effectiveAnnualYield,startingAmount:round(normalized.startingAmount),monthlyContribution:round(normalized.monthlyContribution),totalContributions:round(normalized.monthlyContribution*normalized.termMonths),ownMoney:round(ownMoney),endingWithoutInterest:round(endingWithoutInterest),endingWithInterest:round(endingWithInterest),interestEarned:round(interestEarned),interestDifference:round(endingWithInterest-endingWithoutInterest),targetAmount:normalized.targetAmount==null?null:round(normalized.targetAmount),targetMonthWithInterest,targetMonthWithoutInterest,targetMonthWithInterestDate:targetMonthWithInterest==null?null:dateText(addMonths(start,targetMonthWithInterest)),targetMonthWithoutInterestDate:targetMonthWithoutInterest==null?null:dateText(addMonths(start,targetMonthWithoutInterest)),timeSavedMonths:targetMonthWithInterest!=null&&targetMonthWithoutInterest!=null?Math.max(0,targetMonthWithoutInterest-targetMonthWithInterest):null,reachedWithInterest:targetMonthWithInterest!=null,reachedWithoutInterest:targetMonthWithoutInterest!=null,warnings,timeline,assumptions:{rateType:'nominal_annual',capitalization:'monthly',contributionTiming:'end_of_month',taxesIncluded:false,feesIncluded:false,inflationIncluded:false}};
    return{ok:true,inputs:normalized,result,sourceFingerprint:source.fingerprint,sourceDefaults:source.defaults,sourceScenarioDelta:source.delta||0};
  }
  function saveSimulation(state,input,inputDeps={},actorId='member-anna',at=Date.now()){
    normalizeState(state,at);const calculated=calculate(state,input,inputDeps,{at});if(!calculated.ok)return calculated;
    const item=normalizeSimulation({id:makeId('interest-simulation',at),name:calculated.inputs.name,sourceMode:calculated.inputs.sourceMode,goalId:calculated.inputs.goalId,contributionSource:calculated.inputs.contributionSource,scenarioId:calculated.inputs.scenarioId,inputs:calculated.inputs,result:calculated.result,sourceFingerprint:calculated.sourceFingerprint,createdAt:at,createdByMemberId:actorId,updatedAt:at,updatedByMemberId:actorId},at);
    state.whatIfInterestSimulations.push(item);return{ok:true,simulation:item};
  }
  function activeSimulations(state){normalizeState(state);return state.whatIfInterestSimulations.filter(item=>item.status==='active').sort((a,b)=>b.updatedAt-a.updatedAt||a.name.localeCompare(b.name,'ru'))}
  function duplicateSimulation(state,id,actorId='member-anna',at=Date.now()){
    normalizeState(state,at);const source=state.whatIfInterestSimulations.find(item=>item.id===id&&item.status==='active');if(!source)return{ok:false,error:'Расчёт не найден.'};
    const copy=normalizeSimulation({...clone(source),id:makeId('interest-simulation',at),name:`${source.name} — копия`,createdAt:at,createdByMemberId:actorId,updatedAt:at,updatedByMemberId:actorId},at);state.whatIfInterestSimulations.push(copy);return{ok:true,simulation:copy};
  }
  function archiveSimulation(state,id,actorId='member-anna',at=Date.now()){
    normalizeState(state,at);const item=state.whatIfInterestSimulations.find(item=>item.id===id&&item.status==='active');if(!item)return{ok:false,error:'Расчёт не найден.'};item.status='archived';item.updatedAt=at;item.updatedByMemberId=actorId;return{ok:true,simulation:item};
  }
  function isStale(state,simulation,inputDeps={},at=Date.now()){
    const item=typeof simulation==='string'?activeSimulations(state).find(row=>row.id===simulation):simulation;if(!item||item.sourceMode==='custom')return false;
    const current=sourceSnapshot(state,item.inputs,inputDeps,at);return !current.ok||current.fingerprint!==item.sourceFingerprint;
  }
  function financialFingerprint(state){const keys=['operations','obligationRules','obligationOccurrences','plannedIncomeRules','plannedIncomeOccurrences','debtEvents','savingsGoals','savingsAccountPlans','savingsContributionOverrides','savingsTransfers','walletTransfers','investmentAccounts','investmentValuations','balanceAdjustments','wallets','whatIfScenarios','whatIfPlanConversions'];const out={};for(const key of keys)out[key]=clone(state?.[key]||[]);return JSON.stringify(out)}
  return Object.freeze({MAX_AMOUNT,MAX_RATE,MAX_MONTHS,normalizeState,sourceSnapshot,scenarioDelta,calculate,saveSimulation,activeSimulations,duplicateSimulation,archiveSimulation,isStale,financialFingerprint});
});

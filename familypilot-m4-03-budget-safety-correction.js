(()=>{
  'use strict';
  if(window.__FP_M4_03_BUDGET_SAFETY_CORRECTION__)return;
  window.__FP_M4_03_BUDGET_SAFETY_CORRECTION__=true;

  const REVIEW_THRESHOLD=.33;
  const round=value=>Math.round((Number(value)||0)*100)/100;
  const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const makeId=(prefix='id',at=Date.now())=>`${prefix}-${Number(at).toString(36)}-${Math.random().toString(36).slice(2,9)}`;

  function normalizeReservePolicies(state){
    state.savingsReservePolicies=Array.isArray(state.savingsReservePolicies)?state.savingsReservePolicies:[];
    return state.savingsReservePolicies;
  }

  function currentReservePolicy(state){
    normalizeReservePolicies(state);
    return state.savingsReservePolicies.find(item=>item&&item.status==='active')||null;
  }

  function reviewDelta(current,baseline){
    const base=Math.max(.01,Math.abs(number(baseline)));
    return Math.abs(number(current)-number(baseline))/base;
  }

  function wrap(original){
    if(!original||original.__budgetSafetyCorrection)return original;

    const safeMonthEndReview=(state,accounts,options={})=>{
      const review=original.monthEndReview(state,accounts,options);
      const baseCapital=Number(options.baseCapital)||0;
      const asOf=Number(options.asOf)||Date.now();
      const nextMonth=original.forecast(state,accounts,{baseCapital,from:asOf,horizonDays:30});
      const safeRemainder=round(Math.max(0,Math.min(Number(review.operatingRemainder)||0,Number(nextMonth.minimumOperating)||0)));
      let remaining=safeRemainder;
      const proposals=[];
      for(const item of review.proposals||[]){
        if(remaining<=0)break;
        const amount=round(Math.min(Math.max(0,Number(item.amount)||0),remaining));
        if(!amount)continue;
        proposals.push({...item,amount});
        remaining=round(remaining-amount);
      }
      const allocated=round(proposals.reduce((sum,item)=>sum+item.amount,0));
      return{
        ...review,
        rawOperatingRemainder:round(review.operatingRemainder),
        operatingRemainder:safeRemainder,
        proposals,
        allocated,
        unallocated:round(safeRemainder-allocated),
        safetyBasis:'30_day_minimum_operating',
        next30DayMinimumOperating:round(nextMonth.minimumOperating),
      };
    };

    const additiveReserveProposal=(state,accounts,options={})=>{
      normalizeReservePolicies(state);
      const source=original.reserveProposal(state,accounts,options);
      const maximum=Number(accounts?.MAX_AMOUNT)||9999999.99;
      const recommendedTargetAmount=round(Math.min(maximum,Math.max(.01,Number(source.targetAmount)||.01)));
      const policy=currentReservePolicy(state);
      const baseline=policy?.recommendedTargetAtConfirmation||recommendedTargetAmount;
      const delta=policy?reviewDelta(recommendedTargetAmount,baseline):0;
      const targetAmount=round(Math.min(maximum,Math.max(.01,number(policy?.targetAmount,recommendedTargetAmount))));
      const monthlyContribution=round(Math.max(0,number(policy?.monthlyContribution,0)));
      return{
        ...source,
        id:`reserve:${original.monthKey(options.asOf||Date.now())}`,
        createItemId:`reserve-create:${original.monthKey(options.asOf||Date.now())}`,
        contributionItemId:`reserve-contribution:${original.monthKey(options.asOf||Date.now())}`,
        fundingMode:'additional_contribution',
        sourceItems:[],
        recommendedTargetAmount,
        targetAmount,
        monthlyContribution,
        targetLimit:maximum,
        reviewThreshold:REVIEW_THRESHOLD,
        recommendationChangeRatio:delta,
        reviewRequired:Boolean(policy&&delta>=REVIEW_THRESHOLD),
        policy,
        requiresPerItemConfirmation:true,
        explanation:'Резерв создаётся дополнительным накоплением и не уменьшает целевые отчисления.',
      };
    };

    const applyAdditiveReserveProposal=(state,accounts,legacy,proposal,confirmed,actor='member-anna',at=Date.now())=>{
      normalizeReservePolicies(state);
      const ids=new Set(confirmed||[]);
      if(!ids.has(proposal?.createItemId))return{ok:false,error:'Отдельно подтвердите создание или изменение резервного накопления.'};
      if(!ids.has(proposal?.contributionItemId))return{ok:false,error:'Отдельно подтвердите дополнительный ежемесячный взнос.'};
      const maximum=Number(accounts?.MAX_AMOUNT)||9999999.99;
      const targetAmount=round(number(proposal?.userTargetAmount,proposal?.targetAmount));
      const monthlyContribution=round(number(proposal?.userMonthlyContribution,proposal?.monthlyContribution));
      if(!(targetAmount>0&&targetAmount<=maximum))return{ok:false,error:`Цель резерва должна быть от 0,01 до ${maximum.toLocaleString('ru-RU')} €.`};
      if(!(monthlyContribution>0&&monthlyContribution<=maximum))return{ok:false,error:'Укажите положительный дополнительный ежемесячный взнос.'};

      let goal=(state.savingsGoals||[]).find(item=>item.id===state.reserveSavingsGoalId&&item.status==='active');
      let result;
      if(goal){
        result=legacy.updateGoal(state,goal.id,{
          name:'Резерв на покрытие дефицита',
          targetAmount,
          savedAmount:goal.savedAmount,
          targetDate:goal.targetDate||'',
        },actor,at);
      }else{
        result=legacy.createGoal(state,{
          name:'Резерв на покрытие дефицита',
          targetAmount,
          savedAmount:0,
          targetDate:'',
        },actor,at);
      }
      if(!result.ok)return result;
      goal=result.goal;
      state.reserveSavingsGoalId=goal.id;
      const plan=accounts.setPlan(state,goal.id,{
        planningMode:'fixed_contribution',
        monthlyContribution,
        contributionDay:1,
      },actor,at);
      if(!plan.ok)return plan;

      for(const item of state.savingsReservePolicies)item.status='superseded';
      const policy={
        id:makeId('reserve-policy',at),
        status:'active',
        goalId:goal.id,
        targetAmount,
        monthlyContribution,
        recommendedTargetAtConfirmation:round(number(proposal?.recommendedTargetAmount,targetAmount)),
        reviewThreshold:REVIEW_THRESHOLD,
        fundingMode:'additional_contribution',
        confirmedAt:at,
        confirmedByMemberId:actor,
      };
      state.savingsReservePolicies.push(policy);
      state.savingsReserveDesigns=Array.isArray(state.savingsReserveDesigns)?state.savingsReserveDesigns:[];
      state.savingsReserveDesigns.push({
        id:makeId('reserve-design',at),
        goalId:goal.id,
        targetAmount,
        monthlyContribution,
        sourceGoalIds:[],
        overrideIds:[],
        fundingMode:'additional_contribution',
        createdAt:at,
        createdByMemberId:actor,
      });
      return{
        ok:true,
        goal,
        policy,
        plan:plan.plan,
        overrides:[],
        requiresPerItemConfirmation:true,
      };
    };

    return Object.freeze({
      ...original,
      monthEndReview:safeMonthEndReview,
      reserveProposal:additiveReserveProposal,
      applyReserveProposal:applyAdditiveReserveProposal,
      reservePolicy:currentReservePolicy,
      __budgetSafetyCorrection:true,
      __additiveReserveCorrection:true,
    });
  }

  let current;
  const descriptor=Object.getOwnPropertyDescriptor(window,'FamilyPilotBudgetDesigner');
  if(descriptor?.value)current=wrap(descriptor.value);
  Object.defineProperty(window,'FamilyPilotBudgetDesigner',{
    configurable:true,
    enumerable:true,
    get(){return current},
    set(value){current=wrap(value)},
  });
  if(descriptor?.value)window.FamilyPilotBudgetDesigner=descriptor.value;
})();

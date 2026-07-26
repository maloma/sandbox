(()=>{
  'use strict';
  if(window.__FP_M4_03_BUDGET_SAFETY_CORRECTION__)return;
  window.__FP_M4_03_BUDGET_SAFETY_CORRECTION__=true;

  const round=value=>Math.round((Number(value)||0)*100)/100;

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

    const safeReserveProposal=(state,accounts,options={})=>{
      const proposal=original.reserveProposal(state,accounts,options);
      const maximum=Number(accounts?.MAX_AMOUNT)||9999999.99;
      return{
        ...proposal,
        targetAmount:round(Math.min(maximum,Math.max(0,Number(proposal.targetAmount)||0))),
        targetLimit:maximum,
      };
    };

    return Object.freeze({
      ...original,
      monthEndReview:safeMonthEndReview,
      reserveProposal:safeReserveProposal,
      __budgetSafetyCorrection:true,
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

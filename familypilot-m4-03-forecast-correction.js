(()=>{
  'use strict';
  if(window.__FP_M4_03_FORECAST_CORRECTION__)return;
  window.__FP_M4_03_FORECAST_CORRECTION__=true;

  const DAY=86400000;
  const terminal=new Set(['paid','skipped','cancelled']);
  const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const round=value=>Math.round((Number(value)||0)*100)/100;
  const startOfDay=value=>{const date=new Date(value);return new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime()};

  function linkedExpense(state,occurrenceId){
    return(Array.isArray(state?.operations)?state.operations:[])
      .filter(operation=>operation?.status==='active'&&operation?.kind==='expense'&&operation?.links?.obligationOccurrenceId===occurrenceId)
      .reduce((sum,operation)=>sum+Math.max(0,number(operation.amount)),0);
  }

  function rebuild(base,events){
    const rank={external_outflow:0,internal_transfer:1,external_inflow:2};
    const sorted=[...events].sort((a,b)=>a.date-b.date||(rank[a.type]??9)-(rank[b.type]??9)||String(a.title).localeCompare(String(b.title),'ru'));
    let operating=round(base.initial.operating),totalCapital=round(base.initial.totalCapital),purpose=round(base.initial.purpose),minimumOperating=operating,minimumOperatingDate=base.from,currentDate=null,currentIds=[];
    const timeline=[{date:base.from,operating,totalCapital,purpose,eventIds:[]}];
    const closeDate=()=>{
      if(currentDate==null)return;
      timeline.push({date:currentDate,operating:round(operating),totalCapital:round(totalCapital),purpose:round(purpose),eventIds:[...currentIds]});
      if(operating<minimumOperating){minimumOperating=operating;minimumOperatingDate=currentDate}
    };
    for(const event of sorted){
      if(currentDate!==event.date){closeDate();currentDate=event.date;currentIds=[]}
      currentIds.push(event.id);
      if(event.type==='external_inflow'){operating=round(operating+event.amount);totalCapital=round(totalCapital+event.amount)}
      else if(event.type==='external_outflow'){operating=round(operating-event.amount);totalCapital=round(totalCapital-event.amount)}
      else if(event.type==='internal_transfer'){operating=round(operating-event.amount);purpose=round(purpose+event.amount)}
    }
    closeDate();
    const ending=timeline[timeline.length-1]||timeline[0];
    return{...base,events:sorted,timeline,minimumOperating:round(minimumOperating),minimumOperatingDate,endingOperating:ending.operating,endingTotalCapital:ending.totalCapital,deficit:minimumOperating<0};
  }

  function wrap(original){
    if(!original||original.__obligationAmountCorrection)return original;
    const correctedForecast=(state,options={})=>{
      const base=original.forecast(state,options);
      const start=base.from;
      const end=base.to;
      const rules=Array.isArray(state?.obligationRules)?state.obligationRules:[];
      const events=base.events.filter(event=>event.sourceModule!=='obligations');
      for(const occurrence of Array.isArray(state?.obligationOccurrences)?state.obligationOccurrences:[]){
        if(terminal.has(occurrence?.status))continue;
        const date=startOfDay(number(occurrence?.dueAt,NaN));
        if(!Number.isFinite(date)||date<start||date>end)continue;
        const expected=occurrence?.expectedAmountOverride==null?Math.max(0,number(occurrence?.expectedAmount)):Math.max(0,number(occurrence.expectedAmountOverride));
        const amount=round(Math.max(0,expected-linkedExpense(state,occurrence.id)));
        if(!amount)continue;
        const rule=rules.find(item=>item.id===occurrence.ruleId);
        events.push({id:`obligation:${occurrence.id}`,date,type:'external_outflow',title:rule?.name||'Обязательный платёж',amount,sourceModule:'obligations',sourceId:occurrence.id,certainty:'planned'});
      }
      return rebuild(base,events);
    };
    return Object.freeze({...original,forecast:correctedForecast,__obligationAmountCorrection:true});
  }

  let current;
  const descriptor=Object.getOwnPropertyDescriptor(window,'FamilyPilotSavingsAccounts');
  if(descriptor?.value)current=wrap(descriptor.value);
  Object.defineProperty(window,'FamilyPilotSavingsAccounts',{
    configurable:true,
    enumerable:true,
    get(){return current},
    set(value){current=wrap(value)}
  });
  if(descriptor?.value)window.FamilyPilotSavingsAccounts=descriptor.value;
})();

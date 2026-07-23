(()=>{
  'use strict';
  if(window.__FP_PARTIAL_PAYMENT_SETTLEMENT__)return;
  const READY_LIMIT=1200,EPSILON=.005;

  function boot(attempt=0){
    const runtime=window.__FP_RUNTIME__,base=window.FamilyPilotPartialPayments;
    if(!runtime||!base||!window.__FP_PARTIAL_PAYMENTS_READY__){
      if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);
      else window.__FP_PARTIAL_PAYMENT_SETTLEMENT_ERROR__='Settlement dependencies did not become ready';
      return;
    }
    window.__FP_PARTIAL_PAYMENT_SETTLEMENT__=true;
    const state=runtime.state;
    const occurrence=id=>(state.obligationOccurrences||[]).find(item=>item.id===id)||null;

    function partialIntent(op){
      if(!op)return false;
      if(String(op.id||'').startsWith('op-partial-'))return true;
      if(op.links?.obligationAllocationOccurrenceId)return true;
      return(op.revisions||[]).some(revision=>['partial_payment_created','partial_payment_link_existing'].includes(revision?.source));
    }
    function explicitFullSettlement(id,operations){
      return operations.some(op=>op.links?.obligationOccurrenceId===id&&!partialIntent(op));
    }
    function summary(id){
      const raw=base.summary(id),full=explicitFullSettlement(id,raw.operations);
      if(!full)return{...raw,settlementMode:raw.operations.length?'partial':'none'};
      return{
        ...raw,
        remaining:0,
        overpaid:Math.max(0,raw.paid-raw.expected),
        status:'paid',
        settlementMode:'full'
      };
    }
    function deriveAll(){
      base.deriveAll();
      for(const item of state.obligationOccurrences||[]){
        const data=summary(item.id);
        if(!data.operations.length)continue;
        item.status=data.status;
        item.allocationStatus=data.status;
        item.actualAmount=data.paid;
        item.overpaidAmount=data.overpaid;
        item.linkedOperationIds=data.operations.map(op=>op.id);
        item.paidAt=Math.max(...data.operations.map(op=>Number(op.occurredAt||0)));
      }
      return state;
    }

    const api=Object.freeze({...base,summary,deriveAll,partialIntent,explicitFullSettlement});
    window.FamilyPilotPartialPayments=api;
    deriveAll();
    window.__FP_PARTIAL_PAYMENT_SETTLEMENT_READY__=true;
  }
  boot();
})();

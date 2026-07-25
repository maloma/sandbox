(()=>{
  'use strict';
  if(window.__FP_OBLIGATION_WALLET_ISOLATION__)return;
  const READY_LIMIT=1200;

  function boot(attempt=0){
    const runtime=window.__FP_RUNTIME__,original=window.FamilyPilotPartialPayments;
    if(!runtime||!original||!window.__FP_PARTIAL_PAYMENTS_READY__){
      if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);
      else window.__FP_OBLIGATION_WALLET_ISOLATION_ERROR__='Wallet isolation dependencies did not become ready';
      return;
    }
    window.__FP_OBLIGATION_WALLET_ISOLATION__=true;
    const state=runtime.state;
    const occurrence=id=>(state.obligationOccurrences||[]).find(item=>item.id===id)||null;
    const operation=id=>(state.operations||[]).find(item=>item.id===id)||null;
    const sameWallet=(occurrenceId,candidate)=>{
      const item=occurrence(occurrenceId),op=typeof candidate==='string'?operation(candidate):candidate;
      return !!item&&!!op&&!!item.walletId&&op.walletId===item.walletId;
    };
    const wrapper=Object.freeze({
      ...original,
      attachOperation(occurrenceId,candidate,source){
        const op=typeof candidate==='string'?operation(candidate):candidate;
        if(!sameWallet(occurrenceId,op))return{ok:false,error:'Операция находится в другом кошельке.'};
        return original.attachOperation(occurrenceId,op,source);
      }
    });
    window.FamilyPilotPartialPayments=wrapper;
    if(new URLSearchParams(location.search).has('test')){
      const install=(n=0)=>{if(window.__FP_TEST__){window.__FP_TEST__.obligationWalletIsolation={sameWallet};return}if(n<READY_LIMIT)setTimeout(()=>install(n+1),25)};install();
    }
    window.__FP_OBLIGATION_WALLET_ISOLATION_READY__=true;
  }
  boot();
})();
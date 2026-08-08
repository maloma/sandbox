(function(root){
  'use strict';

  function convertToBaseValue(input={}){
    const amount=Number(input.amount);
    const nativeCurrency=String(input.currency||'').trim().toUpperCase();
    const baseCurrency=String(input.baseCurrency||'').trim().toUpperCase();
    if(!Number.isFinite(amount))return{ok:false,error:'invalid_amount'};
    if(!nativeCurrency)return{ok:false,error:'currency_required'};
    if(!baseCurrency)return{ok:false,error:'base_currency_required'};

    if(nativeCurrency===baseCurrency){
      return{
        ok:true,
        converted:false,
        nativeAmount:amount,
        nativeCurrency,
        baseCurrency,
        baseAmount:Math.round(amount*100)/100,
        rateToBase:1,
        valuationSource:'base_currency',
        valuedAt:null
      };
    }

    const valuation=input.valuation&&typeof input.valuation==='object'?input.valuation:null;
    if(!valuation)return{ok:false,error:'valuation_required',nativeAmount:amount,nativeCurrency,baseCurrency};
    const rateToBase=Number(valuation.rateToBase);
    if(!Number.isFinite(rateToBase)||rateToBase<=0)return{ok:false,error:'invalid_rate',nativeAmount:amount,nativeCurrency,baseCurrency};
    const valuationSource=String(valuation.source||'').trim();
    if(!valuationSource)return{ok:false,error:'valuation_source_required',nativeAmount:amount,nativeCurrency,baseCurrency};
    const valuedAt=typeof valuation.valuedAt==='number'?valuation.valuedAt:Date.parse(String(valuation.valuedAt||''));
    if(!Number.isFinite(valuedAt)||valuedAt<=0)return{ok:false,error:'valuation_date_required',nativeAmount:amount,nativeCurrency,baseCurrency};

    return{
      ok:true,
      converted:true,
      nativeAmount:amount,
      nativeCurrency,
      baseCurrency,
      baseAmount:Math.round(amount*rateToBase*100)/100,
      rateToBase,
      valuationSource,
      valuedAt
    };
  }

  const api=Object.freeze({convertToBaseValue});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FamilyPilotFinancialTruth=api;
})(typeof globalThis!=='undefined'?globalThis:this);

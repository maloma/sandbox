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

  function makeCapitalContribution(input={}){
    const id=String(input.id||'').trim();
    const sourceType=String(input.sourceType||'').trim();
    const sourceId=String(input.sourceId||id).trim();
    const scope=input.scope==='personal'?'personal':'household';
    const scopeId=scope==='personal'?String(input.scopeId||'').trim():null;
    const effect=input.effect==='liability'?'liability':'asset';
    const nativeAmount=Math.abs(Number(input.amount));
    if(!id)return{ok:false,error:'contribution_id_required'};
    if(!sourceType)return{ok:false,error:'source_type_required'};
    if(scope==='personal'&&!scopeId)return{ok:false,error:'personal_scope_id_required'};
    if(!Number.isFinite(nativeAmount))return{ok:false,error:'invalid_amount'};

    const converted=convertToBaseValue({
      amount:nativeAmount,
      currency:input.currency,
      baseCurrency:input.baseCurrency,
      valuation:input.valuation
    });
    const sign=effect==='liability'?-1:1;
    const contribution={
      id,
      className:String(input.className||'other').trim()||'other',
      label:String(input.label||'').trim(),
      sourceType,
      sourceId,
      scope,
      scopeId,
      effect,
      liquid:input.liquid===true,
      nativeAmount,
      nativeCurrency:String(input.currency||'').trim().toUpperCase(),
      baseCurrency:String(input.baseCurrency||'').trim().toUpperCase(),
      resolved:converted.ok===true,
      baseAmount:converted.ok?Math.round(sign*Math.abs(converted.baseAmount)*100)/100:null,
      rateToBase:converted.ok?converted.rateToBase:null,
      valuationSource:converted.ok?converted.valuationSource:null,
      valuedAt:converted.ok?converted.valuedAt:null,
      valuationError:converted.ok?null:converted.error
    };
    return{ok:true,contribution};
  }

  const api=Object.freeze({convertToBaseValue,makeCapitalContribution});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FamilyPilotFinancialTruth=api;
})(typeof globalThis!=='undefined'?globalThis:this);

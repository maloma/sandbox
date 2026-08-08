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

  function sumCapitalContributions(contributions=[],context={}){
    const scope=context.scope==='personal'?'personal':'household';
    const scopeId=scope==='personal'?String(context.scopeId||'').trim():null;
    if(scope==='personal'&&!scopeId)return{ok:false,error:'personal_scope_id_required'};
    const input=Array.isArray(contributions)?contributions:[];
    const seen=new Set(),included=[],unresolved=[];
    let assets=0,liabilities=0,liquidAssets=0;
    for(const contribution of input){
      if(!contribution||typeof contribution!=='object')continue;
      if(contribution.scope!==scope)continue;
      if(scope==='personal'&&contribution.scopeId!==scopeId)continue;
      const id=String(contribution.id||'').trim();
      if(!id)return{ok:false,error:'contribution_id_required'};
      if(seen.has(id))return{ok:false,error:'duplicate_contribution_id',contributionId:id};
      seen.add(id);included.push(contribution);
      if(contribution.resolved!==true||!Number.isFinite(Number(contribution.baseAmount))){unresolved.push(contribution);continue}
      const value=Math.round(Number(contribution.baseAmount)*100)/100;
      if(value>=0){assets+=value;if(contribution.liquid===true)liquidAssets+=value}else liabilities+=Math.abs(value);
    }
    assets=Math.round(assets*100)/100;liabilities=Math.round(liabilities*100)/100;liquidAssets=Math.round(liquidAssets*100)/100;
    return{ok:true,scope,scopeId,assets,liabilities,liquidAssets,netCapital:Math.round((assets-liabilities)*100)/100,included,unresolved,allValued:unresolved.length===0};
  }

  function walletCapitalContributions(walletBalances=[],context={}){
    const baseCurrency=String(context.baseCurrency||'').trim().toUpperCase();
    if(!baseCurrency)return{ok:false,error:'base_currency_required'};
    const rows=Array.isArray(walletBalances)?walletBalances:[],contributions=[];
    for(const row of rows){
      if(!row||typeof row!=='object'||row.included===false)continue;
      const walletId=String(row.id||'').trim();
      const balance=Number(row.balance);
      if(!walletId)return{ok:false,error:'wallet_id_required'};
      if(!Number.isFinite(balance))return{ok:false,error:'invalid_wallet_balance',walletId};
      const result=makeCapitalContribution({
        id:`wallet:${walletId}`,
        sourceType:'wallet',
        sourceId:walletId,
        className:'money',
        label:String(row.name||'').trim(),
        scope:row.scope==='personal'?'personal':'household',
        scopeId:row.scope==='personal'?String(row.scopeId||walletId).trim():null,
        effect:balance<0?'liability':'asset',
        liquid:true,
        amount:Math.abs(balance),
        currency:row.currency||row.nativeCurrency,
        baseCurrency,
        valuation:row.valuation
      });
      if(!result.ok)return{...result,walletId};
      contributions.push(result.contribution);
    }
    return{ok:true,contributions};
  }

  const api=Object.freeze({convertToBaseValue,makeCapitalContribution,sumCapitalContributions,walletCapitalContributions});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FamilyPilotFinancialTruth=api;
})(typeof globalThis!=='undefined'?globalThis:this);

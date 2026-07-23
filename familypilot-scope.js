(function attachFamilyPilotScope(root){
  'use strict';

  const activeOperations=state=>(Array.isArray(state?.operations)?state.operations:[]).filter(operation=>operation?.status==='active');
  const activeMovements=state=>(Array.isArray(state?.walletMovements)?state.walletMovements:[]).filter(movement=>movement?.status==='active'&&(movement?.movementRole==='transfer_source'||movement?.movementRole==='transfer_destination'));
  const wallets=state=>Array.isArray(state?.wallets)?state.wallets:[];

  function canAccessWallet(state,wallet){
    if(!wallet||wallet.archivedAt)return false;
    if(wallet.ownerMemberId&&wallet.ownerMemberId===state?.currentMemberId)return true;
    if(!Array.isArray(wallet.allowedMemberIds))return true;
    return wallet.allowedMemberIds.includes(state?.currentMemberId);
  }
  function accessibleWallets(state){
    const available=wallets(state).filter(wallet=>canAccessWallet(state,wallet));
    return available.length?available:wallets(state).filter(wallet=>!wallet.archivedAt);
  }
  function defaultWallet(state){const available=accessibleWallets(state);return available.find(wallet=>wallet.type==='household_default')||available[0]||null}
  function activeWallet(state){const available=accessibleWallets(state);return available.find(wallet=>wallet.id===state?.activeWalletId)||defaultWallet(state)}
  const isPersonalWallet=wallet=>wallet?.type==='personal';
  const isTransfer=operation=>operation?.kind==='transfer';
  const transferWalletIds=operation=>[operation?.sourceWalletId,operation?.destinationWalletId].filter(Boolean);
  function transferAccessible(state,operation){
    const ids=transferWalletIds(operation);if(ids.length!==2)return false;
    return ids.every(id=>{const wallet=wallets(state).find(item=>item.id===id);return canAccessWallet(state,wallet)});
  }

  function visibleOperations(state){
    const selected=activeWallet(state);if(!selected)return[];
    const operations=activeOperations(state);
    if(isPersonalWallet(selected))return operations.filter(operation=>isTransfer(operation)?transferAccessible(state,operation)&&transferWalletIds(operation).includes(selected.id):operation.walletId===selected.id);
    const householdWalletIds=new Set(accessibleWallets(state).filter(wallet=>!isPersonalWallet(wallet)).map(wallet=>wallet.id));
    return operations.filter(operation=>isTransfer(operation)?transferAccessible(state,operation)&&transferWalletIds(operation).some(id=>householdWalletIds.has(id)):householdWalletIds.has(operation.walletId));
  }

  function householdCapitalOperations(state){
    const includedWalletIds=new Set(wallets(state).filter(wallet=>!wallet.archivedAt&&wallet.includedInHouseholdCapital===true).map(wallet=>wallet.id));
    return activeOperations(state).filter(operation=>!isTransfer(operation)&&includedWalletIds.has(operation.walletId));
  }
  function householdCapitalMovements(state){
    const includedWalletIds=new Set(wallets(state).filter(wallet=>!wallet.archivedAt&&wallet.includedInHouseholdCapital===true).map(wallet=>wallet.id));
    return activeMovements(state).filter(movement=>includedWalletIds.has(movement.walletId));
  }
  function walletMovements(state,walletId){return activeMovements(state).filter(movement=>movement.walletId===walletId)}

  function totals(operations){
    return operations.reduce((result,operation)=>{
      const amount=Number(operation?.amount)||0;
      if(operation?.kind==='income')result.income+=amount;
      if(operation?.kind==='expense')result.expense+=amount;
      if(operation?.kind === 'debt_inflow')result.debtInflow+=amount;
      if(operation?.kind === 'debt_outflow')result.debtOutflow+=amount;
      return result;
    },{income:0,expense:0,debtInflow:0,debtOutflow:0});
  }
  function movementTotals(movements){
    return movements.reduce((result,movement)=>{const amount=Number(movement?.amount)||0;if(movement?.direction==='inflow')result.transferInflow+=amount;if(movement?.direction==='outflow')result.transferOutflow+=amount;return result},{transferInflow:0,transferOutflow:0});
  }
  function snapshot(state,selected,operations,movements,opening,scope,currency){
    const flow=totals(operations),transferFlow=movementTotals(movements);
    const change=flow.income+flow.debtInflow+transferFlow.transferInflow-flow.expense-flow.debtOutflow-transferFlow.transferOutflow;
    return{wallet:selected,scope,currency,opening,...flow,...transferFlow,change,capital:opening+change};
  }
  function capitalSnapshot(state){
    const selected=activeWallet(state);
    if(!selected)return{wallet:null,scope:'household',currency:state?.household?.baseCurrency||'EUR',opening:0,income:0,expense:0,debtInflow:0,debtOutflow:0,transferInflow:0,transferOutflow:0,change:0,capital:0};
    if(isPersonalWallet(selected)){
      const operations=activeOperations(state).filter(operation=>!isTransfer(operation)&&operation.walletId===selected.id),movements=walletMovements(state,selected.id),opening=Number(selected.openingBalance)||0;
      return snapshot(state,selected,operations,movements,opening,'personal',selected.nativeCurrency||state?.household?.baseCurrency||'EUR');
    }
    const operations=householdCapitalOperations(state),movements=householdCapitalMovements(state),opening=Number(state?.household?.openingCapital)||0;
    const additionalOpening=wallets(state).filter(wallet=>wallet.type!=='household_default'&&wallet.includedInHouseholdCapital===true).reduce((sum,wallet)=>sum+(Number(wallet.openingBalance)||0),0);
    return snapshot(state,selected,operations,movements,opening+additionalOpening,'household',state?.household?.baseCurrency||selected.nativeCurrency||'EUR');
  }
  function scopeDescriptor(state){
    const selected=activeWallet(state),personal=isPersonalWallet(selected);
    return{wallet:selected,scope:personal?'personal':'household',currency:personal?(selected?.nativeCurrency||state?.household?.baseCurrency||'EUR'):(state?.household?.baseCurrency||'EUR'),capitalTitle:personal?'Личный капитал':'Капитал',capitalLabel:personal?(selected?.name||'Личный кошелёк'):'включённые кошельки',operationsLabel:personal?(selected?.name||'Личный кошелёк'):'Семейный контекст',analyticsLabel:personal?(selected?.name||'Личный кошелёк'):'Семейный контекст'};
  }

  root.FamilyPilotScope=Object.freeze({activeOperations,activeMovements,canAccessWallet,accessibleWallets,defaultWallet,activeWallet,isPersonalWallet,isTransfer,visibleOperations,householdCapitalOperations,householdCapitalMovements,walletMovements,totals,movementTotals,capitalSnapshot,scopeDescriptor});
})(typeof window!=='undefined'?window:globalThis);

(function bootstrapFamilyPilotPackages(root){
  'use strict';
  if(typeof document==='undefined'||!root||root.__FP_WF02_BOOTSTRAP__)return;
  root.__FP_WF02_BOOTSTRAP__=true;

  const testMode=new URLSearchParams(location.search).has('test');
  const testApiDeadline=Date.now()+30000;

  function ensurePackageMarker(){
    const selector='meta[name="familypilot-package"][content="base-currency-wallet-transfers-v1"]';
    if(document.head&&!document.head.querySelector(selector)){
      const marker=document.createElement('meta');
      marker.name='familypilot-package';
      marker.content='base-currency-wallet-transfers-v1';
      marker.dataset.runtimeMount='familypilot-scope';
      document.head.appendChild(marker);
    }
  }
  function loadScript(path,ready){
    const existing=[...document.scripts].find(script=>script.src&&script.src.endsWith(`/${path}`));
    if(existing){
      if(existing.dataset.loaded==='true')ready();
      else existing.addEventListener('load',ready,{once:true});
      return;
    }
    const script=document.createElement('script');
    script.src=`./${path}`;
    script.async=false;
    script.dataset.familyPilotPackage='runtime-extension';
    script.addEventListener('load',()=>{script.dataset.loaded='true';ready()},{once:true});
    script.addEventListener('error',()=>{root.__FP_PACKAGE_BOOTSTRAP_ERROR__=`Failed to load ${path}`},{once:true});
    document.head.appendChild(script);
  }
  function loadPaymentAttention(){
    loadScript('familypilot-payment-attention.js',()=>loadScript('familypilot-payment-attention-ui.js',()=>{
      root.__FP_M3_03_READY__=true;
      loadScript('familypilot-obligation-state-ui.js',()=>{
        root.__FP_M3_04_READY__=true;
        loadScript('familypilot-partial-payments.js',()=>loadScript('familypilot-partial-payment-settlement.js',()=>loadScript('familypilot-partial-payments-render-sync.js',()=>{
          root.__FP_M3_07_MODEL_READY__=true;
          loadScript('familypilot-payment-link-lifecycle.js',()=>{
            root.__FP_M3_05_READY__=true;
            loadScript('familypilot-mobile-payment-tap.js',()=>loadScript('familypilot-operation-mobile-ui.js',()=>loadScript('familypilot-operation-date-picker.js',()=>{root.__FP_M3_06_READY__=true;root.__FP_M3_07_READY__=true})));
          });
        })));
      });
    }));
  }
  function loadUiWhenBaseRuntimeReady(){
    if(testMode&&!root.__FP_TEST__){
      if(Date.now()>=testApiDeadline){root.__FP_WF02_BOOTSTRAP_ERROR__='Base FamilyPilot test API did not become ready';return}
      setTimeout(loadUiWhenBaseRuntimeReady,25);
      return;
    }
    loadScript('familypilot-wallet-transfers-ui.js',()=>{root.__FP_WF02_READY__=true;loadPaymentAttention()});
  }
  function mount(){
    ensurePackageMarker();
    loadScript('familypilot-wallet-transfers.js',loadUiWhenBaseRuntimeReady);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else queueMicrotask(mount);
})(typeof window!=='undefined'?window:globalThis);

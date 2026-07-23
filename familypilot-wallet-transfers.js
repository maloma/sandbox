(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FamilyPilotWalletTransfers=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const TRANSFER_KIND='transfer';
  const SOURCE_ROLE='transfer_source';
  const DESTINATION_ROLE='transfer_destination';
  const cleanNote=value=>String(value||'').trim().replace(/\s+/g,' ');
  const makeId=(prefix='transfer',at=Date.now())=>`${prefix}-${Number(at).toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const walletById=(state,id)=>(Array.isArray(state?.wallets)?state.wallets:[]).find(wallet=>wallet?.id===id&&!wallet.archivedAt);
  const isPersonal=wallet=>wallet?.type==='personal';
  const accessibleTo=(wallet,memberId)=>!!wallet&&!wallet.archivedAt&&(isPersonal(wallet)&&wallet.ownerMemberId===memberId||!Array.isArray(wallet.allowedMemberIds)||wallet.allowedMemberIds.includes(memberId));
  const baseCurrency=state=>String(state?.household?.baseCurrency||'EUR');
  const movementId=(transferId,role)=>`${transferId}:${role==='source'?'source':'destination'}`;
  const projectionId=transferId=>`${transferId}:operation`;
  const cloneValue=value=>value==null?value:JSON.parse(JSON.stringify(value));

  function normalizeTransfer(raw,state,at=Date.now()){
    const sourceWalletId=String(raw?.sourceWalletId||raw?.source_wallet_id||'');
    const destinationWalletId=String(raw?.destinationWalletId||raw?.destination_wallet_id||'');
    const amount=Number(raw?.amount);
    const createdAt=Number(raw?.createdAt)||Number(raw?.created_at)||at;
    const effectiveDate=Number(raw?.effectiveDate)||Number(raw?.effective_date)||createdAt;
    const actor=String(raw?.createdByMemberId||raw?.created_by_member_id||state?.currentMemberId||'member-anna');
    return{
      id:String(raw?.id||raw?.transferId||raw?.transfer_id||makeId('transfer',at)),
      householdId:String(raw?.householdId||raw?.household_id||state?.household?.id||'household-demo'),
      sourceWalletId,
      destinationWalletId,
      amount:Number.isFinite(amount)?Math.round(amount*100)/100:0,
      currency:String(raw?.currency||baseCurrency(state)),
      effectiveDate,
      note:cleanNote(raw?.note),
      createdAt,
      createdByMemberId:actor,
      updatedAt:Number(raw?.updatedAt)||Number(raw?.updated_at)||createdAt,
      updatedByMemberId:String(raw?.updatedByMemberId||raw?.updated_by_member_id||actor),
      revisionSequence:Number(raw?.revisionSequence)||Number(raw?.revision_sequence)||0,
      revisions:Array.isArray(raw?.revisions)?raw.revisions.map(item=>({...item,changes:Array.isArray(item?.changes)?item.changes.map(change=>({...change})):[]})):[],
      status:raw?.status==='inactive'?'inactive':'active'
    };
  }

  function movementFor(transfer,role){
    const source=role==='source';
    return{
      id:movementId(transfer.id,role),
      householdId:transfer.householdId,
      parentEventId:transfer.id,
      transferId:transfer.id,
      movementRole:source?SOURCE_ROLE:DESTINATION_ROLE,
      direction:source?'outflow':'inflow',
      walletId:source?transfer.sourceWalletId:transfer.destinationWalletId,
      amount:transfer.amount,
      currency:transfer.currency,
      effectiveDate:transfer.effectiveDate,
      status:transfer.status==='active'?'active':'inactive',
      createdAt:transfer.createdAt,
      createdByMemberId:transfer.createdByMemberId,
      updatedAt:transfer.updatedAt,
      updatedByMemberId:transfer.updatedByMemberId
    };
  }

  function operationProjection(transfer,existing){
    return{
      ...(existing&&typeof existing==='object'?existing:{}),
      id:projectionId(transfer.id),
      kind:TRANSFER_KIND,
      transferId:transfer.id,
      transferGroupId:transfer.id,
      sourceWalletId:transfer.sourceWalletId,
      destinationWalletId:transfer.destinationWalletId,
      walletId:transfer.sourceWalletId,
      amount:transfer.amount,
      currency:transfer.currency,
      categoryId:null,
      note:transfer.note,
      occurredAt:transfer.effectiveDate,
      createdByMemberId:transfer.createdByMemberId,
      createdAt:transfer.createdAt,
      lastEditedByMemberId:transfer.updatedByMemberId,
      lastEditedAt:transfer.updatedAt,
      revisions:transfer.revisions.map(item=>({...item,changes:item.changes.map(change=>({...change}))})),
      status:transfer.status,
      deletedAt:null,
      deletedByMemberId:null,
      trashExpiresAt:null,
      receipt:null,
      links:{...(existing?.links||{}),transferId:transfer.id}
    };
  }

  function syncTransfer(state,transfer){
    state.walletMovements=Array.isArray(state.walletMovements)?state.walletMovements:[];
    state.operations=Array.isArray(state.operations)?state.operations:[];
    const source=movementFor(transfer,'source'),destination=movementFor(transfer,'destination');
    const unrelated=state.walletMovements.filter(item=>item?.transferId!==transfer.id&&item?.parentEventId!==transfer.id);
    state.walletMovements=[...unrelated,source,destination];
    const existing=state.operations.find(item=>item?.id===projectionId(transfer.id)||item?.kind===TRANSFER_KIND&&item?.transferId===transfer.id);
    const projection=operationProjection(transfer,existing);
    const operations=state.operations.filter(item=>item!==existing&&!(item?.kind===TRANSFER_KIND&&item?.transferId===transfer.id));
    operations.push(projection);
    state.operations=operations;
    return{sourceMovement:source,destinationMovement:destination,operation:projection};
  }

  function normalizeState(state,at=Date.now()){
    if(!state||typeof state!=='object')throw new Error('FamilyPilot state is required');
    state.schemaVersion=Math.max(8,Number(state.schemaVersion)||0);
    state.household=state.household||{id:'household-demo',baseCurrency:'EUR'};
    state.transfers=Array.isArray(state.transfers)?state.transfers.filter(Boolean).map(item=>normalizeTransfer(item,state,at)):[];
    const unique=[];
    const seen=new Set();
    for(const transfer of state.transfers){
      if(seen.has(transfer.id))continue;
      seen.add(transfer.id);unique.push(transfer);
    }
    state.transfers=unique;
    state.walletMovements=(Array.isArray(state.walletMovements)?state.walletMovements:[]).filter(item=>!item?.transferId&&item?.movementRole!==SOURCE_ROLE&&item?.movementRole!==DESTINATION_ROLE);
    state.operations=(Array.isArray(state.operations)?state.operations:[]).filter(item=>item?.kind!==TRANSFER_KIND);
    for(const transfer of state.transfers)syncTransfer(state,transfer);
    return state;
  }

  function validation(state,input,actorId,editingId=''){
    const sourceWalletId=String(input?.sourceWalletId||'');
    const destinationWalletId=String(input?.destinationWalletId||'');
    const sourceWallet=walletById(state,sourceWalletId),destinationWallet=walletById(state,destinationWalletId);
    const amount=Number(input?.amount);
    const effectiveDate=Number(input?.effectiveDate);
    if(!sourceWallet)return{ok:false,error:'Выберите доступный исходный кошелёк.'};
    if(!destinationWallet)return{ok:false,error:'Выберите доступный кошелёк назначения.'};
    if(sourceWalletId===destinationWalletId)return{ok:false,error:'Исходный кошелёк и кошелёк назначения должны отличаться.'};
    if(sourceWallet.householdId&&sourceWallet.householdId!==state.household.id||destinationWallet.householdId&&destinationWallet.householdId!==state.household.id)return{ok:false,error:'Перевод возможен только внутри текущей семьи.'};
    if(!accessibleTo(sourceWallet,actorId)||!accessibleTo(destinationWallet,actorId))return{ok:false,error:'Один из кошельков недоступен текущему участнику.'};
    const currency=baseCurrency(state);
    if(String(sourceWallet.nativeCurrency||currency)!==currency||String(destinationWallet.nativeCurrency||currency)!==currency)return{ok:false,error:'WF-02 поддерживает только базовую валюту семьи.'};
    if(input?.currency!=null&&String(input.currency)!==currency)return{ok:false,error:'Конвертация валют в WF-02 недоступна.'};
    if(!Number.isFinite(amount)||amount<=0)return{ok:false,error:'Сумма перевода должна быть больше нуля.'};
    if(Math.round(amount*100)/100>999999.99)return{ok:false,error:'Максимальная сумма перевода — 999 999,99.'};
    if(!Number.isFinite(effectiveDate)||effectiveDate<=0)return{ok:false,error:'Укажите дату перевода.'};
    const duplicate=state.transfers?.find(item=>item.id!==editingId&&item.status==='active'&&item.sourceWalletId===sourceWalletId&&item.destinationWalletId===destinationWalletId&&item.amount===Math.round(amount*100)/100&&item.effectiveDate===effectiveDate&&cleanNote(item.note)===cleanNote(input?.note));
    if(duplicate)return{ok:false,error:'Такой перевод уже существует.'};
    return{ok:true,sourceWallet,destinationWallet,sourceWalletId,destinationWalletId,amount:Math.round(amount*100)/100,currency,effectiveDate,note:cleanNote(input?.note)};
  }

  function createTransfer(state,input,actorId,at=Date.now()){
    normalizeState(state,at);
    const valid=validation(state,input,actorId);if(!valid.ok)return valid;
    const transfer=normalizeTransfer({
      id:makeId('transfer',at),householdId:state.household.id,sourceWalletId:valid.sourceWalletId,destinationWalletId:valid.destinationWalletId,
      amount:valid.amount,currency:valid.currency,effectiveDate:valid.effectiveDate,note:valid.note,createdAt:at,createdByMemberId:actorId,
      updatedAt:at,updatedByMemberId:actorId,revisionSequence:0,revisions:[],status:'active'
    },state,at);
    state.transfers.push(transfer);
    const synced=syncTransfer(state,transfer);
    return{ok:true,transfer,...synced};
  }

  function correctTransfer(state,transferId,input,actorId,at=Date.now()){
    normalizeState(state,at);
    const transfer=state.transfers.find(item=>item.id===transferId&&item.status==='active');
    if(!transfer)return{ok:false,error:'Перевод не найден.'};
    const valid=validation(state,input,actorId,transferId);if(!valid.ok)return valid;
    const next={sourceWalletId:valid.sourceWalletId,destinationWalletId:valid.destinationWalletId,amount:valid.amount,currency:valid.currency,effectiveDate:valid.effectiveDate,note:valid.note};
    const changes=[];
    for(const field of Object.keys(next))if(String(transfer[field]??'')!==String(next[field]??''))changes.push({field,oldValue:cloneValue(transfer[field]),newValue:cloneValue(next[field])});
    if(!changes.length)return{ok:true,transfer,unchanged:true,...syncTransfer(state,transfer)};
    transfer.revisionSequence=(Number(transfer.revisionSequence)||0)+1;
    transfer.revisions.push({id:makeId('transfer-rev',at),sequence:transfer.revisionSequence,changedAt:at,changedByMemberId:actorId,changes});
    Object.assign(transfer,next,{updatedAt:at,updatedByMemberId:actorId});
    const synced=syncTransfer(state,transfer);
    return{ok:true,transfer,...synced};
  }

  function accessibleWallets(state,memberId){return(Array.isArray(state?.wallets)?state.wallets:[]).filter(wallet=>accessibleTo(wallet,memberId)&&String(wallet.nativeCurrency||baseCurrency(state))===baseCurrency(state));}
  function transferForOperation(state,operationId){const operation=(state.operations||[]).find(item=>item.id===operationId);return(state.transfers||[]).find(item=>item.id===(operation?.transferId||operationId));}
  function movementsFor(state,transferId){return(state.walletMovements||[]).filter(item=>item.transferId===transferId&&item.status==='active').sort((a,b)=>a.movementRole.localeCompare(b.movementRole));}
  function projectionFor(state,transferId){return(state.operations||[]).find(item=>item.kind===TRANSFER_KIND&&item.transferId===transferId&&item.status==='active');}

  return Object.freeze({TRANSFER_KIND,SOURCE_ROLE,DESTINATION_ROLE,normalizeTransfer,normalizeState,validation,createTransfer,correctTransfer,accessibleTo,accessibleWallets,movementFor,operationProjection,syncTransfer,transferForOperation,movementsFor,projectionFor,movementId,projectionId});
});

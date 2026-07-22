(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FamilyPilotWalletManagement=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const MAX_NAME=60;
  const SHARED_TYPES=new Set(['household_default','household_shared','household_additional']);
  const makeId=(prefix='wallet',at=Date.now())=>`${prefix}-${Number(at).toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const cleanName=value=>String(value||'').trim().replace(/\s+/g,' ');
  const normalizeName=value=>cleanName(value).toLocaleLowerCase('ru-RU');
  const uniq=list=>[...new Set((Array.isArray(list)?list:[]).filter(Boolean).map(String))];
  const memberIds=members=>uniq((Array.isArray(members)?members:[]).map(member=>member?.id));
  const isShared=wallet=>SHARED_TYPES.has(wallet?.type);
  const isPersonal=wallet=>wallet?.type==='personal';

  function normalizeWallet(raw,state,members,at=Date.now()){
    const householdId=String(state?.household?.id||raw?.householdId||'household-demo');
    const baseCurrency=String(state?.household?.baseCurrency||'EUR');
    const allMembers=memberIds(members);
    const type=raw?.type==='personal'?'personal':raw?.type==='household_default'?'household_default':'household_shared';
    const owner=type==='personal'?String(raw?.ownerMemberId||raw?.allowedMemberIds?.[0]||state?.currentMemberId||allMembers[0]||'member-anna'):null;
    const allowed=type==='personal'?uniq([owner,...uniq(raw?.allowedMemberIds)]):uniq(allMembers.length?allMembers:raw?.allowedMemberIds);
    const included=type==='personal'?raw?.includedInHouseholdCapital===true:true;
    const createdAt=Number(raw?.createdAt)||at;
    return{
      id:String(raw?.id||makeId('wallet',at)),
      type,
      name:cleanName(raw?.name)|| (type==='household_default'?'Семейный':type==='personal'?'Личный':'Общий кошелёк'),
      nativeCurrency:type==='personal'||isShared({type})?baseCurrency:baseCurrency,
      householdId,
      ownerMemberId:owner,
      allowedMemberIds:allowed,
      includedInHouseholdCapital:included,
      openingBalance:Number.isFinite(Number(raw?.openingBalance))?Number(raw.openingBalance):0,
      createdAt,
      createdByMemberId:String(raw?.createdByMemberId||owner||state?.currentMemberId||allMembers[0]||'member-anna'),
      updatedAt:Number(raw?.updatedAt)||createdAt,
      updatedByMemberId:String(raw?.updatedByMemberId||raw?.createdByMemberId||owner||state?.currentMemberId||allMembers[0]||'member-anna'),
      archivedAt:raw?.archivedAt==null?null:Number(raw.archivedAt)||null,
      revisions:Array.isArray(raw?.revisions)?raw.revisions:[]
    };
  }

  function normalizeState(state,members,at=Date.now()){
    if(!state||typeof state!=='object')throw new Error('FamilyPilot state is required');
    state.schemaVersion=Math.max(7,Number(state.schemaVersion)||0);
    state.household=state.household||{id:'household-demo',baseCurrency:'EUR'};
    state.household.baseCurrency=String(state.household.baseCurrency||'EUR');
    state.wallets=(Array.isArray(state.wallets)?state.wallets:[]).filter(Boolean).map(wallet=>normalizeWallet(wallet,state,members,at));
    let defaultWallet=state.wallets.find(wallet=>wallet.type==='household_default'&&!wallet.archivedAt);
    if(!defaultWallet){defaultWallet=normalizeWallet({id:'wallet-household-main',type:'household_default',name:'Семейный'},state,members,at);state.wallets.unshift(defaultWallet)}
    defaultWallet.includedInHouseholdCapital=true;
    defaultWallet.ownerMemberId=null;
    defaultWallet.allowedMemberIds=memberIds(members).length?memberIds(members):defaultWallet.allowedMemberIds;
    if(!state.activeWalletId||!state.wallets.some(wallet=>wallet.id===state.activeWalletId&&!wallet.archivedAt))state.activeWalletId=defaultWallet.id;
    return state;
  }

  function validation(state,input){
    const name=cleanName(input?.name),normalized=normalizeName(name);
    if(!name)return{ok:false,error:'Введите название кошелька.'};
    if(Array.from(name).length>MAX_NAME)return{ok:false,error:`Название кошелька — не более ${MAX_NAME} символов.`};
    if((state.wallets||[]).some(wallet=>!wallet.archivedAt&&normalizeName(wallet.name)===normalized&&wallet.id!==input?.id))return{ok:false,error:'Кошелёк с таким названием уже существует.'};
    return{ok:true,name};
  }

  function createWallet(state,members,input,actorId,at=Date.now()){
    normalizeState(state,members,at);
    const valid=validation(state,input);if(!valid.ok)return valid;
    const type=input?.type==='personal'?'personal':'household_shared';
    const allMembers=memberIds(members);
    const wallet=normalizeWallet({
      id:makeId('wallet',at),type,name:valid.name,nativeCurrency:state.household.baseCurrency,
      householdId:state.household.id,ownerMemberId:type==='personal'?actorId:null,
      allowedMemberIds:type==='personal'?[actorId]:allMembers,
      includedInHouseholdCapital:type!=='personal',openingBalance:0,
      createdAt:at,createdByMemberId:actorId,updatedAt:at,updatedByMemberId:actorId,revisions:[]
    },state,members,at);
    state.wallets.push(wallet);
    return{ok:true,wallet};
  }

  function canEdit(wallet,actorId){
    if(!wallet||wallet.archivedAt||wallet.type==='household_default')return false;
    if(isPersonal(wallet))return wallet.ownerMemberId===actorId;
    return wallet.allowedMemberIds.includes(actorId);
  }

  function updateName(state,members,walletId,name,actorId,at=Date.now()){
    normalizeState(state,members,at);
    const wallet=state.wallets.find(item=>item.id===walletId);
    if(!wallet)return{ok:false,error:'Кошелёк не найден.'};
    if(!canEdit(wallet,actorId))return{ok:false,error:'Изменение этого кошелька недоступно.'};
    const valid=validation(state,{id:walletId,name});if(!valid.ok)return valid;
    if(wallet.name===valid.name)return{ok:true,wallet,unchanged:true};
    wallet.revisions.push({id:makeId('wallet-rev',at),changedAt:at,changedByMemberId:actorId,field:'name',oldValue:wallet.name,newValue:valid.name});
    wallet.name=valid.name;wallet.updatedAt=at;wallet.updatedByMemberId=actorId;
    return{ok:true,wallet};
  }

  function setPersonalCapitalInclusion(state,members,walletId,included,actorId,at=Date.now()){
    normalizeState(state,members,at);
    const wallet=state.wallets.find(item=>item.id===walletId);
    if(!wallet)return{ok:false,error:'Кошелёк не найден.'};
    if(!isPersonal(wallet)||wallet.ownerMemberId!==actorId)return{ok:false,error:'Только владелец личного кошелька может менять включение в семейный капитал.'};
    const next=included===true;
    if(wallet.includedInHouseholdCapital===next)return{ok:true,wallet,unchanged:true};
    wallet.revisions.push({id:makeId('wallet-rev',at),changedAt:at,changedByMemberId:actorId,field:'includedInHouseholdCapital',oldValue:wallet.includedInHouseholdCapital,newValue:next});
    wallet.includedInHouseholdCapital=next;wallet.updatedAt=at;wallet.updatedByMemberId=actorId;
    return{ok:true,wallet};
  }

  function accessibleTo(wallet,memberId){
    if(!wallet||wallet.archivedAt)return false;
    if(isPersonal(wallet)&&wallet.ownerMemberId===memberId)return true;
    return wallet.allowedMemberIds.includes(memberId);
  }
  function accessibleWallets(state,memberId){
    return(state.wallets||[]).filter(wallet=>accessibleTo(wallet,memberId)).sort((a,b)=>{
      const rank=wallet=>wallet.type==='household_default'?0:isShared(wallet)?1:2;
      return rank(a)-rank(b)||a.name.localeCompare(b.name,'ru');
    });
  }
  function memberName(members,id){return(Array.isArray(members)?members:[]).find(member=>member.id===id)?.name||id||'—'}
  function descriptor(wallet,members){
    return{
      id:wallet.id,name:wallet.name,type:wallet.type,
      classLabel:wallet.type==='household_default'?'Основной семейный':isPersonal(wallet)?'Личный':'Общий семейный',
      ownerLabel:isPersonal(wallet)?memberName(members,wallet.ownerMemberId):'Семья',
      currency:wallet.nativeCurrency,
      includedInHouseholdCapital:wallet.includedInHouseholdCapital===true,
      editable:wallet.type!=='household_default'
    };
  }

  return Object.freeze({MAX_NAME,isShared,isPersonal,normalizeWallet,normalizeState,validation,createWallet,canEdit,updateName,setPersonalCapitalInclusion,accessibleTo,accessibleWallets,descriptor});
});
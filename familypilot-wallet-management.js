(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FamilyPilotWalletManagement=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const MAX_NAME=60;
  const SHARED_TYPES=new Set(['household_default','household_shared','household_additional']);
  const LOCATION_KINDS=new Set(['cash_wallet','cash_envelope','cash_box','bank_current','bank_savings']);
  const makeId=(prefix='wallet',at=Date.now())=>`${prefix}-${Number(at).toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const cleanName=value=>String(value||'').trim().replace(/\s+/g,' ');
  const normalizeName=value=>cleanName(value).toLocaleLowerCase('ru-RU');
  const uniq=list=>[...new Set((Array.isArray(list)?list:[]).filter(Boolean).map(String))];
  const memberIds=members=>uniq((Array.isArray(members)?members:[]).map(member=>member?.id));
  const isShared=wallet=>SHARED_TYPES.has(wallet?.type);
  const isPersonal=wallet=>wallet?.type==='personal';
  const moneyFormForKind=kind=>String(kind||'').startsWith('cash_')?'cash':'bank';
  const inferLocationKind=raw=>LOCATION_KINDS.has(raw?.locationKind)?raw.locationKind:(raw?.moneyForm==='cash'?'cash_wallet':'bank_current');

  function normalizeWallet(raw,state,members,at=Date.now()){
    const householdId=String(state?.household?.id||raw?.householdId||'household-demo');
    const baseCurrency=String(state?.household?.baseCurrency||'EUR');
    const allMembers=memberIds(members);
    const type=raw?.type==='personal'?'personal':raw?.type==='household_default'?'household_default':'household_shared';
    const owner=type==='personal'?String(raw?.ownerMemberId||raw?.allowedMemberIds?.[0]||state?.currentMemberId||allMembers[0]||'member-anna'):null;
    const allowed=type==='personal'?uniq([owner,...uniq(raw?.allowedMemberIds)]):uniq(allMembers.length?allMembers:raw?.allowedMemberIds);
    const included=type==='personal'?raw?.includedInHouseholdCapital===true:true;
    const createdAt=Number(raw?.createdAt)||at;
    const locationKind=inferLocationKind(raw);
    const moneyForm=moneyFormForKind(locationKind);
    return{
      id:String(raw?.id||makeId('wallet',at)),
      type,
      name:cleanName(raw?.name)||(type==='household_default'?'Основной банковский счёт':type==='personal'?'Личный счёт':'Место хранения'),
      nativeCurrency:type==='personal'||isShared({type})?baseCurrency:baseCurrency,
      householdId,
      ownerMemberId:owner,
      allowedMemberIds:allowed,
      visibleToMemberIds:uniq(raw?.visibleToMemberIds),
      includedInHouseholdCapital:included,
      openingBalance:Number.isFinite(Number(raw?.openingBalance))?Number(raw.openingBalance):0,
      moneyForm,
      locationKind,
      isMoneyLocation:raw?.isMoneyLocation!==false,
      psychologicalProtection:raw?.psychologicalProtection==='separate'?'separate':locationKind==='bank_current'||locationKind==='cash_wallet'?'shared_visible':'separate',
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
    if(!defaultWallet){defaultWallet=normalizeWallet({id:'wallet-household-main',type:'household_default',name:'Основной банковский счёт',locationKind:'bank_current'},state,members,at);state.wallets.unshift(defaultWallet)}
    defaultWallet.includedInHouseholdCapital=true;
    defaultWallet.ownerMemberId=null;
    defaultWallet.allowedMemberIds=memberIds(members).length?memberIds(members):defaultWallet.allowedMemberIds;
    defaultWallet.locationKind=LOCATION_KINDS.has(defaultWallet.locationKind)?defaultWallet.locationKind:'bank_current';
    defaultWallet.moneyForm=moneyFormForKind(defaultWallet.locationKind);
    if(!state.activeWalletId||!state.wallets.some(wallet=>wallet.id===state.activeWalletId&&!wallet.archivedAt))state.activeWalletId=defaultWallet.id;
    return state;
  }

  function validation(state,input){
    const name=cleanName(input?.name),normalized=normalizeName(name);
    if(!name)return{ok:false,error:'Введите название места хранения.'};
    if(Array.from(name).length>MAX_NAME)return{ok:false,error:`Название — не более ${MAX_NAME} символов.`};
    if((state.wallets||[]).some(wallet=>!wallet.archivedAt&&normalizeName(wallet.name)===normalized&&wallet.id!==input?.id))return{ok:false,error:'Место хранения с таким названием уже существует.'};
    if(input?.locationKind!=null&&!LOCATION_KINDS.has(input.locationKind))return{ok:false,error:'Выберите корректный тип места хранения.'};
    return{ok:true,name,locationKind:LOCATION_KINDS.has(input?.locationKind)?input.locationKind:'bank_current'};
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
      includedInHouseholdCapital:type!=='personal'||input?.includedInHouseholdCapital===true,
      openingBalance:Number.isFinite(Number(input?.openingBalance))?Number(input.openingBalance):0,
      locationKind:valid.locationKind,
      psychologicalProtection:input?.psychologicalProtection,
      createdAt:at,createdByMemberId:actorId,updatedAt:at,updatedByMemberId:actorId,revisions:[]
    },state,members,at);
    state.wallets.push(wallet);
    return{ok:true,wallet};
  }

  function createLocation(state,members,input,actorId,at=Date.now()){
    return createWallet(state,members,{...input,type:input?.type==='personal'?'personal':'household_shared'},actorId,at);
  }

  function canEdit(wallet,actorId){
    if(!wallet||wallet.archivedAt||wallet.type==='household_default')return false;
    if(isPersonal(wallet))return wallet.ownerMemberId===actorId;
    return wallet.allowedMemberIds.includes(actorId);
  }

  function updateName(state,members,walletId,name,actorId,at=Date.now()){
    normalizeState(state,members,at);
    const wallet=state.wallets.find(item=>item.id===walletId);
    if(!wallet)return{ok:false,error:'Место хранения не найдено.'};
    if(!canEdit(wallet,actorId))return{ok:false,error:'Изменение этого места хранения недоступно.'};
    const valid=validation(state,{id:walletId,name,locationKind:wallet.locationKind});if(!valid.ok)return valid;
    if(wallet.name===valid.name)return{ok:true,wallet,unchanged:true};
    wallet.revisions.push({id:makeId('wallet-rev',at),changedAt:at,changedByMemberId:actorId,field:'name',oldValue:wallet.name,newValue:valid.name});
    wallet.name=valid.name;wallet.updatedAt=at;wallet.updatedByMemberId=actorId;
    return{ok:true,wallet};
  }

  function updateLocation(state,members,walletId,input,actorId,at=Date.now()){
    normalizeState(state,members,at);
    const wallet=state.wallets.find(item=>item.id===walletId);
    if(!wallet)return{ok:false,error:'Место хранения не найдено.'};
    if(wallet.type==='household_default'&&input?.locationKind!=='bank_current')return{ok:false,error:'Основной семейный счёт должен оставаться банковским текущим счётом.'};
    if(!canEdit(wallet,actorId)&&wallet.type!=='household_default')return{ok:false,error:'Изменение этого места хранения недоступно.'};
    const valid=validation(state,{id:walletId,name:input?.name??wallet.name,locationKind:input?.locationKind??wallet.locationKind});if(!valid.ok)return valid;
    const next={name:valid.name,locationKind:valid.locationKind,moneyForm:moneyFormForKind(valid.locationKind),psychologicalProtection:input?.psychologicalProtection==='separate'?'separate':valid.locationKind==='bank_current'||valid.locationKind==='cash_wallet'?'shared_visible':'separate'};
    for(const [field,newValue] of Object.entries(next))if(wallet[field]!==newValue)wallet.revisions.push({id:makeId('wallet-rev',at),changedAt:at,changedByMemberId:actorId,field,oldValue:wallet[field],newValue});
    Object.assign(wallet,next,{updatedAt:at,updatedByMemberId:actorId});
    return{ok:true,wallet};
  }

  function setPersonalCapitalInclusion(state,members,walletId,included,actorId,at=Date.now()){
    normalizeState(state,members,at);
    const wallet=state.wallets.find(item=>item.id===walletId);
    if(!wallet)return{ok:false,error:'Место хранения не найдено.'};
    if(!isPersonal(wallet)||wallet.ownerMemberId!==actorId)return{ok:false,error:'Только владелец личного места хранения может менять включение в семейный капитал.'};
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
      const rank=wallet=>wallet.type==='household_default'?0:wallet.locationKind==='bank_savings'?1:wallet.moneyForm==='cash'?2:isShared(wallet)?3:4;
      return rank(a)-rank(b)||a.name.localeCompare(b.name,'ru');
    });
  }
  function memberName(members,id){return(Array.isArray(members)?members:[]).find(member=>member.id===id)?.name||id||'—'}
  function locationLabel(wallet){
    return({cash_wallet:'Наличные в кошельке',cash_envelope:'Наличный конверт',cash_box:'Наличная касса',bank_current:'Банковский текущий счёт',bank_savings:'Банковский накопительный счёт'})[wallet?.locationKind]||'Место хранения';
  }
  function descriptor(wallet,members){
    return{
      id:wallet.id,name:wallet.name,type:wallet.type,
      classLabel:wallet.type==='household_default'?'Основной семейный':isPersonal(wallet)?'Личный':'Семейный',
      ownerLabel:isPersonal(wallet)?memberName(members,wallet.ownerMemberId):'Семья',
      currency:wallet.nativeCurrency,
      includedInHouseholdCapital:wallet.includedInHouseholdCapital===true,
      editable:wallet.type!=='household_default',
      moneyForm:wallet.moneyForm,
      locationKind:wallet.locationKind,
      locationLabel:locationLabel(wallet),
      psychologicalProtection:wallet.psychologicalProtection
    };
  }

  return Object.freeze({MAX_NAME,LOCATION_KINDS,isShared,isPersonal,moneyFormForKind,locationLabel,normalizeWallet,normalizeState,validation,createWallet,createLocation,canEdit,updateName,updateLocation,setPersonalCapitalInclusion,accessibleTo,accessibleWallets,descriptor});
});
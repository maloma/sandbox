(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FamilyPilotDebts=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const EPSILON=0.000001;
  const ACTIVE='active';
  const sourceActions=new Set(['opening_liability','opening_receivable','borrow','repay','lend','receive']);
  const cashActions=new Set(['borrow','repay','lend','receive']);

  function makeId(prefix='id',at=Date.now()){return `${prefix}-${Number(at).toString(36)}-${Math.random().toString(36).slice(2,9)}`}
  function asNumber(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback}
  function normalizeName(value){return String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('ru-RU')}
  function history(value){return Array.isArray(value)?value:[]}
  function rounded(value){return Math.round((Number(value)||0)*100)/100}
  function sign(value){return value>EPSILON?1:(value<-EPSILON?-1:0)}
  function actionDelta(action,amount){
    const value=Math.abs(asNumber(amount,0));
    if(action==='opening_receivable'||action==='repay'||action==='lend')return value;
    if(action==='opening_liability'||action==='borrow'||action==='receive')return-value;
    return 0;
  }
  function actionCashKind(action){if(action==='borrow'||action==='receive')return'debt_inflow';if(action==='repay'||action==='lend')return'debt_outflow';return null}
  function directionFromBalance(balance){return balance>EPSILON?'receivable':(balance<-EPSILON?'liability':'zero')}
  function revision(target,changes,actorId,at=Date.now(),source='user'){
    const actual=changes.filter(change=>String(change.oldValue??'')!==String(change.newValue??''));
    if(!actual.length)return null;
    const item={id:makeId('debt-rev',at),sequence:history(target.revisions).length+1,changedByMemberId:actorId||'member-anna',changedAt:at,source,changes:actual};
    target.revisions=history(target.revisions);target.revisions.push(item);target.lastEditedAt=at;target.lastEditedByMemberId=actorId||'member-anna';return item;
  }
  function normalizeCounterparty(raw,at=Date.now()){
    const name=String(raw?.name||'Контрагент').trim().replace(/\s+/g,' ')||'Контрагент';
    return{id:raw?.id||makeId('counterparty',at),name,normalizedName:normalizeName(raw?.normalizedName||name),kind:raw?.kind==='organization'?'organization':'person',note:String(raw?.note||''),createdAt:asNumber(raw?.createdAt,at),createdByMemberId:raw?.createdByMemberId||'member-anna',lastEditedAt:asNumber(raw?.lastEditedAt,raw?.createdAt||at),lastEditedByMemberId:raw?.lastEditedByMemberId||raw?.createdByMemberId||'member-anna',archivedAt:raw?.archivedAt==null?null:asNumber(raw.archivedAt,null),revisions:history(raw?.revisions)};
  }
  function normalizeChain(raw,at=Date.now()){
    return{id:raw?.id||makeId('debt-chain',at),counterpartyId:String(raw?.counterpartyId||''),walletId:String(raw?.walletId||'wallet-household-main'),currency:String(raw?.currency||'EUR'),status:raw?.status==='closed'?'closed':'active',openedAt:asNumber(raw?.openedAt,raw?.createdAt||at),closedAt:raw?.closedAt==null?null:asNumber(raw.closedAt,null),closureEventId:raw?.closureEventId||null,currentBalance:rounded(raw?.currentBalance),currentDirection:directionFromBalance(raw?.currentBalance),createdAt:asNumber(raw?.createdAt,at),createdByMemberId:raw?.createdByMemberId||'member-anna',lastEditedAt:asNumber(raw?.lastEditedAt,raw?.createdAt||at),lastEditedByMemberId:raw?.lastEditedByMemberId||raw?.createdByMemberId||'member-anna',revisions:history(raw?.revisions)};
  }
  function normalizeEvent(raw,at=Date.now()){
    const type=raw?.type==='derived'?'derived':'source';
    return{id:raw?.id||makeId(type==='source'?'debt-source':'debt-derived',at),type,derivedKind:type==='derived'?String(raw?.derivedKind||'offset'):null,chainId:String(raw?.chainId||''),counterpartyId:String(raw?.counterpartyId||''),action:type==='source'&&sourceActions.has(raw?.action)?raw.action:null,amount:Math.max(0,rounded(raw?.amount)),currency:String(raw?.currency||'EUR'),walletId:String(raw?.walletId||'wallet-household-main'),occurredAt:asNumber(raw?.occurredAt,at),comment:String(raw?.comment||''),linkedOperationId:raw?.linkedOperationId||null,sourceEventId:raw?.sourceEventId||null,beforeBalance:rounded(raw?.beforeBalance),afterBalance:rounded(raw?.afterBalance),appliedOffset:rounded(raw?.appliedOffset),excess:rounded(raw?.excess),direction:String(raw?.direction||'neutral'),status:raw?.status==='trash'?'trash':'active',createdAt:asNumber(raw?.createdAt,at),createdByMemberId:raw?.createdByMemberId||'member-anna',lastEditedAt:asNumber(raw?.lastEditedAt,raw?.createdAt||at),lastEditedByMemberId:raw?.lastEditedByMemberId||raw?.createdByMemberId||'member-anna',revisions:history(raw?.revisions)};
  }
  function normalizeState(state,at=Date.now()){
    if(!state||typeof state!=='object')throw new Error('FamilyPilot state is required');
    state.schemaVersion=Math.max(5,asNumber(state.schemaVersion,2));
    state.operations=Array.isArray(state.operations)?state.operations:[];
    state.debtCounterparties=(Array.isArray(state.debtCounterparties)?state.debtCounterparties:[]).map(item=>normalizeCounterparty(item,at));
    state.debtChains=(Array.isArray(state.debtChains)?state.debtChains:[]).map(item=>normalizeChain(item,at));
    state.debtEvents=(Array.isArray(state.debtEvents)?state.debtEvents:[]).map(item=>normalizeEvent(item,at));
    for(const operation of state.operations)operation.links=operation.links&&typeof operation.links==='object'?operation.links:{};
    recalculateAll(state,at);return state;
  }
  function findOrCreateCounterparty(state,input,actorId='member-anna',at=Date.now()){
    if(input?.counterpartyId){const existing=state.debtCounterparties.find(item=>item.id===input.counterpartyId);if(existing)return{counterparty:existing,created:false}}
    const name=String(input?.counterpartyName||input?.name||'').trim().replace(/\s+/g,' ');if(!name)return{error:'Введите контрагента.'};
    const kind=input?.counterpartyKind==='organization'?'organization':'person',normalized=normalizeName(name);
    const existing=state.debtCounterparties.find(item=>!item.archivedAt&&item.kind===kind&&item.normalizedName===normalized);if(existing)return{counterparty:existing,created:false};
    const counterparty=normalizeCounterparty({name,kind,note:input?.counterpartyNote,createdAt:at,createdByMemberId:actorId},at);state.debtCounterparties.push(counterparty);return{counterparty,created:true};
  }
  function activeChain(state,counterpartyId,walletId,currency){return state.debtChains.find(item=>item.status==='active'&&item.counterpartyId===counterpartyId&&item.walletId===walletId&&item.currency===currency)||null}
  function ensureActiveChain(state,counterpartyId,walletId,currency,actorId='member-anna',at=Date.now()){
    const existing=activeChain(state,counterpartyId,walletId,currency);if(existing)return existing;
    const chain=normalizeChain({counterpartyId,walletId,currency,status:'active',openedAt:at,createdAt:at,createdByMemberId:actorId},at);state.debtChains.push(chain);return chain;
  }
  function sourceEvents(state,chainId){return state.debtEvents.filter(item=>item.chainId===chainId&&item.type==='source'&&item.status==='active').sort((a,b)=>a.occurredAt-b.occurredAt||a.createdAt-b.createdAt||a.id.localeCompare(b.id))}
  function linkedOperation(state,event){return event.linkedOperationId?state.operations.find(item=>item.id===event.linkedOperationId)||null:null}
  function sourceEnabled(state,event){if(!cashActions.has(event.action))return true;const operation=linkedOperation(state,event);return !!operation&&operation.status===ACTIVE}
  function createMoneyOperation(state,event,actorId='member-anna',at=Date.now()){
    const kind=actionCashKind(event.action);if(!kind)return null;
    const operation={id:makeId('op',at),kind,amount:event.amount,categoryId:null,walletId:event.walletId,note:event.comment||'Основная сумма долга',occurredAt:event.occurredAt,createdByMemberId:actorId,createdAt:at,lastEditedByMemberId:actorId,lastEditedAt:at,revisions:[],status:'active',deletedAt:null,deletedByMemberId:null,trashExpiresAt:null,receipt:null,links:{sourceModule:'debts',debtChainId:event.chainId,debtEventId:event.id,relation:'principal_movement'},transferGroupId:null};
    state.operations.push(operation);event.linkedOperationId=operation.id;return operation;
  }
  function syncMoneyOperation(state,event,actorId='member-anna',at=Date.now()){
    const kind=actionCashKind(event.action);let operation=linkedOperation(state,event);
    if(!kind){if(operation&&operation.status==='active'){operation.status='trash';operation.deletedAt=at;operation.deletedByMemberId=actorId;operation.lastEditedAt=at}event.linkedOperationId=null;return null}
    if(!operation)return createMoneyOperation(state,event,actorId,at);
    const proposed={kind,amount:event.amount,walletId:event.walletId,occurredAt:event.occurredAt,note:event.comment||'Основная сумма долга'};
    const changes=Object.entries(proposed).filter(([field,value])=>String(operation[field]??'')!==String(value??'')).map(([field,newValue])=>({field,oldValue:operation[field],newValue}));
    if(changes.length){operation.revisions=history(operation.revisions);operation.revisions.push({id:makeId('rev',at),sequence:operation.revisions.length+1,changedByMemberId:actorId,changedAt:at,source:'debt_source_edit',changes});Object.assign(operation,proposed,{lastEditedByMemberId:actorId,lastEditedAt:at})}
    if(operation.status!=='active'){operation.status='active';operation.deletedAt=null;operation.deletedByMemberId=null;operation.trashExpiresAt=null}
    operation.links={sourceModule:'debts',debtChainId:event.chainId,debtEventId:event.id,relation:'principal_movement'};event.linkedOperationId=operation.id;return operation;
  }
  function derivedEvent(data,at=Date.now()){return normalizeEvent({...data,type:'derived',createdAt:at,lastEditedAt:at},at)}
  function recalculateChain(state,chainId,at=Date.now()){
    const chain=state.debtChains.find(item=>item.id===chainId);if(!chain)return{ok:false,error:'Цепочка долга не найдена.'};
    state.debtEvents=state.debtEvents.filter(item=>item.chainId!==chainId||item.type==='source'||item.id===chain.closureEventId);
    let balance=0;const created=[];
    for(const event of sourceEvents(state,chainId)){
      const before=balance,enabled=sourceEnabled(state,event),delta=enabled?actionDelta(event.action,event.amount):0,after=rounded(before+delta);
      const opposite=sign(before)!==0&&sign(delta)!==0&&sign(before)!==sign(delta),applied=opposite?Math.min(Math.abs(before),Math.abs(delta)):0,crossed=opposite&&sign(after)!==0&&sign(after)!==sign(before);
      event.beforeBalance=rounded(before);event.afterBalance=after;event.appliedOffset=rounded(applied);event.excess=crossed?Math.abs(after):0;event.direction=directionFromBalance(after);
      if(applied>EPSILON){const offset=derivedEvent({derivedKind:'offset',chainId,counterpartyId:chain.counterpartyId,amount:rounded(applied),currency:chain.currency,walletId:chain.walletId,occurredAt:event.occurredAt,sourceEventId:event.id,beforeBalance:before,afterBalance:after,appliedOffset:applied,direction:'neutral',comment:'Автоматический взаимозачёт основной суммы'},at);state.debtEvents.push(offset);created.push(offset)}
      if(crossed){const reciprocal=derivedEvent({derivedKind:'reciprocal',chainId,counterpartyId:chain.counterpartyId,amount:rounded(Math.abs(after)),currency:chain.currency,walletId:chain.walletId,occurredAt:event.occurredAt,sourceEventId:event.id,beforeBalance:before,afterBalance:after,appliedOffset:applied,excess:Math.abs(after),direction:directionFromBalance(after),comment:`Переплата ${event.amount}: ${applied} закрывает прежнюю основную сумму, ${Math.abs(after)} автоматически становится встречным долгом.`},at+1);state.debtEvents.push(reciprocal);created.push(reciprocal)}
      balance=after;
    }
    chain.currentBalance=rounded(balance);chain.currentDirection=directionFromBalance(balance);chain.lastEditedAt=at;
    if(chain.status==='closed'&&Math.abs(balance)>EPSILON){chain.status='active';chain.closedAt=null;chain.closureEventId=null}
    return{ok:true,chain,derivedEvents:created,balance:chain.currentBalance};
  }
  function recalculateAll(state,at=Date.now()){for(const chain of state.debtChains)recalculateChain(state,chain.id,at);return state}
  function validateSourceInput(input){
    const action=sourceActions.has(input?.action)?input.action:null,amount=rounded(asNumber(input?.amount,NaN)),occurredAt=asNumber(input?.occurredAt,NaN);
    if(!action)return{ok:false,error:'Выберите действие с долгом.'};
    if(!Number.isFinite(amount)||amount<=0||amount>999999.99)return{ok:false,error:'Основная сумма должна быть от 0,01 до 999 999,99.'};
    if(!Number.isFinite(occurredAt))return{ok:false,error:'Выберите дату операции.'};
    if(!input?.walletId)return{ok:false,error:'Выберите кошелёк.'};
    return{ok:true,value:{action,amount,occurredAt,walletId:String(input.walletId),currency:String(input.currency||'EUR'),comment:String(input.comment||'').trim()}};
  }
  function createSourceEvent(state,input,actorId='member-anna',at=Date.now()){
    normalizeState(state,at);const validated=validateSourceInput(input);if(!validated.ok)return validated;
    const cpResult=findOrCreateCounterparty(state,input,actorId,at);if(cpResult.error)return{ok:false,error:cpResult.error};
    const value=validated.value,chain=ensureActiveChain(state,cpResult.counterparty.id,value.walletId,value.currency,actorId,at);
    const event=normalizeEvent({type:'source',chainId:chain.id,counterpartyId:cpResult.counterparty.id,action:value.action,amount:value.amount,currency:value.currency,walletId:value.walletId,occurredAt:value.occurredAt,comment:value.comment,createdAt:at,createdByMemberId:actorId},at);
    state.debtEvents.push(event);const operation=createMoneyOperation(state,event,actorId,at),result=recalculateChain(state,chain.id,at);
    return{ok:true,counterparty:cpResult.counterparty,chain:eventChain(state,event),event,operation,derivedEvents:result.derivedEvents,zero:Math.abs(result.balance)<=EPSILON};
  }
  function eventChain(state,event){return state.debtChains.find(item=>item.id===event.chainId)||null}
  function updateSourceEvent(state,eventId,input,actorId='member-anna',at=Date.now()){
    const event=state.debtEvents.find(item=>item.id===eventId&&item.type==='source');if(!event)return{ok:false,error:'Исходное движение долга не найдено.'};
    const oldChain=eventChain(state,event);if(!oldChain)return{ok:false,error:'Цепочка долга не найдена.'};if(oldChain.status==='closed')return{ok:false,error:'Закрытая цепочка доступна только для чтения.'};
    const validated=validateSourceInput(input);if(!validated.ok)return validated;const cpResult=findOrCreateCounterparty(state,input,actorId,at);if(cpResult.error)return{ok:false,error:cpResult.error};
    const value=validated.value,targetChain=ensureActiveChain(state,cpResult.counterparty.id,value.walletId,value.currency,actorId,at);
    const proposed={chainId:targetChain.id,counterpartyId:cpResult.counterparty.id,action:value.action,amount:value.amount,currency:value.currency,walletId:value.walletId,occurredAt:value.occurredAt,comment:value.comment};
    revision(event,Object.entries(proposed).map(([field,newValue])=>({field,oldValue:event[field],newValue})),actorId,at,'debt_source_edit');Object.assign(event,proposed,{lastEditedByMemberId:actorId,lastEditedAt:at});syncMoneyOperation(state,event,actorId,at);
    recalculateChain(state,oldChain.id,at);if(targetChain.id!==oldChain.id)recalculateChain(state,targetChain.id,at);
    const currentTarget=state.debtChains.find(item=>item.id===targetChain.id);return{ok:true,event,chain:currentTarget,counterparty:cpResult.counterparty,operation:linkedOperation(state,event),zero:Math.abs(currentTarget.currentBalance)<=EPSILON};
  }
  function closeChain(state,chainId,actorId='member-anna',at=Date.now()){
    const chain=state.debtChains.find(item=>item.id===chainId);if(!chain)return{ok:false,error:'Цепочка долга не найдена.'};recalculateChain(state,chainId,at);
    if(chain.status==='closed')return{ok:true,chain,event:state.debtEvents.find(item=>item.id===chain.closureEventId)||null};
    if(Math.abs(chain.currentBalance)>EPSILON)return{ok:false,error:'Закрыть можно только цепочку с нулевой основной суммой.'};
    const event=derivedEvent({derivedKind:'closed',chainId,counterpartyId:chain.counterpartyId,amount:0,currency:chain.currency,walletId:chain.walletId,occurredAt:at,direction:'neutral',comment:'Debt closed'},at);
    state.debtEvents.push(event);chain.status='closed';chain.closedAt=at;chain.closureEventId=event.id;chain.lastEditedAt=at;chain.lastEditedByMemberId=actorId;return{ok:true,chain,event};
  }
  function keepChainOpen(state,chainId){const chain=state.debtChains.find(item=>item.id===chainId);return chain?{ok:true,chain}:{ok:false,error:'Цепочка долга не найдена.'}}
  function visibleWalletIds(state,scopeDescriptor,accessibleWallets,isPersonalWallet){if(scopeDescriptor?.scope==='personal')return new Set([scopeDescriptor.wallet?.id].filter(Boolean));const wallets=Array.isArray(accessibleWallets)?accessibleWallets:state.wallets||[];return new Set(wallets.filter(wallet=>!(isPersonalWallet?.(wallet)??wallet.type==='personal')).map(wallet=>wallet.id))}
  function visibleChains(state,walletIds,options={}){const allowed=walletIds instanceof Set?walletIds:new Set(walletIds||[]),includeClosed=options.includeClosed!==false;recalculateAll(state,options.at||Date.now());return state.debtChains.filter(chain=>allowed.has(chain.walletId)&&(includeClosed||chain.status==='active')).sort((a,b)=>(a.status===b.status?Math.abs(b.currentBalance)-Math.abs(a.currentBalance):(a.status==='active'?-1:1))||b.openedAt-a.openedAt)}
  function chainHistory(state,chainId){const rank={source:0,offset:1,reciprocal:2,closed:3};return state.debtEvents.filter(item=>item.chainId===chainId).sort((a,b)=>a.occurredAt-b.occurredAt||(rank[a.type==='source'?'source':a.derivedKind]||0)-(rank[b.type==='source'?'source':b.derivedKind]||0)||a.createdAt-b.createdAt)}
  function scopeTotals(state,walletIds){let receivable=0,liability=0;for(const chain of visibleChains(state,walletIds,{includeClosed:false})){if(chain.currentBalance>EPSILON)receivable+=chain.currentBalance;if(chain.currentBalance<-EPSILON)liability+=Math.abs(chain.currentBalance)}return{receivable:rounded(receivable),liability:rounded(liability),net:rounded(receivable-liability)}}
  function counterpartyName(state,id){return state.debtCounterparties.find(item=>item.id===id)?.name||'Контрагент'}
  function actionLabel(action){return({opening_liability:'Начальный долг: я должен',opening_receivable:'Начальный долг: мне должны',borrow:'Я занял',repay:'Я вернул',lend:'Я одолжил',receive:'Мне вернули'})[action]||'Движение долга'}
  function eventDirection(event){const kind=actionCashKind(event.action);if(kind==='debt_inflow')return'inflow';if(kind==='debt_outflow')return'outflow';if(event.action==='opening_receivable')return'inflow';if(event.action==='opening_liability')return'outflow';return'neutral'}

  return Object.freeze({EPSILON,sourceActions,cashActions,makeId,normalizeName,normalizeState,findOrCreateCounterparty,ensureActiveChain,actionDelta,actionCashKind,actionLabel,eventDirection,directionFromBalance,createSourceEvent,updateSourceEvent,recalculateChain,recalculateAll,closeChain,keepChainOpen,visibleWalletIds,visibleChains,chainHistory,scopeTotals,counterpartyName,linkedOperation,sourceEnabled,validateSourceInput});
});

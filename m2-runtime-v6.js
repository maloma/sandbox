(function(){
  const defaults={
    expense:['Продукты','Жильё','Транспорт','Здоровье','Дети','Отдых','Другое'],
    income:['Зарплата','Подработка','Пособие','Подарок','Возврат','Другое'],
    transfer:['Между своими счетами']
  };
  let editingEventId=null;

  function roundMoney(value){return Math.round((Number(value)||0)*100)/100}
  function selectedAction(){return document.querySelector('.action.active')?.dataset.action||'borrow'}
  function sourceEvent(id){return state.events.find(e=>String(e.id)===String(id))}
  function operationForEvent(event){
    if(!event||event.kind!=='separate')return null;
    return state.operations.find(o=>String(o.eventId||'')===String(event.id))
      ||state.operations.find(o=>String(o.sourceDebtEventId||'')===String(event.relatedEventId||'')&&roundMoney(o.amount)===roundMoney(event.principal)&&o.date===event.date)
      ||null;
  }
  function ensureStateShape(){
    state.operations=Array.isArray(state.operations)?state.operations:[];
    state.operationCategories=state.operationCategories||{};
    ['expense','income','transfer'].forEach(type=>{
      const stored=Array.isArray(state.operationCategories[type])?state.operationCategories[type]:[];
      const fromOps=state.operations.filter(o=>o.type===type&&o.category).map(o=>o.category);
      state.operationCategories[type]=[...new Set([...(defaults[type]||[]),...stored,...fromOps])];
    });
  }

  const originalEventMeta=eventMeta;
  eventMeta=function(event){
    if(event.kind==='offset')return{icon:'⇄',verb:'Взаимозачёт встречных долгов'};
    if(event.kind==='counterDebt'&&event.autoOverpayment)return{icon:'⇄',verb:'Встречный долг из переплаты'};
    return originalEventMeta(event);
  };

  function offsetParty(party,date,description,relatedEventId){
    if(!party)return 0;
    const owedByMe=roundMoney(party.owedByMe),owedToMe=roundMoney(party.owedToMe);
    const amount=roundMoney(Math.min(owedByMe,owedToMe));
    if(!(amount>0))return 0;
    party.owedByMe=roundMoney(owedByMe-amount);
    party.owedToMe=roundMoney(owedToMe-amount);
    recordEvent({kind:'offset',partyId:party.id,principal:amount,date:date||localToday(),description:description||'Автоматический взаимозачёт встречных долгов',relatedEventId:relatedEventId||null,derived:true});
    return amount;
  }
  function offsetAllLegacy(){
    let total=0;
    state.parties.forEach(p=>{total=roundMoney(total+offsetParty(p,localToday(),'Автоматический взаимозачёт ранее сохранённых встречных долгов'))});
    if(total>0){save();render()}
    return total;
  }

  function hideRemovedFlows(){
    const extra=$('extra');
    if(extra){extra.value='';const field=extra.closest('label');if(field){field.classList.add('hidden');const row=field.parentElement;if(row?.classList.contains('two'))row.style.gridTemplateColumns='1fr'}}
    $('resolutionModal')?.classList.add('hidden');
    $('separateModal')?.classList.add('hidden');
    const hero=document.querySelector('.hero p');
    if(hero)hero.textContent='Проверяем контрагента, долговые действия, взаимозачёт и автоматический встречный долг при переплате.';
    const task3=$('task3')?.parentElement?.querySelector('span:last-child');
    if(task3)task3.textContent='Ввести возврат больше остатка и проверить автоматическое создание встречного долга.';
  }

  function saveDebtActionSimplified(){
    const party=selectedParty();
    const principal=roundMoney($('principal').value);
    const date=$('date').value||localToday();
    const description=$('description').value.trim();
    if(!party)return toast('Выберите или создайте контрагента');
    if(!(principal>0))return toast('Введите сумму');

    const action=selectedAction();
    const meta=actionMeta(action);
    const balance=roundMoney(party[meta.direction]);
    let excess=0,applied=principal;

    if(meta.delta>0){
      party[meta.direction]=roundMoney(balance+principal);
    }else{
      applied=roundMoney(Math.min(principal,balance));
      excess=roundMoney(principal-applied);
      party[meta.direction]=roundMoney(balance-applied);
    }

    const source=recordEvent({
      kind:'action',action,partyId:party.id,principal,appliedPrincipal:applied,
      overpayment:excess,extra:0,date,description
    });

    if(excess>0){
      party[meta.opposite]=roundMoney((party[meta.opposite]||0)+excess);
      const automatic=`Автоматически создан из переплаты ${money(excess)} при операции «${meta.verb}» ${formatDate(date)}. Введено: ${money(principal)}; зачтено в погашение: ${money(applied)}.`;
      const counter=recordEvent({
        kind:'counterDebt',partyId:party.id,direction:meta.opposite,principal:excess,date,
        description:automatic,relatedEventId:source.id,autoOverpayment:true,derived:true
      });
      source.relatedEventId=counter.id;
      state.test.resolution=true;
    }

    const offset=offsetParty(party,date,'Автоматический взаимозачёт после долговой операции',source.id);
    if(['repay','receive'].includes(action))state.test.repayment=true;
    state.lastDate=date;
    save();resetForm();
    if(excess>0)toast(`Переплата ${money(excess)} стала встречным долгом`);
    else if(offset>0)toast(`Встречные долги взаимозачтены на ${money(offset)}`);
    else toast('Долговое действие сохранено');
  }

  renderBalance=function(){
    const party=selectedParty();
    if(!party){$('balanceBox').innerHTML='<div class="balance-main balance-zero">Контрагент не выбран</div><div class="tiny">Создайте человека или организацию, чтобы связать долговое действие.</div>';return}
    const owedByMe=roundMoney(party.owedByMe),owedToMe=roundMoney(party.owedToMe);
    let result='<div class="tiny">Итог взаиморасчётов с '+esc(party.name)+'</div>';
    if(owedByMe>0)result+='<div class="balance-main owed">Я должен '+money(owedByMe)+'</div>';
    else if(owedToMe>0)result+='<div class="balance-main receivable">Мне должны '+money(owedToMe)+'</div>';
    else result+='<div class="balance-main balance-zero">Расчёты закрыты</div>';
    result+='<div class="tiny">Встречные долги взаимозачитываются. Переплата автоматически становится встречным долгом.</div>';
    $('balanceBox').innerHTML=result;
  };

  renderPartyList=function(){
    if(!state.parties.length){$('partyList').innerHTML='<div class="notice">Контрагентов пока нет.</div>';return}
    $('partyList').innerHTML=state.parties.map(p=>{
      const owedByMe=roundMoney(p.owedByMe),owedToMe=roundMoney(p.owedToMe);
      const result=owedByMe>0?'<span class="pill">Итог: я должен '+money(owedByMe)+'</span>':owedToMe>0?'<span class="pill">Итог: мне должны '+money(owedToMe)+'</span>':'<span class="pill">Расчёты закрыты</span>';
      return'<div class="party-card '+(p.id===state.selectedPartyId?'active':'')+'" data-party="'+p.id+'"><div class="party-name">'+esc(p.name)+'</div><div class="party-meta">'+(p.type==='organization'?'Организация':'Человек')+'</div><div class="balances">'+result+'</div></div>';
    }).join('');
  };

  function directionClass(event){
    if(event.kind==='offset')return'';
    if(event.kind==='opening'||event.kind==='counterDebt')return event.direction==='owedToMe'?'flow-good':'flow-bad';
    if(event.kind==='action')return['borrow','receive'].includes(event.action)?'flow-good':'flow-bad';
    if(event.kind==='extra'){
      const src=sourceEvent(event.relatedEventId);return src&&src.kind==='action'&&src.action==='receive'?'flow-good':'flow-bad';
    }
    if(event.kind==='separate'){
      const op=operationForEvent(event);return op?.type==='income'?'flow-good':op?.type==='expense'?'flow-bad':'';
    }
    return'';
  }
  function displayedDescription(event){
    const parts=[];
    if(event.description)parts.push(event.description);
    if(event.userComment)parts.push(event.userComment);
    return parts.join(' · ');
  }

  renderHistory=function(){
    const events=[...state.events].sort((a,b)=>String(b.date).localeCompare(String(a.date))||(b.createdAt||0)-(a.createdAt||0));
    $('history').innerHTML=events.length?events.map(e=>{
      const party=partyById(e.partyId),meta=eventMeta(e),future=e.date>localToday(),flow=directionClass(e);
      const description=displayedDescription(e);
      const editable=e.kind!=='offset';
      const overpayment=e.kind==='action'&&roundMoney(e.overpayment)>0
        ?`<div class="tiny">Зачтено ${money(e.appliedPrincipal)} · встречный долг ${money(e.overpayment)}</div>`:'';
      const legacyExtra=e.extra>0?`<div class="tiny ${flow}">+ ${money(e.extra)} дополнительно</div>`:'';
      const hint=editable?(e.kind==='separate'?' · изменить тип, категорию или комментарий':' · изменить комментарий'):'';
      return`<div class="history-item ${future?'future':''} ${editable?'editable':''}" ${editable?`data-event-id="${e.id}" role="button" tabindex="0"`:''}><div class="history-icon ${flow}">${meta.icon}</div><div class="grow"><div class="history-title ${flow}">${esc(meta.verb)}</div><div class="history-sub">${esc(party?.name||'Удалённый контрагент')} · ${formatDate(e.date)}${future?'<span class="future-tag">Запланировано</span>':''}${description?' · '+esc(description):''}${hint}</div></div><div class="history-amount ${flow}">${money(e.principal??e.amount)}${overpayment}${legacyExtra}</div></div>`;
    }).join(''):'<div class="notice">Долговых действий пока нет.</div>';
  };

  function installStyles(){
    const style=document.createElement('style');
    style.textContent='.flow-good{color:var(--ok)!important}.flow-bad{color:var(--bad)!important}.history-item.editable{cursor:pointer}.history-item.editable:hover{border-color:#9fc7c1}.editor-grid{display:grid;gap:12px}.editor-actions{display:flex;gap:8px;flex-wrap:wrap}.category-help{font-size:12px;color:var(--muted);line-height:1.4}.locked-summary{display:grid;gap:5px;padding:12px;border-radius:14px;background:var(--soft);font-size:13px}.locked-summary strong{font-size:15px}';
    document.head.appendChild(style);
  }

  function injectEditor(){
    if($('editEventModal'))return;
    const modal=document.createElement('div');modal.id='editEventModal';modal.className='modal';
    modal.innerHTML=`<div class="sheet"><div class="grab"></div><div class="row between"><h2>Редактировать запись</h2><button class="btn ghost small" data-edit-close>Закрыть</button></div><div id="editLockedSummary" class="locked-summary"></div><div class="notice" style="margin-top:12px">Сумма, дата, контрагент и направление заблокированы, потому что их изменение требует пересчёта долговой цепочки.</div><div class="card editor-grid" style="margin-top:12px"><label class="field hidden" id="editOperationTypeField">Тип обычной операции<select id="editOperationType"><option value="expense">Расход</option><option value="income">Доход</option><option value="transfer">Перевод</option></select></label><label class="field hidden" id="editCategoryField">Категория<input id="editCategory" maxlength="60" list="editCategoryList"><datalist id="editCategoryList"></datalist><span class="category-help">Можно выбрать существующую категорию или написать новую.</span></label><label class="field">Комментарий<textarea id="editDescription" rows="3" maxlength="240" placeholder="Необязательно"></textarea></label><div class="editor-actions"><button id="saveEventEdit" class="btn primary">Сохранить</button><button class="btn ghost" data-edit-close>Отмена</button></div></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('[data-edit-close]'))closeEdit()});
    $('editOperationType').addEventListener('change',refreshEditCategories);
    $('saveEventEdit').onclick=saveEdit;
  }
  function refreshEditCategories(){
    ensureStateShape();const type=$('editOperationType').value;
    $('editCategoryList').innerHTML=state.operationCategories[type].map(c=>`<option value="${esc(c)}"></option>`).join('');
  }
  function openEdit(eventId){
    const event=sourceEvent(eventId);if(!event||event.kind==='offset')return;
    editingEventId=event.id;
    const party=partyById(event.partyId),meta=eventMeta(event),isSeparate=event.kind==='separate';
    $('editLockedSummary').innerHTML=`<strong>${esc(meta.verb)}</strong><span>${esc(party?.name||'Удалённый контрагент')} · ${money(event.principal??event.amount)} · ${formatDate(event.date)}</span>`;
    $('editOperationTypeField').classList.toggle('hidden',!isSeparate);
    $('editCategoryField').classList.toggle('hidden',!isSeparate);
    if(isSeparate){
      const operation=operationForEvent(event);
      $('editOperationType').value=operation?.type||'expense';
      $('editCategory').value=operation?.category||'';
      $('editDescription').value=operation?.description||event.userComment||'';
      refreshEditCategories();
    }else{
      const protectedOrigin=event.kind==='counterDebt'&&event.relatedEventId;
      $('editDescription').value=protectedOrigin?(event.userComment||''):(event.description||'');
    }
    $('editEventModal').classList.add('open');
  }
  function closeEdit(){editingEventId=null;$('editEventModal')?.classList.remove('open')}
  function saveEdit(){
    const event=sourceEvent(editingEventId);if(!event)return;
    const comment=$('editDescription').value.trim();
    if(event.kind==='separate'){
      ensureStateShape();
      const type=$('editOperationType').value,category=$('editCategory').value.trim();
      if(!category)return toast('Введите или выберите категорию');
      if(!state.operationCategories[type].some(c=>c.toLowerCase()===category.toLowerCase()))state.operationCategories[type].push(category);
      let operation=operationForEvent(event);
      if(!operation){operation={id:createId(),eventId:event.id,sourceDebtEventId:event.relatedEventId,amount:event.principal,date:event.date,createdAt:Date.now()};state.operations.push(operation)}
      operation.eventId=event.id;operation.type=type;operation.category=category;operation.description=comment;
      event.description=`${type==='expense'?'Расход':type==='income'?'Доход':'Перевод'}: ${category}`;
      event.userComment=comment;
    }else if(event.kind==='counterDebt'&&event.relatedEventId){
      event.userComment=comment;
    }else{
      event.description=comment;
    }
    save();render();closeEdit();toast('Комментарий сохранён');
  }
  function installHistoryEditing(){
    $('history').addEventListener('click',e=>{const item=e.target.closest('[data-event-id]');if(item)openEdit(item.dataset.eventId)});
    $('history').addEventListener('keydown',e=>{const item=e.target.closest('[data-event-id]');if(item&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openEdit(item.dataset.eventId)}});
  }

  function wrapOpening(){
    const button=$('saveOpening');if(!button||typeof button.onclick!=='function')return;
    const original=button.onclick;
    button.onclick=function(event){
      const before=state.events.length;original.call(this,event);
      setTimeout(()=>{
        if(state.events.length===before)return;
        const source=state.events.at(-1),party=partyById(source?.partyId);
        const offset=offsetParty(party,source?.date,'Автоматический взаимозачёт после добавления стартового долга',source?.id);
        if(offset>0){save();render();toast(`Встречные долги взаимозачтены на ${money(offset)}`)}
      },0);
    };
  }

  function install(){
    ensureStateShape();installStyles();hideRemovedFlows();injectEditor();installHistoryEditing();wrapOpening();
    $('saveDebtAction').onclick=saveDebtActionSimplified;
    $('actions')?.addEventListener('click',()=>{const extra=$('extra');if(extra)extra.value=''});
    const migrated=offsetAllLegacy();
    if(migrated>0)toast(`Встречные долги взаимозачтены на ${money(migrated)}`);else render();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
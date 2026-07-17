(function(){
  const defaults={
    expense:['Продукты','Жильё','Транспорт','Здоровье','Дети','Отдых','Другое'],
    income:['Зарплата','Подработка','Пособие','Подарок','Возврат','Другое'],
    transfer:['Между своими счетами']
  };
  let editingEventId=null;

  function selectedAction(){return document.querySelector('.action.active')?.dataset.action||'borrow'}
  function roundMoney(value){return Math.round((Number(value)||0)*100)/100}
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

  function syncExtraField(){
    const input=document.getElementById('extra');if(!input)return;
    const field=input.closest('label');if(!field)return;
    const isRepayment=['repay','receive'].includes(selectedAction());
    field.classList.toggle('hidden',!isRepayment);
    if(!isRepayment)input.value='';
    const label=field.querySelector('.label-row > span');
    if(label)label.textContent='Дополнительно сверх основного долга';
    input.placeholder='Например, проценты или подарок';
    let helper=field.querySelector('[data-extra-helper]');
    if(!helper){helper=document.createElement('span');helper.className='tiny';helper.dataset.extraHelper='true';field.appendChild(helper)}
    helper.textContent='Необязательно. Эта сумма не изменяет основной долг.';
  }

  const originalEventMeta=eventMeta;
  eventMeta=function(event){
    if(event.kind==='offset')return{icon:'⇄',verb:'Взаимозачёт встречных долгов'};
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

  function recomputeBalances(){
    state.parties.forEach(p=>{p.owedByMe=0;p.owedToMe=0});
    state.events=state.events.filter(e=>e.kind!=='offset');
    const sourceEvents=[...state.events].sort((a,b)=>String(a.date).localeCompare(String(b.date))||(a.createdAt||0)-(b.createdAt||0));
    for(const event of sourceEvents){
      const party=partyById(event.partyId);if(!party)continue;
      let changed=false;
      if(event.kind==='opening'){
        party[event.direction]=roundMoney((party[event.direction]||0)+roundMoney(event.principal));changed=true;
      }else if(event.kind==='counterDebt'){
        party[event.direction]=roundMoney((party[event.direction]||0)+roundMoney(event.principal));changed=true;
      }else if(event.kind==='action'){
        const meta=actionMeta(event.action);const amount=roundMoney(event.principal);
        const before=roundMoney(party[meta.direction]);
        if(meta.delta<0&&amount>before+0.0001)return{ok:false,event,message:`Сумма операции «${meta.verb}» превышает доступный остаток на дату ${formatDate(event.date)}.`};
        party[meta.direction]=roundMoney(Math.max(0,before+meta.delta*amount));changed=true;
      }
      if(changed)offsetParty(party,event.date,'Автоматический взаимозачёт после долговой операции',event.id);
    }
    save();
    return{ok:true};
  }

  function offsetAllLegacy(){
    let total=0;
    state.parties.forEach(p=>{total=roundMoney(total+offsetParty(p,localToday(),'Автоматический взаимозачёт существовавших встречных долгов после обновления правила'))});
    if(total>0){save();render()}
    return total;
  }

  renderBalance=function(){
    const party=selectedParty();
    if(!party){$('balanceBox').innerHTML='<div class="balance-main balance-zero">Контрагент не выбран</div><div class="tiny">Создайте человека или организацию, чтобы связать долговое действие.</div>';return}
    const owedByMe=roundMoney(party.owedByMe),owedToMe=roundMoney(party.owedToMe);
    let result='<div class="tiny">Итог взаиморасчётов с '+esc(party.name)+'</div>';
    if(owedByMe>0)result+='<div class="balance-main owed">Я должен '+money(owedByMe)+'</div>';
    else if(owedToMe>0)result+='<div class="balance-main receivable">Мне должны '+money(owedToMe)+'</div>';
    else result+='<div class="balance-main balance-zero">Расчёты закрыты</div>';
    result+='<div class="tiny">Встречные долги автоматически взаимозачитываются. История операций сохраняется.</div>';
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

  renderHistory=function(){
    const events=[...state.events].sort((a,b)=>String(b.date).localeCompare(String(a.date))||(b.createdAt||0)-(a.createdAt||0));
    $('history').innerHTML=events.length?events.map(e=>{
      const p=partyById(e.partyId),m=eventMeta(e),future=e.date>localToday(),flow=directionClass(e);
      const extraLine=e.extra>0?`<div class="tiny ${flow}">+ ${money(e.extra)} дополнительно</div>`:'';
      const linkLine=e.relatedEventId?` · связь ${String(e.relatedEventId).slice(-6)}`:'';
      const editable=e.kind!=='offset';
      return`<div class="history-item ${future?'future':''} ${editable?'editable':''}" data-event-id="${e.id}" role="button" tabindex="0"><div class="history-icon ${flow}">${m.icon}</div><div class="grow"><div class="history-title ${flow}">${esc(m.verb)}</div><div class="history-sub">${esc(p?.name||'Удалённый контрагент')} · ${formatDate(e.date)}${future?'<span class="future-tag">Запланировано</span>':''}${e.description?' · '+esc(e.description):''}${linkLine}${editable?' · нажмите для редактирования':''}</div></div><div class="history-amount ${flow}">${money(e.principal??e.amount)}${extraLine}</div></div>`;
    }).join(''):'<div class="notice">Долговых действий пока нет.</div>';
  };

  function installStyles(){
    const style=document.createElement('style');
    style.textContent='.flow-good{color:var(--ok)!important}.flow-bad{color:var(--bad)!important}.history-item.editable{cursor:pointer}.history-item.editable:hover{border-color:#9fc7c1}.editor-grid{display:grid;gap:12px}.editor-actions{display:flex;gap:8px;flex-wrap:wrap}.category-help{font-size:12px;color:var(--muted);line-height:1.4}';
    document.head.appendChild(style);
  }

  function installCategoryCreation(){
    const input=$('separateCategory');if(!input)return;
    let list=$('separateCategoryList');
    if(!list){list=document.createElement('datalist');list.id='separateCategoryList';input.after(list);input.setAttribute('list',list.id)}
    let helper=input.parentElement.querySelector('[data-category-help]');
    if(!helper){helper=document.createElement('span');helper.className='category-help';helper.dataset.categoryHelp='true';input.parentElement.appendChild(helper)}
    helper.textContent='Выберите существующую категорию или введите новую — она сохранится для следующих операций.';
    const refresh=()=>{ensureStateShape();list.innerHTML=state.operationCategories[separateType].map(c=>`<option value="${esc(c)}"></option>`).join('')};
    refresh();
    $('operationTypes')?.addEventListener('click',()=>setTimeout(refresh,0));
    $('resolveSeparate')?.addEventListener('click',()=>setTimeout(refresh,0));
    $('saveSeparate')?.addEventListener('click',()=>{
      const category=input.value.trim();if(!category)return;
      ensureStateShape();
      if(!state.operationCategories[separateType].some(c=>c.toLowerCase()===category.toLowerCase()))state.operationCategories[separateType].push(category);
      save();refresh();
    },true);
  }

  function injectEditor(){
    if($('editEventModal'))return;
    const modal=document.createElement('div');modal.id='editEventModal';modal.className='modal';
    modal.innerHTML=`<div class="sheet"><div class="grab"></div><div class="row between"><h2>Редактировать операцию</h2><button class="btn ghost small" data-edit-close>Закрыть</button></div><div id="editDerivedNotice" class="notice hidden">Взаимозачёт рассчитывается автоматически. Измените исходную долговую операцию.</div><div id="editEventFields" class="card editor-grid"><label class="field" id="editKindField">Тип<select id="editAction"><option value="borrow">Я беру в долг</option><option value="repay">Я возвращаю долг</option><option value="lend">Я даю в долг</option><option value="receive">Мне возвращают долг</option></select></label><label class="field">Контрагент<select id="editParty"></select></label><label class="field" id="editDirectionField">Направление<select id="editDirection"><option value="owedByMe">Я должен</option><option value="owedToMe">Должны мне</option></select></label><label class="field" id="editOperationTypeField">Тип операции<select id="editOperationType"><option value="expense">Расход</option><option value="income">Доход</option><option value="transfer">Перевод</option></select></label><label class="field">Сумма<input id="editAmount" type="number" min="0" step="0.01" inputmode="decimal"></label><label class="field" id="editExtraField">Дополнительно сверх основного долга<input id="editExtra" type="number" min="0" step="0.01" inputmode="decimal"></label><label class="field" id="editCategoryField">Категория<input id="editCategory" maxlength="60" list="editCategoryList"><datalist id="editCategoryList"></datalist><span class="category-help">Новую категорию можно ввести прямо здесь.</span></label><label class="field">Дата<input id="editDate" type="date"></label><label class="field">Комментарий<input id="editDescription" maxlength="240"></label><div class="editor-actions"><button id="saveEventEdit" class="btn primary">Сохранить изменения</button><button class="btn ghost" data-edit-close>Отмена</button></div></div></div>`;
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
    const event=sourceEvent(eventId);if(!event)return;
    editingEventId=event.id;
    const derived=event.kind==='offset';
    $('editDerivedNotice').classList.toggle('hidden',!derived);
    $('editEventFields').classList.toggle('hidden',derived);
    if(derived){$('editEventModal').classList.add('open');return}
    $('editParty').innerHTML=state.parties.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
    $('editParty').value=event.partyId;
    $('editAmount').value=event.principal??event.amount??0;
    $('editDate').value=event.date||localToday();
    $('editDescription').value=event.description||'';
    $('editExtra').value=event.extra||0;
    const isAction=event.kind==='action',isDirectional=['opening','counterDebt'].includes(event.kind),isSeparate=event.kind==='separate',isExtra=event.kind==='extra';
    $('editKindField').classList.toggle('hidden',!isAction);
    $('editDirectionField').classList.toggle('hidden',!isDirectional);
    $('editOperationTypeField').classList.toggle('hidden',!isSeparate);
    $('editCategoryField').classList.toggle('hidden',!isSeparate);
    $('editExtraField').classList.toggle('hidden',!isAction||!['repay','receive'].includes(event.action));
    if(isAction)$('editAction').value=event.action;
    if(isDirectional)$('editDirection').value=event.direction;
    if(isSeparate){const op=operationForEvent(event);$('editOperationType').value=op?.type||'expense';$('editCategory').value=op?.category||'';refreshEditCategories()}
    if(isExtra){$('editExtraField').classList.add('hidden');$('editCategoryField').classList.add('hidden')}
    $('editEventModal').classList.add('open');
  }

  function closeEdit(){editingEventId=null;$('editEventModal')?.classList.remove('open')}

  function saveEdit(){
    const event=sourceEvent(editingEventId);if(!event)return;
    const snapshot=JSON.stringify({events:state.events,operations:state.operations,parties:state.parties,operationCategories:state.operationCategories});
    const amount=roundMoney($('editAmount').value);if(!(amount>0))return toast('Введите сумму больше нуля');
    event.partyId=Number($('editParty').value);event.principal=amount;event.date=$('editDate').value||localToday();event.description=$('editDescription').value.trim();
    if(event.kind==='action'){
      event.action=$('editAction').value;
      event.extra=['repay','receive'].includes(event.action)?roundMoney($('editExtra').value):0;
    }
    if(['opening','counterDebt'].includes(event.kind))event.direction=$('editDirection').value;
    if(event.kind==='extra')event.principal=amount;
    if(event.kind==='separate'){
      const op=operationForEvent(event);const type=$('editOperationType').value,category=$('editCategory').value.trim();
      if(!category)return toast('Введите или выберите категорию');
      ensureStateShape();if(!state.operationCategories[type].some(c=>c.toLowerCase()===category.toLowerCase()))state.operationCategories[type].push(category);
      if(op){op.type=type;op.amount=amount;op.category=category;op.description=event.description;op.date=event.date;op.eventId=event.id}else state.operations.push({id:createId(),eventId:event.id,sourceDebtEventId:event.relatedEventId,type,amount,category,description:event.description,date:event.date,createdAt:Date.now()});
      event.description=`${type==='expense'?'Расход':type==='income'?'Доход':'Перевод'}: ${category}${event.description?' · '+event.description:''}`;
    }
    const result=recomputeBalances();
    if(!result.ok){
      const old=JSON.parse(snapshot);state.events=old.events;state.operations=old.operations;state.parties=old.parties;state.operationCategories=old.operationCategories;save();render();return toast(result.message)
    }
    save();render();closeEdit();toast('Операция изменена');
  }

  function installHistoryEditing(){
    $('history').addEventListener('click',e=>{const item=e.target.closest('[data-event-id]');if(item)openEdit(item.dataset.eventId)});
    $('history').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('[data-event-id]')){e.preventDefault();openEdit(e.target.closest('[data-event-id]').dataset.eventId)}});
  }

  const originalApplyNormalAction=applyNormalAction;
  applyNormalAction=function(data){
    const party=partyById(data.partyId);originalApplyNormalAction(data);
    const offset=offsetParty(party,data.date,'Автоматический взаимозачёт после долговой операции');
    if(offset>0){save();render();toast('Встречные долги взаимозачтены на '+money(offset))}
  };

  function wrapOffsetButton(id,description){
    const button=$(id);if(!button||typeof button.onclick!=='function')return;
    const original=button.onclick;
    button.onclick=function(event){original.call(this,event);setTimeout(()=>{const result=recomputeBalances();if(result.ok){render();const last=state.events.filter(e=>e.kind==='offset').at(-1);if(last)toast(description)}},0)};
  }

  function install(){
    ensureStateShape();installStyles();syncExtraField();installCategoryCreation();injectEditor();installHistoryEditing();
    const helpButton=document.querySelector('[data-help="extra"]');
    if(helpButton)helpButton.onclick=()=>{$('helpTitle').textContent='Дополнительно сверх основного долга';$('helpText').textContent='Поле показывается только при возврате долга. Используйте его для процентов или подарка. Эта сумма сохраняется отдельно и не меняет основной остаток долга.';$('helpModal').classList.add('open')};
    $('actions')?.addEventListener('click',()=>setTimeout(syncExtraField,0));
    $('saveDebtAction')?.addEventListener('click',()=>{if(!['repay','receive'].includes(selectedAction()))$('extra').value=''},true);
    wrapOffsetButton('saveOpening','Стартовый долг сохранён и взаимозачёт пересчитан');
    wrapOffsetButton('resolveCounterDebt','Встречный долг создан и взаимозачёт пересчитан');
    const migrated=offsetAllLegacy();if(migrated>0)toast('Встречные долги взаимозачтены на '+money(migrated));else render();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
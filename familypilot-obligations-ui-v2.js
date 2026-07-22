(()=>{
  'use strict';

  const api=window.FamilyPilotObligations;
  if(!api||window.__FP_M3_02_UI__)return;
  window.__FP_M3_02_UI__=true;

  const MONTH_KEY='familypilot.obligations.month.v1';
  let paymentCorrectionMode=false;
  let expectedAmountOccurrenceId='';
  let monthAnchor=(()=>{
    const stored=Number(localStorage.getItem(MONTH_KEY));
    const source=Number.isFinite(stored)?new Date(stored):new Date();
    return new Date(source.getFullYear(),source.getMonth(),1).getTime();
  })();

  const style=document.createElement('style');
  style.id='familypilot-m3-02-ui-style';
  style.textContent=`
    #obligationSummary{display:none!important}
    .obligation-month-nav{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;gap:8px;align-items:center}
    .obligation-month-nav button{min-height:44px;border:1px solid var(--line);border-radius:14px;background:var(--card2);color:var(--ink);font-weight:900}
    .obligation-month-nav .obligation-month-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 8px}
    .obligation-date-group{margin-bottom:12px}
    .obligation-date-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 2px;color:var(--muted);font-size:12px;font-weight:900}
    .obligation-date-heading span:first-child{text-transform:capitalize}
    .obligation-date-heading span:last-child{text-align:right;font-size:11px}
    .obligation-date-card{display:grid;gap:8px}
    .obligation-row{position:relative}
    .obligation-row-main{min-width:0;cursor:pointer}
    .obligation-row-actions{display:flex;justify-content:flex-end;gap:6px;margin-top:7px}
    .obligation-row-actions button{min-height:34px;border:0;border-radius:11px;padding:6px 10px;font-size:11px;font-weight:900}
    .obligation-quick-pay{background:var(--green);color:#fff}
    .obligation-open-detail{background:var(--card);color:var(--ink);border:1px solid var(--line)!important}
    .obligation-sequence{display:inline-block;margin-left:5px;color:var(--muted);font-size:10px;font-weight:800}
    .obligation-calendar-empty{border:1px dashed var(--line);border-radius:15px;background:var(--card2);padding:18px;text-align:center;color:var(--muted);font-size:13px}
    .obligation-rule-fields{display:grid;grid-template-columns:1fr 1fr;gap:9px}
    .obligation-rule-fields .field{min-width:0}
    .obligation-rule-fields .field.full{grid-column:1/-1}
    .obligation-rule-chip.archived{opacity:.72}
    .obligation-rule-chip-actions{display:flex;gap:6px;align-items:center}
    .obligation-rule-chip-actions button{border:0;background:transparent;color:var(--green);font-weight:900}
    .obligation-rule-chip-actions .restore{color:var(--blue)}
    #obligationArchiveBtn{grid-column:1/-1}
    .obligation-actual-context{display:grid;gap:9px}
    @media(max-width:380px){.obligation-rule-fields{grid-template-columns:1fr}.obligation-rule-fields .field.full{grid-column:auto}.obligation-date-heading{align-items:flex-start;flex-direction:column;gap:3px}.obligation-date-heading span:last-child{text-align:left}}
  `;
  document.head.appendChild(style);

  const monthBounds=anchor=>{
    const d=new Date(anchor);
    return [new Date(d.getFullYear(),d.getMonth(),1).getTime(),new Date(d.getFullYear(),d.getMonth()+1,1).getTime()];
  };
  const monthLabel=anchor=>new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric'}).format(new Date(anchor));
  const dayLabelM3=value=>new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(value));
  const pluralPayments=count=>count%10===1&&count%100!==11?'платёж':(count%10>=2&&count%10<=4&&(count%100<10||count%100>=20)?'платежа':'платежей');
  const latestSchedule=rule=>rule?.scheduleVersions?.[rule.scheduleVersions.length-1]||{firstDueAt:rule?.firstDueAt||rule?.nextDueAt||now(),intervalValue:rule?.intervalValue||1,intervalUnit:rule?.intervalUnit||'month'};
  const scopedRules=()=>api.visibleRules(state,m3WalletIds(),{includeArchived:true});
  const monthOccurrences=()=>{
    const [from,to]=monthBounds(monthAnchor);
    api.ensureOccurrencesWindow(state,-Infinity,new Date(new Date(to).getFullYear(),new Date(to).getMonth()+12,1).getTime(),now());
    return api.visibleOccurrences(state,m3WalletIds(),now(),{from,to});
  };

  function totalsByCurrency(items){
    const totals=new Map();
    for(const occurrence of items){
      const currency=obligationCurrency(occurrence);
      const amount=occurrence.status==='paid'&&occurrence.actualAmount!=null?occurrence.actualAmount:occurrence.expectedAmount;
      totals.set(currency,(totals.get(currency)||0)+Number(amount||0));
    }
    return [...totals.entries()].map(([currency,value])=>money(value,currency)).join(' · ');
  }

  function renderOccurrenceRow(occurrence){
    const rule=ruleForOccurrence(occurrence),status=occurrenceStatus(occurrence),currency=obligationCurrency(occurrence),walletName=wallet(occurrence.walletId)?.name||'Кошелёк';
    const closed=['paid','skipped','cancelled'].includes(occurrence.status);
    const amount=occurrence.status==='paid'&&occurrence.actualAmount!=null?occurrence.actualAmount:occurrence.expectedAmount;
    return `<div class="obligation-row" data-obligation-occurrence="${esc(occurrence.id)}">
      <div class="obligation-row-main" data-m302-open-detail="${esc(occurrence.id)}" role="button" tabindex="0">
        <span><strong>${esc(rule?.name||'Обязательство')}<span class="obligation-sequence">№ ${occurrence.sequence}</span></strong><small>${esc(walletName)}${occurrence.movedFromDueAt!=null?' · дата изменена':''}</small><span class="obligation-status ${status}">${esc(obligationStatusLabels[status]||status)}</span></span>
        <span class="obligation-row-value"><strong>${money(amount,currency)}</strong>${occurrence.linkedOperationId?'<small class="obligation-linked">связано с расходом</small>':''}</span>
      </div>
      <div class="obligation-row-actions">
        <button class="obligation-open-detail" type="button" data-m302-open-detail="${esc(occurrence.id)}">Подробнее</button>
        ${closed?'':`<button class="obligation-quick-pay" type="button" data-m302-quick-pay="${esc(occurrence.id)}">Оплачено</button>`}
      </div>
    </div>`;
  }

  function renderM302Obligations(){
    const descriptor=scopeDescriptor(),occurrences=monthOccurrences(),rules=scopedRules();
    $('obligationsScopeLabel').textContent=descriptor.analyticsLabel;
    const summary=$('obligationSummary');
    if(summary)summary.remove();
    const label=$('obligationMonthLabel');
    if(label)label.textContent=monthLabel(monthAnchor);
    $('obligationCount').textContent=`В месяце: ${occurrences.length}`;
    const groups=new Map();
    for(const occurrence of occurrences){
      const key=dateInputValue(occurrence.dueAt);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(occurrence);
    }
    $('obligationList').innerHTML=groups.size?[...groups.entries()].map(([,items])=>{
      const ordered=items.sort((a,b)=>a.dueAt-b.dueAt||a.sequence-b.sequence);
      return `<section class="obligation-date-group"><div class="obligation-date-heading"><span>${esc(dayLabelM3(ordered[0].dueAt))}</span><span>${ordered.length} ${pluralPayments(ordered.length)} · ${esc(totalsByCurrency(ordered))}</span></div><div class="obligation-date-card">${ordered.map(renderOccurrenceRow).join('')}</div></section>`;
    }).join(''):'<div class="obligation-calendar-empty">В выбранном месяце платежей нет.</div>';
    $('obligationRules').innerHTML=rules.length?rules.map(rule=>`<div class="obligation-rule-chip${rule.status==='archived'?' archived':''}"><span><strong>${esc(rule.name)}</strong><small class="meta-note">${esc(api.scheduleLabel(rule))} · ${money(rule.amount,rule.currency)}${rule.status==='archived'?' · Архив':''}</small></span><span class="obligation-rule-chip-actions"><button type="button" data-obligation-rule="${esc(rule.id)}">Изменить</button>${rule.status==='archived'?`<button class="restore" type="button" data-m302-restore-rule="${esc(rule.id)}">Вернуть</button>`:''}</span></div>`).join(''):'<div class="obligation-empty">Правил пока нет.</div>';
  }

  function installMonthNavigation(){
    if($('obligationMonthNav'))return;
    const payments=$('obligationList').closest('section');
    const section=document.createElement('section');
    section.id='obligationMonthNav';
    section.className='card section';
    section.innerHTML='<div class="obligation-month-nav"><button type="button" data-m302-month="-1" aria-label="Предыдущий месяц">‹</button><button id="obligationMonthLabel" class="obligation-month-label" type="button"></button><button type="button" data-m302-month="1" aria-label="Следующий месяц">›</button></div>';
    payments.parentNode.insertBefore(section,payments);
  }

  function installRuleFields(){
    const cadence=$('obligationCadence');
    cadence.innerHTML='<option value="once">Один раз</option><option value="recurring">Повторяется</option>';
    cadence.closest('.field').querySelector('label').textContent='Расписание';
    $('obligationDueDate').closest('.field').querySelector('label').textContent='Первый или следующий платёж';
    if(!$('m302RuleFields')){
      const wrap=document.createElement('div');
      wrap.id='m302RuleFields';
      wrap.className='obligation-rule-fields';
      wrap.innerHTML=`
        <div class="field" data-m302-recurring><label for="obligationIntervalValue">Каждые</label><input id="obligationIntervalValue" type="number" min="1" max="720" value="1"></div>
        <div class="field" data-m302-recurring><label for="obligationIntervalUnit">Единица</label><select id="obligationIntervalUnit"><option value="day">дней</option><option value="week">недель</option><option value="month" selected>месяцев</option><option value="year">лет</option></select></div>
        <div class="field full" data-m302-recurring><label for="obligationEndingMode">Окончание</label><select id="obligationEndingMode"><option value="unlimited">Бессрочно</option><option value="count">По числу платежей</option><option value="untilDate">До даты</option></select></div>
        <div class="field full" data-m302-ending="count"><label for="obligationPaymentCount">Количество платежей</label><input id="obligationPaymentCount" type="number" min="1" max="720" value="12"></div>
        <div class="field full" data-m302-ending="untilDate"><label for="obligationEndingDate">Дата окончания</label><input id="obligationEndingDate" type="date"></div>
      `;
      cadence.closest('.field').after(wrap);
    }
    const actions=$('obligationRuleSave').closest('.sheet-actions');
    if(!$('obligationArchiveBtn')){
      const button=document.createElement('button');
      button.id='obligationArchiveBtn';button.type='button';button.className='btn danger';button.textContent='Архивировать правило';button.hidden=true;
      actions.appendChild(button);
    }
    cadence.addEventListener('change',syncRuleFieldVisibility);
    $('obligationEndingMode').addEventListener('change',syncRuleFieldVisibility);
  }

  function syncRuleFieldVisibility(){
    const recurring=$('obligationCadence').value==='recurring';
    document.querySelectorAll('[data-m302-recurring]').forEach(node=>node.hidden=!recurring);
    const ending=recurring?$('obligationEndingMode').value:'count';
    document.querySelectorAll('[data-m302-ending]').forEach(node=>node.hidden=!recurring||node.dataset.m302Ending!==ending);
  }

  function installPaymentFields(){
    const amountField=$('obligationPayAmount').closest('.field');
    if(!$('obligationPayContext')){
      const wrap=document.createElement('div');wrap.id='obligationPayContext';wrap.className='obligation-actual-context';
      wrap.innerHTML='<div class="field"><label for="obligationPayWallet">Кошелёк</label><select id="obligationPayWallet"></select></div><div class="field"><label for="obligationPayCategory">Категория расхода</label><select id="obligationPayCategory"></select></div><div class="field"><label for="obligationPayNote">Комментарий</label><textarea id="obligationPayNote"></textarea></div>';
      amountField.parentNode.insertBefore(wrap,$('obligationPayError'));
    }
    const title=$('obligationPayModal').querySelector('h2');title.id='obligationPayTitle';
  }

  function installExpectedAmountModal(){
    if($('obligationExpectedAmountModal'))return;
    const modal=document.createElement('div');
    modal.id='obligationExpectedAmountModal';modal.className='modal';
    modal.innerHTML='<div class="sheet"><div class="sheet-head"><h2>Изменить ожидаемую сумму</h2><button class="close" type="button" data-m302-close="obligationExpectedAmountModal">Закрыть</button></div><div class="field"><label for="obligationExpectedAmountInput">Новая сумма</label><input id="obligationExpectedAmountInput" inputmode="decimal"></div><div class="field"><label for="obligationExpectedAmountScope">Применить</label><select id="obligationExpectedAmountScope"><option value="starting_next" selected>Начиная со следующего платежа</option><option value="this_and_following">К этому и всем следующим</option><option value="only_this">Только к этому платежу</option></select></div><div id="obligationExpectedAmountError" class="obligation-error"></div><div class="sheet-actions"><button class="btn secondary" type="button" data-m302-close="obligationExpectedAmountModal">Отмена</button><button id="obligationExpectedAmountSave" class="btn primary" type="button">Сохранить</button></div></div>';
    document.body.appendChild(modal);
    const actions=$('obligationDetailModal').querySelector('.obligation-detail-actions');
    const button=document.createElement('button');button.id='obligationExpectedAmountBtn';button.type='button';button.className='btn secondary';button.textContent='Изменить ожидаемую сумму';
    actions.appendChild(button);
  }

  function fillPaymentWallets(selected){
    const allowed=m3WalletIds(),items=scopeApi.accessibleWallets(state).filter(item=>allowed.has(item.id));
    $('obligationPayWallet').innerHTML=items.map(item=>`<option value="${esc(item.id)}"${item.id===selected?' selected':''}>${esc(item.name)} · ${esc(item.nativeCurrency)}</option>`).join('');
  }

  function fillPaymentCategories(selected){
    const items=state.categories.filter(item=>item.kind==='expense'&&(!item.archivedAt||item.id===selected)).sort((a,b)=>a.name.localeCompare(b.name,'ru'));
    $('obligationPayCategory').innerHTML=items.map(item=>`<option value="${esc(item.id)}"${item.id===selected?' selected':''}>${esc(item.name)}</option>`).join('');
  }

  openObligationRuleEditor=function(ruleId=''){
    const rule=state.obligationRules.find(item=>item.id===ruleId);
    obligationEditingRuleId=ruleId;
    $('obligationRuleId').value=ruleId;
    $('obligationRuleTitle').textContent=rule?'Изменить обязательство':'Новое обязательство';
    $('obligationName').value=rule?.name||'';
    $('obligationAmount').value=rule?String(rule.amount).replace('.',','):'';
    $('obligationAmount').readOnly=!!rule;
    $('obligationAmount').closest('.field').querySelector('.m302-amount-help')?.remove();
    if(rule){const help=document.createElement('small');help.className='meta-note m302-amount-help';help.textContent='Ожидаемая сумма изменяется из конкретного платежа с выбором области.';$('obligationAmount').after(help)}
    $('obligationCadence').value=rule?.cadence==='recurring'?'recurring':'once';
    const schedule=latestSchedule(rule);
    $('obligationIntervalValue').value=String(schedule.intervalValue||1);
    $('obligationIntervalUnit').value=schedule.intervalUnit||'month';
    $('obligationEndingMode').value=rule?.endingMode||'unlimited';
    $('obligationPaymentCount').value=String(rule?.paymentCount||12);
    $('obligationEndingDate').value=rule?.endingDate?dateInputValue(rule.endingDate):'';
    $('obligationDueDate').value=dateInputValue(schedule.firstDueAt||now());
    fillObligationWallets(rule?.walletId||state.activeWalletId);
    fillObligationCategories(rule?.categoryId);
    $('obligationNote').value=rule?.note||'';
    $('obligationRuleError').textContent='';
    $('obligationArchiveBtn').hidden=!rule;
    $('obligationArchiveBtn').textContent=rule?.status==='archived'?'Вернуть правило':'Архивировать правило';
    syncRuleFieldVisibility();
    open('obligationRuleModal');
  };

  saveObligationRule=function(){
    const amount=Number($('obligationAmount').value.trim().replace(',','.')),walletId=$('obligationWallet').value,cadence=$('obligationCadence').value;
    const input={name:$('obligationName').value,amount,dueAt:dateFromInput($('obligationDueDate').value),cadence,intervalValue:Number($('obligationIntervalValue').value),intervalUnit:$('obligationIntervalUnit').value,endingMode:$('obligationEndingMode').value,paymentCount:Number($('obligationPaymentCount').value),endingDate:dateFromInput($('obligationEndingDate').value),walletId,categoryId:$('obligationCategory').value,currency:wallet(walletId)?.nativeCurrency||'EUR',note:$('obligationNote').value};
    const result=obligationEditingRuleId?api.updateRule(state,obligationEditingRuleId,input,state.currentMemberId,now()):api.createRule(state,input,state.currentMemberId,now());
    if(!result.ok){$('obligationRuleError').textContent=result.error;return}
    save();close('obligationRuleModal');renderAll();showScreen('obligations');toast(obligationEditingRuleId?'Обязательство обновлено':'Обязательство добавлено');
  };

  openObligationDetail=function(id){
    const occurrence=state.obligationOccurrences.find(item=>item.id===id);if(!occurrence)return;
    obligationDetailId=id;
    const rule=ruleForOccurrence(occurrence),status=occurrenceStatus(occurrence),linked=occurrence.linkedOperationId?state.operations.find(operation=>operation.id===occurrence.linkedOperationId):null;
    $('obligationDetailTitle').textContent=rule?.name||'Обязательство';
    $('obligationDetailContent').innerHTML=`<div class="detail-grid" style="margin-top:14px"><div class="detail-row"><span>Статус</span><strong><span class="obligation-status ${status}">${esc(obligationStatusLabels[status]||status)}</span></strong></div><div class="detail-row"><span>Номер платежа</span><strong>${occurrence.sequence}</strong></div><div class="detail-row"><span>Плановая дата</span><strong>${esc(new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(occurrence.scheduledDueAt)))}</strong></div><div class="detail-row"><span>Текущая дата</span><strong>${esc(new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(occurrence.dueAt)))}</strong></div><div class="detail-row"><span>Ожидается</span><strong>${money(occurrence.expectedAmount,obligationCurrency(occurrence))}</strong></div>${occurrence.actualAmount!=null?`<div class="detail-row"><span>Оплачено</span><strong>${money(occurrence.actualAmount,obligationCurrency(occurrence))}</strong></div>`:''}<div class="detail-row"><span>Кошелёк</span><strong>${esc(wallet(occurrence.walletId)?.name||'—')}</strong></div><div class="detail-row"><span>Категория</span><strong>${esc(categoryName(occurrence.categoryId))}</strong></div><div class="detail-row"><span>Повтор</span><strong>${esc(api.scheduleLabel(rule||{}))}</strong></div>${linked?`<div class="detail-row"><span>Связанный расход</span><strong>${money(linked.amount,wallet(linked.walletId)?.nativeCurrency||'EUR')} · ${linked.status==='active'?'активен':'в Корзине'}</strong></div>`:''}${rule?.note?`<div class="detail-row"><span>Комментарий</span><strong>${esc(rule.note)}</strong></div>`:''}</div>`;
    const closed=['paid','skipped','cancelled'].includes(occurrence.status);
    $('obligationPayBtn').hidden=closed&&!linked;
    $('obligationPayBtn').textContent=linked?'Исправить оплату':'Оплатить';
    $('obligationPostponeBtn').hidden=closed;
    $('obligationSkipBtn').hidden=closed;
    $('obligationExpectedAmountBtn').hidden=closed;
    $('obligationEditRuleBtn').hidden=!rule;
    open('obligationDetailModal');
  };

  openObligationPay=function(){
    const occurrence=state.obligationOccurrences.find(item=>item.id===obligationDetailId);if(!occurrence)return;
    const linked=occurrence.linkedOperationId?state.operations.find(operation=>operation.id===occurrence.linkedOperationId&&operation.status==='active'):null;
    paymentCorrectionMode=!!linked;obligationActionOccurrenceId=occurrence.id;
    $('obligationPayTitle').textContent=linked?'Исправить оплату':'Оплатить обязательство';
    $('obligationPayAmount').value=String(linked?.amount??occurrence.expectedAmount).replace('.',',');
    $('obligationPayDate').value=dateInputValue(linked?.occurredAt||now());$('obligationPayDate').max=dateInputValue(now());
    fillPaymentWallets(linked?.walletId||occurrence.walletId);fillPaymentCategories(linked?.categoryId||occurrence.categoryId);$('obligationPayNote').value=linked?.note||'';
    $('obligationPayError').textContent='';$('obligationPaySave').textContent=linked?'Сохранить исправление':'Создать расход';
    close('obligationDetailModal');open('obligationPayModal');
  };

  saveObligationPayment=function(){
    const selectedDate=$('obligationPayDate').value,occurredAt=selectedDate===dateInputValue(now())?now():dateFromInput(selectedDate),input={amount:Number($('obligationPayAmount').value.trim().replace(',','.')),occurredAt,walletId:$('obligationPayWallet').value,categoryId:$('obligationPayCategory').value,note:$('obligationPayNote').value};
    const result=paymentCorrectionMode?api.correctPayment(state,obligationActionOccurrenceId,input,state.currentMemberId,now()):api.payOccurrence(state,obligationActionOccurrenceId,input,state.currentMemberId,now());
    if(!result.ok){$('obligationPayError').textContent=result.error;return}
    save();close('obligationPayModal');renderAll();showScreen('obligations');toast(paymentCorrectionMode?'Оплата исправлена':'Оплата сохранена как связанный расход');
  };

  openObligationPostpone=function(){
    const occurrence=state.obligationOccurrences.find(item=>item.id===obligationDetailId);if(!occurrence)return;
    obligationActionOccurrenceId=occurrence.id;$('obligationPostponeDate').value=dateInputValue(occurrence.dueAt);$('obligationPostponeDate').removeAttribute('min');$('obligationPostponeError').textContent='';close('obligationDetailModal');open('obligationPostponeModal');
  };

  saveObligationPostpone=function(){
    const result=api.moveOccurrence(state,obligationActionOccurrenceId,dateFromInput($('obligationPostponeDate').value),state.currentMemberId,now());
    if(!result.ok){$('obligationPostponeError').textContent=result.error;return}
    save();close('obligationPostponeModal');renderAll();showScreen('obligations');toast('Изменена только дата этого платежа');
  };

  function quickPay(id){
    const occurrence=state.obligationOccurrences.find(item=>item.id===id);if(!occurrence)return;
    const result=api.payOccurrence(state,id,{amount:occurrence.expectedAmount,occurredAt:now(),walletId:occurrence.walletId,categoryId:occurrence.categoryId},state.currentMemberId,now());
    if(!result.ok){alert(result.error);return}
    save();renderAll();showScreen('obligations');toast('Оплата сохранена как связанный расход');
  }

  function openExpectedAmount(id){
    const occurrence=state.obligationOccurrences.find(item=>item.id===id);if(!occurrence)return;
    expectedAmountOccurrenceId=id;$('obligationExpectedAmountInput').value=String(occurrence.expectedAmount).replace('.',',');$('obligationExpectedAmountScope').value='starting_next';$('obligationExpectedAmountError').textContent='';close('obligationDetailModal');open('obligationExpectedAmountModal');
  }

  function saveExpectedAmount(){
    const result=api.changeExpectedAmount(state,expectedAmountOccurrenceId,Number($('obligationExpectedAmountInput').value.trim().replace(',','.')),$('obligationExpectedAmountScope').value,state.currentMemberId,now());
    if(!result.ok){$('obligationExpectedAmountError').textContent=result.error;return}
    save();close('obligationExpectedAmountModal');renderAll();showScreen('obligations');toast('Ожидаемая сумма обновлена с выбранной областью');
  }

  function toggleArchive(){
    const rule=state.obligationRules.find(item=>item.id===obligationEditingRuleId);if(!rule)return;
    const restoring=rule.status==='archived';
    if(!restoring&&!confirm('Архивировать правило? История и связанные расходы сохранятся.'))return;
    const result=restoring?api.restoreRule(state,rule.id,state.currentMemberId,now()):api.archiveRule(state,rule.id,state.currentMemberId,now());
    if(!result.ok){$('obligationRuleError').textContent=result.error;return}
    save();close('obligationRuleModal');renderAll();showScreen('obligations');toast(restoring?'Правило возвращено':'Правило архивировано');
  }

  installMonthNavigation();installRuleFields();installPaymentFields();installExpectedAmountModal();
  renderObligations=renderM302Obligations;
  $('obligationRuleSave').onclick=saveObligationRule;
  $('obligationPayBtn').onclick=openObligationPay;
  $('obligationPaySave').onclick=saveObligationPayment;
  $('obligationPostponeBtn').onclick=openObligationPostpone;
  $('obligationPostponeSave').onclick=saveObligationPostpone;
  $('obligationExpectedAmountBtn').onclick=()=>openExpectedAmount(obligationDetailId);
  $('obligationExpectedAmountSave').onclick=saveExpectedAmount;
  $('obligationArchiveBtn').onclick=toggleArchive;

  document.addEventListener('click',event=>{
    const month=event.target.closest('[data-m302-month]');
    const quick=event.target.closest('[data-m302-quick-pay]');
    const detail=event.target.closest('[data-m302-open-detail]');
    const restore=event.target.closest('[data-m302-restore-rule]');
    const closeButton=event.target.closest('[data-m302-close]');
    if(month||quick||detail||restore||closeButton){event.preventDefault();event.stopImmediatePropagation();}
    if(month){const d=new Date(monthAnchor);monthAnchor=new Date(d.getFullYear(),d.getMonth()+Number(month.dataset.m302Month),1).getTime();localStorage.setItem(MONTH_KEY,String(monthAnchor));renderAll();return}
    if(quick){quickPay(quick.dataset.m302QuickPay);return}
    if(detail){openObligationDetail(detail.dataset.m302OpenDetail);return}
    if(restore){const result=api.restoreRule(state,restore.dataset.m302RestoreRule,state.currentMemberId,now());if(result.ok){save();renderAll();toast('Правило возвращено')}return}
    if(closeButton){close(closeButton.dataset.m302Close);return}
  },true);

  document.addEventListener('keydown',event=>{const detail=event.target.closest?.('[data-m302-open-detail]');if(detail&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openObligationDetail(detail.dataset.m302OpenDetail)}},true);

  if(new URLSearchParams(location.search).has('test')&&window.__FP_TEST__?.obligations){
    Object.assign(window.__FP_TEST__.obligations,{
      setMonth:value=>{const d=new Date(value);monthAnchor=new Date(d.getFullYear(),d.getMonth(),1).getTime();localStorage.setItem(MONTH_KEY,String(monthAnchor));renderAll()},
      month:()=>monthAnchor,
      monthOccurrences:()=>monthOccurrences().map(item=>item.id),
      quickPay:id=>{quickPay(id);return state.obligationOccurrences.find(item=>item.id===id)},
      correctPayment:(id,input)=>{const result=api.correctPayment(state,id,input,state.currentMemberId,now());save();renderAll();return result},
      changeExpectedAmount:(id,amount,scope)=>{const result=api.changeExpectedAmount(state,id,amount,scope,state.currentMemberId,now());save();renderAll();return result},
      archiveRule:id=>{const result=api.archiveRule(state,id,state.currentMemberId,now());save();renderAll();return result},
      restoreRule:id=>{const result=api.restoreRule(state,id,state.currentMemberId,now());save();renderAll();return result},
      ensureWindow:(from,to)=>{const result=api.ensureOccurrencesWindow(state,from,to,now());save();renderAll();return result.map(item=>item.id)},
      hasForbiddenSummary:()=>!!document.querySelector('#obligationSummary')||/Сегодня\s*<\/span>/.test(document.querySelector('#obligationsScreen')?.innerHTML||''),
      renderM302:()=>{renderAll();return true}
    });
  }

  api.normalizeState(state);save();renderAll();
})();

(()=>{
  'use strict';

  if(window.__FP_M3_03_ATTENTION_UI__)return;
  const READY_LIMIT=1200;
  const MONTH_KEY='familypilot.obligations.month.v1';
  const terminal=new Set(['paid','skipped','cancelled']);

  function repairMonth(){
    const raw=localStorage.getItem(MONTH_KEY),stored=raw===null||raw===''?NaN:Number(raw),date=new Date(stored);
    if(Number.isFinite(stored)&&stored>0&&!Number.isNaN(date.getTime())&&date.getFullYear()>=2000&&date.getFullYear()<=2100)return true;
    const current=new Date(),anchor=new Date(current.getFullYear(),current.getMonth(),1).getTime();
    localStorage.setItem(MONTH_KEY,String(anchor));
    const reloadKey=`${anchor}`;
    if(sessionStorage.getItem('familypilot.obligations.month.repaired')!==reloadKey){
      sessionStorage.setItem('familypilot.obligations.month.repaired',reloadKey);
      location.reload();
      return false;
    }
    return true;
  }

  function boot(attempt=0){
    const runtime=window.__FP_RUNTIME__,attentionApi=window.FamilyPilotPaymentAttention,obligationApi=window.FamilyPilotObligations;
    if(!runtime||!attentionApi||!obligationApi||!window.__FP_M3_02_UI__){
      if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);
      else window.__FP_M3_03_ATTENTION_ERROR__='Payment attention dependencies did not become ready';
      return;
    }
    if(!repairMonth())return;
    window.__FP_M3_03_ATTENTION_UI__=true;

    const state=runtime.state,scopeApi=runtime.scopeApi,$=runtime.$,esc=runtime.esc,money=runtime.money,save=runtime.save,open=runtime.open,close=runtime.close,now=runtime.now;
    let selectedRuleId='';

    const wallet=id=>(state.wallets||[]).find(item=>item.id===id);
    const category=id=>(state.categories||[]).find(item=>item.id===id);
    const rule=id=>(state.obligationRules||[]).find(item=>item.id===id);
    const occurrence=id=>(state.obligationOccurrences||[]).find(item=>item.id===id);
    const dateInput=value=>{const d=new Date(value),p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`};
    const formatDate=value=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value));
    const currency=item=>item?.currency||wallet(item?.walletId)?.nativeCurrency||state.household?.baseCurrency||'EUR';
    const plural=(n,a,b,c)=>n%10===1&&n%100!==11?a:(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?b:c);
    const statusLabel=status=>({overdue:'Просрочено',due:'Сегодня',paid:'Оплачено',postponed:'Перенесён',skipped:'Пропущено',cancelled:'Отменено',planned:'Запланировано'}[status]||status);
    const visibleWalletIds=()=>{const selected=scopeApi.activeWallet(state);if(!selected)return new Set();if(scopeApi.isPersonalWallet(selected))return new Set([selected.id]);return new Set(scopeApi.accessibleWallets(state).filter(item=>!scopeApi.isPersonalWallet(item)).map(item=>item.id))};
    const visibleRules=()=>obligationApi.visibleRules(state,visibleWalletIds(),{includeArchived:true});
    const openForRule=id=>(state.obligationOccurrences||[]).filter(item=>item.ruleId===id&&!terminal.has(item.status)).sort((a,b)=>a.dueAt-b.dueAt||a.sequence-b.sequence);

    function ensureMarker(){
      const selector='meta[name="familypilot-package"][content="planned-payment-attention-v2"]';
      if(document.head&&!document.head.querySelector(selector)){const marker=document.createElement('meta');marker.name='familypilot-package';marker.content='planned-payment-attention-v2';document.head.appendChild(marker)}
    }

    function installStyle(){
      if($('familypilot-m3-03-attention-style'))$('familypilot-m3-03-attention-style').remove();
      const style=document.createElement('style');style.id='familypilot-m3-03-attention-style';style.textContent=`
        .bottom .nav{position:relative}.plan-attention-badge{position:absolute;top:2px;right:calc(50% - 20px);min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#d99a00;color:#fff;font-size:9px;display:grid;place-items:center;font-style:normal;font-weight:950;border:2px solid var(--card)}.plan-attention-badge[hidden]{display:none}.plan-attention-badge.overdue{background:var(--red)}.plan-attention-badge.upcoming{width:9px;min-width:9px;height:9px;padding:0;top:6px}
        .plan-module.attention-overdue{border-color:color-mix(in srgb,var(--red) 55%,var(--line));background:color-mix(in srgb,var(--red) 7%,var(--card))}.plan-module.attention-overdue .plan-module-state{color:var(--red)}.plan-module.attention-today{border-color:color-mix(in srgb,#d99a00 55%,var(--line));background:color-mix(in srgb,#d99a00 7%,var(--card))}.plan-module.attention-today .plan-module-state,.plan-module.attention-upcoming .plan-module-state{color:#b57900}
        .obligation-date-group{padding:10px;border:1px solid var(--line);border-radius:18px;background:var(--card);margin-bottom:13px}.obligation-date-group.has-overdue{border-color:color-mix(in srgb,var(--red) 50%,var(--line))}.obligation-date-group.is-today{border-color:color-mix(in srgb,#d99a00 45%,var(--line))}.obligation-date-heading{padding:2px 2px 10px!important;align-items:flex-start!important}.obligation-day-date{font-size:14px!important;color:var(--ink);font-weight:950;text-transform:capitalize}.obligation-day-plan{display:block;text-align:right}.obligation-day-plan strong,.obligation-day-plan small{display:block}.obligation-day-plan strong{font-size:11px}.obligation-day-plan small{margin-top:2px;color:var(--muted);font-size:10px}.obligation-date-group.is-multi .obligation-day-plan{padding:5px 8px;border-radius:11px;background:var(--card2);border:1px solid var(--line)}
        .obligation-date-card{gap:7px!important}.obligation-row{display:grid!important;grid-template-columns:38px minmax(0,1fr)!important;gap:9px!important;padding:9px!important;background:var(--card2)!important}.obligation-row--overdue{border-color:color-mix(in srgb,var(--red) 55%,var(--line))!important;background:color-mix(in srgb,var(--red) 8%,var(--card))!important}.obligation-row--due{border-color:color-mix(in srgb,#d99a00 50%,var(--line))!important;background:color-mix(in srgb,#d99a00 7%,var(--card))!important}.obligation-row--paid{border-color:color-mix(in srgb,var(--green) 45%,var(--line))!important;background:color-mix(in srgb,var(--green) 7%,var(--card))!important}.obligation-row--skipped,.obligation-row--cancelled{opacity:.68}.obligation-pay-check{width:34px;height:34px;border:2px solid color-mix(in srgb,var(--muted) 55%,var(--line));border-radius:11px;background:var(--card);color:var(--green);font-size:20px;font-weight:950;display:grid;place-items:center}.obligation-pay-check:not(:disabled){cursor:pointer}.obligation-pay-check.is-checked{border-color:var(--green);background:var(--green);color:#fff}.obligation-row-main{display:grid!important;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}.obligation-row-copy{min-width:0}.obligation-row-copy strong,.obligation-row-copy small{display:block}.obligation-row-copy strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.obligation-row-actions,.obligation-sequence{display:none!important}
        .obligation-rule-card{width:100%;border:1px solid var(--line);border-radius:15px;background:var(--card2);color:var(--ink);padding:11px 12px;margin-top:7px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;text-align:left}.obligation-rule-card strong,.obligation-rule-card small{display:block}.obligation-rule-card strong{font-size:14px}.obligation-rule-card small{font-size:11px;color:var(--muted);margin-top:3px}.obligation-rule-card-value{font-size:14px;font-weight:950;white-space:nowrap}.obligation-rule-card.archived{opacity:.65}.obligation-rule-detail-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.obligation-rule-detail-actions .danger{grid-column:1/-1}.payment-attention-reminder-help{display:block;color:var(--muted);font-size:10px;margin-top:4px}
        @media(max-width:380px){.obligation-date-heading{flex-direction:column}.obligation-day-plan{text-align:left}.obligation-rule-detail-actions{grid-template-columns:1fr}}
      `;document.head.appendChild(style);
    }

    function installReminderField(){
      if($('obligationReminderLeadDays'))return;
      const due=$('obligationDueDate')?.closest('.field');if(!due)return;
      const field=document.createElement('div');field.id='paymentReminderField';field.className='field';
      field.innerHTML='<label for="obligationReminderLeadDays">Напомнить заранее</label><select id="obligationReminderLeadDays"><option value="0">Только в день платежа</option><option value="1">За 1 день</option><option value="3" selected>За 3 дня</option><option value="7">За 7 дней</option><option value="14">За 14 дней</option><option value="30">За 30 дней</option></select><small class="payment-attention-reminder-help">Показывается внутри FamilyPilot. Системные уведомления появятся отдельным пакетом.</small>';
      due.after(field);
    }

    function installRuleModal(){
      if($('obligationRuleDetailModal'))return;
      const modal=document.createElement('div');modal.id='obligationRuleDetailModal';modal.className='modal';
      modal.innerHTML='<div class="sheet"><div class="sheet-head"><h2 id="obligationRuleDetailTitle">Правило</h2><button class="close" type="button" data-ux-rule-close>Закрыть</button></div><div id="obligationRuleDetailContent"></div><div class="obligation-rule-detail-actions"><button class="btn primary" type="button" data-ux-rule-edit>Изменить</button><button class="btn secondary" type="button" data-ux-rule-clone>Клонировать</button><button class="btn danger" type="button" data-ux-rule-delete>Удалить</button></div></div>';
      document.body.appendChild(modal);
    }

    function planIndicator(){
      const groups=attentionApi.groupedAttention(state,scopeApi,now()),overdue=groups.overdue.length,today=groups.today.length,upcoming=groups.upcoming.length;
      const nav=document.querySelector('.bottom [data-screen="plans"]');let badge=nav?.querySelector('.plan-attention-badge');
      if(nav&&!badge){badge=document.createElement('span');badge.className='plan-attention-badge';nav.appendChild(badge)}
      if(badge){const urgent=overdue+today;badge.hidden=!(urgent||upcoming);badge.textContent=urgent?String(Math.min(99,urgent)):'';badge.classList.toggle('overdue',overdue>0);badge.classList.toggle('upcoming',!urgent&&upcoming>0)}
      const module=document.querySelector('[data-plan-module="obligations"]'),hint=$('planObligationHint'),stateNode=$('planObligationState');if(!module||!hint||!stateNode)return;
      module.classList.remove('attention-overdue','attention-today','attention-upcoming');
      if(overdue){module.classList.add('attention-overdue');hint.textContent=`${overdue} просрочено`;stateNode.textContent='Проверить'}
      else if(today){module.classList.add('attention-today');hint.textContent=`Сегодня ${today} ${plural(today,'платёж','платежа','платежей')}`;stateNode.textContent='Сегодня'}
      else if(upcoming){module.classList.add('attention-upcoming');hint.textContent=`Скоро ${upcoming} ${plural(upcoming,'платёж','платежа','платежей')}`;stateNode.textContent='Скоро'}
      else{hint.textContent='Платежи и сроки';stateNode.textContent='Открыть'}
    }

    function dayTitle(value){
      const d=new Date(value),t=new Date(now()),tomorrow=new Date(t.getFullYear(),t.getMonth(),t.getDate()+1),same=(a,b)=>a.toDateString()===b.toDateString();
      const plain=new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long'}).format(d);
      if(same(d,t))return`Сегодня · ${plain.replace(/^[^,]+,\s*/,'')}`;if(same(d,tomorrow))return`Завтра · ${plain.replace(/^[^,]+,\s*/,'')}`;return plain;
    }
    function totals(items){const map=new Map();for(const item of items){if(terminal.has(item.status))continue;const c=currency(item);map.set(c,(map.get(c)||0)+Number(item.expectedAmount||0))}return[...map].map(([c,v])=>money(v,c)).join(' · ')||'0 €'}

    function rowHtml(item){
      const itemRule=rule(item.ruleId),status=obligationApi.occurrenceDisplayStatus(item,now()),closed=terminal.has(item.status),paid=item.status==='paid',amount=paid&&item.actualAmount!=null?item.actualAmount:item.expectedAmount;
      const meta=[wallet(item.walletId)?.name||'Кошелёк'];if(status!=='planned')meta.push(statusLabel(status));if(item.movedFromDueAt!=null)meta.push('дата изменена');
      return`<div class="obligation-row obligation-row--${esc(status)}" data-obligation-occurrence="${esc(item.id)}"><button class="obligation-pay-check${paid?' is-checked':''}" type="button" ${closed?'disabled':`data-m302-quick-pay="${esc(item.id)}"`} aria-label="${paid?'Платёж оплачен':'Отметить как оплачено'}">${paid?'✓':item.status==='skipped'?'—':''}</button><div class="obligation-row-main" data-m302-open-detail="${esc(item.id)}" role="button" tabindex="0"><span class="obligation-row-copy"><strong>${esc(itemRule?.name||'Обязательство')}</strong><small>${esc(meta.join(' · '))}</small></span><span class="obligation-row-value"><strong>${money(amount,currency(item))}</strong></span></div></div>`;
    }

    function decoratePayments(){
      const list=$('obligationList');if(!list)return;
      const title=list.closest('section')?.querySelector('.section-head h2');if(title)title.textContent='Календарь платежей';
      for(const group of list.querySelectorAll('.obligation-date-group')){
        const items=[...group.querySelectorAll('[data-obligation-occurrence]')].map(node=>occurrence(node.dataset.obligationOccurrence)).filter(Boolean).sort((a,b)=>a.dueAt-b.dueAt||a.sequence-b.sequence);if(!items.length)continue;
        const openItems=items.filter(item=>!terminal.has(item.status)),overdue=openItems.some(item=>obligationApi.occurrenceDisplayStatus(item,now())==='overdue'),today=openItems.some(item=>obligationApi.occurrenceDisplayStatus(item,now())==='due');
        group.classList.toggle('is-multi',items.length>1);group.classList.toggle('has-overdue',overdue);group.classList.toggle('is-today',today&&!overdue);
        const heading=group.querySelector('.obligation-date-heading');if(heading){const count=`${items.length} ${plural(items.length,'платёж','платежа','платежей')}`,plan=openItems.length?`Запланировать: ${totals(openItems)}`:'Всё отмечено';heading.innerHTML=`<span class="obligation-day-date">${esc(dayTitle(items[0].dueAt))}</span><span class="obligation-day-plan"><strong>${esc(count)}</strong><small>${esc(plan)}</small></span>`}
        const card=group.querySelector('.obligation-date-card');if(card)card.innerHTML=items.map(rowHtml).join('');
      }
    }

    function decorateRules(){
      const container=$('obligationRules');if(!container)return;
      const rules=visibleRules();
      container.innerHTML=rules.length?rules.map(item=>{const next=openForRule(item.id)[0],hint=next?`Ближайший: ${formatDate(next.dueAt)}`:item.status==='archived'?'Удалено из активных':'Нет предстоящих платежей';return`<button class="obligation-rule-card${item.status==='archived'?' archived':''}" type="button" data-ux-rule-open="${esc(item.id)}"><span><strong>${esc(item.name)}</strong><small>${esc(hint)}</small></span><span class="obligation-rule-card-value">${money(item.amount,item.currency)}</span></button>`}).join(''):'<div class="obligation-empty">Правил пока нет.</div>';
    }

    function openRule(ruleId){
      const item=rule(ruleId);if(!item)return;selectedRuleId=ruleId;const next=openForRule(ruleId)[0];
      $('obligationRuleDetailTitle').textContent=item.name;
      $('obligationRuleDetailContent').innerHTML=`<div class="detail-grid" style="margin-top:14px"><div class="detail-row"><span>Ближайший платёж</span><strong>${next?esc(formatDate(next.dueAt)):'—'}</strong></div><div class="detail-row"><span>Сумма</span><strong>${money(item.amount,item.currency)}</strong></div><div class="detail-row"><span>Кошелёк</span><strong>${esc(wallet(item.walletId)?.name||'—')}</strong></div><div class="detail-row"><span>Категория</span><strong>${esc(category(item.categoryId)?.name||'—')}</strong></div><div class="detail-row"><span>Напоминание</span><strong>за ${attentionApi.leadDaysForRule(state,item.id)} дн.</strong></div><div class="detail-row"><span>Правило повторения</span><strong>${esc(obligationApi.scheduleLabel(item))}</strong></div><div class="detail-row"><span>Статус</span><strong>${item.status==='archived'?'Удалено из активных':'Активно'}</strong></div></div>`;
      document.querySelector('[data-ux-rule-delete]').textContent=item.status==='archived'?'Вернуть правило':'Удалить';open('obligationRuleDetailModal');
    }

    function editRule(id){const proxy=document.createElement('button');proxy.hidden=true;proxy.dataset.obligationRule=id;document.body.appendChild(proxy);proxy.click();proxy.remove()}
    function cloneRule(id){const item=rule(id);if(!item)return;close('obligationRuleDetailModal');$('obligationAddBtn')?.click();setTimeout(()=>{const next=openForRule(id)[0],schedule=item.scheduleVersions?.[item.scheduleVersions.length-1]||item;$('obligationName').value=`${item.name} — копия`;$('obligationAmount').value=String(item.amount).replace('.',',');$('obligationCadence').value=item.cadence==='recurring'?'recurring':'once';$('obligationDueDate').value=dateInput(next?.dueAt||item.nextDueAt||item.firstDueAt||now());$('obligationWallet').value=item.walletId;$('obligationCategory').value=item.categoryId;$('obligationNote').value=String(item.note||'').replace(/ · marker:m3-03-payment-attention-demo:[a-z0-9-]+/i,'');if($('obligationIntervalValue'))$('obligationIntervalValue').value=String(schedule.intervalValue||1);if($('obligationIntervalUnit'))$('obligationIntervalUnit').value=schedule.intervalUnit||'month';if($('obligationEndingMode'))$('obligationEndingMode').value=item.endingMode||'unlimited';if($('obligationPaymentCount'))$('obligationPaymentCount').value=String(item.paymentCount||12);if($('obligationReminderLeadDays'))$('obligationReminderLeadDays').value=String(attentionApi.leadDaysForRule(state,item.id));$('obligationCadence').dispatchEvent(new Event('change',{bubbles:true}))},0)}

    function deleteRule(id){
      const item=rule(id);if(!item)return;
      if(item.status==='archived'){const restored=obligationApi.restoreRule(state,id,state.currentMemberId,now());if(restored.ok){save();close('obligationRuleDetailModal');runtime.renderAll();runtime.toast('Правило возвращено.')}return}
      const occurrences=(state.obligationOccurrences||[]).filter(entry=>entry.ruleId===id),hasHistory=occurrences.some(entry=>terminal.has(entry.status)||entry.linkedOperationId||(entry.revisions||[]).length);
      if(!confirm(hasHistory?'Удалить правило из активных? Оплаты и история сохранятся.':'Удалить правило и его ещё не выполненные платежи?'))return;
      if(hasHistory){const archived=obligationApi.archiveRule(state,id,state.currentMemberId,now());if(!archived.ok)return}else{const ids=new Set(occurrences.map(entry=>entry.id));state.obligationRules=state.obligationRules.filter(entry=>entry.id!==id);state.obligationOccurrences=state.obligationOccurrences.filter(entry=>!ids.has(entry.id));delete attentionApi.ensureReminderConfig(state)[id]}
      save();close('obligationRuleDetailModal');runtime.renderAll();runtime.toast(hasHistory?'Правило удалено из активных. История сохранена.':'Правило удалено.');
    }

    function syncReminder(ruleId=''){if($('obligationReminderLeadDays'))$('obligationReminderLeadDays').value=String(ruleId?attentionApi.leadDaysForRule(state,ruleId):attentionApi.DEFAULT_LEAD_DAYS)}
    function render(){$('paymentAttentionCard')?.remove();planIndicator();decoratePayments();decorateRules()}

    ensureMarker();installStyle();installReminderField();installRuleModal();attentionApi.ensureReminderConfig(state);
    const previous=runtime.getRenderAll();runtime.setRenderAll(()=>{previous();render()});render();

    document.addEventListener('click',event=>{
      const add=event.target.closest('#obligationAddBtn'),legacyEdit=event.target.closest('[data-obligation-rule]'),saveButton=event.target.closest('#obligationRuleSave');
      if(add)setTimeout(()=>syncReminder(''),0);if(legacyEdit)setTimeout(()=>syncReminder(legacyEdit.dataset.obligationRule),0);
      if(saveButton){const editingId=$('obligationRuleId')?.value||'',before=new Set((state.obligationRules||[]).map(item=>item.id)),lead=$('obligationReminderLeadDays')?.value;setTimeout(()=>{const id=editingId||(state.obligationRules||[]).find(item=>!before.has(item.id))?.id;if(id){attentionApi.setRuleLeadDays(state,id,lead);save();render()}},0)}
      const openButton=event.target.closest('[data-ux-rule-open]'),edit=event.target.closest('[data-ux-rule-edit]'),clone=event.target.closest('[data-ux-rule-clone]'),remove=event.target.closest('[data-ux-rule-delete]'),closeRule=event.target.closest('[data-ux-rule-close]');
      if(openButton){openRule(openButton.dataset.uxRuleOpen);return}if(edit){const id=selectedRuleId;close('obligationRuleDetailModal');editRule(id);return}if(clone){cloneRule(selectedRuleId);return}if(remove){deleteRule(selectedRuleId);return}if(closeRule){close('obligationRuleDetailModal');return}
    },true);

    const testApi={snapshot:()=>attentionApi.groupedAttention(state,scopeApi,now()),render,setLeadDays:(id,days)=>{const result=attentionApi.setRuleLeadDays(state,id,days);save();render();return result},openRule,deleteRule,cloneRule,currentMonthKey:()=>localStorage.getItem(MONTH_KEY)};
    function installTest(attempt=0){if(!new URLSearchParams(location.search).has('test'))return;if(window.__FP_TEST__){window.__FP_TEST__.paymentAttention=testApi;window.__FP_TEST__.obligationUx=testApi;return}if(attempt<READY_LIMIT)setTimeout(()=>installTest(attempt+1),25)}
    installTest();window.__FP_M3_03_READY__=true;
  }

  boot();
})();
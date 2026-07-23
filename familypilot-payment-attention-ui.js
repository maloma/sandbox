(()=>{
  'use strict';

  if(window.__FP_M3_03_ATTENTION_UI__)return;
  const READY_LIMIT=1200;
  const MONTH_KEY='familypilot.obligations.month.v1';
  const DAY=86400000;
  const terminal=new Set(['paid','skipped','cancelled']);
  const PRESS_MS=550;

  function repairMonth(){
    const raw=localStorage.getItem(MONTH_KEY),stored=raw===null||raw===''?NaN:Number(raw),date=new Date(stored);
    if(Number.isFinite(stored)&&stored>0&&!Number.isNaN(date.getTime())&&date.getFullYear()>=2000&&date.getFullYear()<=2100)return true;
    const current=new Date(),anchor=new Date(current.getFullYear(),current.getMonth(),1).getTime();
    localStorage.setItem(MONTH_KEY,String(anchor));
    const reloadKey=String(anchor);
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
    let selectedRuleId='',contextOccurrenceId='',reconcileOccurrenceId='',pressTimer=0,suppressClickUntil=0;

    const wallet=id=>(state.wallets||[]).find(item=>item.id===id);
    const category=id=>(state.categories||[]).find(item=>item.id===id);
    const rule=id=>(state.obligationRules||[]).find(item=>item.id===id);
    const occurrence=id=>(state.obligationOccurrences||[]).find(item=>item.id===id);
    const operation=id=>(state.operations||[]).find(item=>item.id===id);
    const dateInput=value=>{const d=new Date(value),p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`};
    const formatDate=value=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value));
    const formatShortDate=value=>new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value));
    const currency=item=>item?.currency||wallet(item?.walletId)?.nativeCurrency||state.household?.baseCurrency||'EUR';
    const plural=(n,a,b,c)=>n%10===1&&n%100!==11?a:(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?b:c);
    const statusLabel=status=>({overdue:'Просрочено',due:'Сегодня',paid:'Оплачено',postponed:'Перенесён',skipped:'Пропущено',cancelled:'Удалено',planned:'Запланировано'}[status]||status);
    const visibleWalletIds=()=>{const selected=scopeApi.activeWallet(state);if(!selected)return new Set();if(scopeApi.isPersonalWallet(selected))return new Set([selected.id]);return new Set(scopeApi.accessibleWallets(state).filter(item=>!scopeApi.isPersonalWallet(item)).map(item=>item.id))};
    const visibleRules=()=>obligationApi.visibleRules(state,visibleWalletIds(),{includeArchived:true});
    const ruleOccurrences=id=>(state.obligationOccurrences||[]).filter(item=>item.ruleId===id).sort((a,b)=>a.sequence-b.sequence||a.dueAt-b.dueAt);
    const openForRule=id=>ruleOccurrences(id).filter(item=>!terminal.has(item.status)).sort((a,b)=>a.dueAt-b.dueAt||a.sequence-b.sequence);
    const sameCents=(a,b)=>Math.round(Number(a||0)*100)===Math.round(Number(b||0)*100);
    const addRevision=(target,source,changes)=>{target.revisions=Array.isArray(target.revisions)?target.revisions:[];target.revisions.push({id:`ux-rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,sequence:target.revisions.length+1,changedAt:now(),changedByMemberId:state.currentMemberId,source,changes});target.lastEditedAt=now()};

    function ensureMarker(){
      const selector='meta[name="familypilot-package"][content="planned-payment-attention-v3"]';
      if(document.head&&!document.head.querySelector(selector)){const marker=document.createElement('meta');marker.name='familypilot-package';marker.content='planned-payment-attention-v3';document.head.appendChild(marker)}
    }

    function installStyle(){
      $('familypilot-m3-03-attention-style')?.remove();
      const style=document.createElement('style');style.id='familypilot-m3-03-attention-style';style.textContent=`
        .bottom .nav{position:relative}.plan-attention-badge{position:absolute;top:2px;right:calc(50% - 20px);min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#d99a00;color:#fff;font-size:9px;display:grid;place-items:center;font-style:normal;font-weight:950;border:2px solid var(--card)}.plan-attention-badge[hidden]{display:none}.plan-attention-badge.overdue{background:var(--red)}.plan-attention-badge.upcoming{width:9px;min-width:9px;height:9px;padding:0;top:6px}
        .actions.wf02-actions .action.income{order:1}.actions.wf02-actions .action.transfer{order:2}.actions.wf02-actions .action.expense{order:3}
        .plan-module.attention-overdue{border-color:color-mix(in srgb,var(--red) 55%,var(--line));background:color-mix(in srgb,var(--red) 7%,var(--card))}.plan-module.attention-overdue .plan-module-state{color:var(--red)}.plan-module.attention-today{border-color:color-mix(in srgb,#d99a00 55%,var(--line));background:color-mix(in srgb,#d99a00 7%,var(--card))}.plan-module.attention-today .plan-module-state,.plan-module.attention-upcoming .plan-module-state{color:#b57900}
        .obligation-date-group{padding:10px;border:1px solid var(--line);border-radius:18px;background:var(--card);margin-bottom:13px}.obligation-date-group.has-overdue{border-color:color-mix(in srgb,var(--red) 50%,var(--line))}.obligation-date-group.is-today{border-color:color-mix(in srgb,#d99a00 45%,var(--line))}.obligation-date-heading{padding:2px 2px 10px!important;align-items:flex-start!important}.obligation-day-date{font-size:14px!important;color:var(--ink);font-weight:950;text-transform:capitalize}.obligation-day-plan{display:block;text-align:right}.obligation-day-plan strong,.obligation-day-plan small{display:block}.obligation-day-plan strong{font-size:11px}.obligation-day-plan small{margin-top:2px;color:var(--muted);font-size:10px}.obligation-date-group.is-multi .obligation-day-plan{padding:5px 8px;border-radius:11px;background:var(--card2);border:1px solid var(--line)}
        .obligation-date-card{gap:7px!important}.obligation-row{display:grid!important;grid-template-columns:minmax(0,1fr) 42px!important;gap:9px!important;padding:9px!important;background:var(--card2)!important}.obligation-row--overdue{border-color:color-mix(in srgb,var(--red) 55%,var(--line))!important;background:color-mix(in srgb,var(--red) 8%,var(--card))!important}.obligation-row--due{border-color:color-mix(in srgb,#d99a00 50%,var(--line))!important;background:color-mix(in srgb,#d99a00 7%,var(--card))!important}.obligation-row--paid{border-color:color-mix(in srgb,var(--green) 45%,var(--line))!important;background:color-mix(in srgb,var(--green) 7%,var(--card))!important}.obligation-row--skipped{opacity:.72}.obligation-pay-check{width:40px;height:40px;border:2px solid color-mix(in srgb,var(--muted) 55%,var(--line));border-radius:13px;background:var(--card);color:var(--green);font-size:22px;font-weight:950;display:grid;place-items:center;touch-action:manipulation;user-select:none;-webkit-user-select:none}.obligation-pay-check:active{transform:scale(.96)}.obligation-pay-check.is-checked{border-color:var(--green);background:var(--green);color:#fff}.obligation-pay-check.is-skipped{border-color:var(--muted);color:var(--muted)}.obligation-row-main{display:grid!important;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;order:1}.obligation-pay-check{order:2}.obligation-row-copy{min-width:0}.obligation-row-copy strong,.obligation-row-copy small{display:block}.obligation-row-copy strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.obligation-row-actions,.obligation-sequence{display:none!important}
        .obligation-rule-section{margin-top:10px}.obligation-rule-section+.obligation-rule-section{margin-top:24px;padding-top:18px;border-top:1px solid var(--line)}.obligation-rule-section-head{display:flex;justify-content:space-between;gap:10px;align-items:end;margin-bottom:8px}.obligation-rule-section-head h3{font-size:13px;margin:0}.obligation-rule-section-head small{color:var(--muted);font-size:10px}.obligation-rule-card{width:100%;border:1px solid var(--line);border-radius:15px;background:var(--card2);color:var(--ink);padding:11px 12px;margin-top:7px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;text-align:left}.obligation-rule-card strong,.obligation-rule-card small{display:block}.obligation-rule-card strong{font-size:14px}.obligation-rule-card small{font-size:11px;color:var(--muted);margin-top:3px}.obligation-rule-card-value{font-size:14px;font-weight:950;white-space:nowrap}.obligation-rule-card.disabled{opacity:.72}.obligation-rule-detail-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.obligation-rule-stats{margin-top:14px;padding:12px;border:1px solid var(--line);border-radius:15px;background:var(--card2)}.obligation-rule-stats h3{font-size:13px;margin:0 0 8px}.obligation-rule-stat{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-top:1px solid var(--line);font-size:12px}.obligation-rule-stat:first-of-type{border-top:0}.obligation-rule-stat span{color:var(--muted)}.obligation-rule-stat strong{text-align:right}.obligation-operation-link{color:var(--green)!important;font-weight:800}.payment-attention-reminder-help{display:block;color:var(--muted);font-size:10px;margin-top:4px}#obligationArchiveBtn{display:none!important}
        .payment-context-actions{display:grid;gap:8px;margin-top:14px}.payment-context-actions button{width:100%;min-height:48px}.payment-candidate-list{display:grid;gap:8px;margin-top:12px}.payment-candidate{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid var(--line);border-radius:14px;background:var(--card2);padding:10px}.payment-candidate strong,.payment-candidate small{display:block}.payment-candidate small{color:var(--muted);font-size:10px;margin-top:3px}.payment-candidate button{min-height:38px}
        @media(max-width:380px){.obligation-date-heading{flex-direction:column}.obligation-day-plan{text-align:left}.obligation-rule-detail-actions{grid-template-columns:1fr}}
      `;document.head.appendChild(style);
    }

    function installReminderField(){
      if($('obligationReminderLeadDays'))return;
      const due=$('obligationDueDate')?.closest('.field');if(!due)return;
      const field=document.createElement('div');field.id='paymentReminderField';field.className='field';
      field.innerHTML='<label for="obligationReminderLeadDays">Напомнить заранее</label><select id="obligationReminderLeadDays"><option value="0">Только в день платежа</option><option value="1">За 1 день</option><option value="3" selected>За 3 дня</option><option value="7">За 7 дней</option><option value="14">За 14 дней</option><option value="30">За 30 дней</option></select><small class="payment-attention-reminder-help">Показывается внутри FamilyPilot. Системные уведомления и их общий выключатель появятся вместе с отдельным push-модулем.</small>';
      due.after(field);
    }

    function installModals(){
      if(!$('obligationRuleDetailModal')){const modal=document.createElement('div');modal.id='obligationRuleDetailModal';modal.className='modal';modal.innerHTML='<div class="sheet"><div class="sheet-head"><h2 id="obligationRuleDetailTitle">Правило</h2><button class="close" type="button" data-ux-rule-close>Закрыть</button></div><div id="obligationRuleDetailContent"></div><div class="obligation-rule-detail-actions"><button class="btn secondary" type="button" data-ux-rule-edit>Изменить</button><button class="btn secondary" type="button" data-ux-rule-clone>Клонировать</button><button class="btn secondary" type="button" data-ux-rule-toggle>Отключить</button><button class="btn danger" type="button" data-ux-rule-delete>Удалить</button></div></div>';document.body.appendChild(modal)}
      if(!$('paymentContextModal')){const modal=document.createElement('div');modal.id='paymentContextModal';modal.className='modal';modal.innerHTML='<div class="sheet"><div class="sheet-head"><h2 id="paymentContextTitle">Платёж</h2><button class="close" type="button" data-payment-context-close>Закрыть</button></div><div id="paymentContextInfo" class="obligation-help"></div><div class="payment-context-actions"><button class="btn primary" type="button" data-payment-context-action="paid">Оплачено</button><button class="btn secondary" type="button" data-payment-context-action="unpaid">Не оплачено</button><button class="btn secondary" type="button" data-payment-context-action="skipped">Пропущено</button><button class="btn secondary" type="button" data-payment-context-action="edit">Изменить</button><button class="btn danger" type="button" data-payment-context-action="delete">Удалить платёж</button></div></div>';document.body.appendChild(modal)}
      if(!$('paymentReconcileModal')){const modal=document.createElement('div');modal.id='paymentReconcileModal';modal.className='modal';modal.innerHTML='<div class="sheet"><div class="sheet-head"><h2>Похожий расход уже записан</h2><button class="close" type="button" data-payment-reconcile-close>Закрыть</button></div><p class="obligation-help">Чтобы не получить двойной расход, свяжите существующую операцию с платежом или явно создайте новую.</p><div id="paymentCandidateList" class="payment-candidate-list"></div><div class="sheet-actions"><button class="btn secondary" type="button" data-payment-reconcile-close>Отмена</button><button class="btn primary" type="button" data-payment-create-new>Создать новый расход</button></div></div>';document.body.appendChild(modal)}
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
      const itemRule=rule(item.ruleId),status=obligationApi.occurrenceDisplayStatus(item,now()),paid=item.status==='paid',amount=paid&&item.actualAmount!=null?item.actualAmount:item.expectedAmount;
      const meta=[wallet(item.walletId)?.name||'Кошелёк'];if(status!=='planned')meta.push(statusLabel(status));if(item.movedFromDueAt!=null)meta.push('дата изменена');
      const mark=paid?'✓':item.status==='skipped'?'—':'';
      return`<div class="obligation-row obligation-row--${esc(status)}" data-obligation-occurrence="${esc(item.id)}"><div class="obligation-row-main" data-m302-open-detail="${esc(item.id)}" role="button" tabindex="0"><span class="obligation-row-copy"><strong>${esc(itemRule?.name||'Обязательство')}</strong><small>${esc(meta.join(' · '))}</small></span><span class="obligation-row-value"><strong>${money(amount,currency(item))}</strong></span></div><button class="obligation-pay-check${paid?' is-checked':''}${item.status==='skipped'?' is-skipped':''}" type="button" data-ux-payment-toggle="${esc(item.id)}" aria-label="${paid?'Снять отметку оплаты':'Изменить статус платежа'}" aria-pressed="${paid?'true':'false'}">${mark}</button></div>`;
    }

    function decoratePayments(){
      const list=$('obligationList');if(!list)return;
      const title=list.closest('section')?.querySelector('.section-head h2');if(title)title.textContent='Календарь платежей';
      for(const group of [...list.querySelectorAll('.obligation-date-group')]){
        const items=[...group.querySelectorAll('[data-obligation-occurrence]')].map(node=>occurrence(node.dataset.obligationOccurrence)).filter(item=>item&&item.status!=='cancelled').sort((a,b)=>a.dueAt-b.dueAt||a.sequence-b.sequence);
        if(!items.length){group.remove();continue}
        const openItems=items.filter(item=>!terminal.has(item.status)),overdue=openItems.some(item=>obligationApi.occurrenceDisplayStatus(item,now())==='overdue'),today=openItems.some(item=>obligationApi.occurrenceDisplayStatus(item,now())==='due');
        group.classList.toggle('is-multi',items.length>1);group.classList.toggle('has-overdue',overdue);group.classList.toggle('is-today',today&&!overdue);
        const heading=group.querySelector('.obligation-date-heading');if(heading){const count=`${items.length} ${plural(items.length,'платёж','платежа','платежей')}`,plan=openItems.length?`Запланировать: ${totals(openItems)}`:'Всё отмечено';heading.innerHTML=`<span class="obligation-day-date">${esc(dayTitle(items[0].dueAt))}</span><span class="obligation-day-plan"><strong>${esc(count)}</strong><small>${esc(plan)}</small></span>`}
        const card=group.querySelector('.obligation-date-card');if(card)card.innerHTML=items.map(rowHtml).join('');
      }
    }

    function ruleStats(id){
      const item=rule(id),items=ruleOccurrences(id),paid=items.filter(entry=>entry.status==='paid').sort((a,b)=>(a.paidAt||a.dueAt)-(b.paidAt||b.dueAt)),start=items[0]?.scheduledDueAt||item?.firstDueAt||null,last=paid[paid.length-1]||null,lastBoundary=last?.dueAt??null;
      const skippedBetween=lastBoundary==null?0:items.filter(entry=>entry.status==='skipped'&&entry.dueAt>=start&&entry.dueAt<=lastBoundary).length;
      const total=item?.endingMode==='count'?Number(item.paymentCount||0):null;
      return{start,completed:paid.length,total,lastCompleted:last?.paidAt||last?.dueAt||null,skippedBetween,next:openForRule(id)[0]?.dueAt||null};
    }

    function ruleCard(item){const next=openForRule(item.id)[0],hint=next?`Ближайший: ${formatDate(next.dueAt)}`:item.status==='archived'?'Новые платежи не создаются':'Нет предстоящих платежей';return`<button class="obligation-rule-card${item.status==='archived'?' disabled':''}" type="button" data-ux-rule-open="${esc(item.id)}"><span><strong>${esc(item.name)}</strong><small>${esc(hint)}</small></span><span class="obligation-rule-card-value">${money(item.amount,item.currency)}</span></button>`}
    function decorateRules(){
      const container=$('obligationRules');if(!container)return;
      const rules=visibleRules(),active=rules.filter(item=>item.status==='active'),disabled=rules.filter(item=>item.status==='archived');
      const section=(title,note,items,kind)=>`<section class="obligation-rule-section ${kind}"><div class="obligation-rule-section-head"><h3>${title}</h3><small>${note}</small></div>${items.length?items.map(ruleCard).join(''):'<div class="obligation-empty">Нет правил.</div>'}</section>`;
      container.innerHTML=section('Активные правила','Создают будущие платежи',active,'active-rules')+(disabled.length?section('Отключённые','Новые платежи не создаются',disabled,'disabled-rules'):'');
    }

    function openRule(ruleId){
      const item=rule(ruleId);if(!item)return;selectedRuleId=ruleId;const next=openForRule(ruleId)[0],stats=ruleStats(ruleId),completed=stats.total?`${stats.completed} из ${stats.total}`:String(stats.completed);
      $('obligationRuleDetailTitle').textContent=item.name;
      const statsHtml=item.cadence==='recurring'?`<section class="obligation-rule-stats"><h3>Выполнение правила</h3><div class="obligation-rule-stat"><span>Дата начала</span><strong>${stats.start?esc(formatDate(stats.start)):'—'}</strong></div><div class="obligation-rule-stat"><span>Выполнено</span><strong>${esc(completed)}</strong></div><div class="obligation-rule-stat"><span>Последний выполненный</span><strong>${stats.lastCompleted?esc(formatDate(stats.lastCompleted)):'—'}</strong></div><div class="obligation-rule-stat"><span>Пропущено до последней оплаты</span><strong>${stats.skippedBetween}</strong></div></section>`:'';
      $('obligationRuleDetailContent').innerHTML=`<div class="detail-grid" style="margin-top:14px"><div class="detail-row"><span>Статус</span><strong>${item.status==='archived'?'Отключено':'Активно'}</strong></div><div class="detail-row"><span>Ближайший платёж</span><strong>${next?esc(formatDate(next.dueAt)):'—'}</strong></div><div class="detail-row"><span>Сумма</span><strong>${money(item.amount,item.currency)}</strong></div><div class="detail-row"><span>Кошелёк</span><strong>${esc(wallet(item.walletId)?.name||'—')}</strong></div><div class="detail-row"><span>Категория</span><strong>${esc(category(item.categoryId)?.name||'—')}</strong></div><div class="detail-row"><span>Напоминание</span><strong>за ${attentionApi.leadDaysForRule(state,item.id)} дн.</strong></div><div class="detail-row"><span>Правило повторения</span><strong>${esc(obligationApi.scheduleLabel(item))}</strong></div></div>${statsHtml}`;
      document.querySelector('[data-ux-rule-toggle]').textContent=item.status==='archived'?'Включить':'Отключить';open('obligationRuleDetailModal');
    }

    function editRule(id){const proxy=document.createElement('button');proxy.hidden=true;proxy.dataset.obligationRule=id;document.body.appendChild(proxy);proxy.click();proxy.remove()}
    function cloneRule(id){const item=rule(id);if(!item)return;close('obligationRuleDetailModal');$('obligationAddBtn')?.click();setTimeout(()=>{const next=openForRule(id)[0],schedule=item.scheduleVersions?.[item.scheduleVersions.length-1]||item;$('obligationName').value=`${item.name} — копия`;$('obligationAmount').value=String(item.amount).replace('.',',');$('obligationCadence').value=item.cadence==='recurring'?'recurring':'once';$('obligationDueDate').value=dateInput(next?.dueAt||item.nextDueAt||item.firstDueAt||now());$('obligationWallet').value=item.walletId;$('obligationCategory').value=item.categoryId;$('obligationNote').value=String(item.note||'').replace(/ · marker:m3-03-payment-attention-demo:[a-z0-9-]+/i,'');if($('obligationIntervalValue'))$('obligationIntervalValue').value=String(schedule.intervalValue||1);if($('obligationIntervalUnit'))$('obligationIntervalUnit').value=schedule.intervalUnit||'month';if($('obligationEndingMode'))$('obligationEndingMode').value=item.endingMode||'unlimited';if($('obligationPaymentCount'))$('obligationPaymentCount').value=String(item.paymentCount||12);if($('obligationReminderLeadDays'))$('obligationReminderLeadDays').value=String(attentionApi.leadDaysForRule(state,item.id));$('obligationCadence').dispatchEvent(new Event('change',{bubbles:true}))},0)}
    function toggleRule(id){const item=rule(id);if(!item)return;const restoring=item.status==='archived',result=restoring?obligationApi.restoreRule(state,id,state.currentMemberId,now()):obligationApi.archiveRule(state,id,state.currentMemberId,now());if(!result.ok){runtime.toast(result.error);return}save();close('obligationRuleDetailModal');runtime.renderAll();runtime.toast(restoring?'Правило включено.':'Правило отключено.')}
    function deleteRule(id){const item=rule(id);if(!item)return;const items=ruleOccurrences(id),hasHistory=items.some(entry=>entry.status==='paid'||entry.status==='skipped'||entry.linkedOperationId||(entry.revisions||[]).length);if(hasHistory){runtime.toast('Правило с историей нельзя удалить. Его можно отключить.');return}if(!confirm('Удалить правило и все его ещё не выполненные платежи?'))return;const ids=new Set(items.map(entry=>entry.id));state.obligationRules=state.obligationRules.filter(entry=>entry.id!==id);state.obligationOccurrences=state.obligationOccurrences.filter(entry=>!ids.has(entry.id));delete attentionApi.ensureReminderConfig(state)[id];save();close('obligationRuleDetailModal');runtime.renderAll();runtime.toast('Правило удалено.')}

    function matchingExpenses(occurrenceId){
      const item=occurrence(occurrenceId);if(!item)return[];const targetDay=Math.min(item.dueAt,now());
      return(state.operations||[]).filter(entry=>entry.status==='active'&&entry.kind==='expense'&&!entry.links?.obligationOccurrenceId&&entry.walletId===item.walletId&&entry.categoryId===item.categoryId&&sameCents(entry.amount,item.expectedAmount)&&Number(entry.occurredAt)<=now()&&Math.abs(Number(entry.occurredAt)-targetDay)<=45*DAY).sort((a,b)=>b.occurredAt-a.occurredAt).slice(0,5);
    }
    function linkExistingExpense(occurrenceId,operationId){
      const item=occurrence(occurrenceId),itemRule=rule(item?.ruleId),op=operation(operationId);if(!item||!itemRule||!op||op.status!=='active'||op.kind!=='expense')return{ok:false,error:'Расход недоступен для связи.'};if(op.links?.obligationOccurrenceId)return{ok:false,error:'Расход уже связан с другим платежом.'};
      op.links={...(op.links||{}),obligationRuleId:itemRule.id,obligationOccurrenceId:item.id,relation:'fulfills_occurrence',obligationLinkMode:'existing'};
      addRevision(op,'obligation_link_existing',[{field:'obligationOccurrenceId',oldValue:null,newValue:item.id}]);addRevision(item,'obligation_link_existing',[{field:'status',oldValue:item.status,newValue:'paid'},{field:'linkedOperationId',oldValue:item.linkedOperationId,newValue:op.id}]);
      item.status='paid';item.linkedOperationId=op.id;item.actualAmount=Number(op.amount)||item.expectedAmount;item.paidAt=Number(op.occurredAt)||now();save();runtime.renderAll();return{ok:true,occurrence:item,operation:op};
    }
    function trashGeneratedOperation(op){const at=now();op.status='trash';op.deletedAt=at;op.deletedByMemberId=state.currentMemberId;op.trashExpiresAt=state.config?.trashRetentionEnabled?at+Number(state.config.trashRetentionDays||45)*DAY:null;addRevision(op,'obligation_payment_unchecked',[{field:'status',oldValue:'active',newValue:'trash'}])}
    function unlinkManualOperation(op){const old=op.links?.obligationOccurrenceId;op.links={...(op.links||{})};delete op.links.obligationRuleId;delete op.links.obligationOccurrenceId;delete op.links.relation;delete op.links.obligationLinkMode;addRevision(op,'obligation_unlink_existing',[{field:'obligationOccurrenceId',oldValue:old,newValue:null}])}
    function unpayOccurrence(id){
      const item=occurrence(id);if(!item)return{ok:false,error:'Платёж не найден.'};const op=operation(item.linkedOperationId)||state.operations.find(entry=>entry.status==='active'&&entry.links?.obligationOccurrenceId===id);
      if(op){if(op.links?.obligationLinkMode==='existing')unlinkManualOperation(op);else trashGeneratedOperation(op)}
      addRevision(item,'obligation_payment_unchecked',[{field:'status',oldValue:item.status,newValue:'planned'},{field:'linkedOperationId',oldValue:item.linkedOperationId,newValue:null}]);item.status='planned';item.linkedOperationId=null;item.actualAmount=null;item.paidAt=null;save();runtime.renderAll();return{ok:true,occurrence:item,operation:op||null};
    }
    function createNewExpense(id){const item=occurrence(id);if(!item)return{ok:false,error:'Платёж не найден.'};const result=obligationApi.payOccurrence(state,id,{amount:item.expectedAmount,occurredAt:now(),walletId:item.walletId,categoryId:item.categoryId},state.currentMemberId,now());if(!result.ok){runtime.toast(result.error);return result}save();runtime.renderAll();runtime.toast('Оплата отмечена.');return result}
    function showReconcile(id,candidates){reconcileOccurrenceId=id;$('paymentCandidateList').innerHTML=candidates.map(op=>`<div class="payment-candidate"><span><strong>${money(op.amount,wallet(op.walletId)?.nativeCurrency||'EUR')}</strong><small>${esc(formatShortDate(op.occurredAt))}${op.note?` · ${esc(op.note)}`:''}</small></span><button class="btn secondary" type="button" data-payment-link-existing="${esc(op.id)}">Связать</button></div>`).join('');open('paymentReconcileModal')}
    function beginPay(id,{forceNew=false}={}){const item=occurrence(id);if(!item)return;if(item.status==='skipped'||item.status==='cancelled'){openContext(id);return}const candidates=forceNew?[]:matchingExpenses(id);if(candidates.length){showReconcile(id,candidates);return}createNewExpense(id)}
    function setPaidFromContext(id){const item=occurrence(id);if(!item)return;if(item.status==='paid'){close('paymentContextModal');return}if(item.status==='skipped'||item.status==='cancelled'){reopenOccurrence(item);save();runtime.renderAll()}close('paymentContextModal');beginPay(id)}
    function togglePayment(id){const item=occurrence(id);if(!item)return;if(item.status==='paid'){unpayOccurrence(id);runtime.toast('Отметка оплаты снята.');return}beginPay(id)}

    function openContext(id){const item=occurrence(id),itemRule=rule(item?.ruleId);if(!item)return;contextOccurrenceId=id;$('paymentContextTitle').textContent=itemRule?.name||'Платёж';$('paymentContextInfo').textContent=`${formatDate(item.dueAt)} · ${money(item.status==='paid'&&item.actualAmount!=null?item.actualAmount:item.expectedAmount,currency(item))} · ${statusLabel(obligationApi.occurrenceDisplayStatus(item,now()))}`;open('paymentContextModal')}
    function reopenOccurrence(item){addRevision(item,'obligation_reopen',[{field:'status',oldValue:item.status,newValue:'planned'}]);item.status='planned';item.skippedAt=null}
    function setSkipped(id){const item=occurrence(id);if(!item)return;if(item.status==='paid')unpayOccurrence(id);if(item.status==='cancelled')reopenOccurrence(item);const result=obligationApi.skipOccurrence(state,id,state.currentMemberId,now());if(!result.ok){runtime.toast(result.error);return}save();close('paymentContextModal');runtime.renderAll();runtime.toast('Платёж отмечен как пропущенный.')}
    function setUnpaid(id){const item=occurrence(id);if(!item)return;if(item.status==='paid')unpayOccurrence(id);else if(item.status==='skipped'||item.status==='cancelled'){reopenOccurrence(item);save();runtime.renderAll()}close('paymentContextModal');runtime.toast('Платёж снова ожидает решения.')}
    function deleteOccurrence(id){const item=occurrence(id);if(!item)return;if(!confirm('Удалить только этот платёж? Правило следующих платежей не изменится.'))return;if(item.status==='paid')unpayOccurrence(id);addRevision(item,'obligation_occurrence_cancel',[{field:'status',oldValue:item.status,newValue:'cancelled'}]);item.status='cancelled';save();close('paymentContextModal');runtime.renderAll();runtime.toast('Платёж удалён. Правило не изменено.')}
    function openOccurrenceDetail(id){close('paymentContextModal');const node=document.querySelector(`[data-m302-open-detail="${CSS.escape(id)}"]`);node?.click()}

    function installOperationLinkProjection(){
      const base=runtime.getOperationRow();runtime.setOperationRow(function(op){let html=base(op);if(op?.kind!=='expense'||!op.links?.obligationOccurrenceId)return html;const item=occurrence(op.links.obligationOccurrenceId),itemRule=rule(item?.ruleId);if(!item)return html;const label=`Обязательство · срок ${formatShortDate(item.dueAt)}${itemRule?.name?` · ${itemRule.name}`:''}`;if(html.includes('obligation-operation-link'))return html;return html.replace(/(<div class="op-meta">[\s\S]*?<\/div>)/,`$1<div class="op-note obligation-operation-link">${esc(label)}</div>`)});
    }

    function syncReminder(ruleId=''){if($('obligationReminderLeadDays'))$('obligationReminderLeadDays').value=String(ruleId?attentionApi.leadDaysForRule(state,ruleId):attentionApi.DEFAULT_LEAD_DAYS)}
    function render(){$('paymentAttentionCard')?.remove();planIndicator();decoratePayments();decorateRules()}

    ensureMarker();installStyle();installReminderField();installModals();attentionApi.ensureReminderConfig(state);installOperationLinkProjection();
    const previous=runtime.getRenderAll();runtime.setRenderAll(()=>{previous();render()});render();

    document.addEventListener('pointerdown',event=>{const toggle=event.target.closest('[data-ux-payment-toggle]');if(!toggle)return;clearTimeout(pressTimer);pressTimer=setTimeout(()=>{suppressClickUntil=Date.now()+900;openContext(toggle.dataset.uxPaymentToggle);navigator.vibrate?.(20)},PRESS_MS)},true);
    for(const type of ['pointerup','pointercancel','pointerleave'])document.addEventListener(type,()=>{clearTimeout(pressTimer);pressTimer=0},true);
    document.addEventListener('contextmenu',event=>{const toggle=event.target.closest('[data-ux-payment-toggle]');if(!toggle)return;event.preventDefault();event.stopImmediatePropagation();openContext(toggle.dataset.uxPaymentToggle)},true);
    document.addEventListener('click',event=>{
      const toggle=event.target.closest('[data-ux-payment-toggle]');if(toggle){event.preventDefault();event.stopImmediatePropagation();if(Date.now()<suppressClickUntil)return;togglePayment(toggle.dataset.uxPaymentToggle);return}
      const add=event.target.closest('#obligationAddBtn'),legacyEdit=event.target.closest('[data-obligation-rule]'),saveButton=event.target.closest('#obligationRuleSave');
      if(add)setTimeout(()=>syncReminder(''),0);if(legacyEdit)setTimeout(()=>syncReminder(legacyEdit.dataset.obligationRule),0);
      if(saveButton){const editingId=$('obligationRuleId')?.value||'',before=new Set((state.obligationRules||[]).map(item=>item.id)),lead=$('obligationReminderLeadDays')?.value;setTimeout(()=>{const id=editingId||(state.obligationRules||[]).find(item=>!before.has(item.id))?.id;if(id){attentionApi.setRuleLeadDays(state,id,lead);save();render()}},0)}
      const openButton=event.target.closest('[data-ux-rule-open]'),edit=event.target.closest('[data-ux-rule-edit]'),clone=event.target.closest('[data-ux-rule-clone]'),toggleRuleButton=event.target.closest('[data-ux-rule-toggle]'),remove=event.target.closest('[data-ux-rule-delete]'),closeRule=event.target.closest('[data-ux-rule-close]');
      if(openButton){openRule(openButton.dataset.uxRuleOpen);return}if(edit){const id=selectedRuleId;close('obligationRuleDetailModal');editRule(id);return}if(clone){cloneRule(selectedRuleId);return}if(toggleRuleButton){toggleRule(selectedRuleId);return}if(remove){deleteRule(selectedRuleId);return}if(closeRule){close('obligationRuleDetailModal');return}
      const contextClose=event.target.closest('[data-payment-context-close]'),contextAction=event.target.closest('[data-payment-context-action]');if(contextClose){close('paymentContextModal');return}if(contextAction){const action=contextAction.dataset.paymentContextAction,id=contextOccurrenceId;if(action==='paid')setPaidFromContext(id);if(action==='unpaid')setUnpaid(id);if(action==='skipped')setSkipped(id);if(action==='edit')openOccurrenceDetail(id);if(action==='delete')deleteOccurrence(id);return}
      const reconcileClose=event.target.closest('[data-payment-reconcile-close]'),link=event.target.closest('[data-payment-link-existing]'),createNew=event.target.closest('[data-payment-create-new]');if(reconcileClose){close('paymentReconcileModal');return}if(link){const result=linkExistingExpense(reconcileOccurrenceId,link.dataset.paymentLinkExisting);if(result.ok){close('paymentReconcileModal');runtime.toast('Существующий расход связан с платежом.')}else runtime.toast(result.error);return}if(createNew){const id=reconcileOccurrenceId;close('paymentReconcileModal');beginPay(id,{forceNew:true});return}
    },true);

    const testApi={
      snapshot:()=>attentionApi.groupedAttention(state,scopeApi,now()),render,setLeadDays:(id,days)=>{const result=attentionApi.setRuleLeadDays(state,id,days);save();render();return result},
      openRule,cloneRule,deleteRule,toggleRule,ruleStats,currentMonthKey:()=>localStorage.getItem(MONTH_KEY),matchingExpenses,linkExistingExpense,unpayOccurrence,togglePayment,openContext,
      addManualExpense:input=>{const at=now(),op={id:`op-manual-${at.toString(36)}-${Math.random().toString(36).slice(2,7)}`,kind:'expense',amount:Number(input.amount),categoryId:input.categoryId,walletId:input.walletId,note:String(input.note||'Ручной расход'),occurredAt:Number(input.occurredAt||at),createdByMemberId:state.currentMemberId,createdAt:at,lastEditedByMemberId:state.currentMemberId,lastEditedAt:at,revisions:[],status:'active',deletedAt:null,deletedByMemberId:null,trashExpiresAt:null,receipt:null,links:{},transferGroupId:null};state.operations.push(op);save();runtime.renderAll();return op},
      contextAction:(id,action)=>{contextOccurrenceId=id;if(action==='paid')setPaidFromContext(id);if(action==='unpaid')setUnpaid(id);if(action==='skipped')setSkipped(id);if(action==='delete')deleteOccurrence(id)},
      actionOrder:()=>[...document.querySelectorAll('#actionDock .actions .action')].sort((a,b)=>Number(getComputedStyle(a).order)-Number(getComputedStyle(b).order)).map(node=>node.querySelector('strong')?.textContent.trim()||''),
      operationHtml:id=>{const op=operation(id);return op?runtime.getOperationRow()(op):''}
    };
    function installTest(attempt=0){if(!new URLSearchParams(location.search).has('test'))return;if(window.__FP_TEST__){window.__FP_TEST__.paymentAttention=testApi;window.__FP_TEST__.obligationUx=testApi;return}if(attempt<READY_LIMIT)setTimeout(()=>installTest(attempt+1),25)}
    installTest();window.__FP_M3_03_READY__=true;
  }

  boot();
})();

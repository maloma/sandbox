(()=>{
  'use strict';

  if(window.__FP_M3_03_ATTENTION_UI__)return;
  const READY_LIMIT=1200;

  function boot(attempt=0){
    const runtime=window.__FP_RUNTIME__,attentionApi=window.FamilyPilotPaymentAttention,obligationApi=window.FamilyPilotObligations;
    if(!runtime||!attentionApi||!obligationApi){
      if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);
      else window.__FP_M3_03_ATTENTION_ERROR__='Payment attention dependencies did not become ready';
      return;
    }
    window.__FP_M3_03_ATTENTION_UI__=true;

    const state=runtime.state,scopeApi=runtime.scopeApi,$=runtime.$,esc=runtime.esc,money=runtime.money,save=runtime.save,showScreen=runtime.showScreen,open=runtime.open,close=runtime.close,now=runtime.now;
    const dateLabel=value=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short'}).format(new Date(value));
    const fullDateLabel=value=>new Intl.DateTimeFormat('ru-RU',{weekday:'short',day:'numeric',month:'long'}).format(new Date(value));
    const walletName=id=>(state.wallets||[]).find(wallet=>wallet.id===id)?.name||'Кошелёк';
    const amountFor=occurrence=>occurrence.status==='paid'&&occurrence.actualAmount!=null?occurrence.actualAmount:occurrence.expectedAmount;
    const currencyFor=occurrence=>occurrence.currency||state.household?.baseCurrency||'EUR';

    function ensureMarker(){
      const selector='meta[name="familypilot-package"][content="planned-payment-attention-v1"]';
      if(document.head&&!document.head.querySelector(selector)){
        const marker=document.createElement('meta');marker.name='familypilot-package';marker.content='planned-payment-attention-v1';document.head.appendChild(marker);
      }
    }

    function installStyle(){
      if($('familypilot-m3-03-attention-style'))return;
      const style=document.createElement('style');style.id='familypilot-m3-03-attention-style';style.textContent=`
        #paymentAttentionCard[hidden]{display:none}
        .payment-attention-list{display:grid;gap:11px}
        .payment-attention-group{display:grid;gap:7px}
        .payment-attention-heading{display:flex;justify-content:space-between;gap:10px;align-items:center;color:var(--muted);font-size:11px;font-weight:900;text-transform:uppercase}
        .payment-attention-heading.overdue{color:var(--red)}
        .payment-attention-heading.today{color:#9a6900}
        .payment-attention-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;border:1px solid var(--line);border-radius:15px;background:var(--card2);padding:9px}
        .payment-attention-main{min-width:0;border:0;background:transparent;color:var(--ink);padding:0;text-align:left;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}
        .payment-attention-main strong,.payment-attention-main small{display:block}
        .payment-attention-main strong{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .payment-attention-main small{color:var(--muted);font-size:10px;margin-top:3px}
        .payment-attention-amount{font-size:13px;font-weight:900;white-space:nowrap}
        .payment-attention-pay{min-height:36px;border:0;border-radius:11px;background:var(--green);color:#fff;padding:6px 10px;font-size:11px;font-weight:900}
        .payment-attention-reminder-help{display:block;color:var(--muted);font-size:10px;margin-top:4px}
        @media(max-width:380px){.payment-attention-row{grid-template-columns:1fr}.payment-attention-pay{width:100%}}
      `;document.head.appendChild(style);
    }

    function installHomeCard(){
      if($('paymentAttentionCard'))return;
      const card=document.createElement('section');card.id='paymentAttentionCard';card.className='card section';card.hidden=true;
      card.innerHTML='<div class="section-head"><div><h2>Платежи</h2><small class="analytics-data-basis">Сегодня, просрочено и ближайшие напоминания</small></div><button class="link" type="button" data-payment-attention-all>Все</button></div><div id="paymentAttentionList" class="payment-attention-list"></div>';
      const debts=$('homeDebtReceivable')?.closest('.debts');
      if(debts?.parentNode)debts.parentNode.insertBefore(card,debts.nextSibling);
    }


    function installDetailModal(){
      if($('paymentAttentionDetailModal'))return;
      const modal=document.createElement('div');modal.id='paymentAttentionDetailModal';modal.className='modal';
      modal.innerHTML='<div class="sheet"><div class="sheet-head"><h2 id="paymentAttentionDetailTitle">Платёж</h2><button class="close" type="button" data-close="paymentAttentionDetailModal">Закрыть</button></div><div id="paymentAttentionDetailContent"></div><div class="sheet-actions"><button id="paymentAttentionDetailCalendar" class="btn secondary" type="button">Открыть календарь</button><button id="paymentAttentionDetailPay" class="btn primary" type="button">Оплачено</button></div></div>';
      document.body.appendChild(modal);
    }

    function detailHtml(occurrence,rule){
      return `<div class="detail-grid"><div class="detail-row"><span>Дата</span><strong>${esc(fullDateLabel(occurrence.dueAt))}</strong></div><div class="detail-row"><span>Сумма</span><strong>${esc(money(amountFor(occurrence),currencyFor(occurrence)))}</strong></div><div class="detail-row"><span>Кошелёк</span><strong>${esc(walletName(occurrence.walletId))}</strong></div><div class="detail-row"><span>Напоминание</span><strong>за ${ruleLead(occurrence.ruleId)} дн.</strong></div></div>${rule?.note?`<p class="obligation-help">${esc(rule.note)}</p>`:''}`;
    }

    function installReminderField(){
      if($('obligationReminderLeadDays'))return;
      const dueField=$('obligationDueDate')?.closest('.field');
      if(!dueField)return;
      const field=document.createElement('div');field.id='paymentReminderField';field.className='field';
      field.innerHTML='<label for="obligationReminderLeadDays">Напомнить заранее</label><select id="obligationReminderLeadDays"><option value="0">Только в день платежа</option><option value="1">За 1 день</option><option value="3" selected>За 3 дня</option><option value="7">За 7 дней</option><option value="14">За 14 дней</option><option value="30">За 30 дней</option></select><small class="payment-attention-reminder-help">Показывается внутри FamilyPilot. Push, SMS и email не отправляются.</small>';
      dueField.after(field);
    }

    function ruleLead(ruleId){return attentionApi.leadDaysForRule(state,ruleId)}
    function syncReminderField(ruleId=''){
      const select=$('obligationReminderLeadDays');if(!select)return;
      select.value=String(ruleId?ruleLead(ruleId):attentionApi.DEFAULT_LEAD_DAYS);
    }

    function rowHtml(item){
      const occurrence=item.occurrence,rule=item.rule,title=rule?.name||'Платёж',meta=`${fullDateLabel(occurrence.dueAt)} · ${walletName(occurrence.walletId)}`;
      return `<div class="payment-attention-row" data-payment-attention-row="${esc(occurrence.id)}"><button class="payment-attention-main" type="button" data-payment-attention-open="${esc(occurrence.id)}"><span><strong>${esc(title)}</strong><small>${esc(meta)}</small></span><span class="payment-attention-amount">${esc(money(amountFor(occurrence),currencyFor(occurrence)))}</span></button><button class="payment-attention-pay" type="button" data-payment-attention-pay="${esc(occurrence.id)}">Оплачено</button></div>`;
    }

    function groupHtml(key,items){
      if(!items.length)return'';
      const labels={overdue:'Просрочено',today:'Сегодня',upcoming:'Скоро'};
      const note=key==='overdue'?'Вчера и ранее':key==='upcoming'?`до ${dateLabel(items[items.length-1].occurrence.dueAt)}`:`${items.length}`;
      return `<section class="payment-attention-group"><div class="payment-attention-heading ${key}"><span>${labels[key]}</span><span>${esc(note)}</span></div>${items.map(rowHtml).join('')}</section>`;
    }

    function renderAttention(){
      const card=$('paymentAttentionCard'),list=$('paymentAttentionList');if(!card||!list)return;
      const groups=attentionApi.groupedAttention(state,scopeApi,now());
      const total=groups.overdue.length+groups.today.length+groups.upcoming.length;
      card.hidden=!total;
      list.innerHTML=total?groupHtml('overdue',groups.overdue)+groupHtml('today',groups.today)+groupHtml('upcoming',groups.upcoming):'';
    }

    function openOccurrence(id){showScreen('obligations');runtime.renderAll();
      const occurrence=(state.obligationOccurrences||[]).find(item=>item.id===id);if(!occurrence)return;
      const rule=(state.obligationRules||[]).find(item=>item.id===occurrence.ruleId)||null;
      $('paymentAttentionDetailTitle').textContent=rule?.name||'Платёж';
      $('paymentAttentionDetailContent').innerHTML=detailHtml(occurrence,rule);
      $('paymentAttentionDetailPay').dataset.occurrenceId=id;
      $('paymentAttentionDetailCalendar').dataset.occurrenceId=id;
      if(typeof open==='function')open('paymentAttentionDetailModal');else $('paymentAttentionDetailModal').classList.add('open');
    }

    function payOccurrence(id){
      const result=obligationApi.payOccurrence(state,id,{},state.currentMemberId,now());
      if(!result.ok){runtime.toast(result.error||'Не удалось отметить платёж.');return}
      save();runtime.renderAll();runtime.toast('Платёж отмечен.');
    }

    document.addEventListener('click',event=>{
      const all=event.target.closest('[data-payment-attention-all]');if(all){showScreen('obligations');runtime.renderAll();return}
      const open=event.target.closest('[data-payment-attention-open]');if(open){openOccurrence(open.dataset.paymentAttentionOpen);return}
      const pay=event.target.closest('[data-payment-attention-pay]');if(pay){payOccurrence(pay.dataset.paymentAttentionPay);return}
      const detailPay=event.target.closest('#paymentAttentionDetailPay');if(detailPay){payOccurrence(detailPay.dataset.occurrenceId);if(typeof close==='function')close('paymentAttentionDetailModal');return}
      const calendar=event.target.closest('#paymentAttentionDetailCalendar');if(calendar){if(typeof close==='function')close('paymentAttentionDetailModal');showScreen('obligations');runtime.renderAll();return}
      const add=event.target.closest('#obligationAddBtn');if(add)setTimeout(()=>syncReminderField(''),0);
      const edit=event.target.closest('[data-obligation-rule]');if(edit)setTimeout(()=>syncReminderField(edit.dataset.obligationRule),0);
      const saveButton=event.target.closest('#obligationRuleSave');if(saveButton){
        const select=$('obligationReminderLeadDays'),editingId=$('obligationRuleId')?.value||'',idsBefore=new Set((state.obligationRules||[]).map(rule=>rule.id)),lead=select?.value;
        setTimeout(()=>{
          const id=editingId||(state.obligationRules||[]).find(rule=>!idsBefore.has(rule.id))?.id;
          if(id){attentionApi.setRuleLeadDays(state,id,lead);save();renderAttention()}
        },0);
      }
    });

    ensureMarker();installStyle();installHomeCard();installDetailModal();installReminderField();
    attentionApi.ensureReminderConfig(state);
    const previousRenderAll=runtime.getRenderAll();
    runtime.setRenderAll(()=>{previousRenderAll();renderAttention()});
    renderAttention();

    const testApi={snapshot:()=>attentionApi.groupedAttention(state,scopeApi,now()),render:renderAttention,setLeadDays:(ruleId,days)=>{const result=attentionApi.setRuleLeadDays(state,ruleId,days);save();renderAttention();return result},pay:payOccurrence,open:openOccurrence};
    function installTestApi(attempt=0){if(!new URLSearchParams(location.search).has('test'))return;if(window.__FP_TEST__){window.__FP_TEST__.paymentAttention=testApi;return}if(attempt<READY_LIMIT)setTimeout(()=>installTestApi(attempt+1),25)}
    installTestApi();
    window.__FP_M3_03_READY__=true;
  }

  boot();
})();

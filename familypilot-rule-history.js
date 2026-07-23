(()=>{
  'use strict';
  if(window.__FP_RULE_HISTORY__)return;
  const READY_LIMIT=1200,DAY=86400000;

  function boot(attempt=0){
    const runtime=window.__FP_RUNTIME__,payments=window.FamilyPilotPartialPayments;
    if(!runtime||!payments||!window.__FP_M3_07_READY__){
      if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);
      else window.__FP_RULE_HISTORY_ERROR__='Rule history dependencies did not become ready';
      return;
    }
    window.__FP_RULE_HISTORY__=true;
    const state=runtime.state,$=runtime.$,esc=runtime.esc,money=runtime.money,now=runtime.now;
    let currentRuleId='',rendering=false,observer=null;

    const rule=id=>(state.obligationRules||[]).find(item=>item.id===id)||null;
    const occurrence=id=>(state.obligationOccurrences||[]).find(item=>item.id===id)||null;
    const operation=id=>(state.operations||[]).find(item=>item.id===id)||null;
    const wallet=id=>(state.wallets||[]).find(item=>item.id===id)||null;
    const currency=item=>item?.currency||wallet(item?.walletId)?.nativeCurrency||state.household?.baseCurrency||'EUR';
    const formatDate=value=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value));
    const formatDateTime=value=>new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
    const startOfToday=()=>{const d=new Date(now());return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()};
    const hiddenMap=()=>state.config?.hiddenObligationOccurrencesById||{};
    const memoryMap=()=>state.config?.obligationPartialPaymentMemoryByOccurrenceId||{};

    function allocatedOperationIds(item){
      const ids=new Set();
      for(const op of state.operations||[]){
        if(op.links?.obligationOccurrenceId===item.id||op.links?.obligationAllocationOccurrenceId===item.id)ids.add(op.id);
      }
      for(const id of memoryMap()[item.id]?.operationIds||[])ids.add(id);
      return[...ids];
    }
    function allocatedOperations(item){return allocatedOperationIds(item).map(operation).filter(Boolean).sort((a,b)=>Number(a.occurredAt||a.createdAt||0)-Number(b.occurredAt||b.createdAt||0))}
    function currentLink(op,item){return op.links?.obligationOccurrenceId===item.id||op.links?.obligationAllocationOccurrenceId===item.id}
    function operationState(op,item){
      if(op.status==='voided')return{label:'Убрана из финансов',className:'voided'};
      if(op.status==='trash')return{label:'В Корзине',className:'trash'};
      if(op.status==='active'&&currentLink(op,item))return{label:'Учтена',className:'active'};
      if(op.status==='active')return{label:'Связь снята',className:'detached'};
      return{label:'Не учитывается',className:'inactive'};
    }
    function displayStatus(item){
      const data=payments.summary(item.id),today=startOfToday(),due=new Date(item.dueAt);due.setHours(0,0,0,0);
      if(data.status==='partial')return{key:'partial',label:'Частично оплачено'};
      if(data.status==='paid')return{key:'paid',label:data.overpaid>0?'Оплачено с переплатой':'Оплачено'};
      if(item.status==='skipped')return{key:'skipped',label:'Пропущено'};
      if(item.status==='cancelled')return{key:'cancelled',label:'Отменено'};
      if(due.getTime()<today)return{key:'overdue',label:'Просрочено'};
      if(due.getTime()===today)return{key:'due',label:'Сегодня'};
      return{key:'planned',label:'Запланировано'};
    }
    function historyOccurrences(ruleId){
      const todayEnd=startOfToday()+DAY-1,hidden=hiddenMap();
      return(state.obligationOccurrences||[]).filter(item=>{
        if(item.ruleId!==ruleId)return false;
        return Number(item.dueAt)<=todayEnd||item.status!=='planned'||hidden[item.id]||allocatedOperationIds(item).length>0;
      }).sort((a,b)=>Number(b.dueAt)-Number(a.dueAt)||Number(b.sequence)-Number(a.sequence));
    }
    function summary(ruleId){
      const items=historyOccurrences(ruleId),result={total:items.length,paid:0,partial:0,skipped:0,overdue:0,hidden:0,planned:0,paidAmount:0};
      for(const item of items){
        const status=displayStatus(item),data=payments.summary(item.id);result[status.key]=(result[status.key]||0)+1;if(hiddenMap()[item.id])result.hidden+=1;result.paidAmount+=data.paid;
      }
      return result;
    }

    function operationHtml(op,item){
      const stateInfo=operationState(op,item),note=String(op.note||'').trim();
      return`<div class="rule-history-operation ${stateInfo.className}"><span><strong>${money(op.amount,currency(item))}</strong><small>${esc(formatDateTime(op.occurredAt||op.createdAt))}${note?` · ${esc(note)}`:''}</small></span><span class="rule-history-operation-state">${esc(stateInfo.label)}</span></div>`;
    }
    function occurrenceHtml(item,index){
      const data=payments.summary(item.id),status=displayStatus(item),hidden=!!hiddenMap()[item.id],ops=allocatedOperations(item),expected=money(data.expected,currency(item)),paid=money(data.paid,currency(item)),remaining=money(data.remaining,currency(item));
      const amountLine=data.status==='planned'?expected:data.status==='paid'?`${paid} из ${expected}`:`${paid} из ${expected}`;
      const detailLine=data.status==='partial'?`Осталось ${remaining}`:data.status==='paid'&&data.overpaid>0?`Переплата ${money(data.overpaid,currency(item))}`:data.status==='paid'&&data.settlementMode==='full'&&data.paid!==data.expected?'Обязательство закрыто полностью':`План: ${expected}`;
      return`<details class="rule-history-occurrence status-${status.key}" data-rule-history-occurrence="${esc(item.id)}"${index===0?' open':''}><summary><span class="rule-history-occurrence-copy"><strong>${esc(formatDate(item.dueAt))}</strong><small>${esc(status.label)}${hidden?' · Скрыто':''}</small></span><span class="rule-history-occurrence-amount"><strong>${amountLine}</strong><small>${esc(detailLine)}</small></span></summary><div class="rule-history-occurrence-body"><div class="rule-history-facts"><div><span>Запланировано</span><strong>${expected}</strong></div><div><span>Оплачено</span><strong>${paid}</strong></div><div><span>Осталось</span><strong>${remaining}</strong></div></div>${ops.length?`<div class="rule-history-operations"><h4>Операции (${ops.length})</h4>${ops.map(op=>operationHtml(op,item)).join('')}</div>`:'<div class="rule-history-empty-operation">Связанных операций нет.</div>'}</div></details>`;
    }

    const fieldLabels={name:'Название',amount:'Сумма',walletId:'Кошелёк',categoryId:'Категория',status:'Статус',intervalValue:'Интервал',intervalUnit:'Период',endingMode:'Окончание',paymentCount:'Количество платежей',endingDate:'Дата окончания',amountVersion:'Изменение суммы',scheduleVersion:'Изменение расписания'};
    const sourceLabels={obligation_archive:'Правило отключено',obligation_restore:'Правило включено',amount_version:'Изменена сумма',user:'Изменено правило',obligation_rule_update:'Изменено правило'};
    function changeValue(field,value){
      if(value==null||value==='')return'—';
      if(field==='walletId')return wallet(value)?.name||'Другой кошелёк';
      if(field==='status')return value==='archived'?'Отключено':value==='active'?'Активно':String(value);
      if(['endingDate'].includes(field)&&Number.isFinite(Number(value)))return formatDate(Number(value));
      return String(value);
    }
    function revisionHtml(revision){
      const visible=(revision.changes||[]).filter(change=>fieldLabels[change.field]);
      if(!visible.length)return'';
      const title=sourceLabels[revision.source]||'Изменено правило';
      return`<div class="rule-change-item"><strong>${esc(title)}</strong><small>${esc(formatDateTime(revision.changedAt))}</small>${visible.map(change=>`<div><span>${esc(fieldLabels[change.field])}</span><b>${esc(changeValue(change.field,change.oldValue))} → ${esc(changeValue(change.field,change.newValue))}</b></div>`).join('')}</div>`;
    }
    function changesHtml(item){
      const rows=(item.revisions||[]).slice().sort((a,b)=>Number(b.changedAt)-Number(a.changedAt)).map(revisionHtml).filter(Boolean);
      return`<details class="rule-change-history"><summary><span>Изменения правила</span><small>${rows.length}</small></summary><div class="rule-change-list">${rows.length?rows.join(''):'<div class="rule-history-empty">Изменений пока нет.</div>'}</div></details>`;
    }

    function renderHistory(ruleId=currentRuleId){
      const item=rule(ruleId),content=$('obligationRuleDetailContent'),modal=$('obligationRuleDetailModal');
      if(!item||!content||!modal?.classList.contains('open')||rendering)return false;
      rendering=true;observer?.disconnect();
      try{
        content.querySelector('.obligation-rule-stats')?.remove();
        content.querySelector('#obligationRuleHistory')?.remove();
        const items=historyOccurrences(ruleId),stats=summary(ruleId),section=document.createElement('section');
        section.id='obligationRuleHistory';section.className='obligation-rule-history';
        section.innerHTML=`<div class="rule-history-head"><div><h3>История платежей</h3><small>${items.length} событий</small></div><strong>${money(stats.paidAmount,item.currency)}</strong></div><div class="rule-history-summary"><span><b>${stats.paid}</b> оплачено</span><span><b>${stats.partial}</b> частично</span><span><b>${stats.skipped}</b> пропущено</span><span><b>${stats.hidden}</b> скрыто</span></div><div class="rule-history-list">${items.length?items.map(occurrenceHtml).join(''):'<div class="rule-history-empty">История появится после первого срока или действия с платежом.</div>'}</div>${changesHtml(item)}`;
        content.appendChild(section);
      }finally{rendering=false;observe()}
      return true;
    }
    function observe(){
      const content=$('obligationRuleDetailContent');if(observer&&content)observer.observe(content,{childList:true,subtree:false});
    }
    function schedule(){if(rendering||!currentRuleId)return;queueMicrotask(()=>renderHistory(currentRuleId))}

    function installStyle(){
      const style=document.createElement('style');style.id='familypilot-rule-history-style';style.textContent=`
        .obligation-rule-history{margin-top:18px;padding-top:18px;border-top:1px solid var(--line)}.rule-history-head{display:flex;align-items:end;justify-content:space-between;gap:12px}.rule-history-head h3{margin:0;font-size:15px}.rule-history-head small{display:block;color:var(--muted);font-size:10px;margin-top:3px}.rule-history-head>strong{font-size:16px}.rule-history-summary{display:flex;gap:6px;overflow:auto;padding:10px 0 5px;scrollbar-width:none}.rule-history-summary::-webkit-scrollbar{display:none}.rule-history-summary span{flex:none;border:1px solid var(--line);border-radius:999px;background:var(--card2);padding:6px 9px;font-size:10px;color:var(--muted)}.rule-history-summary b{color:var(--ink)}.rule-history-list{display:grid;gap:8px;margin-top:9px}.rule-history-occurrence{border:1px solid var(--line);border-radius:16px;background:var(--card2);overflow:hidden}.rule-history-occurrence.status-paid{border-color:color-mix(in srgb,var(--green) 40%,var(--line))}.rule-history-occurrence.status-partial{border-color:color-mix(in srgb,#d99a00 55%,var(--line));background:color-mix(in srgb,#d99a00 7%,var(--card2))}.rule-history-occurrence.status-overdue{border-color:color-mix(in srgb,var(--red) 45%,var(--line))}.rule-history-occurrence.status-skipped,.rule-history-occurrence.status-cancelled{opacity:.8}.rule-history-occurrence>summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:11px}.rule-history-occurrence>summary::-webkit-details-marker{display:none}.rule-history-occurrence-copy strong,.rule-history-occurrence-copy small,.rule-history-occurrence-amount strong,.rule-history-occurrence-amount small{display:block}.rule-history-occurrence-copy small,.rule-history-occurrence-amount small{color:var(--muted);font-size:10px;margin-top:3px}.rule-history-occurrence-amount{text-align:right}.rule-history-occurrence-amount strong{font-size:13px}.rule-history-occurrence-body{padding:0 11px 11px;border-top:1px solid var(--line)}.rule-history-facts{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding-top:10px}.rule-history-facts div{border:1px solid var(--line);border-radius:11px;background:var(--card);padding:7px;text-align:center}.rule-history-facts span,.rule-history-facts strong{display:block}.rule-history-facts span{font-size:9px;color:var(--muted)}.rule-history-facts strong{font-size:11px;margin-top:3px}.rule-history-operations{margin-top:12px}.rule-history-operations h4{margin:0 0 6px;font-size:11px}.rule-history-operation{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px 0;border-top:1px solid var(--line)}.rule-history-operation:first-of-type{border-top:0}.rule-history-operation strong,.rule-history-operation small{display:block}.rule-history-operation small{font-size:9px;color:var(--muted);margin-top:2px}.rule-history-operation-state{font-size:9px;font-weight:900;color:var(--green)}.rule-history-operation.voided .rule-history-operation-state,.rule-history-operation.detached .rule-history-operation-state,.rule-history-operation.trash .rule-history-operation-state{color:var(--muted)}.rule-history-empty,.rule-history-empty-operation{padding:12px;color:var(--muted);font-size:11px;text-align:center}.rule-change-history{margin-top:16px;border:1px solid var(--line);border-radius:15px;background:var(--card2)}.rule-change-history>summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;gap:10px;padding:12px;font-weight:900;font-size:12px}.rule-change-history>summary::-webkit-details-marker{display:none}.rule-change-history>summary small{color:var(--muted)}.rule-change-list{padding:0 12px 12px}.rule-change-item{padding:9px 0;border-top:1px solid var(--line)}.rule-change-item>strong,.rule-change-item>small{display:block}.rule-change-item>small{font-size:9px;color:var(--muted);margin-top:2px}.rule-change-item>div{display:flex;justify-content:space-between;gap:10px;margin-top:5px;font-size:9px}.rule-change-item>div span{color:var(--muted)}.rule-change-item>div b{text-align:right}@media(max-width:380px){.rule-history-facts{grid-template-columns:1fr}.rule-history-occurrence>summary{grid-template-columns:1fr}.rule-history-occurrence-amount{text-align:left}}
      `;document.head.appendChild(style);
    }

    installStyle();
    const content=$('obligationRuleDetailContent');if(content){observer=new MutationObserver(schedule);observe()}
    const previous=runtime.getRenderAll();runtime.setRenderAll(()=>{const result=previous();if(currentRuleId&&$('obligationRuleDetailModal')?.classList.contains('open'))schedule();return result});
    document.addEventListener('click',event=>{
      const opener=event.target.closest?.('[data-ux-rule-open]');if(opener){currentRuleId=opener.dataset.uxRuleOpen;queueMicrotask(()=>renderHistory(currentRuleId));return}
      if(event.target.closest?.('[data-ux-rule-close]'))currentRuleId='';
    },true);

    const api={
      historyOccurrences,summary,allocatedOperations,renderHistory,
      openRule:id=>{currentRuleId=id;window.__FP_TEST__?.paymentAttention?.openRule?.(id);return renderHistory(id)}
    };
    window.FamilyPilotRuleHistory=Object.freeze(api);
    if(new URLSearchParams(location.search).has('test')){const install=(n=0)=>{if(window.__FP_TEST__){window.__FP_TEST__.ruleHistory=api;return}if(n<READY_LIMIT)setTimeout(()=>install(n+1),25)};install()}
    window.__FP_RULE_HISTORY_READY__=true;
  }
  boot();
})();

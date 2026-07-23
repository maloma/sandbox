(()=>{
  'use strict';
  if(window.__FP_MOBILE_PAYMENT_TAP__)return;
  const READY_LIMIT=1200,LONG_MS=560,MOVE_LIMIT=18;

  function boot(attempt=0){
    const runtime=window.__FP_RUNTIME__;
    if(!runtime||!window.__FP_M3_05_READY__||!window.__FP_OBLIGATION_STATE_UI_READY__){
      if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);
      else window.__FP_MOBILE_PAYMENT_TAP_ERROR__='Payment tap dependencies did not become ready';
      return;
    }
    window.__FP_MOBILE_PAYMENT_TAP__=true;
    const state=runtime.state,save=runtime.save,now=runtime.now;
    let active=null,forwardingContext=false,suppressedPointerClick={id:'',until:0};
    const occurrence=id=>(state.obligationOccurrences||[]).find(item=>item.id===id)||null;

    const style=document.createElement('style');
    style.id='familypilot-mobile-payment-tap-style';
    style.textContent='.obligation-row{grid-template-columns:minmax(0,1fr) 60px!important}.obligation-pay-check{width:58px!important;height:58px!important;min-width:58px!important;min-height:58px!important;border-radius:17px!important;touch-action:manipulation!important}';
    document.head.appendChild(style);

    function stateToggle(id){return document.querySelector(`[data-obligation-occurrence="${CSS.escape(id)}"] [data-state-payment-toggle]`)}
    function paymentProxy(id){
      const row=document.querySelector(`[data-obligation-occurrence="${CSS.escape(id)}"]`);
      return row?.querySelector(`[data-state-compat="${CSS.escape(id)}"]`)||row?.querySelector('[data-ux-payment-toggle]')||null;
    }
    function updateContext(id){
      const item=occurrence(id),modal=document.getElementById('paymentContextModal');if(!item||!modal)return;
      const paid=modal.querySelector('[data-payment-context-action="paid"]'),unpaid=modal.querySelector('[data-payment-context-action="unpaid"]'),skipped=modal.querySelector('[data-payment-context-action="skipped"]');
      if(paid){paid.disabled=item.status==='paid';paid.textContent=item.status==='paid'?'Уже оплачено':'Оплачено'}
      if(unpaid){unpaid.disabled=item.status==='planned';unpaid.textContent=item.status==='planned'?'Уже не оплачено':'Не оплачено'}
      if(skipped){skipped.disabled=item.status==='skipped';skipped.textContent=item.status==='skipped'?'Уже пропущено':'Пропущено'}
    }
    function openContext(id){
      const target=stateToggle(id);if(!target)return;
      forwardingContext=true;
      target.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
      forwardingContext=false;
      queueMicrotask(()=>updateContext(id));
    }
    function restoreSkipped(id){
      const item=occurrence(id);if(!item||item.status!=='skipped')return false;
      item.revisions=Array.isArray(item.revisions)?item.revisions:[];
      item.revisions.push({id:`mobile-rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,sequence:item.revisions.length+1,changedAt:now(),changedByMemberId:state.currentMemberId,source:'obligation_skip_unchecked',changes:[{field:'status',oldValue:'skipped',newValue:'planned'},{field:'skippedAt',oldValue:item.skippedAt,newValue:null}]});
      item.status='planned';item.skippedAt=null;item.lastEditedAt=now();save();runtime.renderAll();runtime.toast('Отметка «Пропущено» снята.');return true;
    }
    function shortAction(id){const item=occurrence(id);if(!item)return;if(item.status==='skipped'){restoreSkipped(id);return}paymentProxy(id)?.click()}
    function suppressNextPointerClick(id,duration=700){suppressedPointerClick={id,until:Date.now()+duration}}
    function finish(event,cancelled=false){
      const current=active;if(!current||event.pointerId!==current.pointerId)return;
      clearTimeout(current.timer);active=null;suppressNextPointerClick(current.id);
      if(cancelled||current.long)return;
      if(Math.hypot(Number(event.clientX)-current.x,Number(event.clientY)-current.y)>MOVE_LIMIT)return;
      event.preventDefault();event.stopImmediatePropagation();shortAction(current.id);
    }

    window.addEventListener('pointerdown',event=>{
      const button=event.target.closest?.('[data-state-payment-toggle]');if(!button||event.button>0)return;
      const id=button.dataset.statePaymentToggle;
      active={pointerId:event.pointerId,id,x:Number(event.clientX),y:Number(event.clientY),long:false,timer:0};
      active.timer=setTimeout(()=>{if(!active||active.pointerId!==event.pointerId)return;active.long=true;suppressNextPointerClick(id,900);openContext(id);navigator.vibrate?.(20)},LONG_MS);
      try{button.setPointerCapture?.(event.pointerId)}catch{}
      event.stopImmediatePropagation();
    },true);
    window.addEventListener('pointermove',event=>{if(active&&event.pointerId===active.pointerId&&Math.hypot(Number(event.clientX)-active.x,Number(event.clientY)-active.y)>MOVE_LIMIT){clearTimeout(active.timer);active.timer=0}},true);
    window.addEventListener('pointerup',event=>finish(event,false),true);
    window.addEventListener('pointercancel',event=>finish(event,true),true);
    window.addEventListener('contextmenu',event=>{
      const button=event.target.closest?.('[data-state-payment-toggle]');if(!button)return;
      if(forwardingContext)return;
      event.preventDefault();event.stopImmediatePropagation();clearTimeout(active?.timer);active=null;
      suppressNextPointerClick(button.dataset.statePaymentToggle,900);openContext(button.dataset.statePaymentToggle);
    },true);
    window.addEventListener('click',event=>{
      const button=event.target.closest?.('[data-state-payment-toggle]');if(!button)return;
      event.preventDefault();event.stopImmediatePropagation();
      const id=button.dataset.statePaymentToggle;
      const duplicatedPointerClick=event.detail>0&&suppressedPointerClick.id===id&&Date.now()<suppressedPointerClick.until;
      if(duplicatedPointerClick)return;
      suppressedPointerClick={id:'',until:0};
      shortAction(id);
    },true);

    const testApi={restoreSkipped,targetSize:id=>{const node=stateToggle(id),rect=node?.getBoundingClientRect();return rect?{width:rect.width,height:rect.height}:null}};
    if(new URLSearchParams(location.search).has('test')){
      const install=(attempt=0)=>{if(window.__FP_TEST__){window.__FP_TEST__.mobilePaymentTap=testApi;return}if(attempt<READY_LIMIT)setTimeout(()=>install(attempt+1),25)};install();
    }
    window.__FP_MOBILE_PAYMENT_TAP_READY__=true;
  }
  boot();
})();

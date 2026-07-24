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
    let active=null,contextPress=null,forwardingContext=false,forwardingContextAction=false;
    let suppressedToggleClick={id:'',until:0},suppressedContextClick={button:null,until:0};
    const occurrence=id=>(state.obligationOccurrences||[]).find(item=>item.id===id)||null;

    const style=document.createElement('style');
    style.id='familypilot-mobile-payment-tap-style';
    style.textContent='.obligation-pay-check{touch-action:manipulation!important;user-select:none!important;-webkit-user-select:none!important}.payment-context-actions button{touch-action:manipulation!important;user-select:none!important;-webkit-user-select:none!important;pointer-events:auto!important}';
    document.head.appendChild(style);

    function stateToggle(id){return document.querySelector(`[data-obligation-occurrence="${CSS.escape(id)}"] [data-state-payment-toggle]`)}
    function paymentProxy(id){
      const row=document.querySelector(`[data-obligation-occurrence="${CSS.escape(id)}"]`);
      return row?.querySelector(`[data-state-compat="${CSS.escape(id)}"]`)||row?.querySelector('[data-ux-payment-toggle]')||null;
    }
    function consume(event){event.preventDefault();event.stopImmediatePropagation()}
    function moved(start,event){return Math.hypot(Number(event.clientX)-start.x,Number(event.clientY)-start.y)>MOVE_LIMIT}
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
    function suppressToggle(id,duration=1200){suppressedToggleClick={id,until:Date.now()+duration}}
    function finishToggle(event,cancelled=false){
      const current=active;if(!current||event.pointerId!==current.pointerId)return;
      clearTimeout(current.timer);active=null;suppressToggle(current.id);
      consume(event);
      if(cancelled||current.long||moved(current,event))return;
      shortAction(current.id);
    }
    function fireContextAction(button){
      suppressedContextClick={button,until:Date.now()+900};
      forwardingContextAction=true;
      try{button.click()}finally{forwardingContextAction=false}
    }

    window.addEventListener('pointerdown',event=>{
      const contextButton=event.target.closest?.('[data-payment-context-action]');
      if(contextButton&&!contextButton.disabled&&event.button<=0){
        contextPress={pointerId:event.pointerId,button:contextButton,x:Number(event.clientX),y:Number(event.clientY)};
        try{contextButton.setPointerCapture?.(event.pointerId)}catch{}
        consume(event);return;
      }
      const button=event.target.closest?.('[data-state-payment-toggle]');if(!button||event.button>0)return;
      const id=button.dataset.statePaymentToggle;
      active={pointerId:event.pointerId,id,button,x:Number(event.clientX),y:Number(event.clientY),long:false,timer:0};
      active.timer=setTimeout(()=>{
        if(!active||active.pointerId!==event.pointerId)return;
        active.long=true;suppressToggle(id,1400);
        try{button.releasePointerCapture?.(event.pointerId)}catch{}
        openContext(id);navigator.vibrate?.(20);
      },LONG_MS);
      try{button.setPointerCapture?.(event.pointerId)}catch{}
      consume(event);
    },true);
    window.addEventListener('pointermove',event=>{
      if(active&&event.pointerId===active.pointerId&&moved(active,event)){clearTimeout(active.timer);active.timer=0}
      if(contextPress&&event.pointerId===contextPress.pointerId&&moved(contextPress,event))contextPress.cancelled=true;
    },true);
    window.addEventListener('pointerup',event=>{
      if(contextPress&&event.pointerId===contextPress.pointerId){
        const current=contextPress;contextPress=null;consume(event);
        try{current.button.releasePointerCapture?.(event.pointerId)}catch{}
        if(!current.cancelled&&!moved(current,event))fireContextAction(current.button);
        return;
      }
      finishToggle(event,false);
    },true);
    window.addEventListener('pointercancel',event=>{
      if(contextPress&&event.pointerId===contextPress.pointerId){contextPress=null;consume(event);return}
      finishToggle(event,true);
    },true);
    window.addEventListener('contextmenu',event=>{
      const button=event.target.closest?.('[data-state-payment-toggle]');if(!button)return;
      if(forwardingContext)return;
      consume(event);clearTimeout(active?.timer);active=null;suppressToggle(button.dataset.statePaymentToggle,1400);openContext(button.dataset.statePaymentToggle);
    },true);
    window.addEventListener('click',event=>{
      const contextButton=event.target.closest?.('[data-payment-context-action]');
      if(contextButton){
        if(forwardingContextAction)return;
        if(suppressedContextClick.button===contextButton&&Date.now()<suppressedContextClick.until){consume(event);return}
        return;
      }
      const button=event.target.closest?.('[data-state-payment-toggle]');if(!button)return;
      consume(event);
      const id=button.dataset.statePaymentToggle;
      if(suppressedToggleClick.id===id&&Date.now()<suppressedToggleClick.until)return;
      suppressedToggleClick={id:'',until:0};shortAction(id);
    },true);

    const testApi={
      restoreSkipped,
      targetSize:id=>{const node=stateToggle(id),rect=node?.getBoundingClientRect();return rect?{width:rect.width,height:rect.height}:null},
      openContext,
      contextActionAtEdge:button=>{const rect=button.getBoundingClientRect(),id=57;button.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:id,pointerType:'mouse',button:0,buttons:1,clientX:rect.right-2,clientY:rect.bottom-2}));button.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,pointerId:id,pointerType:'mouse',button:0,buttons:0,clientX:rect.right-2,clientY:rect.bottom-2}))}
    };
    if(new URLSearchParams(location.search).has('test')){
      const install=(attempt=0)=>{if(window.__FP_TEST__){window.__FP_TEST__.mobilePaymentTap=testApi;return}if(attempt<READY_LIMIT)setTimeout(()=>install(attempt+1),25)};install();
    }
    window.__FP_MOBILE_PAYMENT_TAP_READY__=true;
  }
  boot();
})();

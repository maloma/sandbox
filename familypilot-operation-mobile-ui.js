(()=>{
  'use strict';
  if(window.__FP_OPERATION_MOBILE_UI__)return;
  const READY_LIMIT=1200;
  function boot(attempt=0){
    const runtime=window.__FP_RUNTIME__;
    if(!runtime||!window.__FP_M3_05_READY__){if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);return}
    window.__FP_OPERATION_MOBILE_UI__=true;
    const style=document.createElement('style');
    style.id='familypilot-operation-mobile-ui-style';
    style.textContent=':root{--fp-fixed-bottom:74px}html{scroll-padding-bottom:calc(var(--fp-fixed-bottom) + 12px)}.app{padding-bottom:calc(var(--fp-fixed-bottom) + 12px)!important}#operationDetail details.history{margin-top:14px}';
    document.head.appendChild(style);

    function collapseHistory(){const history=document.querySelector('#operationDetail details.history');if(history)history.removeAttribute('open')}
    collapseHistory();
    const detail=document.getElementById('operationDetail');
    if(detail)new MutationObserver(()=>{if(detail.classList.contains('open'))collapseHistory()}).observe(detail,{attributes:true,attributeFilter:['class']});

    function syncFixedBottom(){
      const nav=document.querySelector('.bottom'),dock=document.getElementById('actionDock');
      const navHeight=nav&&getComputedStyle(nav).display!=='none'?nav.getBoundingClientRect().height:0;
      const dockVisible=dock&&!dock.classList.contains('hidden')&&getComputedStyle(dock).display!=='none';
      const dockHeight=dockVisible?dock.getBoundingClientRect().height:0;
      const total=Math.max(0,Math.ceil(navHeight+dockHeight));
      document.documentElement.style.setProperty('--fp-fixed-bottom',`${total}px`);
      document.body.classList.toggle('fp-action-dock-visible',!!dockVisible);
      return total;
    }
    syncFixedBottom();
    new MutationObserver(()=>requestAnimationFrame(syncFixedBottom)).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
    window.addEventListener('resize',syncFixedBottom,{passive:true});
    window.visualViewport?.addEventListener('resize',syncFixedBottom,{passive:true});
    window.visualViewport?.addEventListener('scroll',syncFixedBottom,{passive:true});
    document.addEventListener('focusout',()=>setTimeout(syncFixedBottom,120),true);

    const testApi={collapseHistory,historyCollapsed:()=>!document.querySelector('#operationDetail details.history')?.hasAttribute('open'),syncFixedBottom,fixedBottom:()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fp-fixed-bottom'))||0};
    if(new URLSearchParams(location.search).has('test')){const install=(n=0)=>{if(window.__FP_TEST__){window.__FP_TEST__.operationMobileUi=testApi;return}if(n<READY_LIMIT)setTimeout(()=>install(n+1),25)};install()}
    window.__FP_OPERATION_MOBILE_UI_READY__=true;
  }
  boot();
})();

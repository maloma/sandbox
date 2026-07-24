(()=>{
  'use strict';
  if(window.__FP_VIEWPORT_ANCHOR__)return;
  window.__FP_VIEWPORT_ANCHOR__=true;
  const READY_LIMIT=1200;

  function boot(attempt=0){
    const nav=document.querySelector('.bottom'),dock=document.getElementById('actionDock'),app=document.querySelector('.app');
    if(!nav||!dock||!app){if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);return}

    if(nav.parentElement!==document.body)document.body.appendChild(nav);
    if(dock.parentElement!==document.body)document.body.insertBefore(dock,nav);

    const style=document.createElement('style');
    style.id='familypilot-viewport-anchor-style';
    style.textContent=`
      body>.bottom{position:fixed!important;left:50%!important;right:auto!important;top:auto!important;bottom:0!important;transform:translate3d(-50%,var(--fp-visual-shift,0px),0)!important;width:min(100%,520px)!important;z-index:600!important;will-change:transform;isolation:isolate}
      body>#actionDock{position:fixed!important;left:50%!important;right:auto!important;top:auto!important;bottom:var(--fp-nav-height,62px)!important;transform:translate3d(-50%,var(--fp-visual-shift,0px),0)!important;width:min(100%,520px)!important;z-index:590!important;will-change:transform;isolation:isolate}
      body>.bottom,body>#actionDock{margin:0!important}
    `;
    document.head.appendChild(style);

    let syncing=false;
    function sync(){
      if(syncing)return;syncing=true;
      requestAnimationFrame(()=>{
        try{
          document.documentElement.style.setProperty('--fp-visual-shift','0px');
          const navVisible=getComputedStyle(nav).display!=='none';
          const navHeight=navVisible?Math.ceil(nav.getBoundingClientRect().height):0;
          document.documentElement.style.setProperty('--fp-nav-height',`${navHeight}px`);
          const vv=window.visualViewport;
          const visualBottom=vv?vv.offsetTop+vv.height:window.innerHeight;
          const rect=nav.getBoundingClientRect();
          const shift=Math.round(visualBottom-rect.bottom);
          document.documentElement.style.setProperty('--fp-visual-shift',`${Number.isFinite(shift)?shift:0}px`);
          const dockVisible=getComputedStyle(dock).display!=='none'&&!dock.classList.contains('hidden');
          const dockHeight=dockVisible?Math.ceil(dock.getBoundingClientRect().height):0;
          const total=Math.max(0,navHeight+dockHeight);
          document.documentElement.style.setProperty('--fp-fixed-bottom',`${total}px`);
          app.style.paddingBottom=`calc(${total}px + 16px + env(safe-area-inset-bottom))`;
        }finally{syncing=false}
      });
    }

    sync();
    new MutationObserver(sync).observe(dock,{attributes:true,attributeFilter:['class']});
    new MutationObserver(sync).observe(nav,{attributes:true,attributeFilter:['class']});
    for(const target of [window,window.visualViewport].filter(Boolean)){
      target.addEventListener('resize',sync,{passive:true});
      target.addEventListener('scroll',sync,{passive:true});
    }
    document.addEventListener('focusin',sync,true);
    document.addEventListener('focusout',()=>setTimeout(sync,120),true);

    const api={sync,parents:()=>({nav:nav.parentElement===document.body,dock:dock.parentElement===document.body}),positions:()=>({nav:nav.getBoundingClientRect(),dock:dock.getBoundingClientRect(),visualBottom:(window.visualViewport?.offsetTop||0)+(window.visualViewport?.height||window.innerHeight)})};
    if(new URLSearchParams(location.search).has('test')){
      const install=(n=0)=>{if(window.__FP_TEST__){window.__FP_TEST__.viewportAnchor=api;return}if(n<READY_LIMIT)setTimeout(()=>install(n+1),25)};install();
    }
    window.__FP_VIEWPORT_ANCHOR_READY__=true;
  }
  boot();
})();

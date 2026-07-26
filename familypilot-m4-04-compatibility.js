(()=>{
  'use strict';
  if(window.__FP_M4_04_COMPATIBILITY__)return;
  window.__FP_M4_04_COMPATIBILITY__=true;

  const deadline=Date.now()+40000;

  function clarifyReserveCard(card){
    if(!card)return;
    const heading=card.querySelector('h2');
    if(heading&&heading.textContent!=='Резерв (непредвиденные расходы)')heading.textContent='Резерв (непредвиденные расходы)';
    const subtitle=heading?.parentElement?.querySelector('small');
    if(subtitle&&subtitle.textContent!=='Резерв на покрытие дефицита и непредвиденных расходов.')subtitle.textContent='Резерв на покрытие дефицита и непредвиденных расходов.';
  }

  function install(){
    const card=document.getElementById('budgetReserveCard');
    if(!card){
      if(Date.now()<deadline)setTimeout(install,25);
      return;
    }
    clarifyReserveCard(card);
    new MutationObserver(()=>clarifyReserveCard(card)).observe(card,{childList:true,subtree:true,characterData:true});
    window.__FP_M4_04_COMPATIBILITY_READY__=true;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();

(function(){
  function install(){
    const grid=document.getElementById('calcGrid');
    if(!grid)return;
    const byKey=key=>grid.querySelector('[data-key="'+key+'"]');
    const clear=byKey('C');
    const plus=byKey('+');
    const backspace=byKey('Backspace');
    if(clear){
      clear.style.gridColumn='auto';
      clear.style.gridRow='auto';
      clear.textContent='C';
      clear.title='Очистить весь расчёт';
      clear.setAttribute('aria-label','Очистить весь расчёт');
    }
    if(plus){plus.style.gridColumn='auto';plus.style.gridRow='auto'}
    if(backspace){
      backspace.style.gridColumn='1 / -1';
      backspace.style.gridRow='auto';
      backspace.textContent='⌫';
    }
    const zero=byKey('0'),decimal=byKey('.');
    [zero,decimal,clear,plus,backspace].filter(Boolean).forEach(button=>grid.appendChild(button));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
(function(){
  function install(){
    const grid=document.getElementById('calcGrid');
    if(!grid||grid.querySelector('[data-key="Backspace"]'))return;
    const button=document.createElement('button');
    button.type='button';
    button.className='btn ghost';
    button.dataset.key='Backspace';
    button.textContent='⌫';
    button.title='Стереть последний символ';
    button.setAttribute('aria-label','Стереть последний символ');
    button.style.gridColumn='span 2';
    const clear=grid.querySelector('[data-key="C"]');
    if(clear){clear.textContent='C';clear.title='Очистить весь расчёт';clear.setAttribute('aria-label','Очистить весь расчёт');clear.style.gridColumn='span 2'}
    grid.appendChild(button);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();

(function(){
  function byKey(grid,key){
    return [...grid.querySelectorAll('[data-key]')].find(button=>button.dataset.key===key)||null;
  }

  function install(){
    const grid=document.getElementById('calcGrid');
    const useButton=document.getElementById('useCalc');
    if(!grid||!useButton)return;

    let backspace=byKey(grid,'Backspace');
    if(!backspace){
      backspace=document.createElement('button');
      backspace.type='button';
      backspace.dataset.key='Backspace';
    }
    backspace.className='btn ghost';
    backspace.textContent='⌫';
    backspace.title='Стереть последний символ';
    backspace.setAttribute('aria-label','Стереть последний символ');

    const clearButton=byKey(grid,'C');
    if(!clearButton)return;

    const order=['7','8','9','÷','4','5','6','×','1','2','3','−','0','.','Backspace','+'];
    order.forEach(key=>{
      const button=key==='Backspace'?backspace:byKey(grid,key);
      if(button){
        button.style.gridColumn='';
        grid.appendChild(button);
      }
    });
    grid.style.gridTemplateColumns='repeat(4,minmax(0,1fr))';

    let actions=document.getElementById('calcActions');
    if(!actions){
      actions=document.createElement('div');
      actions.id='calcActions';
      actions.className='calc-action-row';
      grid.after(actions);
    }

    clearButton.className='btn ghost';
    clearButton.textContent='Очистить';
    clearButton.title='Очистить весь расчёт';
    clearButton.setAttribute('aria-label','Очистить весь расчёт');
    clearButton.style.gridColumn='';
    clearButton.onclick=function(event){
      event.preventDefault();
      event.stopPropagation();
      pushCalc('C');
    };

    useButton.classList.remove('block');
    useButton.style.marginTop='0';
    actions.append(clearButton,useButton);

    if(!document.getElementById('calcLayoutV3Styles')){
      const style=document.createElement('style');
      style.id='calcLayoutV3Styles';
      style.textContent='.calc-action-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}.calc-action-row .btn{width:100%;min-width:0;min-height:60px;margin:0!important;padding-left:10px;padding-right:10px}.calc-action-row #useCalc{font-size:clamp(16px,4.2vw,20px)}';
      document.head.appendChild(style);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
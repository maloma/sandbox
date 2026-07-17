(function(){
  const MAX=999999.99;

  function prettyExpr(value){
    return String(value||'').replace(/\*/g,'×').replace(/\//g,'÷').replace(/-/g,'−');
  }

  function currentToken(value){
    const parts=String(value||'').split(/[+\-*/()]/);
    return parts[parts.length-1]||'';
  }

  function tokenIsValid(token){
    if(token==='')return true;
    if(!/^\d{0,6}(?:\.\d{0,2})?$/.test(token))return false;
    const numeric=Number(token.endsWith('.')?token.slice(0,-1):token);
    return !Number.isFinite(numeric)||numeric<=MAX;
  }

  function installCalculatorFixes(){
    if(typeof expr==='undefined'||typeof $!=='function')return;

    evaluateCalc=function(){
      const expressionBox=$('calcExpression');
      const resultBox=$('calcResult');
      const useButton=$('useCalc');
      const pretty=prettyExpr(expr);
      expressionBox.textContent=pretty||'0';

      // A trailing decimal point is a valid editing state. Keep the visible number
      // instead of replacing it with a dash, but do not enable Use yet.
      if(/\.$/.test(expr)){
        const base=Number(expr.slice(0,-1));
        resultBox.textContent=Number.isFinite(base)?String(base):'—';
        calcValue=null;
        useButton.textContent='Введите копейки';
        useButton.disabled=true;
        return;
      }

      try{
        if(!expr||!/[0-9]$/.test(expr)||!/^[0-9+\-*/. ()]+$/.test(expr))throw new Error('incomplete');
        const value=Function('"use strict";return ('+expr+')')();
        if(!Number.isFinite(value))throw new Error('invalid');
        const rounded=Math.round(value*100)/100;
        if(Math.abs(rounded)>MAX){
          calcValue=null;
          resultBox.textContent='Лимит 999 999,99';
          useButton.textContent='Сумма выше лимита';
          useButton.disabled=true;
          return;
        }
        calcValue=rounded;
        const shown=String(Number(rounded.toFixed(2)));
        resultBox.textContent=shown;
        useButton.textContent='Использовать '+shown;
        useButton.disabled=false;
      }catch(error){
        calcValue=null;
        resultBox.textContent='—';
        useButton.textContent='Завершите расчёт';
        useButton.disabled=true;
      }
    };

    pushCalc=function(key){
      if(key==='C'){
        expr='';
        evaluateCalc();
        return;
      }
      if(key==='Backspace'){
        expr=expr.slice(0,-1);
        evaluateCalc();
        return;
      }

      const normalized=({'÷':'/','×':'*','−':'-'}[key]||key);
      const token=currentToken(expr);

      // A second decimal separator in the same number is simply ignored.
      if(normalized==='.'&&token.includes('.'))return;

      // Starting with a decimal separator means 0.x.
      const append=normalized==='.'&&token===''?'0.':normalized;
      const candidate=expr+append;
      if(candidate.length>48)return;
      if(!tokenIsValid(currentToken(candidate))){
        if(typeof toast==='function')toast('Максимальная сумма — 999 999,99 €');
        return;
      }
      expr=candidate;
      evaluateCalc();
    };
  }

  function installTouchProtection(){
    const style=document.createElement('style');
    style.id='m2TouchProtection';
    style.textContent='button,.btn,.calc-grid,[data-key]{touch-action:manipulation;-webkit-tap-highlight-color:transparent}.calc-grid button{user-select:none;-webkit-user-select:none}';
    document.head.appendChild(style);

    // Safari can still zoom on rapid taps in embedded browser views.
    let lastTouchEnd=0;
    document.addEventListener('touchend',function(event){
      if(!event.target.closest('#calcModal button'))return;
      const now=Date.now();
      if(now-lastTouchEnd<=300)event.preventDefault();
      lastTouchEnd=now;
    },{passive:false});
  }

  function clarifyDebtEditor(){
    const modal=$('editEventModal');
    if(!modal)return;
    const heading=modal.querySelector('h2');
    if(heading)heading.textContent='Комментарий к записи';
    const notice=modal.querySelector('.notice:not(.hidden), #editLockedNotice');
    if(notice)notice.textContent='Для долговой записи можно изменить только комментарий. Сумма, дата, контрагент и направление зафиксированы, чтобы не пересчитывать долговую цепочку.';
    const save=$('saveEventEdit');
    if(save)save.textContent='Сохранить комментарий';
  }

  function install(){
    installCalculatorFixes();
    installTouchProtection();
    clarifyDebtEditor();
    document.addEventListener('click',function(event){
      if(event.target.closest('[data-event-id]'))setTimeout(clarifyDebtEditor,0);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
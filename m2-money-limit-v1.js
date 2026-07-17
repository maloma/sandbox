(function(){
  const MAX=999999.99;
  const MESSAGE='Максимальная сумма — 999 999,99 €';
  const MONEY_IDS=new Set(['principal','extra','openingAmount','separateAmount','editAmount','editExtra']);
  const SAVE_IDS=new Set(['saveDebtAction','saveOpening','saveSeparate','saveEventEdit','useCalc']);
  let lastNoticeAt=0;

  window.FAMILYPILOT_MAX_MONEY_AMOUNT=MAX;

  function notify(){
    const now=Date.now();
    if(now-lastNoticeAt<700)return;
    lastNoticeAt=now;
    if(typeof toast==='function')toast(MESSAGE);
  }

  function parseValue(value){
    if(value===null||value===undefined||String(value).trim()==='')return null;
    const number=Number(String(value).replace(',','.'));
    return Number.isFinite(number)?number:null;
  }

  function isMoneyInput(input){
    return input instanceof HTMLInputElement&&input.type==='number'&&(MONEY_IDS.has(input.id)||input.inputMode==='decimal'||input.step==='0.01');
  }

  function bindInput(input){
    if(!isMoneyInput(input)||input.dataset.moneyLimitBound==='true')return;
    input.dataset.moneyLimitBound='true';
    input.max=String(MAX);
    if(!input.step||input.step==='any')input.step='0.01';
    const initial=parseValue(input.value);
    input.dataset.lastValidMoney=initial!==null&&initial<=MAX?input.value:'';

    input.addEventListener('focus',()=>{
      const value=parseValue(input.value);
      if(value!==null&&value<=MAX)input.dataset.lastValidMoney=input.value;
    });

    input.addEventListener('input',()=>{
      if(input.value===''){
        input.dataset.lastValidMoney='';
        return;
      }
      const value=parseValue(input.value);
      if(value===null)return;
      if(value>MAX){
        input.value=input.dataset.lastValidMoney||'';
        notify();
        return;
      }
      input.dataset.lastValidMoney=input.value;
    });

    input.addEventListener('change',()=>{
      const value=parseValue(input.value);
      if(value!==null&&value>MAX){
        input.value=input.dataset.lastValidMoney||'';
        notify();
      }
    });
  }

  function bindAllInputs(){
    document.querySelectorAll('input[type="number"]').forEach(bindInput);
  }

  function firstInvalidMoneyInput(){
    return [...document.querySelectorAll('input[type="number"]')].find(input=>isMoneyInput(input)&&parseValue(input.value)>MAX)||null;
  }

  function formatCalcValue(value){
    return String(Number(Number(value).toFixed(2)));
  }

  function currentNumberPart(candidate){
    const parts=String(candidate).split(/[+\-*/()]/);
    return parts[parts.length-1]||'';
  }

  function canAppendToCalculator(candidate,key){
    if(!/^[0-9.]$/.test(key))return true;
    const part=currentNumberPart(candidate);
    if(part==='.'||part==='')return true;
    const pieces=part.split('.');
    if(pieces.length>2)return false;
    if((pieces[0]||'').replace(/^0+(?=\d)/,'').length>6)return false;
    if(pieces[1]&&pieces[1].length>2)return false;
    const value=Number(part);
    return !Number.isFinite(value)||value<=MAX;
  }

  function installCalculatorLimit(){
    if(typeof evaluateCalc!=='function'||typeof pushCalc!=='function')return;

    evaluateCalc=function(){
      const pretty=expr.replace(/\*/g,'×').replace(/\//g,'÷').replace(/-/g,'−');
      $('calcExpression').textContent=pretty||'0';
      try{
        if(!expr||!/[0-9]$/.test(expr)||!/^[0-9+\-*/. ()]+$/.test(expr))throw new Error('incomplete');
        const value=Function('"use strict";return ('+expr+')')();
        if(!Number.isFinite(value))throw new Error('invalid');
        const rounded=Math.round(value*100)/100;
        if(Math.abs(rounded)>MAX){
          calcValue=null;
          $('calcResult').textContent='Лимит 999 999,99';
          $('useCalc').textContent='Сумма выше лимита';
          $('useCalc').disabled=true;
          return;
        }
        calcValue=rounded;
        const shown=formatCalcValue(calcValue);
        $('calcResult').textContent=shown;
        $('useCalc').textContent='Использовать '+shown;
        $('useCalc').disabled=false;
      }catch(error){
        calcValue=null;
        $('calcResult').textContent='—';
        $('useCalc').textContent='Завершите расчёт';
        $('useCalc').disabled=true;
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
      const candidate=expr+normalized;
      if(candidate.length>48){
        notify();
        return;
      }
      if(!canAppendToCalculator(candidate,normalized)){
        notify();
        return;
      }
      expr=candidate;
      evaluateCalc();
    };

    const expression=document.getElementById('calcExpression');
    const result=document.getElementById('calcResult');
    if(expression){expression.style.overflow='hidden';expression.style.textOverflow='ellipsis';expression.style.whiteSpace='nowrap'}
    if(result){result.style.fontSize='clamp(34px,10vw,64px)';result.style.overflow='hidden';result.style.textOverflow='ellipsis';result.style.whiteSpace='nowrap'}
  }

  function install(){
    bindAllInputs();
    installCalculatorLimit();

    const observer=new MutationObserver(bindAllInputs);
    observer.observe(document.body,{childList:true,subtree:true});

    document.addEventListener('click',event=>{
      const button=event.target.closest('button');
      if(!button||!SAVE_IDS.has(button.id))return;
      const invalid=firstInvalidMoneyInput();
      if(!invalid)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      invalid.focus();
      notify();
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();

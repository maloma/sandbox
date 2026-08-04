(()=>{
  'use strict';
  const COMMENT_MAX=1000,EXPR_MAX=80,RECEIPT_MAX=750000,WORKSPACE_KEY='familypilot.operations.workspace.v1';
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const byId=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const localDate=value=>{const d=new Date(value),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`};

  function calculate(raw){
    const text=String(raw||'').trim();
    if(!text)return {empty:true};
    if(text.length>EXPR_MAX)return {error:`Не более ${EXPR_MAX} символов.`};
    if(!/^[0-9.,+\-*/()\s]+$/.test(text))return {error:'Допустимы числа, +, −, ×, ÷ и скобки.'};
    const tokens=text.replace(/,/g,'.').replace(/\s+/g,'').match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/]/g);
    if(!tokens||tokens.join('')!==text.replace(/,/g,'.').replace(/\s+/g,''))return {error:'Некорректное выражение.'};
    let index=0;
    const primary=()=>{const token=tokens[index++];if(token==='('){const value=sum();if(tokens[index++]!==')')throw Error('Скобки не сбалансированы.');return value}if(token==='+'||token==='-')return (token==='-'?-1:1)*primary();const value=Number(token);if(!Number.isFinite(value))throw Error('Ожидается число.');return value};
    const product=()=>{let value=primary();while(tokens[index]==='*'||tokens[index]==='/'){const op=tokens[index++],right=primary();if(op==='/'&&right===0)throw Error('Деление на ноль невозможно.');value=op==='*'?value*right:value/right}return value};
    const sum=()=>{let value=product();while(tokens[index]==='+'||tokens[index]==='-'){const op=tokens[index++],right=product();value=op==='+'?value+right:value-right}return value};
    try{const value=sum();if(index!==tokens.length||!Number.isFinite(value))return {error:'Некорректное выражение.'};return {value:Math.round(value*100)/100}}catch(error){return {error:error.message||'Некорректное выражение.'}}
  }

  async function boot(){
    let runtime;
    for(let attempt=0;attempt<1200;attempt+=1){runtime=window.__FP_RUNTIME__;if(runtime?.state&&runtime?.save&&runtime?.renderAll)break;await wait(25)}
    if(!runtime){window.__FP_79_REMEDIATION_ERROR__='FamilyPilot runtime unavailable';return}
    const state=runtime.state;
    state.config=state.config||{};
    if(state.config.allowFutureActualOperations!==true)state.config.allowFutureActualOperations=false;
    for(const operation of state.operations||[])operation.note=String(operation.note||'').slice(0,COMMENT_MAX);
    runtime.save();

    function injectStyle(){
      if(byId('familypilot79-style'))return;
      const style=document.createElement('style');style.id='familypilot79-style';style.textContent=`
        .fp79-calculation{display:block;min-height:18px;color:var(--muted);font-size:12px;margin-top:5px}.fp79-calculation.error{color:var(--red)}
        .fp79-receipt{display:grid;gap:7px;margin:12px 0;padding:10px;border:1px solid var(--line);border-radius:12px;background:var(--card2)}.fp79-receipt small{color:var(--muted);font-size:12px}
        .fp79-capital-grid{display:grid;gap:7px;margin-top:12px}.fp79-capital-grid div{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line);padding-bottom:7px}.fp79-capital-grid span{color:var(--muted)}
        .plan-module-copy strong,.plan-module-copy small,.plan-module-state{overflow-wrap:anywhere}.plan-module{align-items:start}.plan-module-state{white-space:normal;text-align:right;max-width:82px;line-height:1.2}
        @media(min-width:900px){.meta-note,.settings-subtitle,.plan-module-copy small{font-size:13px!important}.op-meta,.op-note{font-size:13px!important}}@media(max-width:480px){.meta-note,.settings-subtitle,.plan-module-copy small{font-size:12px!important}}
      `;document.head.appendChild(style);
    }
    function ensureSettings(){
      const trash=byId('trashFlagBtn'),parent=trash?.closest('.config-row');if(!parent||byId('futureActualOperationsBtn'))return;
      const row=document.createElement('div');row.className='config-row';row.innerHTML='<div><label>Будущие фактические операции</label><small>По умолчанию запрещены, чтобы фактический баланс оставался консервативным.</small></div><button id="futureActualOperationsBtn" class="switch" type="button" aria-label="Разрешить будущие фактические операции"></button>';
      parent.after(row);const button=byId('futureActualOperationsBtn');button.onclick=()=>{state.config.allowFutureActualOperations=!state.config.allowFutureActualOperations;runtime.save();syncSettings()};
    }
    function syncSettings(){const button=byId('futureActualOperationsBtn');if(button){button.classList.toggle('on',state.config.allowFutureActualOperations===true);button.setAttribute('aria-pressed',String(state.config.allowFutureActualOperations===true))}}
    function amountInput(){return byId('amountInput')}
    function installCalculator(){
      const original=amountInput();if(!original||original.dataset.fp79Calculator)return;
      const input=original.cloneNode(true);input.dataset.fp79Calculator='true';input.type='text';input.maxLength=EXPR_MAX;input.autocomplete='off';input.setAttribute('aria-describedby','amountCalculation');original.replaceWith(input);
      const note=byId('amountCalculation')||document.createElement('small');note.id='amountCalculation';note.className='fp79-calculation';if(!note.parentNode)input.after(note);
      const refresh=()=>{const result=calculate(input.value);note.classList.toggle('error',!!result.error);note.textContent=result.error|| (result.empty?'Максимум одной операции: 999 999,99 €':`Будет сохранено: ${result.value.toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2})} €`);return result};
      input.addEventListener('input',()=>{if(input.value.length>EXPR_MAX)input.value=input.value.slice(0,EXPR_MAX);refresh()});input.addEventListener('blur',refresh);refresh();
    }
    function installCommentLimit(){const note=byId('noteInput');if(!note||note.dataset.fp79Bounded)return;note.dataset.fp79Bounded='true';note.maxLength=COMMENT_MAX;note.addEventListener('input',()=>{if(note.value.length>COMMENT_MAX)note.value=note.value.slice(0,COMMENT_MAX)})}
    function validationError(message=''){const target=byId('entryError');if(target)target.textContent=message}
    function futureError(){const input=byId('dateInput'),date=new Date(input?.value||'').getTime();return !Number.isFinite(date)?'Выберите корректную дату операции.':(!state.config.allowFutureActualOperations&&date>Date.now()?'Будущая дата операции запрещена.':'')}
    function installSave(){const button=byId('saveOperationBtn');if(!button||button.dataset.fp79Save)return;button.dataset.fp79Save='true';button.onclick=()=>{
      const amountResult=calculate(amountInput()?.value);if(amountResult.empty||amountResult.error||amountResult.value<=0||amountResult.value>999999.99){validationError(amountResult.error||'Сумма должна быть от 0,01 € до 999 999,99 €.');return}
      const dateError=futureError();if(dateError){validationError(dateError);return}
      const id=byId('editingId')?.value||'',existing=(state.operations||[]).find(item=>item.id===id),categoryId=byId('categoryInput')?.value||'',category=(state.categories||[]).find(item=>item.id===categoryId),occurredAt=new Date(byId('dateInput')?.value||'').getTime(),time=Date.now(),note=String(byId('noteInput')?.value||'').trim().slice(0,COMMENT_MAX),kind=existing?.kind||category?.kind||'expense',walletId=existing?.walletId||state.activeWalletId;
      if(existing){const changes=[];for(const [field,value] of Object.entries({amount:amountResult.value,occurredAt,categoryId,walletId,note,kind}))if(String(existing[field]??'')!==String(value??''))changes.push({field,oldValue:existing[field],newValue:value});if(changes.length){existing.revisions=Array.isArray(existing.revisions)?existing.revisions:[];existing.revisions.push({id:uid('rev'),sequence:existing.revisions.length+1,changedByMemberId:state.currentMemberId,changedAt:time,source:'user',batchId:uid('batch'),changes});Object.assign(existing,{amount:amountResult.value,occurredAt,categoryId,walletId,note,kind,lastEditedByMemberId:state.currentMemberId,lastEditedAt:time})}}
      else (state.operations||[]).push({id:uid('op'),kind,amount:amountResult.value,categoryId,walletId,note,occurredAt,createdByMemberId:state.currentMemberId,createdAt:time,lastEditedByMemberId:state.currentMemberId,lastEditedAt:time,revisions:[],status:'active',deletedAt:null,deletedByMemberId:null,trashExpiresAt:null,receipt:null,links:{},transferGroupId:null});
      runtime.save();runtime.close('entryModal');runtime.renderAll();runtime.toast(existing?'Операция обновлена':'Операция сохранена');
    };
      const date=byId('dateInput');date?.addEventListener('input',()=>{if(!futureError()&&byId('entryError')?.textContent.includes('Будущая дата'))validationError('')});
    }
    function installFocus(){const modal=byId('entryModal');if(!modal||modal.dataset.fp79Focus)return;modal.dataset.fp79Focus='true';new MutationObserver(()=>{if(modal.classList.contains('open'))requestAnimationFrame(()=>amountInput()?.focus({preventScroll:true}))}).observe(modal,{attributes:true,attributeFilter:['class']})}
    function installDemoReset(){const button=byId('resetBtn');if(!button||button.dataset.fp79Reset)return;button.dataset.fp79Reset='true';const base=button.onclick;button.onclick=()=>{let accepted=false,nativeConfirm=window.confirm;window.confirm=message=>{accepted=nativeConfirm(message);return accepted};try{base?.()}finally{window.confirm=nativeConfirm}if(accepted){state.household=state.household||{};state.household.openingCapital=0;runtime.save();runtime.renderAll();runtime.toast('Демоданные восстановлены без неучтённого начального капитала')}}}

    let detailId='';
    function installReceipts(){
      if(byId('fp79ReceiptFile'))return;
      const input=document.createElement('input');input.id='fp79ReceiptFile';input.type='file';input.accept='image/*,application/pdf';input.hidden=true;document.body.appendChild(input);
      input.addEventListener('change',()=>{const file=input.files?.[0],operation=(state.operations||[]).find(item=>item.id===detailId);if(!file||!operation)return;if(file.size>RECEIPT_MAX){runtime.toast('Файл чека больше 750 КБ.');input.value='';return}const reader=new FileReader();reader.onload=()=>{operation.receipt={name:String(file.name).slice(0,120),type:file.type||'application/octet-stream',data:String(reader.result||''),addedAt:Date.now()};runtime.save();runtime.renderAll();runtime.toast('Чек сохранён в этом браузере')};reader.readAsDataURL(file);input.value=''});
      new MutationObserver(syncReceipt).observe(byId('operationDetail'),{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
    }
    function syncReceipt(){const modal=byId('operationDetail');if(!modal?.classList.contains('open')||!detailId)return;const actions=modal.querySelector('.detail-actions');if(!actions||actions.querySelector('[data-fp79-receipt]'))return;const operation=(state.operations||[]).find(item=>item.id===detailId),block=document.createElement('div');block.className='fp79-receipt';block.innerHTML=`<strong>${operation?.receipt?'Чек прикреплён':'Добавить чек'}</strong><small>${operation?.receipt?esc(operation.receipt.name):'Фото или PDF до 750 КБ сохраняется только в этом браузере.'}</small><button type="button" class="btn secondary" data-fp79-receipt>${operation?.receipt?'Заменить чек':'Прикрепить чек'}</button>`;actions.before(block)}

    function installNavigation(){
      document.addEventListener('click',event=>{
        const row=event.target.closest?.('[data-op-id]');if(row)detailId=row.dataset.opId||detailId;
        const receipt=event.target.closest?.('[data-fp79-receipt]');if(receipt){event.preventDefault();event.stopImmediatePropagation();byId('fp79ReceiptFile')?.click();return}
        const nav=event.target.closest?.('nav [data-screen="operations"]');if(nav){event.preventDefault();event.stopImmediatePropagation();runtime.showScreen('operations');runtime.renderAll();return}
        const debtBack=event.target.closest?.('[data-debt-back]');if(debtBack){event.preventDefault();event.stopImmediatePropagation();runtime.showScreen(sessionStorage.getItem('familypilot79.previousScreen')||'plans');runtime.renderAll();return}
        const screen=event.target.closest?.('[data-screen]')?.dataset.screen;if(screen&&screen!=='debts')sessionStorage.setItem('familypilot79.previousScreen',screen);
        if(event.target.closest?.('[data-plan-module="debts"],[data-debt-filter]'))sessionStorage.setItem('familypilot79.previousScreen',document.querySelector('.screen.active')?.id?.replace('Screen','')||'plans');
      },true);
    }
    function capitalBreakdown(){
      const snapshot=runtime.scopeApi.capitalSnapshot(state),content=byId('capitalInfoContent');if(!content||!content.parentElement?.classList.contains('open'))return;const debt=(state.debtChains||[]).filter(item=>item.status==='active'),receivable=debt.reduce((sum,item)=>sum+Math.max(0,Number(item.currentBalance)||0),0),liability=debt.reduce((sum,item)=>sum+Math.max(0,-Number(item.currentBalance)||0),0),currency=snapshot.currency||'EUR',money=value=>runtime.money(value,currency);if(content.querySelector('.fp79-capital-grid'))return;const block=document.createElement('div');block.className='fp79-capital-grid';block.innerHTML=`<div><span>Ликвидные операционные средства</span><strong>${money(snapshot.operationalFunds??snapshot.liquidCapital??snapshot.capital)}</strong></div><div><span>Мне должны</span><strong>+${money(receivable)}</strong></div><div><span>Я должен</span><strong>−${money(liability)}</strong></div><div><span>Чистый семейный капитал</span><strong>${money(snapshot.netFamilyCapital??snapshot.capital)}</strong></div><small>Все суммы — за всё время. Накопления и цели не являются отдельными деньгами; кредитная и ипотечная модель здесь не создаётся.</small>`;content.appendChild(block);
    }
    function sync(){injectStyle();ensureSettings();syncSettings();installCalculator();installCommentLimit();installSave();installFocus();installDemoReset();installReceipts();capitalBreakdown()}
    installNavigation();sync();setInterval(sync,500);
    if(new URLSearchParams(location.search).has('test')){window.__FP_TEST__=window.__FP_TEST__||{};window.__FP_TEST__.founder79={calculate,commentLimit:COMMENT_MAX,expressionLimit:EXPR_MAX,allowFuture:value=>{state.config.allowFutureActualOperations=!!value;runtime.save();syncSettings()},receipt:(id,value)=>{const operation=(state.operations||[]).find(item=>item.id===id);if(!operation)return false;operation.receipt={name:String(value?.name||'receipt.txt').slice(0,120),type:String(value?.type||'text/plain'),data:String(value?.data||''),addedAt:Date.now()};runtime.save();return true},workspaceKey:WORKSPACE_KEY};}
    window.__FP_79_REMEDIATION_READY__=true;
  }
  boot();
})();

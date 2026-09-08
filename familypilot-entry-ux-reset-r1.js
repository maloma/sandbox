(function(root,factory){
'use strict';
const api=factory(root);
if(typeof module==='object'&&module.exports)module.exports=api;
if(root&&root.document){
  root.FamilyPilotEntryUxResetR1=api;
  api.install();
}
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';

const RESET_ID='FP86_ENTRY_UX_RESET_R1';
const $=id=>root?.document?.getElementById(id)||null;
const OPS=Object.freeze({'+':'+','−':'-','-':'-','×':'*','*':'*','÷':'/','/':'/'});
const KEYPAD=Object.freeze([
  Object.freeze(['7','8','9','+']),
  Object.freeze(['4','5','6','−']),
  Object.freeze(['1','2','3','×']),
  Object.freeze(['.','0','⌫','÷'])
]);
const KEY_LABELS=Object.freeze({
  '0':'Ноль','1':'Один','2':'Два','3':'Три','4':'Четыре',
  '5':'Пять','6':'Шесть','7':'Семь','8':'Восемь','9':'Девять',
  '.':'Десятичная точка','+':'Плюс','−':'Минус','×':'Умножить','÷':'Разделить','⌫':'Удалить последний символ'
});
const HP='familypilot.hints.enabled.v1';

let entryBaseline=null;
let allowDiscardOnce=false;
let amountState={expression:'',preloaded:false};
let entryWasOpen=false;

const pref=(k,d=true)=>{
  try{
    const v=root.localStorage?.getItem(k);
    return v===null?d:v!=='false';
  }catch{return d}
};
const setPref=(k,v)=>{
  try{root.localStorage?.setItem(k,v?'true':'false')}catch{}
};
const input=n=>n.dispatchEvent(new Event('input',{bubbles:true}));

function calc(raw){
  const t=String(raw||'').trim();
  if(!t)return{empty:true};
  const c=t.replace(/\s+/gu,'').replace(/,/g,'.').replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');
  if(!/^[0-9.+\-*/()]+$/u.test(c))return{error:'invalid'};
  const z=c.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/]/g);
  if(!z||z.join('')!==c)return{error:'invalid'};
  let i=0;
  const a=()=>{
    const x=z[i++];
    if(x==='('){
      const v=s();
      if(z[i++]!==')')throw 0;
      return v;
    }
    if(x==='+'||x==='-')return(x==='-'?-1:1)*a();
    const v=Number(x);
    if(!Number.isFinite(v))throw 0;
    return v;
  };
  const m=()=>{
    let v=a();
    while(z[i]==='*'||z[i]==='/'){
      const o=z[i++],r=a();
      if(o==='/'&&r===0)throw 0;
      v=o==='*'?v*r:v/r;
    }
    return v;
  };
  const s=()=>{
    let v=m();
    while(z[i]==='+'||z[i]==='-'){
      const o=z[i++],r=m();
      v=o==='+'?v+r:v-r;
    }
    return v;
  };
  try{
    const v=s();
    return i===z.length&&Number.isFinite(v)?{value:Math.round(v*100)/100}:{error:'invalid'};
  }catch{return{error:'invalid'}}
}

function amountResult(){
  const a=$('amountInput'),n=$('amountCalculation'),e=$('fpAmountExpression');
  if(!a||!n)return;
  const r=keypadResult(a.value);
  const frac=!r.error&&r.displayValue!==null&&Math.abs(r.displayValue-Math.round(r.displayValue))>1e-9;
  const text=r.empty
    ? '0 €'
    : r.displayValue===null
      ? '—'
      : new Intl.NumberFormat('ru-RU',{minimumFractionDigits:frac?2:0,maximumFractionDigits:2}).format(r.displayValue)+' €';
  n.textContent=text;
  n.className='fp-amount-result';
  Object.assign(n.style,{
    display:'block',
    marginTop:'8px',
    fontWeight:'950',
    lineHeight:'1.05',
    textAlign:'right',
    color:r.error?'var(--red)':'var(--ink)',
    fontSize:text.replace(/\s/gu,'').length<=8?'32px':text.replace(/\s/gu,'').length<=11?'28px':text.replace(/\s/gu,'').length<=15?'24px':'20px'
  });
  if(e){
    e.textContent=displayExpression(a.value)||'0';
    e.setAttribute('aria-label',`Текущее выражение: ${e.textContent}`);
  }
}

function displayExpression(value){
  return canonicalExpression(value)
    .replace(/-/g,'−')
    .replace(/\*/g,'×')
    .replace(/\//g,'÷')
    .replace(/\./g,',');
}

function canonicalExpression(value){
  return sanitizeExpressionValue(value).replace(/,/g,'.');
}

function reduceKeypadState(state,key){
  const current={
    expression:canonicalExpression(state?.expression),
    preloaded:!!state?.preloaded
  };
  const normalized=OPS[key]||key;
  if(key==='⌫'){
    return{expression:current.expression.slice(0,-1),preloaded:false};
  }
  if(/^[0-9]$/u.test(key)){
    return{expression:canonicalExpression((current.preloaded?'':current.expression)+key),preloaded:false};
  }
  if(key==='.'){
    let expression=current.preloaded?'':current.expression;
    const operand=expression.match(/[^+\-*/]*$/u)?.[0]||'';
    if(operand.includes('.'))return{expression,preloaded:false};
    if(!operand)expression+='0';
    return{expression:canonicalExpression(expression+'.'),preloaded:false};
  }
  if(Object.values(OPS).includes(normalized)){
    if(!current.expression)return current;
    const expression=/[+\-*/]$/u.test(current.expression)
      ? current.expression.slice(0,-1)+normalized
      : current.expression+normalized;
    return{expression,preloaded:false};
  }
  return current;
}

function keypadResult(value){
  const expression=canonicalExpression(value);
  if(!expression)return{empty:true,displayValue:0,validForSave:false};
  const complete=calc(expression);
  if(!complete.error&&!complete.empty){
    return{value:complete.value,displayValue:complete.value,validForSave:true};
  }
  if(/[+\-*/]$/u.test(expression)){
    const prior=calc(expression.slice(0,-1));
    if(!prior.error&&!prior.empty){
      return{incomplete:true,displayValue:prior.value,validForSave:false};
    }
  }
  return{error:'invalid',displayValue:null,validForSave:false};
}

function setAmountExpression(state){
  const a=$('amountInput');
  amountState={expression:canonicalExpression(state?.expression),preloaded:!!state?.preloaded};
  if(!a)return false;
  a.value=amountState.expression;
  input(a);
  amountResult();
  syncSaveState();
  return true;
}

function pressAmountKey(key){
  if(!KEYPAD.flat().includes(key))return false;
  return setAmountExpression(reduceKeypadState(amountState,key));
}

function insert(o){
  const label=Object.entries(OPS).find(([visible,normalized])=>visible.length===1&&normalized===OPS[o]&&KEYPAD.flat().includes(visible))?.[0]||o;
  return pressAmountKey(label);
}

function restoreSnapshot(value){
  if(!value)return false;
  const editing=$('editingId'),amount=$('amountInput'),category=$('categoryInput'),date=$('dateInput'),note=$('noteInput');
  if(!editing||!amount||!category||!date||!note)return false;
  editing.value=value.editing;
  amount.value=value.amount;
  category.value=value.category;
  date.value=value.date;
  note.value=value.note;
  amountState={expression:canonicalExpression(value.amount),preloaded:false};
  amount.value=amountState.expression;
  input(amount);
  category.dispatchEvent(new Event('change',{bubbles:true}));
  input(date);
  input(note);
  amountResult();
  syncSaveState();
  return true;
}

function style(){
  if($('fpEntryUxResetR1Style'))return;
  const s=root.document.createElement('style');
  s.id='fpEntryUxResetR1Style';
  s.textContent=`
#saveOperationBtn[aria-disabled="true"]{opacity:.62}
.fp-hints-hidden .meta-note,.fp-hints-hidden .field-help,.fp-hints-hidden .settings-subtitle,.fp-hints-hidden .manager-help,.fp-hints-hidden .obligation-help{display:none!important}
.fp-unsaved-inline{margin:12px 0 2px;padding:13px;border:1px solid color-mix(in srgb,var(--blue) 42%,var(--line));border-radius:16px;background:color-mix(in srgb,var(--blue) 8%,var(--card));box-shadow:var(--shadow)}
.fp-unsaved-inline[hidden]{display:none!important}
.fp-unsaved-inline strong{display:block;font-size:17px}
.fp-unsaved-inline p{margin:5px 0 11px;color:var(--muted);font-size:12px}
.fp-unsaved-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#amountLimitHint{display:block;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fp-amount-keypad{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px}
.fp-amount-key{min-height:48px;padding:9px 4px;font-size:20px;font-weight:900}
.fp-amount-key[data-amount-kind="operator"]{color:var(--blue)}
.fp-amount-expression{display:block;min-height:20px;margin-top:6px;color:var(--muted);font-size:13px;font-weight:800;text-align:right;overflow-wrap:anywhere}
.fp-amount-storage[hidden]{display:none!important}
#fpCloudAccount.fp-cloud-settings-card{max-width:none!important;margin:10px 0!important;padding:14px!important;border-color:var(--line)!important;border-radius:20px!important;background:var(--card)!important;color:var(--ink)!important}
#fpCloudAccount.fp-cloud-settings-card #fpCloudStatus{color:var(--muted)!important}
`;
  root.document.head.appendChild(s);
}

function sanitizeExpressionValue(value){
  return String(value||'')
    .replace(/\s+/gu,'')
    .replace(/[−]/g,'-')
    .replace(/[×]/g,'*')
    .replace(/[÷]/g,'/')
    .replace(/[^0-9.,+\-*/()]/gu,'')
    .slice(0,80);
}

function expressionInput(event){
  const a=event?.target;
  if(!a)return;
  a.value=canonicalExpression(a.value);
}

function arithmetic(a){
  if($('amountKeypad'))return;
  a.oninput=expressionInput;
  const field=a.closest?.('.field');
  const n=$('amountCalculation');
  if(!field||!n)return;
  const expression=root.document.createElement('output');
  const keypad=root.document.createElement('div');
  const amountLabel=field.querySelector?.('label[for="amountInput"]');
  if(amountLabel&&!amountLabel.id)amountLabel.id='amountKeypadLabel';
  n.setAttribute('role','status');
  n.setAttribute('aria-live','polite');
  expression.id='fpAmountExpression';
  expression.className='fp-amount-expression';
  expression.setAttribute('aria-live','polite');
  expression.setAttribute('aria-label','Текущее выражение: 0');
  keypad.id='amountKeypad';
  keypad.className='fp-amount-keypad';
  keypad.setAttribute('role','group');
  if(amountLabel)keypad.setAttribute('aria-labelledby',amountLabel.id);
  else keypad.setAttribute('aria-label','Калькулятор суммы');
  for(const key of KEYPAD.flat()){
    const b=root.document.createElement('button');
    b.type='button';
    b.className='btn secondary fp-amount-key';
    b.textContent=key;
    b.dataset.amountKey=key;
    b.dataset.amountKind=OPS[key]?'operator':key==='⌫'?'backspace':key==='.'?'decimal':'digit';
    b.setAttribute('aria-label',KEY_LABELS[key]);
    b.addEventListener('click',()=>pressAmountKey(key));
    keypad.appendChild(b);
  }
  field.insertBefore(n,a);
  field.insertBefore(expression,a);
  field.insertBefore(keypad,a);
  a.readOnly=true;
  a.tabIndex=-1;
  a.hidden=true;
  a.classList.add('fp-amount-storage');
  a.setAttribute('inputmode','none');
  a.setAttribute('aria-hidden','true');
  a.setAttribute('aria-describedby','amountCalculation fpAmountExpression amountLimitHint');
  a.addEventListener('input',()=>{
    amountResult();
    syncSaveState();
  });
  a.addEventListener('blur',amountResult);
  amountResult();
}

function compactMaximumHint(){
  const amount=$('amountInput');
  const field=amount?.closest?.('.field');
  if(!field)return null;
  const notes=[...field.querySelectorAll?.('.meta-note')||[]];
  let hint=notes.find(node=>/Максимум(?: одной операции)?:/u.test(String(node.textContent||'')));
  if(!hint){
    hint=root.document.createElement('small');
    hint.className='meta-note';
    field.appendChild(hint);
  }
  hint.id='amountLimitHint';
  hint.textContent='Максимум 999 999,99.';
  return hint;
}

const sw=(b,on)=>{
  if(!b)return;
  b.classList.toggle('on',on);
  b.setAttribute('aria-pressed',String(on));
};

function prefs(){
  const h=pref(HP);
  root.document.body?.classList.toggle('fp-hints-hidden',!h);
  sw($('fpHintsEnabledBtn'),h);
}

function row(id,label,small){
  const r=root.document.createElement('div');
  const c=root.document.createElement('div');
  const l=root.document.createElement('label');
  const s=root.document.createElement('small');
  const b=root.document.createElement('button');
  r.className='config-row';
  l.textContent=label;
  s.textContent=small;
  c.append(l,s);
  b.id=id;
  b.type='button';
  b.className='switch';
  b.setAttribute('aria-label',label);
  r.append(c,b);
  return[r,b];
}

function settings(){
  if($('fpHintsEnabledBtn'))return prefs();
  const g=root.document.querySelector('#moreScreen .settings-group');
  if(!g)return;
  const[h,hb]=row('fpHintsEnabledBtn','Подсказки','Показывать поясняющий текст для освоения приложения.');
  const before=g.querySelector('.settings-wide-action');
  g.insertBefore(h,before||null);
  hb.addEventListener('click',()=>{
    setPref(HP,!pref(HP));
    prefs();
  });
  prefs();
}

function placeCloudAccount(){
  const cloud=$('fpCloudAccount');
  const more=$('moreScreen');
  if(!cloud||!more)return false;
  if(cloud.parentNode===more)return true;
  cloud.classList.add('fp-cloud-settings-card','card','section');
  cloud.removeAttribute?.('style');
  const settingsGroup=more.querySelector?.('.settings-group');
  if(settingsGroup?.nextSibling){
    more.insertBefore(cloud,settingsGroup.nextSibling);
  }else{
    more.appendChild(cloud);
  }
  return true;
}

function snapshot(){
  return{
    editing:String($('editingId')?.value||''),
    amount:String($('amountInput')?.value||''),
    category:String($('categoryInput')?.value||''),
    date:String($('dateInput')?.value||''),
    note:String($('noteInput')?.value||'')
  };
}

const sameSnapshot=(a,b)=>!!a&&!!b&&
  a.editing===b.editing&&
  a.amount===b.amount&&
  a.category===b.category&&
  a.date===b.date&&
  a.note===b.note;

function dirty(){
  return!!entryBaseline&&!sameSnapshot(entryBaseline,snapshot());
}

function ensureBlankCategory(){
  const s=$('categoryInput');
  if(!s)return;
  let o=[...s.options].find(x=>String(x.value||'')==='');
  if(!o){
    o=root.document.createElement('option');
    o.value='';
    o.textContent='Выберите категорию';
    o.disabled=true;
    s.insertBefore(o,s.firstChild||null);
  }
  if(!$('editingId')?.value){
    s.value='';
    for(const chip of root.document.querySelectorAll?.('#quickCategories [data-quick-category].active')||[]){
      chip.classList.remove('active');
    }
  }
}

function minimum(){
  const a=calc($('amountInput')?.value);
  const g=String($('categoryInput')?.value||'');
  if(a.empty||a.error||!Number.isFinite(a.value)||a.value<0.01||a.value>999999.99){
    return{ok:false,field:'amount'};
  }
  if(!g)return{ok:false,field:'category'};
  return{ok:true};
}

function syncSaveState(){
  const b=$('saveOperationBtn');
  if(!b)return;
  const v=minimum();
  b.setAttribute('aria-disabled',String(!v.ok));
  b.dataset.minimumComplete=v.ok?'true':'false';
}

function guardSave(event){
  const v=minimum();
  if(v.ok)return true;
  event?.preventDefault?.();
  event?.stopImmediatePropagation?.();
  const e=$('entryError'),ce=$('categoryError');
  if(v.field==='category'){
    if(ce)ce.textContent='Выберите категорию.';
    if(e)e.textContent='';
  }else if(e){
    e.textContent='Введите корректную сумму.';
  }
  syncSaveState();
  return false;
}

function confirmPanel(){
  let w=$('fpUnsavedConfirm');
  if(w)return w;
  const m=$('entryModal');
  const sheet=m?.querySelector?.('.entry-sheet')||m?.querySelector?.('.sheet');
  if(!sheet)return null;

  w=root.document.createElement('div');
  w.id='fpUnsavedConfirm';
  w.className='fp-unsaved-inline';
  w.hidden=true;

  const title=root.document.createElement('strong');
  const copy=root.document.createElement('p');
  const actions=root.document.createElement('div');
  const no=root.document.createElement('button');
  const yes=root.document.createElement('button');

  title.textContent='Сохранить?';
  copy.textContent='В форме есть несохранённые изменения.';
  actions.className='fp-unsaved-actions';

  no.type='button';
  no.id='fpDiscardEntryBtn';
  no.className='btn secondary';
  no.textContent='Не сохранять';

  yes.type='button';
  yes.id='fpSaveEntryFromCloseBtn';
  yes.className='btn primary';
  yes.textContent='Сохранить';

  actions.append(no,yes);
  w.append(title,copy,actions);

  const head=sheet.querySelector?.('.entry-head');
  if(head?.nextSibling){
    sheet.insertBefore(w,head.nextSibling);
  }else{
    sheet.prepend(w);
  }

  no.addEventListener('click',()=>{
    w.hidden=true;
    allowDiscardOnce=true;
    root.document.querySelector?.('[data-close="entryModal"]')?.click();
  });

  yes.addEventListener('click',()=>{
    w.hidden=true;
    $('saveOperationBtn')?.click();
  });

  return w;
}

function hideConfirm(){
  const w=$('fpUnsavedConfirm');
  if(w)w.hidden=true;
}

function askSave(){
  const w=confirmPanel();
  if(!w)return false;
  w.hidden=false;
  const sheet=w.closest?.('.sheet');
  if(sheet)sheet.scrollTop=0;
  w.scrollIntoView?.({block:'nearest'});
  return true;
}

function entryOpen(){
  const amount=$('amountInput');
  const expression=$('editingId')?.value?canonicalExpression(amount?.value):'';
  amountState={expression,preloaded:!!expression};
  if(amount)amount.value=expression;
  ensureBlankCategory();
  entryBaseline=snapshot();
  hideConfirm();
  if($('entryError'))$('entryError').textContent='';
  if($('categoryError'))$('categoryError').textContent='';
  syncSaveState();
  scheduleEntryScrollReset();
}

function entryOpenTransition(wasOpen,isOpen){
  return Object.freeze({opened:!!isOpen&&!wasOpen,closed:!isOpen&&!!wasOpen});
}

function scheduleEntryScrollReset(){
  const m=$('entryModal');
  const sheet=m?.querySelector?.('.entry-sheet')||m?.querySelector?.('.sheet');
  if(!m||!sheet)return false;
  const frame=root.requestAnimationFrame?.bind(root)||((callback)=>root.setTimeout?.(callback,0));
  frame(()=>frame(()=>{
    if(m.classList.contains('open'))sheet.scrollTop=0;
  }));
  return true;
}

function nativeLayerCloser(layer){
  if(!layer?.id)return null;
  if(layer.id==='operationDatePickerModal')return layer.querySelector?.('[data-operation-date-close]')||null;
  return layer.querySelector?.(`[data-close="${layer.id}"]`)||null;
}

function dispatchNativeLayerClose(layer){
  const closer=nativeLayerCloser(layer);
  if(!closer||typeof closer.click!=='function')return false;
  try{closer.click();return true}catch{return false}
}

function handleNativeBack(){
  const layers=[...root.document.querySelectorAll?.('.overlay.open,.modal.open')||[]];
  const layer=layers.at(-1);
  if(layer){
    // The date picker is appended above the entry sheet, including its inline dirty guard.
    // Never fall through to a lower layer when the actual top layer has no close contract.
    return dispatchNativeLayerClose(layer);
  }
  const confirm=$('fpUnsavedConfirm');
  if(confirm&&!confirm.hidden){
    hideConfirm();
    return true;
  }
  const active=[...root.document.querySelectorAll?.('.screen.active')||[]].at(-1);
  if(active&&active.id!=='homeScreen'){
    const back=active.querySelector?.('.back,[data-back]');
    if(back){
      back.click();
      return true;
    }
    const home=root.document.querySelector?.('[data-screen="home"]');
    if(home){
      home.click();
      return true;
    }
  }
  return false;
}

function installNativeContract(){
  root.FamilyPilotNativeContract=Object.freeze({version:1,handleBack:handleNativeBack});
  root.addEventListener?.('familypilot:native-resume',()=>{
    root.document.documentElement?.getBoundingClientRect?.();
    root.requestAnimationFrame?.(()=>root.document.body?.getBoundingClientRect?.());
  });
}

function intercept(event){
  const t=event.target;
  const save=t?.closest?.('#saveOperationBtn');
  if(save){
    guardSave(event);
    return;
  }

  const m=$('entryModal');
  if(!m?.classList?.contains('open'))return;

  const close=t?.closest?.('[data-close="entryModal"]');
  const backdrop=t===m;
  if(!close&&!backdrop)return;

  if(allowDiscardOnce){
    allowDiscardOnce=false;
    return;
  }

  if(dirty()){
    event.preventDefault();
    event.stopImmediatePropagation();
    askSave();
  }
}

function entryLifecycle(){
  const m=$('entryModal');
  if(!m)return;
  confirmPanel();
  root.document.addEventListener('click',intercept,true);
  root.document.addEventListener('click',()=>root.setTimeout?.(syncSaveState,0));
  $('categoryInput')?.addEventListener('change',()=>{
    if($('categoryError'))$('categoryError').textContent='';
    syncSaveState();
  });
  const o=root.MutationObserver?new root.MutationObserver(()=>{
    const isOpen=m.classList.contains('open');
    const transition=entryOpenTransition(entryWasOpen,isOpen);
    entryWasOpen=isOpen;
    if(transition.opened){
      entryOpen();
    }else if(transition.closed){
      entryBaseline=null;
      hideConfirm();
    }
  }):null;
  o?.observe(m,{attributes:true,attributeFilter:['class']});
  entryWasOpen=m.classList.contains('open');
}

function openSync(){
  const m=$('entryModal');
  if(!m||!root.MutationObserver||root.__FP_AMOUNT_RESULT_OBSERVER__)return;
  const o=new root.MutationObserver(()=>{
    if(m.classList.contains('open'))root.setTimeout?.(amountResult,0);
  });
  o.observe(m,{attributes:true,attributeFilter:['class']});
  root.__FP_AMOUNT_RESULT_OBSERVER__=o;
}

function install(){
  if(!root?.document||root.__FP_ENTRY_UX_RESET_R1_READY__)return false;
  const a=$('amountInput'),n=$('noteInput'),sheet=a?.closest('.sheet');
  if(!a||!n||!sheet)return false;

  style();
  arithmetic(a);
  compactMaximumHint();
  placeCloudAccount();
  openSync();
  settings();
  entryLifecycle();
  installNativeContract();
  prefs();

  root.__FP_ENTRY_UX_RESET_R1_READY__=true;
  root.__FP_ENTRY_UX_RESET_ID__=RESET_ID;
  return true;
}

return Object.freeze({
  version:1,
  architecture:RESET_ID,
  keypadLayout:KEYPAD,
  calculateExpression:calc,
  displayAmountExpression:displayExpression,
  keypadExpressionResult:keypadResult,
  reduceKeypadState,
  updateAmountResult:amountResult,
  pressAmountKey,
  insertAmountToken:insert,
  restoreEntrySnapshot:restoreSnapshot,
  entrySnapshot:snapshot,
  sameEntrySnapshot:sameSnapshot,
  isEntryDirty:dirty,
  minimumEntryValidity:minimum,
  sanitizeAmountExpressionValue:sanitizeExpressionValue,
  prepareEntryForOpen:entryOpen,
  entryOpenTransition,
  resetEntryScrollForOpen:scheduleEntryScrollReset,
  handleNativeBack,
  compactMaximumHint,
  placeCloudAccount,
  install
});
});

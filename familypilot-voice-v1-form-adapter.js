(function(root,factory){
'use strict';
const api=factory(root);
if(typeof module==='object'&&module.exports)module.exports=api;
if(root&&root.document)root.FamilyPilotVoiceV1FormAdapter=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';

const RESET_ID='FP86_ENTRY_UX_RESET_R1';
const $=id=>root?.document?.getElementById(id)||null;
const p=()=>root?.FamilyPilotOnDeviceSpeechV1||null;
const OPS=Object.freeze({'+':'+','−':'-','-':'-','×':'*','*':'*','÷':'/','/':'/'});
const VP='familypilot.voice.enabled.v1';
const HP='familypilot.hints.enabled.v1';

let recording=false;
let stopping=false;
let entryBaseline=null;
let voiceRecovery=null;
let allowDiscardOnce=false;

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

function cats(){
  const s=$('categoryInput');
  return s
    ? [...s.options]
        .filter(o=>String(o.value||'').trim()&&String(o.textContent||'').trim())
        .map(o=>({id:String(o.value),name:String(o.textContent||'')}))
    : [];
}

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

function normalize(text){
  const raw=String(text||'').trim();
  const v=raw.replace(/^(\d+)\s+(\d{2})(?=\s|$)/u,'$1,$2');
  const num='(?:\\d+\\s+(?:запятая|точка)\\s+\\d{1,2}|\\d+:\\d{1,2}|\\d+(?:[.,]\\d+)?|[.,]\\d+)';
  const op='(?:[+\\-−×*÷/]|плюс|минус|(?:умножить|помножить)\\s+на|(?:разделить|делить)\\s+на)';
  const q=v.match(new RegExp(`^\\s*(${num}(?:\\s*${op}\\s*${num})*)`,'iu'));
  if(!q)return v;
  const e=q[1]
    .replace(/(\d+)\s+(?:запятая|точка)\s+(\d{1,2})/giu,'$1,$2')
    .replace(/(\d+):(\d{1,2})/gu,'$1,$2')
    .replace(/(?:умножить|помножить)\s+на/giu,'*')
    .replace(/(?:разделить|делить)\s+на/giu,'/')
    .replace(/плюс/giu,'+')
    .replace(/минус/giu,'-')
    .replace(/[×]/g,'*')
    .replace(/[÷]/g,'/')
    .replace(/[−]/g,'-')
    .replace(/\s+/gu,'');
  const r=calc(e);
  if(r.error||r.empty||!Number.isFinite(r.value))return v;
  const tail=v.slice(q[0].length).replace(/^\s*(?:€|EUR|евро)(?=\s|$)\s*/iu,'').trimStart();
  const amount=String(Math.round(r.value*100)/100).replace('.',',');
  return tail?`${amount} ${tail}`:amount;
}

function structured(text){
  const c=root?.FamilyPilotVoiceV1;
  if(!c?.parseTranscript)return Object.freeze({ok:false,error:'voice_core_unavailable'});
  const t=normalize(text);
  let r=c.parseTranscript({text:t,categories:cats()});
  if(!r?.ok)return r;
  const a=r.consumed?.find(x=>x.kind==='amount');
  const g=r.consumed?.find(x=>x.kind==='category');
  const start=t.search(/\S/u);
  if(a&&a.start===start&&(!g||!t.slice(a.end,g.start).trim()))return r;
  return c.parseTranscript({text:t,categories:[]});
}

function amountResult(){
  const a=$('amountInput'),n=$('amountCalculation');
  if(!a||!n)return;
  const r=calc(a.value);
  const frac=!r.error&&!r.empty&&Math.abs(r.value-Math.round(r.value))>1e-9;
  const text=r.empty
    ? '0 €'
    : r.error
      ? '—'
      : new Intl.NumberFormat('ru-RU',{minimumFractionDigits:frac?2:0,maximumFractionDigits:2}).format(r.value)+' €';
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
}

function apply(r){
  if(!r?.ok||!r.draft)return r;
  const a=$('amountInput'),g=$('categoryInput'),n=$('noteInput');
  if(!a||!g||!n)return Object.freeze({ok:false,error:'voice_form_unavailable'});
  if(r.draft.amount!=null){
    a.value=String(r.draft.amount).replace('.',',');
    input(a);
  }
  if(r.draft.categoryId!=null){
    g.value=r.draft.categoryId;
    g.dispatchEvent(new Event('change',{bubbles:true}));
  }
  n.value=r.draft.note;
  input(n);
  amountResult();
  syncSaveState();
  return Object.freeze({ok:true,draft:r.draft});
}

const applyText=t=>apply(structured(t));

function parseNote(){
  const n=$('noteInput');
  if(!n)return Object.freeze({ok:false,error:'voice_form_unavailable'});
  const t=String(n.value||'').trim();
  if(!t)return Object.freeze({ok:false,error:'note_empty'});
  const r=structured(t);
  if(!r?.ok)return r;
  const extracted=(r.consumed||[]).filter(x=>x.kind==='amount'||x.kind==='category');
  if(!extracted.length)return Object.freeze({ok:false,error:'no_fields_extracted'});
  return apply(r);
}

function insert(o){
  const a=$('amountInput'),t=OPS[o];
  if(!a||!t)return false;
  const v=String(a.value||'');
  const s=Number.isInteger(a.selectionStart)?a.selectionStart:v.length;
  const e=Number.isInteger(a.selectionEnd)?a.selectionEnd:s;
  a.value=v.slice(0,s)+t+v.slice(e);
  input(a);
  amountResult();
  syncSaveState();
  a.focus?.();
  try{a.setSelectionRange?.(s+t.length,s+t.length)}catch{}
  return true;
}

function setLive(text,state='partial'){
  const n=$('voiceLiveTranscript');
  if(!n)return;
  const t=String(text||'').trim();
  if(!t){
    n.hidden=true;
    n.textContent='';
    n.dataset.state='';
    return;
  }
  n.hidden=false;
  n.dataset.state=state;
  n.textContent=t;
}

function showVoiceRecovery(show){
  const n=$('voiceResultRecovery');
  if(n)n.hidden=!show;
}

function clearVoiceRecovery(){
  voiceRecovery=null;
  showVoiceRecovery(false);
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
  input(amount);
  category.dispatchEvent(new Event('change',{bubbles:true}));
  input(date);
  input(note);
  amountResult();
  syncSaveState();
  return true;
}

function undoVoiceResult(){
  if(recording||!voiceRecovery)return false;
  const before=voiceRecovery;
  clearVoiceRecovery();
  if(!restoreSnapshot(before))return false;
  setLive('Результат отменён. Черновик восстановлен.','final');
  return true;
}

async function retryVoiceResult(){
  if(recording||!voiceRecovery)return Object.freeze({ok:false,error:'voice_recovery_unavailable'});
  const before=voiceRecovery;
  clearVoiceRecovery();
  if(!restoreSnapshot(before))return Object.freeze({ok:false,error:'voice_form_unavailable'});
  setLive('Черновик восстановлен. Начинаю новую запись…','listening');
  return session();
}

async function dictate(onPartial){
  const x=p();
  if(!x||x.mode!=='on_device'||typeof x.recognize!=='function'){
    return Object.freeze({ok:false,error:'on_device_speech_unavailable'});
  }
  let r;
  try{
    r=await x.recognize(text=>{
      const t=String(text||'').trim();
      if(t){
        setLive(`Слышу: ${t}`,'partial');
        if(typeof onPartial==='function')onPartial(t);
      }
    });
  }catch{
    return Object.freeze({ok:false,error:'speech_recognition_failed'});
  }
  if(!r?.ok||typeof r.text!=='string'){
    return Object.freeze({ok:false,error:r?.error||'speech_recognition_failed'});
  }
  const applied=applyText(r.text);
  return applied?.ok
    ? Object.freeze({ok:true,draft:applied.draft,transcript:r.text})
    : applied;
}

function voiceButton(){
  const b=$('voiceOperationBtn');
  if(!b)return;
  b.classList.toggle('fp-recording',recording&&!stopping);
  if(recording&&!stopping){
    b.disabled=false;
    b.innerHTML='<span class="fp-record-dot"></span>Слушаю — нажмите, чтобы закончить';
    b.setAttribute('aria-label','Идёт запись. Нажмите, чтобы закончить и разобрать операцию.');
  }else if(recording){
    b.disabled=true;
    b.textContent='Обрабатываю…';
  }else{
    b.disabled=false;
    b.textContent='🎤 Продиктовать операцию';
    b.setAttribute('aria-label','Начать голосовой ввод операции FamilyPilot');
  }
}

async function stop(){
  const x=p();
  if(!recording||!x||typeof x.stop!=='function')return false;
  stopping=true;
  voiceButton();
  try{
    const ok=(await x.stop())===true;
    if(!ok){
      stopping=false;
      voiceButton();
    }
    return ok;
  }catch{
    stopping=false;
    voiceButton();
    return false;
  }
}

async function session(){
  if(recording)return stop();
  const e=$('entryError');
  if(e)e.textContent='';
  root.document.activeElement?.blur?.();
  const before=snapshot();
  clearVoiceRecovery();
  recording=true;
  stopping=false;
  setLive('Слушаю…','listening');
  voiceButton();
  const r=await dictate();
  recording=false;
  stopping=false;
  voiceButton();
  if(r.ok){
    voiceRecovery=before;
    showVoiceRecovery(true);
    setLive(`Распознано: ${r.transcript}. Проверьте поля перед сохранением.`,'final');
  }else{
    clearVoiceRecovery();
    const quiet=r.error==='empty_transcript'||String(r.error||'').startsWith('speech_recognition_failed');
    const msg=quiet
      ? 'Не услышал речь. Попробуйте говорить чуть громче или ближе к телефону.'
      : 'Голосовой ввод недоступен.';
    setLive(msg,'error');
    if(e)e.textContent=msg;
  }
  return r;
}

async function available(){
  const x=p();
  if(!x||x.mode!=='on_device'||typeof x.recognize!=='function')return false;
  if(typeof x.isAvailable!=='function')return true;
  try{return(await x.isAvailable())===true}catch{return false}
}

const help=t=>{
  const d=root.document.createElement('div');
  d.className='field-help';
  d.textContent=t;
  d.style.marginTop='6px';
  return d;
};

function style(){
  if($('fpEntryUxResetR1Style'))return;
  const s=root.document.createElement('style');
  s.id='fpEntryUxResetR1Style';
  s.textContent=`
@keyframes fpVoicePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.72)}}
#voiceOperationBtn.fp-recording{background:#d93025!important;color:#fff!important;border-color:#d93025!important}
#voiceOperationBtn .fp-record-dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:#fff;margin-right:8px;animation:fpVoicePulse 1s ease-in-out infinite}
.fp-voice-live{margin-top:8px;padding:9px 11px;border-radius:12px;background:var(--card2);border:1px solid var(--line);font-size:13px;line-height:1.35}
.fp-voice-live[data-state="partial"]{border-color:color-mix(in srgb,var(--green) 50%,var(--line))}
.fp-voice-live[data-state="error"]{color:var(--red)}
.fp-voice-recovery{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.fp-voice-recovery[hidden]{display:none!important}
#saveOperationBtn[aria-disabled="true"]{opacity:.62}
.fp-hints-hidden .meta-note,.fp-hints-hidden .field-help,.fp-hints-hidden .settings-subtitle,.fp-hints-hidden .manager-help,.fp-hints-hidden .obligation-help{display:none!important}
.fp-unsaved-inline{margin:12px 0 2px;padding:13px;border:1px solid color-mix(in srgb,var(--blue) 42%,var(--line));border-radius:16px;background:color-mix(in srgb,var(--blue) 8%,var(--card));box-shadow:var(--shadow)}
.fp-unsaved-inline[hidden]{display:none!important}
.fp-unsaved-inline strong{display:block;font-size:17px}
.fp-unsaved-inline p{margin:5px 0 11px;color:var(--muted);font-size:12px}
.fp-unsaved-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#amountLimitHint{display:block;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
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
  a.value=sanitizeExpressionValue(a.value);
}

function arithmetic(a){
  if($('amountOperatorControls'))return;
  a.oninput=expressionInput;
  const r=root.document.createElement('div');
  r.id='amountOperatorControls';
  r.setAttribute('aria-label','Арифметические действия');
  Object.assign(r.style,{
    display:'grid',
    gridTemplateColumns:'repeat(4,minmax(0,1fr))',
    gap:'7px',
    marginTop:'9px'
  });
  for(const l of ['+','−','×','÷']){
    const b=root.document.createElement('button');
    b.type='button';
    b.className='btn secondary';
    b.textContent=l;
    b.dataset.amountOperator=OPS[l];
    b.setAttribute('aria-label',`Вставить ${l}`);
    Object.assign(b.style,{minHeight:'44px',padding:'8px 4px'});
    b.addEventListener('click',()=>insert(l));
    r.appendChild(b);
  }
  a.insertAdjacentElement('afterend',r);
  const n=$('amountCalculation');
  if(n)r.insertAdjacentElement('afterend',n);
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

function noteAction(n){
  if($('parseOperationNoteBtn'))return;
  const w=root.document.createElement('div');
  const b=root.document.createElement('button');
  const result=root.document.createElement('div');
  w.id='parseOperationNoteWrap';
  w.style.marginTop='8px';
  b.type='button';
  b.id='parseOperationNoteBtn';
  b.className='btn secondary';
  b.textContent='Разобрать текст';
  b.style.width='100%';
  result.id='parseOperationNoteResult';
  result.className='field-help';
  result.hidden=true;
  result.setAttribute('aria-live','polite');
  b.addEventListener('click',()=>{
    const e=$('entryError');
    if(e)e.textContent='';
    const r=parseNote();
    result.hidden=false;
    result.dataset.state=r.ok?'success':'error';
    result.textContent=r.ok
      ? 'Готово: найденные поля заполнены. Проверьте и сохраните черновик вручную.'
      : r.error==='no_fields_extracted'
        ? 'Не нашёл сумму или точную категорию.'
        : r.error==='note_empty'
          ? 'Введите текст для разбора.'
          : 'Не удалось разобрать текст.';
  });
  w.append(b,result,help('Порядок: сумма, точная категория, затем примечание. Для копеек можно сказать «7 запятая 61» или «7 61».'));
  n.insertAdjacentElement('afterend',w);
}

async function voice(sheet,ok){
  if($('voiceOperationBtn'))return;
  const w=root.document.createElement('div');
  const b=root.document.createElement('button');
  const live=root.document.createElement('div');
  const recovery=root.document.createElement('div');
  const undo=root.document.createElement('button');
  const retry=root.document.createElement('button');
  const anchor=$('voiceOperationAnchor');
  w.id='voiceOperationWrap';
  Object.assign(w.style,{marginTop:'18px',marginBottom:'12px'});
  b.type='button';
  b.id='voiceOperationBtn';
  b.className='btn secondary';
  b.style.width='100%';
  b.disabled=!ok;
  b.textContent=ok?'🎤 Продиктовать операцию':'Голосовой ввод FamilyPilot недоступен';
  live.id='voiceLiveTranscript';
  live.className='fp-voice-live';
  live.hidden=true;
  live.setAttribute('aria-live','polite');
  recovery.id='voiceResultRecovery';
  recovery.className='fp-voice-recovery';
  recovery.hidden=true;
  undo.id='undoVoiceResultBtn';
  undo.type='button';
  undo.className='btn secondary';
  undo.textContent='Отменить результат';
  retry.id='retryVoiceResultBtn';
  retry.type='button';
  retry.className='btn secondary';
  retry.textContent='Продиктовать заново';
  undo.addEventListener('click',undoVoiceResult);
  retry.addEventListener('click',()=>retryVoiceResult());
  recovery.append(undo,retry);
  if(ok)b.addEventListener('click',()=>session());
  w.append(
    b,
    live,
    recovery,
    help(ok
      ? 'Говорите по порядку: сумма → точная категория → примечание. Текст, который телефон слышит, появится здесь; поля заполнятся только после остановки.'
      : 'Локальное распознавание для выбранного языка недоступно. Используйте ручной ввод.')
  );
  if(anchor){
    anchor.appendChild(w);
  }else{
    const h=sheet.querySelector('.entry-head');
    h?.nextSibling?sheet.insertBefore(w,h.nextSibling):sheet.prepend(w);
  }
}

const sw=(b,on)=>{
  if(!b)return;
  b.classList.toggle('on',on);
  b.setAttribute('aria-pressed',String(on));
};

function prefs(){
  const v=pref(VP),h=pref(HP),w=$('voiceOperationWrap');
  if(w)w.hidden=!v;
  root.document.body?.classList.toggle('fp-hints-hidden',!h);
  sw($('fpVoiceEnabledBtn'),v);
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
  if($('fpVoiceEnabledBtn'))return prefs();
  const g=root.document.querySelector('#moreScreen .settings-group');
  if(!g)return;
  const[v,vb]=row('fpVoiceEnabledBtn','Голосовой ввод','Показывать кнопку голосового ввода операции.');
  const[h,hb]=row('fpHintsEnabledBtn','Подсказки','Показывать поясняющий текст для освоения приложения.');
  const before=g.querySelector('.settings-wide-action');
  g.insertBefore(v,before||null);
  g.insertBefore(h,before||null);
  vb.addEventListener('click',()=>{
    setPref(VP,!pref(VP));
    prefs();
  });
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
  ensureBlankCategory();
  entryBaseline=snapshot();
  clearVoiceRecovery();
  setLive('');
  const parseResult=$('parseOperationNoteResult');
  if(parseResult){
    parseResult.hidden=true;
    parseResult.textContent='';
  }
  hideConfirm();
  if($('entryError'))$('entryError').textContent='';
  if($('categoryError'))$('categoryError').textContent='';
  syncSaveState();
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

  if(recording){
    event.preventDefault();
    event.stopImmediatePropagation();
    const e=$('entryError');
    if(e)e.textContent='Сначала остановите голосовую запись.';
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
    if(m.classList.contains('open')){
      entryOpen();
    }else{
      entryBaseline=null;
      clearVoiceRecovery();
      hideConfirm();
      setLive('');
    }
  }):null;
  o?.observe(m,{attributes:true,attributeFilter:['class']});
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

async function install(){
  if(!root?.document||root.__FP_VOICE_V1_FORM_READY__)return false;
  const a=$('amountInput'),n=$('noteInput'),sheet=a?.closest('.sheet');
  if(!a||!n||!sheet||!root.FamilyPilotVoiceV1)return false;

  style();
  arithmetic(a);
  compactMaximumHint();
  placeCloudAccount();
  openSync();
  noteAction(n);
  settings();
  entryLifecycle();
  await voice(sheet,await available());
  prefs();

  root.__FP_VOICE_V1_FORM_READY__=true;
  root.__FP_ENTRY_UX_RESET_ID__=RESET_ID;
  return true;
}

return Object.freeze({
  version:1,
  architecture:RESET_ID,
  categoriesFromForm:cats,
  applyText,
  parseStructuredText:structured,
  parseCurrentNote:parseNote,
  normalizeVoicePrefix:normalize,
  calculateExpression:calc,
  updateAmountResult:amountResult,
  insertAmountToken:insert,
  dictate,
  startVoiceSession:session,
  stopDictation:stop,
  restoreEntrySnapshot:restoreSnapshot,
  undoVoiceResult,
  retryVoiceResult,
  available,
  entrySnapshot:snapshot,
  sameEntrySnapshot:sameSnapshot,
  isEntryDirty:dirty,
  minimumEntryValidity:minimum,
  sanitizeAmountExpressionValue:sanitizeExpressionValue,
  prepareEntryForOpen:entryOpen,
  compactMaximumHint,
  placeCloudAccount,
  install
});
});

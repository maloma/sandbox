(function installFamilyPilotVoiceV1FormAdapter(root,factory){
  'use strict';
  const api=factory(root);
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root&&root.document) root.FamilyPilotVoiceV1FormAdapter=api;
})(typeof globalThis!=='undefined'?globalThis:this,function createFamilyPilotVoiceV1FormAdapter(root){
  'use strict';

  const byId=id=>root?.document?.getElementById(id)||null;
  const provider=()=>root?.FamilyPilotOnDeviceSpeechV1||null;
  const OPERATOR_MAP=Object.freeze({'+':'+','−':'-','-':'-','×':'*','*':'*','÷':'/','/':'/'});
  const VOICE_PREF='familypilot.voice.enabled.v1';
  const HINTS_PREF='familypilot.hints.enabled.v1';
  let recording=false;
  let stopping=false;
  let activeRecognition=null;

  function readPref(key,defaultValue=true){
    try{const value=root.localStorage?.getItem(key);return value===null?defaultValue:value!=='false'}catch{return defaultValue}
  }
  function writePref(key,value){try{root.localStorage?.setItem(key,value?'true':'false')}catch{}}

  function categoriesFromForm(){
    const select=byId('categoryInput');
    if(!select) return [];
    return [...select.options].map(option=>({id:String(option.value),name:String(option.textContent||'')}));
  }
  function dispatchInput(node){node.dispatchEvent(new Event('input',{bubbles:true}))}

  function applyParsed(result){
    if(!result?.ok||!result.draft) return result;
    const amount=byId('amountInput'),category=byId('categoryInput'),note=byId('noteInput');
    if(!amount||!category||!note) return Object.freeze({ok:false,error:'voice_form_unavailable'});
    if(result.draft.amount!=null){amount.value=String(result.draft.amount).replace('.',',');dispatchInput(amount)}
    if(result.draft.categoryId!=null){category.value=result.draft.categoryId;category.dispatchEvent(new Event('change',{bubbles:true}))}
    note.value=result.draft.note;dispatchInput(note);
    return Object.freeze({ok:true,draft:result.draft});
  }

  function calculateExpression(raw){
    const text=String(raw||'').trim();
    if(!text)return{empty:true};
    const compact=text.replace(/\s+/gu,'').replace(/,/g,'.').replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');
    if(!/^[0-9.+\-*/()]+$/u.test(compact))return{error:'invalid'};
    const tokens=compact.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/]/g);
    if(!tokens||tokens.join('')!==compact)return{error:'invalid'};
    let position=0;
    const primary=()=>{const token=tokens[position++];if(token==='('){const value=sum();if(tokens[position++]!==')')throw Error();return value}if(token==='+'||token==='-')return(token==='-'?-1:1)*primary();const value=Number(token);if(!Number.isFinite(value))throw Error();return value};
    const product=()=>{let value=primary();while(tokens[position]==='*'||tokens[position]==='/'){const op=tokens[position++],right=primary();if(op==='/'&&right===0)throw Error();value=op==='*'?value*right:value/right}return value};
    const sum=()=>{let value=product();while(tokens[position]==='+'||tokens[position]==='-'){const op=tokens[position++],right=product();value=op==='+'?value+right:value-right}return value};
    try{const value=sum();return position===tokens.length&&Number.isFinite(value)?{value:Math.round(value*100)/100}:{error:'invalid'}}catch{return{error:'invalid'}}
  }

  function normalizeVoicePrefix(text){
    let value=String(text||'').trim();
    value=value
      .replace(/\b(?:умножить|помножить)\s+на\b/giu,'*')
      .replace(/\b(?:разделить|делить)\s+на\b/giu,'/')
      .replace(/\bплюс\b/giu,'+')
      .replace(/\bминус\b/giu,'-')
      .replace(/\bзапятая\b/giu,',')
      .replace(/\bточка\b/giu,'.')
      .replace(/(?<=\d):(?=\d{2}(?:\s|$))/u,',')
      .replace(/\s*([,.])\s*/gu,'$1');

    const prefix=value.match(/^\s*((?:\d+(?:[.,]\d*)?|[.,]\d+)(?:\s*[+\-*/]\s*(?:\d+(?:[.,]\d*)?|[.,]\d+))*)/u);
    if(!prefix) return value;
    const calculated=calculateExpression(prefix[1]);
    if(calculated.error||calculated.empty||!Number.isFinite(calculated.value)) return value;
    let rest=value.slice(prefix[0].length).replace(/^\s*(?:€|EUR|евро)\b\s*/iu,' ').trimStart();
    const amount=String(Math.round(calculated.value*100)/100).replace('.',',');
    return rest?`${amount} ${rest}`:amount;
  }

  function parseStructuredText(text){
    const core=root?.FamilyPilotVoiceV1;
    if(!core?.parseTranscript) return Object.freeze({ok:false,error:'voice_core_unavailable'});
    const normalized=normalizeVoicePrefix(text);
    let result=core.parseTranscript({text:normalized,categories:categoriesFromForm()});
    if(!result?.ok) return result;
    const amount=result.consumed?.find(item=>item.kind==='amount')||null;
    const category=result.consumed?.find(item=>item.kind==='category')||null;
    const firstNonSpace=normalized.search(/\S/u);
    const orderOkay=amount&&amount.start===firstNonSpace&&(!category||!normalized.slice(amount.end,category.start).trim());
    if(orderOkay) return result;
    result=core.parseTranscript({text:normalized,categories:[]});
    return result;
  }

  function applyText(text){return applyParsed(parseStructuredText(text))}
  function parseCurrentNote(){
    const note=byId('noteInput');
    if(!note) return Object.freeze({ok:false,error:'voice_form_unavailable'});
    const text=String(note.value||'').trim();
    if(!text) return Object.freeze({ok:false,error:'note_empty'});
    return applyText(text);
  }

  function formatResult(value){
    const fractional=Math.abs(value-Math.round(value))>1e-9;
    return new Intl.NumberFormat('ru-RU',{minimumFractionDigits:fractional?2:0,maximumFractionDigits:2}).format(value)+' €';
  }
  function updateAmountResult(){
    const amount=byId('amountInput'),resultNode=byId('amountCalculation');
    if(!amount||!resultNode)return;
    const result=calculateExpression(amount.value);
    const text=result.empty?'0 €':result.error?'—':formatResult(result.value);
    resultNode.textContent=text;
    resultNode.className='fp-amount-result';
    resultNode.style.display='block';
    resultNode.style.marginTop='9px';
    resultNode.style.fontWeight='950';
    resultNode.style.lineHeight='1.05';
    resultNode.style.textAlign='right';
    resultNode.style.color=result.error?'var(--red)':'var(--ink)';
    const length=text.replace(/\s/g,'').length;
    resultNode.style.fontSize=length<=8?'32px':length<=11?'28px':length<=15?'24px':'20px';
  }

  function insertAmountToken(displayToken){
    const amount=byId('amountInput'),token=OPERATOR_MAP[displayToken];
    if(!amount||!token)return false;
    const value=String(amount.value||''),start=Number.isInteger(amount.selectionStart)?amount.selectionStart:value.length,end=Number.isInteger(amount.selectionEnd)?amount.selectionEnd:start;
    amount.value=value.slice(0,start)+token+value.slice(end);
    const caret=start+token.length;dispatchInput(amount);updateAmountResult();
    if(typeof amount.focus==='function')amount.focus();
    if(typeof amount.setSelectionRange==='function'){try{amount.setSelectionRange(caret,caret)}catch{}}
    return true;
  }

  async function dictate(){
    const p=provider();
    if(!p||p.mode!=='on_device'||typeof p.recognize!=='function')return Object.freeze({ok:false,error:'on_device_speech_unavailable'});
    let recognized;try{recognized=await p.recognize()}catch{return Object.freeze({ok:false,error:'speech_recognition_failed'})}
    if(!recognized?.ok||typeof recognized.text!=='string')return Object.freeze({ok:false,error:recognized?.error||'speech_recognition_failed'});
    return applyText(recognized.text);
  }
  async function stopDictation(){
    const p=provider();
    if(!recording||!p||typeof p.stop!=='function')return false;
    stopping=true;syncVoiceButton();
    try{return (await p.stop())===true}catch{return false}
  }
  async function available(){
    const p=provider();if(!p||p.mode!=='on_device'||typeof p.recognize!=='function')return false;
    if(typeof p.isAvailable!=='function')return true;
    try{return(await p.isAvailable())===true}catch{return false}
  }

  function makeHelper(text){const helper=root.document.createElement('div');helper.className='field-help';helper.textContent=text;helper.style.marginTop='6px';return helper}

  function installStyle(){
    if(byId('fpVoiceV2Style'))return;
    const style=root.document.createElement('style');style.id='fpVoiceV2Style';style.textContent=`
      @keyframes fpVoicePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.72)}}
      #voiceOperationBtn.fp-recording{background:#d93025!important;color:#fff!important;border-color:#d93025!important}
      #voiceOperationBtn .fp-record-dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:#fff;margin-right:8px;animation:fpVoicePulse 1s ease-in-out infinite}
      .fp-hints-hidden .meta-note,.fp-hints-hidden .field-help,.fp-hints-hidden .settings-subtitle,.fp-hints-hidden .manager-help,.fp-hints-hidden .obligation-help{display:none!important}
    `;root.document.head.appendChild(style);
  }

  function installArithmeticControls(amount){
    if(byId('amountOperatorControls'))return;
    const row=root.document.createElement('div');row.id='amountOperatorControls';row.setAttribute('aria-label','Арифметические действия');row.style.display='grid';row.style.gridTemplateColumns='repeat(4,minmax(0,1fr))';row.style.gap='7px';row.style.marginTop='9px';
    for(const label of ['+','−','×','÷']){const button=root.document.createElement('button');button.type='button';button.className='btn secondary';button.textContent=label;button.dataset.amountOperator=OPERATOR_MAP[label];button.setAttribute('aria-label',`Вставить ${label}`);button.style.minHeight='44px';button.style.padding='8px 4px';button.addEventListener('click',()=>insertAmountToken(label));row.appendChild(button)}
    amount.insertAdjacentElement('afterend',row);
    const hint=byId('amountCalculation');if(hint)row.insertAdjacentElement('afterend',hint);
    amount.addEventListener('input',updateAmountResult);amount.addEventListener('blur',updateAmountResult);updateAmountResult();
  }

  function installNoteParseAction(note){
    if(byId('parseOperationNoteBtn'))return;
    const wrap=root.document.createElement('div');wrap.id='parseOperationNoteWrap';wrap.style.marginTop='8px';
    const button=root.document.createElement('button');button.type='button';button.id='parseOperationNoteBtn';button.className='btn secondary';button.textContent='Разобрать текст';button.style.width='100%';button.addEventListener('click',()=>{const error=byId('entryError');if(error)error.textContent='';const result=parseCurrentNote();if(!result.ok&&result.error!=='note_empty'&&error)error.textContent='Не удалось разобрать текст.'});
    wrap.appendChild(button);wrap.appendChild(makeHelper('Порядок: сумма, точная категория, затем примечание. Для копеек можно сказать «7 запятая 61».'));note.insertAdjacentElement('afterend',wrap);
  }

  function syncVoiceButton(){
    const button=byId('voiceOperationBtn');if(!button)return;
    button.classList.toggle('fp-recording',recording&&!stopping);
    if(recording&&!stopping){button.disabled=false;button.innerHTML='<span class="fp-record-dot"></span>Слушаю — нажмите, чтобы закончить';button.setAttribute('aria-label','Идёт запись. Нажмите, чтобы закончить и разобрать операцию.');return}
    if(recording&&stopping){button.disabled=true;button.textContent='Обрабатываю…';return}
    button.disabled=false;button.textContent='🎤 Продиктовать операцию';button.setAttribute('aria-label','Начать голосовой ввод операции FamilyPilot');
  }

  async function startVoiceSession(){
    if(recording)return stopDictation();
    const error=byId('entryError');if(error)error.textContent='';
    const active=root.document.activeElement;if(active&&typeof active.blur==='function')active.blur();
    recording=true;stopping=false;syncVoiceButton();
    activeRecognition=dictate();
    const result=await activeRecognition;
    activeRecognition=null;recording=false;stopping=false;syncVoiceButton();
    if(!result.ok&&error)error.textContent=result.error==='speech_recognition_failed'?'Не удалось распознать речь.':'Голосовой ввод недоступен.';
    return result;
  }

  async function installVoiceAction(sheet,voiceAvailable){
    if(byId('voiceOperationBtn'))return;
    const anchor=byId('voiceOperationAnchor'),wrap=root.document.createElement('div');wrap.id='voiceOperationWrap';wrap.style.marginTop='18px';wrap.style.marginBottom='12px';
    const button=root.document.createElement('button');button.type='button';button.id='voiceOperationBtn';button.className='btn secondary';button.style.width='100%';button.disabled=!voiceAvailable;
    button.textContent=voiceAvailable?'🎤 Продиктовать операцию':'Голосовой ввод FamilyPilot недоступен';
    if(voiceAvailable)button.addEventListener('click',()=>startVoiceSession());
    wrap.appendChild(button);wrap.appendChild(makeHelper(voiceAvailable?'Говорите по порядку: сумма → точная категория → примечание. Нажмите кнопку ещё раз, чтобы закончить запись.':'Локальное распознавание для выбранного языка недоступно. Используйте ручной ввод.'));
    if(anchor)anchor.appendChild(wrap);else{const head=sheet.querySelector('.entry-head');if(head?.nextSibling)sheet.insertBefore(wrap,head.nextSibling);else sheet.prepend(wrap)}
  }

  function syncSwitch(button,on){if(!button)return;button.classList.toggle('on',on);button.setAttribute('aria-pressed',String(on))}
  function applyPreferences(){
    const voiceEnabled=readPref(VOICE_PREF,true),hintsEnabled=readPref(HINTS_PREF,true);
    const voiceWrap=byId('voiceOperationWrap');if(voiceWrap)voiceWrap.hidden=!voiceEnabled;
    root.document.body?.classList.toggle('fp-hints-hidden',!hintsEnabled);
    syncSwitch(byId('fpVoiceEnabledBtn'),voiceEnabled);syncSwitch(byId('fpHintsEnabledBtn'),hintsEnabled);
  }
  function settingRow(id,label,help){
    const row=root.document.createElement('div');row.className='config-row';const copy=root.document.createElement('div'),title=root.document.createElement('label'),small=root.document.createElement('small'),button=root.document.createElement('button');title.textContent=label;small.textContent=help;copy.append(title,small);button.id=id;button.type='button';button.className='switch';button.setAttribute('aria-label',label);row.append(copy,button);return{row,button};
  }
  function installPreferences(){
    if(byId('fpVoiceEnabledBtn')){applyPreferences();return}
    const group=root.document.querySelector('#moreScreen .settings-group');if(!group)return;
    const voice=settingRow('fpVoiceEnabledBtn','Голосовой ввод','Показывать кнопку голосового ввода операции.');
    const hints=settingRow('fpHintsEnabledBtn','Подсказки','Показывать поясняющий текст для освоения приложения.');
    const wide=group.querySelector('.settings-wide-action');group.insertBefore(voice.row,wide||null);group.insertBefore(hints.row,wide||null);
    voice.button.addEventListener('click',()=>{writePref(VOICE_PREF,!readPref(VOICE_PREF,true));applyPreferences()});
    hints.button.addEventListener('click',()=>{writePref(HINTS_PREF,!readPref(HINTS_PREF,true));applyPreferences()});
    applyPreferences();
  }

  async function install(){
    if(!root?.document||root.__FP_VOICE_V1_FORM_READY__)return false;
    const amount=byId('amountInput'),note=byId('noteInput'),sheet=amount?.closest('.sheet');if(!amount||!note||!sheet||!root.FamilyPilotVoiceV1)return false;
    installStyle();installArithmeticControls(amount);installNoteParseAction(note);installPreferences();
    const voiceAvailable=await available();await installVoiceAction(sheet,voiceAvailable);applyPreferences();
    root.__FP_VOICE_V1_FORM_READY__=true;return true;
  }

  return Object.freeze({version:2,categoriesFromForm,applyText,parseStructuredText,parseCurrentNote,normalizeVoicePrefix,calculateExpression,updateAmountResult,insertAmountToken,dictate,stopDictation,available,install});
});

(function installFamilyPilotVoiceV1FormAdapter(root,factory){
  'use strict';
  const api=factory(root);
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root&&root.document) root.FamilyPilotVoiceV1FormAdapter=api;
})(typeof globalThis!=='undefined'?globalThis:this,function createFamilyPilotVoiceV1FormAdapter(root){
  'use strict';

  const byId=id=>root?.document?.getElementById(id)||null;
  const provider=()=>root?.FamilyPilotOnDeviceSpeechV1||null;
  const OPERATOR_MAP=Object.freeze({'+':'+','−':'-','-':'-','×':'*','*':'*','÷':'/','/':'/','(':'(',')':')'});

  function categoriesFromForm(){
    const select=byId('categoryInput');
    if(!select) return [];
    return [...select.options].map(option=>({id:String(option.value),name:String(option.textContent||'')}));
  }

  function dispatchInput(node){
    node.dispatchEvent(new Event('input',{bubbles:true}));
  }

  function applyParsed(result){
    if(!result?.ok||!result.draft) return result;
    const amount=byId('amountInput'),category=byId('categoryInput'),note=byId('noteInput');
    if(!amount||!category||!note) return Object.freeze({ok:false,error:'voice_form_unavailable'});
    if(result.draft.amount!=null){
      amount.value=String(result.draft.amount).replace('.',',');
      dispatchInput(amount);
    }
    if(result.draft.categoryId!=null){
      category.value=result.draft.categoryId;
      category.dispatchEvent(new Event('change',{bubbles:true}));
    }
    note.value=result.draft.note;
    dispatchInput(note);
    return Object.freeze({ok:true,draft:result.draft});
  }

  function applyText(text){
    const core=root?.FamilyPilotVoiceV1;
    if(!core?.parseTranscript) return Object.freeze({ok:false,error:'voice_core_unavailable'});
    return applyParsed(core.parseTranscript({text,categories:categoriesFromForm()}));
  }

  function parseCurrentNote(){
    const note=byId('noteInput');
    if(!note) return Object.freeze({ok:false,error:'voice_form_unavailable'});
    const text=String(note.value||'').trim();
    if(!text) return Object.freeze({ok:false,error:'note_empty'});
    return applyText(text);
  }

  function insertAmountToken(displayToken){
    const amount=byId('amountInput');
    const token=OPERATOR_MAP[displayToken];
    if(!amount||!token) return false;
    const value=String(amount.value||'');
    const start=Number.isInteger(amount.selectionStart)?amount.selectionStart:value.length;
    const end=Number.isInteger(amount.selectionEnd)?amount.selectionEnd:start;
    amount.value=value.slice(0,start)+token+value.slice(end);
    const caret=start+token.length;
    dispatchInput(amount);
    if(typeof amount.focus==='function') amount.focus();
    if(typeof amount.setSelectionRange==='function'){
      try{amount.setSelectionRange(caret,caret)}catch{}
    }
    return true;
  }

  async function dictate(){
    const core=root?.FamilyPilotVoiceV1;
    if(!core?.recognizeAndParse) return Object.freeze({ok:false,error:'voice_core_unavailable'});
    const result=await core.recognizeAndParse(provider(),categoriesFromForm());
    return result.ok?applyParsed(result):result;
  }

  async function available(){
    const p=provider();
    if(!p||p.mode!=='on_device'||typeof p.recognize!=='function') return false;
    if(typeof p.isAvailable!=='function') return true;
    try{return (await p.isAvailable())===true}catch{return false}
  }

  function makeHelper(text){
    const helper=root.document.createElement('div');
    helper.className='field-help';
    helper.textContent=text;
    helper.style.marginTop='6px';
    return helper;
  }

  function installArithmeticControls(amount){
    if(byId('amountOperatorControls')) return;
    const row=root.document.createElement('div');
    row.id='amountOperatorControls';
    row.setAttribute('aria-label','Арифметические действия');
    row.style.display='grid';
    row.style.gridTemplateColumns='repeat(6,minmax(0,1fr))';
    row.style.gap='6px';
    row.style.marginTop='8px';
    for(const label of ['+','−','×','÷','(',')']){
      const button=root.document.createElement('button');
      button.type='button';
      button.className='btn secondary';
      button.textContent=label;
      button.dataset.amountOperator=OPERATOR_MAP[label];
      button.setAttribute('aria-label',`Вставить ${label}`);
      button.style.minHeight='44px';
      button.style.padding='8px 4px';
      button.addEventListener('click',()=>insertAmountToken(label));
      row.appendChild(button);
    }
    amount.insertAdjacentElement('afterend',row);
  }

  function installNoteParseAction(note){
    if(byId('parseOperationNoteBtn')) return;
    const wrap=root.document.createElement('div');
    wrap.id='parseOperationNoteWrap';
    wrap.style.marginTop='8px';
    const button=root.document.createElement('button');
    button.type='button';
    button.id='parseOperationNoteBtn';
    button.className='btn secondary';
    button.textContent='Разобрать текст';
    button.style.width='100%';
    button.addEventListener('click',()=>{
      const error=byId('entryError');
      if(error) error.textContent='';
      const result=parseCurrentNote();
      if(!result.ok&&result.error!=='note_empty'&&error) error.textContent='Не удалось разобрать текст.';
    });
    wrap.appendChild(button);
    wrap.appendChild(makeHelper('Если текст введён или продиктован системной клавиатурой, нажмите здесь: FamilyPilot извлечёт сумму и точную категорию, остальное оставит в примечании.'));
    note.insertAdjacentElement('afterend',wrap);
  }

  async function installVoiceAction(sheet,voiceAvailable){
    if(byId('voiceOperationBtn')) return;
    const anchor=byId('voiceOperationAnchor');
    const wrap=root.document.createElement('div');
    wrap.id='voiceOperationWrap';
    wrap.style.marginBottom='12px';
    const button=root.document.createElement('button');
    button.type='button';
    button.id='voiceOperationBtn';
    button.className='btn secondary';
    button.textContent=voiceAvailable?'🎤 Продиктовать операцию':'Голосовой ввод FamilyPilot недоступен';
    button.setAttribute('aria-label','Голосовой ввод FamilyPilot — продиктовать всю операцию');
    button.style.width='100%';
    button.disabled=!voiceAvailable;
    if(voiceAvailable){
      button.addEventListener('click',async()=>{
        const active=root.document.activeElement;
        if(active&&typeof active.blur==='function') active.blur();
        button.disabled=true;
        const error=byId('entryError');
        if(error) error.textContent='';
        const result=await dictate();
        if(!result.ok&&error) error.textContent=result.error==='speech_recognition_failed'?'Не удалось распознать речь.':'Голосовой ввод недоступен.';
        button.disabled=false;
      });
    }
    wrap.appendChild(button);
    wrap.appendChild(makeHelper(voiceAvailable
      ?'Это голосовой ввод FamilyPilot: распознает всю операцию — сумму, точную категорию и примечание. Системный микрофон клавиатуры диктует только в текущее поле.'
      :'На этом устройстве или для выбранного языка локальное распознавание недоступно. Используйте ручной ввод.'));
    if(anchor) anchor.appendChild(wrap);
    else{
      const head=sheet.querySelector('.entry-head');
      if(head?.nextSibling) sheet.insertBefore(wrap,head.nextSibling);else sheet.prepend(wrap);
    }
  }

  async function install(){
    if(!root?.document||root.__FP_VOICE_V1_FORM_READY__) return false;
    const amount=byId('amountInput'),note=byId('noteInput'),sheet=amount?.closest('.sheet');
    if(!amount||!note||!sheet||!root.FamilyPilotVoiceV1) return false;

    installArithmeticControls(amount);
    installNoteParseAction(note);
    const voiceAvailable=await available();
    await installVoiceAction(sheet,voiceAvailable);

    root.__FP_VOICE_V1_FORM_READY__=true;
    return true;
  }

  return Object.freeze({version:1,categoriesFromForm,applyText,parseCurrentNote,insertAmountToken,dictate,available,install});
});

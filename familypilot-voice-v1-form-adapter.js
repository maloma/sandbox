(function installFamilyPilotVoiceV1FormAdapter(root,factory){
  'use strict';
  const api=factory(root);
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root&&root.document) root.FamilyPilotVoiceV1FormAdapter=api;
})(typeof globalThis!=='undefined'?globalThis:this,function createFamilyPilotVoiceV1FormAdapter(root){
  'use strict';

  const byId=id=>root?.document?.getElementById(id)||null;
  const provider=()=>root?.FamilyPilotOnDeviceSpeechV1||null;

  function categoriesFromForm(){
    const select=byId('categoryInput');
    if(!select) return [];
    return [...select.options].map(option=>({id:String(option.value),name:String(option.textContent||'')}));
  }

  function applyParsed(result){
    if(!result?.ok||!result.draft) return result;
    const amount=byId('amountInput'),category=byId('categoryInput'),note=byId('noteInput');
    if(!amount||!category||!note) return Object.freeze({ok:false,error:'voice_form_unavailable'});
    if(result.draft.amount!=null){
      amount.value=String(result.draft.amount).replace('.',',');
      amount.dispatchEvent(new Event('input',{bubbles:true}));
    }
    if(result.draft.categoryId!=null){
      category.value=result.draft.categoryId;
      category.dispatchEvent(new Event('change',{bubbles:true}));
    }
    note.value=result.draft.note;
    note.dispatchEvent(new Event('input',{bubbles:true}));
    return Object.freeze({ok:true,draft:result.draft});
  }

  function applyText(text){
    const core=root?.FamilyPilotVoiceV1;
    if(!core?.parseTranscript) return Object.freeze({ok:false,error:'voice_core_unavailable'});
    return applyParsed(core.parseTranscript({text,categories:categoriesFromForm()}));
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

  async function install(){
    if(!root?.document||root.__FP_VOICE_V1_FORM_READY__) return false;
    const amount=byId('amountInput'),sheet=amount?.closest('.sheet');
    if(!amount||!sheet||!root.FamilyPilotVoiceV1) return false;
    if(!(await available())) return false;

    const button=root.document.createElement('button');
    button.type='button';
    button.id='voiceOperationBtn';
    button.className='btn secondary';
    button.textContent='Продиктовать';
    button.setAttribute('aria-label','Продиктовать операцию');
    button.style.width='100%';
    button.style.marginTop='12px';
    button.addEventListener('click',async()=>{
      button.disabled=true;
      const error=byId('entryError');
      if(error) error.textContent='';
      const result=await dictate();
      if(!result.ok&&error) error.textContent=result.error==='speech_recognition_failed'?'Не удалось распознать речь.':'Голосовой ввод недоступен.';
      button.disabled=false;
    });
    const head=sheet.querySelector('.entry-head');
    if(head?.nextSibling) sheet.insertBefore(button,head.nextSibling);else sheet.prepend(button);
    root.__FP_VOICE_V1_FORM_READY__=true;
    return true;
  }

  return Object.freeze({version:1,categoriesFromForm,applyText,dictate,available,install});
});

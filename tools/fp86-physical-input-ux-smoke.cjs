'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const adapterSource=fs.readFileSync(path.join(root,'familypilot-voice-v1-form-adapter.js'),'utf8');
const coreSource=fs.readFileSync(path.join(root,'familypilot-voice-v1.js'),'utf8');

assert.match(adapterSource,/FP86_ENTRY_UX_RESET_R1/);
assert.match(adapterSource,/fp-unsaved-inline/);
assert.match(adapterSource,/sheet\.insertBefore\(w,head\.nextSibling\)/);
assert.doesNotMatch(adapterSource,/fp-unsaved-confirm\{position:fixed/);
assert.doesNotMatch(adapterSource,/document\.body\.appendChild\(w\)/);
assert.match(adapterSource,/Максимум 999 999,99\./);
assert.doesNotMatch(adapterSource,/Максимум одной операции:/);
assert.match(adapterSource,/placeCloudAccount/);
assert.match(adapterSource,/fpCloudAccount/);
assert.match(adapterSource,/moreScreen/);
assert.match(adapterSource,/fp-cloud-settings-card/);
assert.match(adapterSource,/\.fp-hints-hidden \.meta-note/);
assert.match(adapterSource,/\.fp-hints-hidden \.field-help/);
assert.match(adapterSource,/Слышу:/);
assert.match(adapterSource,/Слушаю — нажмите, чтобы закончить/);
assert.match(adapterSource,/\['\+','−','×','÷'\]/);
assert.doesNotMatch(adapterSource,/\['\+','−','×','÷','\(','\)'\]/);
assert.match(adapterSource,/a\.oninput=expressionInput/);
assert.match(adapterSource,/addEventListener\('click',intercept,true\)/);
assert.doesNotMatch(adapterSource,/note\.addEventListener\(['"]input['"]/);
assert.doesNotMatch(adapterSource,/setInterval\(|autosave|autoSave/i);

class FakeEvent{
  constructor(type,options={}){
    this.type=type;
    this.bubbles=Boolean(options.bubbles);
  }
}

const amountEvents=[];
const noteEvents=[];
const categoryEvents=[];

const amount={
  value:'',
  selectionStart:0,
  selectionEnd:0,
  focused:false,
  style:{},
  className:'',
  dispatchEvent(event){
    amountEvents.push(event.type);
    if(event.type==='input'&&typeof this.oninput==='function')this.oninput({target:this});
    return true;
  },
  focus(){this.focused=true},
  setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end}
};

const category={
  value:'',
  options:[
    {value:'',textContent:'Выберите категорию',disabled:true},
    {value:'products',textContent:'Продукты'},
    {value:'fuel',textContent:'Топливо'},
    {value:'transport',textContent:'Транспорт'}
  ],
  dispatchEvent(event){
    categoryEvents.push(event.type);
    return true;
  }
};

const note={
  value:'',
  dispatchEvent(event){
    noteEvents.push(event.type);
    return true;
  }
};

const resultNode={textContent:'',style:{},className:''};
const liveNode={textContent:'',hidden:true,dataset:{},style:{}};
const editing={value:''};
const date={value:'2026-09-01T20:00'};
const save={
  attrs:{},
  dataset:{},
  setAttribute(k,v){this.attrs[k]=String(v)}
};
const entryError={textContent:''};
const categoryError={textContent:''};

const amountLimitHint={
  textContent:'Максимум одной операции: 999 999,99 €',
  id:'',
  className:'meta-note'
};
const amountField={
  querySelectorAll(selector){
    return selector==='.meta-note'?[amountLimitHint]:[];
  }
};
amount.closest=selector=>selector==='.field'?amountField:null;

const cloudClassSet=new Set();
const cloud={
  parentNode:{},
  classList:{add(...items){for(const item of items)cloudClassSet.add(item)}},
  removeAttribute(name){if(name==='style')this.styleRemoved=true}
};
const settingsGroup={nextSibling:{id:'after-settings'}};
const more={
  children:[],
  querySelector(selector){return selector==='.settings-group'?settingsGroup:null},
  insertBefore(node,before){this.children.push({node,before});node.parentNode=this},
  appendChild(node){this.children.push({node,before:null});node.parentNode=this}
};

const nodes={
  amountInput:amount,
  categoryInput:category,
  noteInput:note,
  amountCalculation:resultNode,
  voiceLiveTranscript:liveNode,
  editingId:editing,
  dateInput:date,
  saveOperationBtn:save,
  entryError,
  categoryError,
  fpCloudAccount:cloud,
  moreScreen:more
};

const document={
  getElementById:id=>nodes[id]||null,
  querySelectorAll:()=>[],
  querySelector:()=>null,
  createElement:()=>({className:'',textContent:'',style:{}})
};

const context={
  document,
  Event:FakeEvent,
  console,
  Intl,
  Object,
  Array,
  Set,
  Map,
  RegExp,
  String,
  Number,
  Math,
  JSON,
  Promise,
  setTimeout,
  clearTimeout
};
context.globalThis=context;

vm.createContext(context);
vm.runInContext(coreSource,context,{filename:'familypilot-voice-v1.js'});
vm.runInContext(adapterSource,context,{filename:'familypilot-voice-v1-form-adapter.js'});

const api=context.FamilyPilotVoiceV1FormAdapter;
assert(api);
assert.strictEqual(api.version,1);
assert.strictEqual(api.architecture,'FP86_ENTRY_UX_RESET_R1');

assert.deepStrictEqual(JSON.parse(JSON.stringify(api.categoriesFromForm())),[
  {id:'products',name:'Продукты'},
  {id:'fuel',name:'Топливо'},
  {id:'transport',name:'Транспорт'}
]);

assert.strictEqual(api.normalizeVoicePrefix('12:45 Продукты кофе'),'12,45 Продукты кофе');
assert.strictEqual(api.normalizeVoicePrefix('3:05 Топливо вода'),'3,05 Топливо вода');
assert.strictEqual(api.normalizeVoicePrefix('7 запятая 61 Продукты вода'),'7,61 Продукты вода');
assert.strictEqual(api.normalizeVoicePrefix('12 плюс 7 Продукты обед'),'19 Продукты обед');
assert.strictEqual(api.normalizeVoicePrefix('20 € Топливо Shell'),'20 Топливо Shell');
assert.strictEqual(api.normalizeVoicePrefix('20 Продукты кофе плюс булочка'),'20 Продукты кофе плюс булочка');

const numericOnly=api.parseStructuredText('200');
assert.strictEqual(numericOnly.ok,true);
assert.strictEqual(numericOnly.draft.amount,200);
assert.strictEqual(numericOnly.draft.categoryId,null);
assert.strictEqual(numericOnly.draft.note,'');

assert.strictEqual(api.sanitizeAmountExpressionValue(' 12,50 + 7,50 '),'12,50+7,50');
assert.strictEqual(api.sanitizeAmountExpressionValue('12×2−1'),'12*2-1');
amount.oninput=event=>{event.target.value=api.sanitizeAmountExpressionValue(event.target.value)};

for(const [display,internal] of [['+','+'],['−','-'],['×','*'],['÷','/']]){
  amount.value='12';
  amount.selectionStart=2;
  amount.selectionEnd=2;
  amountEvents.length=0;
  amount.focused=false;
  assert.strictEqual(api.insertAmountToken(display),true);
  assert.strictEqual(amount.value,'12'+internal);
  assert.ok(amountEvents.includes('input'));
  assert.strictEqual(amount.focused,true);
}
assert.strictEqual(api.insertAmountToken('('),false);
assert.strictEqual(api.insertAmountToken(')'),false);

amount.value='12/5';
api.updateAmountResult();
assert.match(resultNode.textContent,/^2,40\s€$/u);

amount.value='20';
category.value='';
assert.deepStrictEqual(JSON.parse(JSON.stringify(api.minimumEntryValidity())),{ok:false,field:'category'});
category.value='fuel';
assert.deepStrictEqual(JSON.parse(JSON.stringify(api.minimumEntryValidity())),{ok:true});

api.compactMaximumHint();
assert.strictEqual(amountLimitHint.textContent,'Максимум 999 999,99.');
assert.strictEqual(amountLimitHint.id,'amountLimitHint');

assert.strictEqual(api.placeCloudAccount(),true);
assert.strictEqual(cloud.parentNode,more);
assert.ok(cloudClassSet.has('fp-cloud-settings-card'));
assert.ok(cloudClassSet.has('card'));
assert.ok(cloudClassSet.has('section'));
assert.strictEqual(cloud.styleRemoved,true);

const base={editing:'',amount:'',category:'',date:'2026-09-01T20:00',note:''};
assert.strictEqual(api.sameEntrySnapshot(base,{...base}),true);
assert.strictEqual(api.sameEntrySnapshot(base,{...base,note:'x'}),false);

(async()=>{
  amount.value='';
  category.value='';
  note.value='';
  liveNode.hidden=true;
  liveNode.textContent='';
  let finishRecognize;
  context.FamilyPilotOnDeviceSpeechV1={
    mode:'on_device',
    recognize(onPartial){
      onPartial('200 Топливо');
      return new Promise(resolve=>{finishRecognize=resolve});
    }
  };
  const pending=api.dictate();
  await Promise.resolve();
  assert.strictEqual(liveNode.hidden,false);
  assert.strictEqual(liveNode.textContent,'Слышу: 200 Топливо');
  assert.strictEqual(amount.value,'');
  assert.strictEqual(category.value,'');
  assert.strictEqual(note.value,'');
  finishRecognize({ok:true,text:'200 Топливо Shell'});
  const final=await pending;
  assert.strictEqual(final.ok,true);
  assert.strictEqual(amount.value,'200');
  assert.strictEqual(category.value,'fuel');
  assert.strictEqual(note.value,'Shell');

  console.log('FP86_ENTRY_UX_RESET_R1_PASS');
  console.log('FP86_INLINE_UNSAVED_CONFIRM_ARCH_PASS');
  console.log('FP86_COMPACT_AMOUNT_LIMIT_PASS');
  console.log('FP86_CLOUD_ACCOUNT_SETTINGS_PLACEMENT_PASS');
  console.log('FP86_HINTS_OFF_LAYOUT_CONTRACT_PASS');
  console.log('FP86_LIVE_PARTIAL_DISPLAY_ONLY_PRESERVED_PASS');
  console.log('FP86_NUMERIC_ONLY_AMOUNT_200_PRESERVED_PASS');
  console.log('FP86_REQUIRED_AMOUNT_CATEGORY_GUARD_PRESERVED_PASS');
  console.log('FP86_RUNTIME_ARITHMETIC_OPERATOR_PRESERVED_PASS');
  console.log('FP86_NO_AUTO_SAVE_PRESERVED_PASS');
})();

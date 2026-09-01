'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const adapterSource=fs.readFileSync(path.join(root,'familypilot-voice-v1-form-adapter.js'),'utf8');
const coreSource=fs.readFileSync(path.join(root,'familypilot-voice-v1.js'),'utf8');

assert.match(adapterSource,/Слушаю — нажмите, чтобы закончить/);
assert.match(adapterSource,/Слышу:/);
assert.match(adapterSource,/voiceLiveTranscript/);
assert.match(adapterSource,/aria-live/);
assert.match(adapterSource,/Не услышал речь\. Попробуйте говорить чуть громче или ближе к телефону\./);
assert.match(adapterSource,/fp-record-dot/);
assert.match(adapterSource,/stopDictation/);
assert.match(adapterSource,/familypilot\.voice\.enabled\.v1/);
assert.match(adapterSource,/familypilot\.hints\.enabled\.v1/);
assert.match(adapterSource,/voiceOperationWrap/);
assert.match(adapterSource,/\.hidden=!v/);
assert.match(adapterSource,/\['\+','−','×','÷'\]/);
assert.doesNotMatch(adapterSource,/\['\+','−','×','÷','\(','\)'\]/);
assert.match(adapterSource,/minimumFractionDigits:frac\?2:0/);
assert.match(adapterSource,/fontSize:/);
assert.match(adapterSource,/Порядок: сумма, точная категория, затем примечание/);
assert.match(adapterSource,/Выберите категорию/);
assert.match(adapterSource,/Сохранить\?/);
assert.match(adapterSource,/Не сохранять/);
assert.match(adapterSource,/a\.oninput=expressionInput/,'adapter must override legacy numeric-only amount oninput');
assert.match(adapterSource,/addEventListener\('click',intercept,true\)/,'save/close guard must run in capture before legacy bubble handler');
assert.doesNotMatch(adapterSource,/note\.addEventListener\(['"]input['"]/);
assert.doesNotMatch(adapterSource,/setInterval\(|autosave|autoSave/i);

class FakeEvent{constructor(type,options={}){this.type=type;this.bubbles=Boolean(options.bubbles)}}
const amountEvents=[];
const noteEvents=[];
const categoryEvents=[];
const amount={value:'',selectionStart:0,selectionEnd:0,focused:false,style:{},className:'',dispatchEvent(event){amountEvents.push(event.type);if(event.type==='input'&&typeof this.oninput==='function')this.oninput({target:this});return true},focus(){this.focused=true},setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end}};
const category={value:'',options:[{value:'',textContent:'Выберите категорию',disabled:true},{value:'products',textContent:'Продукты'},{value:'fuel',textContent:'Топливо'},{value:'transport',textContent:'Транспорт'}],dispatchEvent(event){categoryEvents.push(event.type);return true}};
const note={value:'',dispatchEvent(event){noteEvents.push(event.type);return true}};
const resultNode={textContent:'',style:{},className:''};
const liveNode={textContent:'',hidden:true,dataset:{},style:{}};
const editing={value:''};
const date={value:'2026-09-01T20:00'};
const save={attrs:{},dataset:{},setAttribute(k,v){this.attrs[k]=String(v)}};
const entryError={textContent:''},categoryError={textContent:''};
const nodes={amountInput:amount,categoryInput:category,noteInput:note,amountCalculation:resultNode,voiceLiveTranscript:liveNode,editingId:editing,dateInput:date,saveOperationBtn:save,entryError,categoryError};
const document={getElementById:id=>nodes[id]||null,querySelectorAll:()=>[],querySelector:()=>null};
const context={document,Event:FakeEvent,console,Intl,Object,Array,Set,Map,RegExp,String,Number,Math,JSON,Promise,setTimeout,clearTimeout};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(coreSource,context,{filename:'familypilot-voice-v1.js'});
vm.runInContext(adapterSource,context,{filename:'familypilot-voice-v1-form-adapter.js'});
const api=context.FamilyPilotVoiceV1FormAdapter;
assert(api);
assert.strictEqual(api.version,3);

assert.deepStrictEqual(JSON.parse(JSON.stringify(api.categoriesFromForm())),[
  {id:'products',name:'Продукты'},
  {id:'fuel',name:'Топливо'},
  {id:'transport',name:'Транспорт'}
],'blank category placeholder must never enter voice category candidates');

assert.strictEqual(api.normalizeVoicePrefix('12:45 Продукты кофе'),'12,45 Продукты кофе');
assert.strictEqual(api.normalizeVoicePrefix('3:05 Продукты вода'),'3,05 Продукты вода');
assert.strictEqual(api.normalizeVoicePrefix('7 запятая 61 Продукты вода'),'7,61 Продукты вода');
assert.strictEqual(api.normalizeVoicePrefix('12 плюс 7 Продукты обед'),'19 Продукты обед');
assert.strictEqual(api.normalizeVoicePrefix('12 умножить на 2 Продукты обед'),'24 Продукты обед');
assert.strictEqual(api.normalizeVoicePrefix('20 евро Топливо Shell'),'20 Топливо Shell');
assert.strictEqual(api.normalizeVoicePrefix('20 € Топливо Shell'),'20 Топливо Shell');
assert.strictEqual(api.normalizeVoicePrefix('20 Продукты кофе плюс булочка'),'20 Продукты кофе плюс булочка');

const numericOnly=api.parseStructuredText('200');
assert.strictEqual(numericOnly.ok,true);
assert.strictEqual(numericOnly.draft.amount,200);
assert.strictEqual(numericOnly.draft.categoryId,null);
assert.strictEqual(numericOnly.draft.note,'');

note.value='12:45 Продукты кофе';category.value='transport';amount.value='';
const parsedTime=api.parseCurrentNote();
assert.strictEqual(parsedTime.ok,true);assert.strictEqual(amount.value,'12,45');assert.strictEqual(category.value,'products');assert.strictEqual(note.value,'кофе');

note.value='3:05 Топливо Shell';category.value='products';amount.value='';
const parsedSmall=api.parseCurrentNote();
assert.strictEqual(parsedSmall.ok,true);assert.strictEqual(amount.value,'3,05');assert.strictEqual(category.value,'fuel');assert.strictEqual(note.value,'Shell');

note.value='20 Shell Топливо';category.value='transport';amount.value='';
const lateCategory=api.parseCurrentNote();
assert.strictEqual(lateCategory.ok,true);assert.strictEqual(amount.value,'20');assert.strictEqual(category.value,'transport','category appearing after note text must not be extracted');assert.strictEqual(note.value,'Shell Топливо');

assert.strictEqual(api.sanitizeAmountExpressionValue(' 12,50 + 7,50 '),'12,50+7,50');
assert.strictEqual(api.sanitizeAmountExpressionValue('12×2−1'),'12*2-1');
assert.strictEqual(api.sanitizeAmountExpressionValue('12abc+7'),'12+7');
amount.oninput=event=>{event.target.value=api.sanitizeAmountExpressionValue(event.target.value)};
for(const [display,internal] of [['+','+'],['−','-'],['×','*'],['÷','/']]){
  amount.value='12';amount.selectionStart=2;amount.selectionEnd=2;amountEvents.length=0;amount.focused=false;
  assert.strictEqual(api.insertAmountToken(display),true);
  assert.strictEqual(amount.value,'12'+internal,'runtime amount oninput must preserve arithmetic operator');
  assert.ok(amountEvents.includes('input'));assert.strictEqual(amount.focused,true);
}
assert.strictEqual(api.insertAmountToken('('),false);assert.strictEqual(api.insertAmountToken(')'),false);

amount.value='12/5';api.updateAmountResult();assert.match(resultNode.textContent,/^2,40\s€$/u);assert.strictEqual(resultNode.style.fontSize,'32px');
amount.value='999999,99';api.updateAmountResult();assert.match(resultNode.textContent,/999[\s\u00a0]999,99/);assert.ok(['28px','24px','20px'].includes(resultNode.style.fontSize));

amount.value='20';category.value='';assert.deepStrictEqual(JSON.parse(JSON.stringify(api.minimumEntryValidity())),{ok:false,field:'category'});
category.value='fuel';assert.deepStrictEqual(JSON.parse(JSON.stringify(api.minimumEntryValidity())),{ok:true});
amount.value='';assert.deepStrictEqual(JSON.parse(JSON.stringify(api.minimumEntryValidity())),{ok:false,field:'amount'});

const base={editing:'',amount:'',category:'',date:'2026-09-01T20:00',note:''};
assert.strictEqual(api.sameEntrySnapshot(base,{...base}),true);
assert.strictEqual(api.sameEntrySnapshot(base,{...base,note:'x'}),false);

(async()=>{
  amount.value='';category.value='';note.value='';liveNode.hidden=true;liveNode.textContent='';
  let finishRecognize;
  context.FamilyPilotOnDeviceSpeechV1={mode:'on_device',recognize(onPartial){onPartial('200 Топливо');return new Promise(resolve=>{finishRecognize=resolve})}};
  const pending=api.dictate();
  await Promise.resolve();
  assert.strictEqual(liveNode.hidden,false);
  assert.strictEqual(liveNode.textContent,'Слышу: 200 Топливо');
  assert.strictEqual(amount.value,'','partial text must not mutate amount before finalization');
  assert.strictEqual(category.value,'','partial text must not mutate category before finalization');
  assert.strictEqual(note.value,'','partial text must not mutate note before finalization');
  finishRecognize({ok:true,text:'200 Топливо Shell'});
  const final=await pending;
  assert.strictEqual(final.ok,true);
  assert.strictEqual(amount.value,'200');
  assert.strictEqual(category.value,'fuel');
  assert.strictEqual(note.value,'Shell');

  console.log('FP86_PHYSICAL_INPUT_UX_V3_PASS');
  console.log('FP86_LIVE_PARTIAL_DISPLAY_ONLY_PASS');
  console.log('FP86_NUMERIC_ONLY_AMOUNT_200_PASS');
  console.log('FP86_BLANK_CATEGORY_CANDIDATE_FILTER_PASS');
  console.log('FP86_REQUIRED_AMOUNT_CATEGORY_GUARD_PASS');
  console.log('FP86_UNSAVED_CLOSE_CONFIRM_CONTRACT_PASS');
  console.log('FP86_RUNTIME_ARITHMETIC_OPERATOR_PASS');
  console.log('FP86_AMOUNT_FIRST_CATEGORY_SECOND_PASS');
  console.log('FP86_TIME_LIKE_DECIMAL_NORMALIZATION_PASS');
  console.log('FP86_PROMINENT_AMOUNT_RESULT_PASS');
  console.log('FP86_NO_AUTO_SAVE_PRESERVED_PASS');
})();

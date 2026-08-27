'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const adapterSource=fs.readFileSync(path.join(root,'familypilot-voice-v1-form-adapter.js'),'utf8');
const coreSource=fs.readFileSync(path.join(root,'familypilot-voice-v1.js'),'utf8');

assert.match(adapterSource,/Слушаю — нажмите, чтобы закончить/);
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
assert.doesNotMatch(adapterSource,/note\.addEventListener\(['"]input['"]/);
assert.doesNotMatch(adapterSource,/saveOperation|entrySave\.click|\.save\(/);

class FakeEvent{constructor(type,options={}){this.type=type;this.bubbles=Boolean(options.bubbles)}}
const amountEvents=[];
const noteEvents=[];
const categoryEvents=[];
const amount={
  value:'',selectionStart:0,selectionEnd:0,focused:false,style:{},className:'',
  dispatchEvent(event){amountEvents.push(event.type);return true},
  focus(){this.focused=true},
  setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end}
};
const category={
  value:'',
  options:[{value:'products',textContent:'Продукты'},{value:'fuel',textContent:'Топливо'},{value:'transport',textContent:'Транспорт'}],
  dispatchEvent(event){categoryEvents.push(event.type);return true}
};
const note={value:'',dispatchEvent(event){noteEvents.push(event.type);return true}};
const resultNode={textContent:'',style:{},className:''};
const nodes={amountInput:amount,categoryInput:category,noteInput:note,amountCalculation:resultNode};
const document={getElementById:id=>nodes[id]||null};
const context={document,Event:FakeEvent,console,Intl,Object,Array,Set,Map,RegExp,String,Number,Math,JSON};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(coreSource,context,{filename:'familypilot-voice-v1.js'});
vm.runInContext(adapterSource,context,{filename:'familypilot-voice-v1-form-adapter.js'});
const api=context.FamilyPilotVoiceV1FormAdapter;
assert(api);

assert.strictEqual(api.normalizeVoicePrefix('12:45 Продукты кофе'),'12,45 Продукты кофе');
assert.strictEqual(api.normalizeVoicePrefix('3:05 Продукты вода'),'3,05 Продукты вода');
assert.strictEqual(api.normalizeVoicePrefix('7 запятая 61 Продукты вода'),'7,61 Продукты вода');
assert.strictEqual(api.normalizeVoicePrefix('12 плюс 7 Продукты обед'),'19 Продукты обед');
assert.strictEqual(api.normalizeVoicePrefix('12 умножить на 2 Продукты обед'),'24 Продукты обед');
assert.strictEqual(api.normalizeVoicePrefix('20 евро Топливо Shell'),'20 Топливо Shell');
assert.strictEqual(api.normalizeVoicePrefix('20 € Топливо Shell'),'20 Топливо Shell');
assert.strictEqual(api.normalizeVoicePrefix('20 Продукты кофе плюс булочка'),'20 Продукты кофе плюс булочка');

note.value='12:45 Продукты кофе';
category.value='transport';
amount.value='';
const parsedTime=api.parseCurrentNote();
assert.strictEqual(parsedTime.ok,true);
assert.strictEqual(amount.value,'12,45');
assert.strictEqual(category.value,'products');
assert.strictEqual(note.value,'кофе');

note.value='3:05 Топливо Shell';
category.value='products';
amount.value='';
const parsedSmall=api.parseCurrentNote();
assert.strictEqual(parsedSmall.ok,true);
assert.strictEqual(amount.value,'3,05');
assert.strictEqual(category.value,'fuel');
assert.strictEqual(note.value,'Shell');

note.value='20 Shell Топливо';
category.value='transport';
amount.value='';
const lateCategory=api.parseCurrentNote();
assert.strictEqual(lateCategory.ok,true);
assert.strictEqual(amount.value,'20');
assert.strictEqual(category.value,'transport','category appearing after note text must not be extracted');
assert.strictEqual(note.value,'Shell Топливо');

for(const [display,internal] of [['+','+'],['−','-'],['×','*'],['÷','/']]){
  amount.value='12';amount.selectionStart=2;amount.selectionEnd=2;amountEvents.length=0;amount.focused=false;
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
assert.strictEqual(resultNode.style.fontSize,'32px');
amount.value='999999,99';
api.updateAmountResult();
assert.match(resultNode.textContent,/999[\s\u00a0]999,99/);
assert.ok(['28px','24px','20px'].includes(resultNode.style.fontSize));

console.log('FP86_PHYSICAL_INPUT_UX_V2_PASS');
console.log('FP86_VISIBLE_RECORDING_STATE_PASS');
console.log('FP86_USER_CONTROLLED_STOP_UI_PASS');
console.log('FP86_AMOUNT_FIRST_CATEGORY_SECOND_PASS');
console.log('FP86_TIME_LIKE_DECIMAL_NORMALIZATION_PASS');
console.log('FP86_VOICE_ARITHMETIC_NORMALIZATION_PASS');
console.log('FP86_NOTE_OPERATOR_WORDS_PRESERVED_PASS');
console.log('FP86_PROMINENT_AMOUNT_RESULT_PASS');
console.log('FP86_VOICE_AND_HINT_SETTINGS_PASS');
console.log('FP86_NO_SILENT_NOTE_AUTO_PARSE_PASS');
console.log('FP86_NO_AUTO_SAVE_PRESERVED_PASS');

'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const adapterSource=fs.readFileSync(path.join(root,'familypilot-voice-v1-form-adapter.js'),'utf8');
const indexSource=fs.readFileSync(path.join(root,'index.html'),'utf8');

assert.match(adapterSource,/Продиктовать операцию/);
assert.match(adapterSource,/Это голосовой ввод FamilyPilot/);
assert.match(adapterSource,/Системный микрофон клавиатуры диктует только в текущее поле/);
assert.match(adapterSource,/Разобрать текст/);
assert.match(adapterSource,/продиктован системной клавиатурой/);
assert.match(adapterSource,/\['\+','−','×','÷','\(','\)'\]/);
assert.match(adapterSource,/OPERATOR_MAP/);
assert.match(adapterSource,/active\.blur\(\)/);
assert.doesNotMatch(adapterSource,/note\.addEventListener\(['"]input['"]/);
assert.doesNotMatch(adapterSource,/saveOperation|entrySave\.click|\.save\(/);
assert.match(indexSource,/id="amountInput"[^>]*inputmode="decimal"/);
assert.match(indexSource,/12,50\+7,50/);

class FakeEvent{
  constructor(type,options={}){this.type=type;this.bubbles=Boolean(options.bubbles)}
}

const amountEvents=[];
const noteEvents=[];
const categoryEvents=[];
const amount={
  value:'',selectionStart:0,selectionEnd:0,focused:false,
  dispatchEvent(event){amountEvents.push(event.type);return true},
  focus(){this.focused=true},
  setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end}
};
const category={
  value:'',
  options:[{value:'products',textContent:'Продукты'},{value:'transport',textContent:'Транспорт'}],
  dispatchEvent(event){categoryEvents.push(event.type);return true}
};
const note={
  value:'',
  dispatchEvent(event){noteEvents.push(event.type);return true}
};
const nodes={amountInput:amount,categoryInput:category,noteInput:note};
const document={getElementById:id=>nodes[id]||null};
const context={document,Event:FakeEvent,console};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(adapterSource,context,{filename:'familypilot-voice-v1-form-adapter.js'});
const api=context.FamilyPilotVoiceV1FormAdapter;
assert(api);

for(const [display,internal] of [['+','+'],['−','-'],['×','*'],['÷','/'],['(', '('],[')', ')']]){
  amount.value='12';
  amount.selectionStart=2;
  amount.selectionEnd=2;
  amountEvents.length=0;
  amount.focused=false;
  assert.strictEqual(api.insertAmountToken(display),true);
  assert.strictEqual(amount.value,'12'+internal);
  assert.deepStrictEqual(amountEvents,['input']);
  assert.strictEqual(amount.focused,true);
  assert.strictEqual(amount.selectionStart,2+internal.length);
  assert.strictEqual(amount.selectionEnd,2+internal.length);
}

let parserCall=null;
context.FamilyPilotVoiceV1={
  parseTranscript(input){
    parserCall=input;
    return {ok:true,draft:{amount:47,categoryId:'products',note:'Lidl по дороге домой'}};
  }
};
note.value='47 Продукты Lidl по дороге домой';
amount.value='';
category.value='';
amountEvents.length=0;
categoryEvents.length=0;
noteEvents.length=0;
const parsed=api.parseCurrentNote();
assert.strictEqual(parsed.ok,true);
assert.strictEqual(parserCall.text,'47 Продукты Lidl по дороге домой');
assert.deepStrictEqual(parserCall.categories,[
  {id:'products',name:'Продукты'},
  {id:'transport',name:'Транспорт'}
]);
assert.strictEqual(amount.value,'47');
assert.strictEqual(category.value,'products');
assert.strictEqual(note.value,'Lidl по дороге домой');
assert.deepStrictEqual(amountEvents,['input']);
assert.deepStrictEqual(categoryEvents,['change']);
assert.deepStrictEqual(noteEvents,['input']);

note.value='   ';
const empty=api.parseCurrentNote();
assert.strictEqual(empty.ok,false);
assert.strictEqual(empty.error,'note_empty');

console.log('FP86_PHYSICAL_INPUT_UX_PASS');
console.log('FP86_APP_LEVEL_VOICE_AFFORDANCE_PASS');
console.log('FP86_ARITHMETIC_OPERATOR_CONTROLS_PASS');
console.log('FP86_EXPLICIT_NOTE_PARSE_PASS');
console.log('FP86_NO_SILENT_NOTE_AUTO_PARSE_PASS');
console.log('FP86_NO_AUTO_SAVE_PRESERVED_PASS');

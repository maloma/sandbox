'use strict';
const assert=require('assert');
const Voice=require('../familypilot-voice-v1.js');

const categories=[
  {id:'cat-grocery',name:'Продукты'},
  {id:'cat-cafe',name:'Кафе'},
  {id:'cat-custom',name:'Машина Лены'},
  {id:'cat-sk',name:'Potraviny'}
];

let r=Voice.parseTranscript({text:'47 Продукты Lidl по дороге домой',categories});
assert.equal(r.ok,true);
assert.equal(r.draft.amount,47);
assert.equal(r.draft.categoryId,'cat-grocery');
assert.equal(r.draft.note,'Lidl по дороге домой');

r=Voice.parseTranscript({text:'Продукты 47 Lidl',categories});
assert.equal(r.draft.amount,47);
assert.equal(r.draft.categoryId,'cat-grocery');
assert.equal(r.draft.note,'Lidl');

r=Voice.parseTranscript({text:'47 продукты Lidl',categories});
assert.equal(r.draft.categoryId,'cat-grocery','exact category name matching is case-insensitive only');
assert.equal(r.draft.note,'Lidl');

r=Voice.parseTranscript({text:'47 еда Lidl',categories});
assert.equal(r.draft.categoryId,null,'synonyms must not map to categories');
assert.equal(r.draft.note,'еда Lidl');

r=Voice.parseTranscript({text:'47 groceries Lidl',categories});
assert.equal(r.draft.categoryId,null,'translations must not map to categories');
assert.equal(r.draft.note,'groceries Lidl');

r=Voice.parseTranscript({text:'47 Машина Лены заправка',categories});
assert.equal(r.draft.categoryId,'cat-custom','custom category exact name must work without stored synonyms');
assert.equal(r.draft.note,'заправка');

r=Voice.parseTranscript({text:'47 Potraviny Lidl',categories});
assert.equal(r.draft.categoryId,'cat-sk','different language works when spoken category exactly matches stored name');
assert.equal(r.draft.note,'Lidl');

r=Voice.parseTranscript({text:'47,50 Продукты без пакета',categories});
assert.equal(r.draft.amount,47.5);
assert.equal(r.draft.note,'без пакета');

r=Voice.parseTranscript({text:'47 EUR Продукты Lidl',categories});
assert.equal(r.draft.amount,47);
assert.equal(r.draft.note,'EUR Lidl','currency words/tokens not modeled by v1 remain in note');

r=Voice.parseTranscript({text:'сорок семь Продукты Lidl',categories});
assert.equal(r.draft.amount,null,'number words are not interpreted by FamilyPilot v1; phone STT must provide numeric text to auto-fill amount');
assert.equal(r.draft.categoryId,'cat-grocery');
assert.equal(r.draft.note,'сорок семь Lidl');

r=Voice.parseTranscript({text:'47 12 Продукты',categories});
assert.equal(r.draft.amount,null,'multiple numeric candidates must not be guessed');
assert.equal(r.draft.categoryId,'cat-grocery');
assert.equal(r.draft.note,'47 12');

r=Voice.parseTranscript({text:'47 Кафе? без сахара',categories});
assert.equal(r.draft.categoryId,'cat-cafe');
assert.equal(r.draft.note,'? без сахара','v1 must not restore or rewrite punctuation');

const sourceCategories=JSON.parse(JSON.stringify(categories));
Voice.parseTranscript({text:'47 Продукты Lidl',categories});
assert.deepStrictEqual(categories,sourceCategories,'parser must not mutate categories');

(async()=>{
  const cloud={mode:'cloud',recognize:async()=>({ok:true,text:'47 Продукты'})};
  const blocked=await Voice.recognizeAndParse(cloud,categories);
  assert.equal(blocked.ok,false);
  assert.equal(blocked.error,'on_device_speech_unavailable');

  const onDevice={mode:'on_device',recognize:async()=>({ok:true,text:'47 Продукты Lidl'})};
  const accepted=await Voice.recognizeAndParse(onDevice,categories);
  assert.equal(accepted.ok,true);
  assert.equal(accepted.draft.amount,47);
  assert.equal(accepted.draft.categoryId,'cat-grocery');
  assert.equal(accepted.draft.note,'Lidl');

  const elements={
    amountInput:{value:'',dispatchEvent(){}},
    categoryInput:{value:'',options:categories.map(c=>({value:c.id,textContent:c.name})),dispatchEvent(){}},
    noteInput:{value:'',dispatchEvent(){}}
  };
  global.document={getElementById:id=>elements[id]||null};
  global.FamilyPilotVoiceV1=Voice;
  const Adapter=require('../familypilot-voice-v1-form-adapter.js');
  const applied=Adapter.applyText('47 Продукты Lidl');
  assert.equal(applied.ok,true);
  assert.equal(elements.amountInput.value,'47');
  assert.equal(elements.categoryInput.value,'cat-grocery');
  assert.equal(elements.noteInput.value,'Lidl');
  assert.equal(typeof Adapter.save,'undefined','voice adapter must not expose or trigger financial save');

  console.log('FP86_VOICE_V1_DOMAIN_PASS');
  console.log('FP86_EXACT_CATEGORY_ONLY_PASS');
  console.log('FP86_REMAINDER_TO_NOTE_PASS');
  console.log('FP86_ON_DEVICE_PROVIDER_BOUNDARY_PASS');
})();

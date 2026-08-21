(function installFamilyPilotVoiceV1(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root&&root.document&&!root.FamilyPilotVoiceV1) root.FamilyPilotVoiceV1=api;
})(typeof globalThis!=='undefined'?globalThis:this,function createFamilyPilotVoiceV1(){
  'use strict';

  const MAX_AMOUNT=999999.99;
  const MAX_NOTE_LENGTH=1000;
  const WORD_CHAR=/[\p{L}\p{N}_]/u;
  const NUMERIC_RUN=/[+\-−]?(?:\d[\d.,]*|[.,]\d[\d.,]*)/gu;
  const VALID_AMOUNT_TOKEN=/^(?:\d{1,6}(?:[.,]\d{0,2})?|[.,]\d{1,2})$/u;

  const freeze=value=>Object.freeze(value);
  const failure=error=>freeze({ok:false,error});
  const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);

  function normalizeCategories(input){
    if(!Array.isArray(input)) return null;
    const out=[];
    const ids=new Set();
    for(const item of input){
      if(!isObject(item)||typeof item.id!=='string'||!item.id||typeof item.name!=='string'||!item.name.trim()||ids.has(item.id)) return null;
      ids.add(item.id);
      out.push(freeze({id:item.id,name:item.name}));
    }
    return freeze(out);
  }

  function boundaryOkay(text,start,end){
    const before=start>0?text[start-1]:'';
    const after=end<text.length?text[end]:'';
    return (!before||!WORD_CHAR.test(before))&&(!after||!WORD_CHAR.test(after));
  }

  function numericCandidates(text){
    const candidates=[];
    NUMERIC_RUN.lastIndex=0;
    for(const match of text.matchAll(NUMERIC_RUN)){
      const raw=match[0],start=match.index,end=match.index+raw.length;
      if(!boundaryOkay(text,start,end)) continue;
      const unsigned=raw[0]!=='-'&&raw[0]!=='−'&&raw[0]!=='+';
      const valid=unsigned&&VALID_AMOUNT_TOKEN.test(raw);
      const value=valid?Number(raw.replace(',','.')):NaN;
      candidates.push(freeze({
        start,end,raw,valid:valid&&Number.isFinite(value)&&value>=0.01&&value<=MAX_AMOUNT,
        value:Number.isFinite(value)?Math.round(value*100)/100:null
      }));
    }
    return freeze(candidates);
  }

  function findAmount(text){
    const candidates=numericCandidates(text);
    if(candidates.length!==1||!candidates[0].valid) return null;
    const candidate=candidates[0];
    return freeze({start:candidate.start,end:candidate.end,raw:candidate.raw,value:candidate.value});
  }

  function findCategory(text,categories,excludedSpan){
    const foldedText=text.toLowerCase();
    const matches=[];
    for(const category of categories){
      const needle=category.name.toLowerCase();
      let from=0;
      while(from<=foldedText.length-needle.length){
        const start=foldedText.indexOf(needle,from);
        if(start<0) break;
        const end=start+needle.length;
        const overlapsExcluded=excludedSpan&&start<excludedSpan.end&&end>excludedSpan.start;
        if(!overlapsExcluded&&boundaryOkay(text,start,end)) matches.push(freeze({start,end,categoryId:category.id,categoryName:category.name}));
        from=start+Math.max(1,needle.length);
      }
    }
    if(matches.length!==1) return null;
    return matches[0];
  }

  function remainder(text,spans){
    const ordered=spans.filter(Boolean).slice().sort((a,b)=>a.start-b.start||a.end-b.end);
    let cursor=0;
    const parts=[];
    for(const span of ordered){
      if(span.start<cursor) continue;
      parts.push(text.slice(cursor,span.start));
      cursor=span.end;
    }
    parts.push(text.slice(cursor));
    return parts.join(' ').trim().replace(/\s+/gu,' ');
  }

  function parseTranscript(input){
    if(!isObject(input)||typeof input.text!=='string') return failure('invalid_voice_transcript');
    const categories=normalizeCategories(input.categories);
    if(!categories) return failure('invalid_voice_categories');
    const text=input.text;
    if(!text.trim()) return failure('empty_voice_transcript');

    const amountMatch=findAmount(text);
    const categoryMatch=findCategory(text,categories,amountMatch);
    const note=remainder(text,[amountMatch,categoryMatch]);
    if(note.length>MAX_NOTE_LENGTH) return failure('voice_note_too_long');

    return freeze({
      ok:true,
      draft:freeze({
        amount:amountMatch?amountMatch.value:null,
        categoryId:categoryMatch?categoryMatch.categoryId:null,
        categoryName:categoryMatch?categoryMatch.categoryName:null,
        note
      }),
      consumed:freeze([
        ...(amountMatch?[freeze({kind:'amount',start:amountMatch.start,end:amountMatch.end,text:amountMatch.raw})]:[]),
        ...(categoryMatch?[freeze({kind:'category',start:categoryMatch.start,end:categoryMatch.end,text:text.slice(categoryMatch.start,categoryMatch.end),categoryId:categoryMatch.categoryId})]:[])
      ].sort((a,b)=>a.start-b.start))
    });
  }

  async function recognizeAndParse(provider,categories){
    if(!isObject(provider)||provider.mode!=='on_device'||typeof provider.recognize!=='function') return failure('on_device_speech_unavailable');
    let recognized;
    try{recognized=await provider.recognize()}catch{return failure('speech_recognition_failed')}
    if(!isObject(recognized)||recognized.ok!==true||typeof recognized.text!=='string') return failure('speech_recognition_failed');
    return parseTranscript({text:recognized.text,categories});
  }

  return freeze({version:1,MAX_AMOUNT,MAX_NOTE_LENGTH,parseTranscript,recognizeAndParse});
});

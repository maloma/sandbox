(function installDecisionOSSearchCoreV1(root, factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root&&!root.DecisionOSSearchCoreV1) root.DecisionOSSearchCoreV1=api;
})(typeof globalThis!=='undefined'?globalThis:this,function createDecisionOSSearchCoreV1(){
  'use strict';

  function assertString(value,label){
    if(typeof value!=='string') throw new TypeError(`${label} must be a string`);
    return value;
  }

  function exactSpans(text,query){
    assertString(text,'field text');
    assertString(query,'query');
    if(query==='') return [];
    const spans=[];
    let from=0;
    while(from<=text.length-query.length){
      const start=text.indexOf(query,from);
      if(start<0) break;
      const end=start+query.length;
      spans.push({start,end});
      from=end;
    }
    return spans;
  }

  function search(documents,query){
    if(!Array.isArray(documents)) throw new TypeError('documents must be an array');
    assertString(query,'query');
    if(query==='') return [];
    const results=[];
    for(const document of documents){
      if(!document||typeof document!=='object') throw new TypeError('document must be an object');
      if(!Array.isArray(document.fields)) throw new TypeError('document.fields must be an array');
      const matchedFields=[];
      for(const field of document.fields){
        if(!field||typeof field!=='object') throw new TypeError('field must be an object');
        const text=assertString(field.text,'field text');
        const spans=exactSpans(text,query);
        if(spans.length){
          matchedFields.push({
            key:field.key,
            label:field.label,
            text,
            spans,
          });
        }
      }
      if(matchedFields.length){
        results.push({
          id:document.id,
          source:document.source,
          section:document.section,
          target:document.target,
          matchedFields,
        });
      }
    }
    return results;
  }

  return Object.freeze({version:1,search,exactSpans});
});

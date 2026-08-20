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
      const documentId=assertString(document.documentId,'documentId');
      const sourceType=assertString(document.sourceType,'sourceType');
      const sourceLabel=assertString(document.sourceLabel,'sourceLabel');
      if(!Array.isArray(document.fields)) throw new TypeError('document.fields must be an array');
      const matches=[];
      for(const field of document.fields){
        if(!field||typeof field!=='object') throw new TypeError('field must be an object');
        const fieldId=assertString(field.fieldId,'fieldId');
        const text=assertString(field.text,'field text');
        for(const span of exactSpans(text,query)) matches.push({fieldId,start:span.start,end:span.end});
      }
      if(matches.length){
        results.push({
          documentId,
          sourceType,
          sourceLabel,
          target:document.target,
          matches,
          matchCount:matches.length,
        });
      }
    }
    return results;
  }

  return Object.freeze({version:1,search,exactSpans});
});

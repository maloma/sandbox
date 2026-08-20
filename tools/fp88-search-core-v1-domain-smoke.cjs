const assert=require('assert');
const core=require('../decisionos-search-core-v1.js');
function docs(){return[
  {documentId:'d1',sourceType:'test',sourceLabel:'S1 · A',target:{x:1},fields:[{fieldId:'a',text:'Alpha alpha  a.a  😀😀'}]},
  {documentId:'d2',sourceType:'test',sourceLabel:'S2 · B',target:{x:2},fields:[{fieldId:'x',text:'xx'},{fieldId:'y',text:'Alpha'}]},
]}
assert.deepStrictEqual(core.search(docs(),''),[]);
assert.deepStrictEqual(core.search(docs(),'alpha').map(r=>r.documentId),['d1']);
assert.deepStrictEqual(core.search(docs(),'Alpha').map(r=>r.documentId),['d1','d2']);
assert.deepStrictEqual(core.search(docs(),'  ').map(r=>r.documentId),['d1']);
assert.deepStrictEqual(core.search(docs(),'a.a').map(r=>r.documentId),['d1']);
const target={opaque:true};
const multi=core.search([{documentId:'d',sourceType:'t',sourceLabel:'Label',target,fields:[{fieldId:'a',text:'cat cat'},{fieldId:'b',text:'cat'}]}],'cat');
assert.strictEqual(multi.length,1);assert.deepStrictEqual(multi[0],{documentId:'d',sourceType:'t',sourceLabel:'Label',target,matches:[{fieldId:'a',start:0,end:3},{fieldId:'a',start:4,end:7},{fieldId:'b',start:0,end:3}],matchCount:3});assert.strictEqual(multi[0].target,target);
assert.deepStrictEqual(core.exactSpans('aaa','aa'),[{start:0,end:2}]);
assert.deepStrictEqual(core.exactSpans('A😀B😀','😀'),[{start:1,end:3},{start:4,end:6}]);
const input=docs(),before=JSON.stringify(input);core.search(input,'Alpha');assert.strictEqual(JSON.stringify(input),before);
assert.throws(()=>core.search(docs(),42),TypeError);assert.throws(()=>core.search({},'x'),TypeError);
assert.throws(()=>core.search([{documentId:'d',sourceType:'t',sourceLabel:'l',fields:[{fieldId:'f',text:7}]}],'x'),TypeError);
console.log('FP88_SEARCH_CORE_V1_PASS');

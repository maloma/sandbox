const assert=require('assert');
const core=require('../decisionos-search-core-v1.js');
function docs(){return[
  {id:'d1',source:'S1',section:'A',target:{x:1},fields:[{key:'a',label:'A',text:'Alpha alpha  a.a  😀😀'}]},
  {id:'d2',source:'S2',section:'B',target:{x:2},fields:[{key:'x',label:'X',text:'xx'},{key:'y',label:'Y',text:'Alpha'}]},
]}
assert.deepStrictEqual(core.search(docs(),''),[]);
assert.deepStrictEqual(core.search(docs(),'alpha').map(r=>r.id),['d1']);
assert.deepStrictEqual(core.search(docs(),'Alpha').map(r=>r.id),['d1','d2']);
assert.deepStrictEqual(core.search(docs(),'  ').map(r=>r.id),['d1']);
assert.deepStrictEqual(core.search(docs(),'a.a').map(r=>r.id),['d1']);
const multi=core.search([{id:'d',fields:[{key:'a',text:'cat cat'},{key:'b',text:'cat'}]}],'cat');
assert.strictEqual(multi.length,1);assert.deepStrictEqual(multi[0].matchedFields.map(x=>x.key),['a','b']);assert.deepStrictEqual(multi[0].matchedFields[0].spans,[{start:0,end:3},{start:4,end:7}]);
assert.deepStrictEqual(core.exactSpans('aaa','aa'),[{start:0,end:2}]);
assert.deepStrictEqual(core.exactSpans('A😀B😀','😀'),[{start:1,end:3},{start:4,end:6}]);
const input=docs(),before=JSON.stringify(input);core.search(input,'Alpha');assert.strictEqual(JSON.stringify(input),before);
assert.throws(()=>core.search(docs(),42),TypeError);assert.throws(()=>core.search({},'x'),TypeError);
console.log('FP88_SEARCH_CORE_V1_PASS');

const assert=require('assert');
const search=require('../familypilot-search-v1.js');
const state={
  categories:[{id:'c1',name:'Food  & Café'},{id:'c2',name:'Secret'}],
  wallets:[{id:'w1',name:'Family Wallet'},{id:'w2',name:'Private'}],
  operations:[
    {id:'op1',status:'active',categoryId:'c1',walletId:'w1',note:'Lunch 😀 exact'},
    {id:'op2',status:'active',categoryId:'c2',walletId:'w2',note:'HIDDEN'},
    {id:'op3',status:'trash',categoryId:'c1',walletId:'w1',note:'TRASH'},
  ],
};
const scopeApi={visibleOperations:()=>[state.operations[0],state.operations[2]],accessibleWallets:()=>[state.wallets[0]]};
const docs=search.operationDocuments(state,scopeApi);
assert.strictEqual(docs.length,1);
assert.strictEqual(docs[0].id,'operation:op1');
assert.deepStrictEqual(docs[0].fields.map(f=>[f.key,f.text]),[['category','Food  & Café'],['note','Lunch 😀 exact'],['wallet','Family Wallet']]);
assert.deepStrictEqual(docs[0].target,{kind:'operation',operationId:'op1'});
assert(!JSON.stringify(docs).includes('HIDDEN'));assert(!JSON.stringify(docs).includes('TRASH'));assert(!JSON.stringify(docs).includes('Private'));
assert.deepStrictEqual(search.operationDocuments(state,{visibleOperations:()=>[],accessibleWallets:()=>[]}),[]);
const noWalletAccess=search.operationDocuments(state,{visibleOperations:()=>[state.operations[0]],accessibleWallets:()=>[]});assert(!JSON.stringify(noWalletAccess).includes('Family Wallet'));assert(noWalletAccess[0].fields.some(field=>field.key==='note'));
const noWalletApi=search.operationDocuments(state,{visibleOperations:()=>[state.operations[0]]});assert(!JSON.stringify(noWalletApi).includes('Family Wallet'));
console.log('FP88_SEARCH_ADAPTER_V1_PASS');
const allowedIds=new Set(['operationsScreen','analyticsScreen','plansScreen','walletManagementOpen','openCategoryManager','walletSelect','themeSelect','actorSelect','trashFlagBtn','futureActualOperationsBtn','learningModeEntry','persistenceEntry']);
global.document={getElementById:id=>allowedIds.has(id)?{id}:null};
const staticDocs=search.buildDocuments({categories:[],wallets:[],operations:[]},{visibleOperations:()=>[],accessibleWallets:()=>[]});
const staticTargets=staticDocs.map(doc=>doc.target.elementId||doc.target.screen);
for(const expected of ['operations','analytics','plans','walletManagementOpen','openCategoryManager','walletSelect','themeSelect','actorSelect','trashFlagBtn','futureActualOperationsBtn','learningModeEntry','persistenceEntry'])assert(staticTargets.includes(expected),`missing explicit static target ${expected}`);
assert(staticDocs.every(doc=>['Функции','Настройки'].includes(doc.source)));
delete global.document;
console.log('FP88_SEARCH_STATIC_ALLOWLIST_PASS');

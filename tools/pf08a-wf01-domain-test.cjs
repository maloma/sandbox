'use strict';

const assert=require('node:assert/strict');
const wallets=require('../familypilot-wallet-management.js');

const members=[{id:'member-anna',name:'Анна'},{id:'member-martin',name:'Мартин'}];
const state={
  schemaVersion:6,
  household:{id:'household-test',baseCurrency:'EUR',openingCapital:5000},
  currentMemberId:'member-anna',activeWalletId:'wallet-household-main',
  wallets:[
    {id:'wallet-household-main',type:'household_default',name:'Семейный кошелёк',nativeCurrency:'EUR',openingBalance:0,ownerMemberId:null,allowedMemberIds:['member-anna','member-martin'],includedInHouseholdCapital:true,archivedAt:null},
    {id:'wallet-personal-anna',type:'personal',name:'Личный кошелёк Анны',nativeCurrency:'EUR',openingBalance:0,ownerMemberId:'member-anna',allowedMemberIds:['member-anna'],includedInHouseholdCapital:false,archivedAt:null}
  ],
  categories:[{id:'cat-inc-other',kind:'income',name:'Прочий доход'}],
  operations:[{id:'op-existing',kind:'income',amount:100,walletId:'wallet-personal-anna',status:'active',links:{}}],
  obligationRules:[{id:'obligation-existing'}],obligationOccurrences:[{id:'occurrence-existing'}],
  debtCounterparties:[{id:'counterparty-existing'}],debtChains:[{id:'chain-existing'}],debtEvents:[{id:'event-existing'}],
  savingsGoals:[{id:'goal-existing',name:'Отпуск',targetAmount:1000,savedAmount:100,status:'active'}]
};
const protectedSnapshot=()=>JSON.stringify({categories:state.categories,operations:state.operations,obligationRules:state.obligationRules,obligationOccurrences:state.obligationOccurrences,debtCounterparties:state.debtCounterparties,debtChains:state.debtChains,debtEvents:state.debtEvents,savingsGoals:state.savingsGoals});
const before=protectedSnapshot();

wallets.normalizeState(state,members,1000);
assert.equal(state.schemaVersion,7);
assert.equal(state.wallets.length,2);
assert.equal(state.wallets[0].id,'wallet-household-main');
assert.equal(state.wallets[1].id,'wallet-personal-anna');
assert.equal(state.wallets[1].includedInHouseholdCapital,false);
assert.equal(protectedSnapshot(),before,'Wallet normalization changed another financial domain');

const shared=wallets.createWallet(state,members,{type:'household_shared',name:'Повседневные расходы'},'member-anna',1100);
assert.equal(shared.ok,true);
assert.equal(shared.wallet.type,'household_shared');
assert.equal(shared.wallet.nativeCurrency,'EUR');
assert.equal(shared.wallet.ownerMemberId,null);
assert.deepEqual(shared.wallet.allowedMemberIds,['member-anna','member-martin']);
assert.equal(shared.wallet.includedInHouseholdCapital,true);
assert.equal(shared.wallet.openingBalance,0);
assert.equal(protectedSnapshot(),before,'Shared wallet creation invented a financial event');

const personal=wallets.createWallet(state,members,{type:'personal',name:'Карман Анны'},'member-anna',1200);
assert.equal(personal.ok,true);
assert.equal(personal.wallet.type,'personal');
assert.equal(personal.wallet.ownerMemberId,'member-anna');
assert.deepEqual(personal.wallet.allowedMemberIds,['member-anna']);
assert.equal(personal.wallet.includedInHouseholdCapital,false);
assert.equal(personal.wallet.openingBalance,0);
assert.equal(protectedSnapshot(),before,'Personal wallet creation invented a financial event');

assert.equal(wallets.createWallet(state,members,{type:'personal',name:'  карман анны  '},'member-anna',1250).ok,false,'Duplicate wallet name was accepted');
const personalId=personal.wallet.id,allowedBefore=[...personal.wallet.allowedMemberIds];
const renamed=wallets.updateName(state,members,personalId,'Личные покупки','member-anna',1300);
assert.equal(renamed.ok,true);
assert.equal(renamed.wallet.id,personalId);
assert.equal(renamed.wallet.name,'Личные покупки');
assert.equal(renamed.wallet.revisions.length,1);
assert.equal(protectedSnapshot(),before,'Rename changed operations or another module');

const included=wallets.setPersonalCapitalInclusion(state,members,personalId,true,'member-anna',1400);
assert.equal(included.ok,true);
assert.equal(included.wallet.includedInHouseholdCapital,true);
assert.deepEqual(included.wallet.allowedMemberIds,allowedBefore,'Capital inclusion changed access');
assert.equal(protectedSnapshot(),before,'Capital inclusion created a financial operation');
assert.equal(wallets.setPersonalCapitalInclusion(state,members,personalId,false,'member-martin',1500).ok,false,'Non-owner changed personal inclusion');
assert.equal(wallets.updateName(state,members,personalId,'Чужое имя','member-martin',1500).ok,false,'Non-owner renamed personal wallet');
assert.equal(wallets.updateName(state,members,'wallet-household-main','Новый основной','member-anna',1500).ok,false,'Default wallet was editable');

const annaIds=wallets.accessibleWallets(state,'member-anna').map(wallet=>wallet.id);
const martinIds=wallets.accessibleWallets(state,'member-martin').map(wallet=>wallet.id);
assert.ok(annaIds.includes(personalId));
assert.ok(!martinIds.includes(personalId),'Private Anna wallet leaked to Martin');
assert.ok(martinIds.includes(shared.wallet.id));
assert.ok(martinIds.includes('wallet-household-main'));

const martinPersonal=wallets.createWallet(state,members,{type:'personal',name:'Карман Мартина'},'member-martin',1600);
assert.equal(martinPersonal.ok,true);
assert.deepEqual(martinPersonal.wallet.allowedMemberIds,['member-martin']);
assert.ok(!wallets.accessibleWallets(state,'member-anna').some(wallet=>wallet.id===martinPersonal.wallet.id),'Private Martin wallet leaked to Anna');

const malformed={schemaVersion:2,household:{id:'h',baseCurrency:'EUR'},currentMemberId:'member-anna',wallets:[{id:'d',type:'household_default',name:'D',allowedMemberIds:[]},{id:'p',type:'personal',name:'P',ownerMemberId:'member-anna',allowedMemberIds:[],includedInHouseholdCapital:null,openingBalance:'bad'}]};
wallets.normalizeState(malformed,members,2000);
assert.equal(malformed.schemaVersion,7);
assert.deepEqual(malformed.wallets[0].allowedMemberIds,['member-anna','member-martin']);
assert.ok(malformed.wallets[1].allowedMemberIds.includes('member-anna'));
assert.equal(malformed.wallets[1].includedInHouseholdCapital,false);
assert.equal(malformed.wallets[1].openingBalance,0);

console.log(JSON.stringify({status:'PASS',marker:'PF08A_WF01_DOMAIN_PASS',stableIds:true,baseCurrencyOnly:true,sharedDefaults:true,personalPrivacyDefault:true,capitalInclusionIndependent:true,defaultWalletImmutable:true,noMoneyMovement:true,crossMemberIsolation:true,priorDomainsPreserved:true},null,2));
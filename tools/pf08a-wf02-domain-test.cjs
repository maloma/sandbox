'use strict';

const assert=require('node:assert/strict');
const transfers=require('../familypilot-wallet-transfers.js');
require('../familypilot-scope.js');
const scope=globalThis.FamilyPilotScope;

const state={
  schemaVersion:7,
  household:{id:'household-test',baseCurrency:'EUR',openingCapital:5000},
  currentMemberId:'member-anna',activeWalletId:'wallet-household-main',
  wallets:[
    {id:'wallet-household-main',householdId:'household-test',type:'household_default',name:'Семейный',nativeCurrency:'EUR',openingBalance:0,ownerMemberId:null,allowedMemberIds:['member-anna','member-martin'],includedInHouseholdCapital:true,archivedAt:null},
    {id:'wallet-shared',householdId:'household-test',type:'household_shared',name:'Повседневные',nativeCurrency:'EUR',openingBalance:0,ownerMemberId:null,allowedMemberIds:['member-anna','member-martin'],includedInHouseholdCapital:true,archivedAt:null},
    {id:'wallet-anna',householdId:'household-test',type:'personal',name:'Личный Анны',nativeCurrency:'EUR',openingBalance:0,ownerMemberId:'member-anna',allowedMemberIds:['member-anna'],includedInHouseholdCapital:false,archivedAt:null},
    {id:'wallet-martin',householdId:'household-test',type:'personal',name:'Личный Мартина',nativeCurrency:'EUR',openingBalance:0,ownerMemberId:'member-martin',allowedMemberIds:['member-martin'],includedInHouseholdCapital:false,archivedAt:null},
    {id:'wallet-usd',householdId:'household-test',type:'household_shared',name:'USD',nativeCurrency:'USD',openingBalance:0,ownerMemberId:null,allowedMemberIds:['member-anna','member-martin'],includedInHouseholdCapital:true,archivedAt:null}
  ],
  categories:[{id:'cat-inc-other',kind:'income',name:'Прочий доход'},{id:'cat-exp-other',kind:'expense',name:'Другое'}],
  operations:[
    {id:'income-main',kind:'income',amount:1000,walletId:'wallet-household-main',status:'active'},
    {id:'income-anna',kind:'income',amount:200,walletId:'wallet-anna',status:'active'}
  ],
  walletMovements:[{id:'debt-movement',movementRole:'debt_principal',direction:'outflow',walletId:'wallet-shared',amount:10,status:'active'}],
  obligationRules:[{id:'rule'}],obligationOccurrences:[{id:'occ'}],debtChains:[{id:'chain'}],debtEvents:[{id:'debt'}],savingsGoals:[{id:'goal'}]
};
const protectedSnapshot=()=>JSON.stringify({categories:state.categories,obligationRules:state.obligationRules,obligationOccurrences:state.obligationOccurrences,debtChains:state.debtChains,debtEvents:state.debtEvents,savingsGoals:state.savingsGoals});
const protectedBefore=protectedSnapshot();

transfers.normalizeState(state,1000);
assert.equal(state.schemaVersion,8);
assert.equal(state.transfers.length,0);
assert.ok(state.walletMovements.some(item=>item.id==='debt-movement'),'Non-transfer movement was removed');
const householdBefore=scope.capitalSnapshot(state).capital;
const ordinaryBefore={income:scope.totals(state.operations).income,expense:scope.totals(state.operations).expense};

const first=transfers.createTransfer(state,{sourceWalletId:'wallet-household-main',destinationWalletId:'wallet-shared',amount:125.5,currency:'EUR',effectiveDate:2000,note:'На расходы'},'member-anna',2100);
assert.equal(first.ok,true);
assert.ok(first.transfer.id);
assert.equal(state.transfers.length,1);
assert.equal(transfers.movementsFor(state,first.transfer.id).length,2);
assert.deepEqual(transfers.movementsFor(state,first.transfer.id).map(item=>item.movementRole).sort(),['transfer_destination','transfer_source']);
assert.equal(state.operations.filter(item=>item.kind==='transfer').length,1);
assert.equal(scope.capitalSnapshot(state).capital,householdBefore,'Included-to-included changed household Capital');
assert.deepEqual({income:scope.totals(state.operations).income,expense:scope.totals(state.operations).expense},ordinaryBefore,'Transfer changed Income/Expense');

assert.equal(transfers.createTransfer(state,{sourceWalletId:'wallet-shared',destinationWalletId:'wallet-shared',amount:1,effectiveDate:2200},'member-anna',2200).ok,false,'Same wallet accepted');
assert.equal(transfers.createTransfer(state,{sourceWalletId:'wallet-shared',destinationWalletId:'wallet-martin',amount:1,effectiveDate:2200},'member-anna',2200).ok,false,'Inaccessible personal wallet accepted');
assert.equal(transfers.createTransfer(state,{sourceWalletId:'wallet-shared',destinationWalletId:'wallet-usd',amount:1,effectiveDate:2200},'member-anna',2200).ok,false,'FX wallet accepted');
assert.equal(transfers.createTransfer(state,{sourceWalletId:'wallet-shared',destinationWalletId:'wallet-anna',amount:0,effectiveDate:2200},'member-anna',2200).ok,false,'Zero amount accepted');

const second=transfers.createTransfer(state,{sourceWalletId:'wallet-household-main',destinationWalletId:'wallet-anna',amount:50,effectiveDate:3000,note:'Личные деньги'},'member-anna',3100);
assert.equal(second.ok,true);
assert.equal(scope.capitalSnapshot(state).capital,householdBefore-50,'Included-to-excluded Capital effect incorrect');
state.activeWalletId='wallet-anna';
assert.equal(scope.capitalSnapshot(state).capital,250,'Personal wallet transfer inflow incorrect');
state.activeWalletId='wallet-household-main';

const transferId=second.transfer.id;
const operationId=transfers.projectionFor(state,transferId).id;
const movementIds=transfers.movementsFor(state,transferId).map(item=>item.id).sort();
const corrected=transfers.correctTransfer(state,transferId,{sourceWalletId:'wallet-shared',destinationWalletId:'wallet-anna',amount:80,currency:'EUR',effectiveDate:3500,note:'Исправлено'},'member-anna',3600);
assert.equal(corrected.ok,true);
assert.equal(corrected.transfer.id,transferId,'Transfer ID changed');
assert.equal(transfers.projectionFor(state,transferId).id,operationId,'Operation projection ID changed');
assert.deepEqual(transfers.movementsFor(state,transferId).map(item=>item.id).sort(),movementIds,'Movement IDs changed');
assert.equal(corrected.transfer.revisions.length,1);
assert.equal(corrected.transfer.revisionSequence,1);
assert.equal(scope.capitalSnapshot(state).capital,householdBefore-80,'Correction left stale Capital effect');
assert.equal(transfers.movementsFor(state,transferId).every(item=>item.amount===80&&item.effectiveDate===3500),true,'Paired movements not corrected together');

const countsBefore={transfers:state.transfers.length,movements:state.walletMovements.filter(item=>item.transferId).length,operations:state.operations.filter(item=>item.kind==='transfer').length};
transfers.normalizeState(state,4000);transfers.normalizeState(state,5000);
assert.deepEqual({transfers:state.transfers.length,movements:state.walletMovements.filter(item=>item.transferId).length,operations:state.operations.filter(item=>item.kind==='transfer').length},countsBefore,'Reload normalization duplicated transfer data');

state.currentMemberId='member-martin';state.activeWalletId='wallet-household-main';
const visibleMartin=scope.visibleOperations(state);
assert.ok(!visibleMartin.some(item=>item.transferId===transferId),'Anna private transfer leaked to Martin');
state.currentMemberId='member-anna';
assert.ok(scope.visibleOperations(state).some(item=>item.transferId===transferId),'Transfer missing for accessible actor');
assert.equal(protectedSnapshot(),protectedBefore,'Transfer package changed another module');

console.log(JSON.stringify({status:'PASS',marker:'PF08A_WF02_DOMAIN_PASS',stableTransferId:true,twoLinkedMovements:true,stableMovementIds:true,baseCurrencyOnly:true,accessibleWalletsOnly:true,noIncomeExpense:true,capitalRecalculation:true,correctionHistory:true,noDuplicateReload:true,crossMemberIsolation:true,priorDomainsPreserved:true},null,2));

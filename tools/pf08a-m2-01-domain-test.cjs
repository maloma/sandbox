const assert=require('node:assert/strict');
const debt=require('../familypilot-debts.js');

const NOW=new Date('2026-07-22T12:00:00Z').getTime();
const DAY=86400000;
function fixture(){return{schemaVersion:4,currentMemberId:'member-anna',wallets:[{id:'house',type:'household_default',nativeCurrency:'EUR',includedInHouseholdCapital:true},{id:'personal',type:'personal',nativeCurrency:'EUR',ownerMemberId:'member-anna',includedInHouseholdCapital:false}],operations:[],debtCounterparties:[],debtChains:[],debtEvents:[]}}
function chain(state,id){return state.debtChains.find(item=>item.id===id)}

const state=fixture();debt.normalizeState(state,NOW);assert.equal(state.schemaVersion,5);

// Historical opening and repayment: principal changes without a current opening cash movement.
const opening=debt.createSourceEvent(state,{counterpartyName:'Банк',counterpartyKind:'organization',action:'opening_liability',amount:500,walletId:'house',currency:'EUR',occurredAt:NOW-10*DAY},'member-anna',NOW);
assert.equal(opening.ok,true);assert.equal(chain(state,opening.chain.id).currentBalance,-500);assert.equal(state.operations.length,0);
const repayment=debt.createSourceEvent(state,{counterpartyId:opening.counterparty.id,action:'repay',amount:120,walletId:'house',currency:'EUR',occurredAt:NOW-DAY},'member-anna',NOW+1);
assert.equal(chain(state,opening.chain.id).currentBalance,-380);assert.equal(repayment.operation.kind,'debt_outflow');assert.equal(state.operations.filter(item=>item.kind==='expense').length,0);

// Overpayment: full source remains, reciprocal debt is derived automatically, no negative principal model.
const overpayment=debt.createSourceEvent(state,{counterpartyId:opening.counterparty.id,action:'repay',amount:400,walletId:'house',currency:'EUR',occurredAt:NOW},'member-anna',NOW+2);
assert.equal(chain(state,opening.chain.id).currentBalance,20);
const overHistory=debt.chainHistory(state,opening.chain.id);
assert.ok(overHistory.some(item=>item.derivedKind==='offset'&&item.amount===380));
assert.ok(overHistory.some(item=>item.derivedKind==='reciprocal'&&item.amount===20));
assert.equal(debt.scopeTotals(state,new Set(['house'])).receivable,20);

// Source edit rebuilds derived rows and preserves the linked operation id.
const originalOperationId=debt.linkedOperation(state,overpayment.event).id;
const corrected=debt.updateSourceEvent(state,overpayment.event.id,{counterpartyId:opening.counterparty.id,action:'repay',amount:380,walletId:'house',currency:'EUR',occurredAt:NOW,comment:'Исправлено'},'member-anna',NOW+3);
assert.equal(corrected.ok,true);assert.equal(debt.linkedOperation(state,corrected.event).id,originalOperationId);assert.equal(chain(state,opening.chain.id).currentBalance,0);
assert.equal(debt.chainHistory(state,opening.chain.id).filter(item=>item.derivedKind==='reciprocal').length,0);

// Zero may close; closed source is immutable and later activity creates a new chain.
assert.equal(debt.closeChain(state,opening.chain.id,'member-anna',NOW+4).ok,true);assert.equal(chain(state,opening.chain.id).status,'closed');
assert.equal(debt.updateSourceEvent(state,repayment.event.id,{counterpartyId:opening.counterparty.id,action:'repay',amount:100,walletId:'house',currency:'EUR',occurredAt:NOW},'member-anna',NOW+5).ok,false);
const later=debt.createSourceEvent(state,{counterpartyId:opening.counterparty.id,action:'borrow',amount:50,walletId:'house',currency:'EUR',occurredAt:NOW+DAY},'member-anna',NOW+6);
assert.notEqual(later.chain.id,opening.chain.id);assert.equal(chain(state,later.chain.id).currentBalance,-50);assert.equal(later.operation.kind,'debt_inflow');

// Borrow/lend/receive movements change wallet direction but never ordinary Income/Expense kinds.
const friend=debt.createSourceEvent(state,{counterpartyName:'Друг',action:'lend',amount:250,walletId:'house',currency:'EUR',occurredAt:NOW+2*DAY},'member-anna',NOW+7);
assert.equal(friend.operation.kind,'debt_outflow');assert.equal(chain(state,friend.chain.id).currentBalance,250);
const receive=debt.createSourceEvent(state,{counterpartyId:friend.counterparty.id,action:'receive',amount:50,walletId:'house',currency:'EUR',occurredAt:NOW+3*DAY},'member-anna',NOW+8);
assert.equal(receive.operation.kind,'debt_inflow');assert.equal(chain(state,friend.chain.id).currentBalance,200);
assert.equal(state.operations.filter(item=>item.kind==='income'||item.kind==='expense').length,0);

// Trash and restore recalculate a cash-backed source event.
const laterOperation=debt.linkedOperation(state,later.event);laterOperation.status='trash';debt.recalculateChain(state,later.chain.id,NOW+9);assert.equal(chain(state,later.chain.id).currentBalance,0);
laterOperation.status='active';debt.recalculateChain(state,later.chain.id,NOW+10);assert.equal(chain(state,later.chain.id).currentBalance,-50);

// Personal chains stay isolated from household scope.
const personal=debt.createSourceEvent(state,{counterpartyName:'Личный контакт',action:'lend',amount:30,walletId:'personal',currency:'EUR',occurredAt:NOW},'member-anna',NOW+11);
assert.ok(!debt.visibleChains(state,new Set(['house'])).some(item=>item.id===personal.chain.id));
assert.ok(debt.visibleChains(state,new Set(['personal'])).some(item=>item.id===personal.chain.id));

// Counterparty reuse prevents accidental duplicates.
const reused=debt.createSourceEvent(state,{counterpartyName:'Друг',action:'lend',amount:10,walletId:'house',currency:'EUR',occurredAt:NOW+4*DAY},'member-anna',NOW+12);
assert.equal(reused.counterparty.id,friend.counterparty.id);
assert.equal(state.debtCounterparties.filter(item=>item.normalizedName==='друг').length,1);

console.log(JSON.stringify({status:'PASS',marker:'PF08A_M2_01_DOMAIN_PASS',schemaV5:true,historicalOpening:true,principalNotOrdinaryIncomeExpense:true,mutualOffset:true,automaticReciprocalDebt:true,stableOperationOnEdit:true,closedChainImmutable:true,newChainAfterClosure:true,trashRestoreRecalculation:true,scopeIsolation:true,counterpartyReuse:true},null,2));

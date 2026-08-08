import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const truth=require('../familypilot-financial-truth.js');
const debts=require('../familypilot-debts.js');

function assert(condition,message){if(!condition)throw new Error(message)}

export function runFinancialTruthCases(){
  const snapshot=truth.financialTruthSnapshot({
    baseCurrency:'EUR',
    scope:'household',
    walletBalances:[{id:'family-main',name:'Семейный счёт',balance:2000,currency:'EUR',scope:'household'}],
    debtPositions:[
      {id:'receivable-1',currentBalance:500,currency:'EUR',scope:'household'},
      {id:'liability-1',currentBalance:-700,currency:'EUR',scope:'household'}
    ],
    investments:[{id:'investment-1',name:'Инвестиция',currentValue:1000,currency:'EUR',scope:'household',status:'active'}]
  });
  assert(snapshot.ok===true,'Снимок финансовой истины не построен');
  assert(snapshot.operationalFunds===2000,'Денежные средства рассчитаны неверно');
  assert(snapshot.assets===3500,'Активы рассчитаны неверно');
  assert(snapshot.liabilities===700,'Обязательства рассчитаны неверно');
  assert(snapshot.netFamilyCapital===2800,'Семейный капитал рассчитан неверно');
  assert(snapshot.allValued===true,'Базовая валюта ошибочно помечена как неоценённая');
  assert(snapshot.contributions.length===4,'Состав капитала неполный');
  return{ok:true,caseCount:7};
}

export function runDebtCapitalCases(){
  const baseState={
    schemaVersion:22,
    activeWalletId:'wallet-household-main',
    wallets:[
      {id:'wallet-household-main',type:'household_default',name:'Семейный',nativeCurrency:'EUR'},
      {id:'wallet-family-second',type:'shared',name:'Второй семейный',nativeCurrency:'EUR'},
      {id:'wallet-personal-anna',type:'personal',name:'Личный Анны',nativeCurrency:'EUR'}
    ],
    operations:[],debtCounterparties:[],debtChains:[],debtEvents:[]
  };
  const state=JSON.parse(JSON.stringify(baseState));
  const opening=debts.createSourceEvent(state,{action:'opening_liability',amount:500,currency:'EUR',occurredAt:1000,counterpartyName:'Банк'});
  assert(opening.ok===true,'Начальный семейный долг не создан без денежного кошелька');
  assert(opening.operation===null,'Начальный долг создал фиктивное движение денег');
  assert(opening.chain.scopeWalletId==='wallet-household-main','Начальный семейный долг получил неверный контекст');

  const borrow=debts.createSourceEvent(state,{action:'borrow',amount:300,currency:'EUR',walletId:'wallet-household-main',occurredAt:2000,counterpartyId:opening.counterparty.id});
  assert(borrow.ok===true&&borrow.operation?.walletId==='wallet-household-main','Получение займа не связано с фактическим кошельком');
  const repay=debts.createSourceEvent(state,{action:'repay',amount:100,currency:'EUR',walletId:'wallet-family-second',occurredAt:3000,counterpartyId:opening.counterparty.id});
  assert(repay.ok===true&&repay.operation?.walletId==='wallet-family-second','Погашение не связано со вторым фактическим кошельком');
  assert(repay.chain.id===borrow.chain.id&&borrow.chain.id===opening.chain.id,'Смена кошелька платежа разорвала одну долговую цепочку');
  assert(repay.chain.currentBalance===-700,'Основная сумма семейного долга рассчитана неверно');

  state.activeWalletId='wallet-personal-anna';
  const personal=debts.createSourceEvent(state,{action:'opening_liability',amount:50,currency:'EUR',occurredAt:4000,counterpartyName:'Личный кредитор'});
  assert(personal.ok===true&&personal.chain.scopeWalletId==='wallet-personal-anna','Личный долг не закреплён за личным контекстом');
  const familyVisible=debts.visibleChains(state,new Set(['wallet-household-main','wallet-family-second']),{includeClosed:false});
  const personalVisible=debts.visibleChains(state,new Set(['wallet-personal-anna']),{includeClosed:false});
  assert(!familyVisible.some(chain=>chain.id===personal.chain.id),'Личный долг попал в семейный список');
  assert(personalVisible.some(chain=>chain.id===personal.chain.id),'Личный долг не виден в личном контексте');

  return{ok:true,caseCount:10};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const financial=runFinancialTruthCases();
  const debt=runDebtCapitalCases();
  console.log(JSON.stringify({status:'PASS',stage:'FP81-20',financial,debt}));
}

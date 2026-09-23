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
  const selfCheck=truth.financialTruthSelfCheck(snapshot);
  assert(selfCheck.ok===true&&selfCheck.netCapital===2800,'Самопроверка не подтвердила канонический снимок');
  const tampered=truth.financialTruthSelfCheck({...snapshot,netFamilyCapital:2801});
  assert(tampered.ok===false&&tampered.error==='net_capital_mismatch','Самопроверка не обнаружила расхождение итогового капитала');

  const empty=truth.financialTruthSnapshot({baseCurrency:'EUR',scope:'household',walletBalances:[],debtPositions:[],investments:[]});
  assert(empty.ok===true&&empty.allValued===true&&empty.unresolved.length===0,'Отсутствующие необязательные классы активов ошибочно делают состояние неполным');
  assert(empty.operationalFunds===0&&empty.assets===0&&empty.liabilities===0&&empty.netFamilyCapital===0,'Отсутствующие необязательные классы активов должны считаться нулём');

  const expenseBefore=truth.financialTruthSnapshot({
    baseCurrency:'EUR',scope:'household',
    walletBalances:[{id:'family-main',balance:1000,currency:'EUR',scope:'household'}],
    debtPositions:[{id:'expense-liability',currentBalance:-700,currency:'EUR',scope:'household'}],
    investments:[]
  });
  const expenseAfter=truth.financialTruthSnapshot({
    baseCurrency:'EUR',scope:'household',
    walletBalances:[{id:'family-main',balance:930,currency:'EUR',scope:'household'}],
    debtPositions:[{id:'expense-liability',currentBalance:-700,currency:'EUR',scope:'household'}],
    investments:[]
  });
  assert(expenseBefore.ok===true&&expenseAfter.ok===true,'Сценарий процентов и комиссий не построен');
  assert(expenseAfter.liabilities===700,'Проценты и комиссии не должны уменьшать основную сумму обязательства');
  assert(expenseBefore.netFamilyCapital-expenseAfter.netFamilyCapital===70,'Проценты и комиссии должны уменьшать капитал через деньги как обычный расход');

  const principalState={
    schemaVersion:22,
    activeWalletId:'wallet-household-main',
    wallets:[{id:'wallet-household-main',type:'household_default',name:'Семейный',nativeCurrency:'EUR'}],
    operations:[],debtCounterparties:[],debtChains:[],debtEvents:[]
  };
  const principalOpening=debts.createSourceEvent(principalState,{action:'opening_liability',amount:500,currency:'EUR',occurredAt:1000,counterpartyName:'Банк'});
  assert(principalOpening.ok===true,'Не удалось создать базовую долговую цепочку для проверки основной суммы');
  const principalBorrow=debts.createSourceEvent(principalState,{action:'borrow',amount:300,currency:'EUR',walletId:'wallet-household-main',occurredAt:2000,counterpartyId:principalOpening.counterparty.id});
  const principalRepay=debts.createSourceEvent(principalState,{action:'repay',amount:100,currency:'EUR',walletId:'wallet-household-main',occurredAt:3000,counterpartyId:principalOpening.counterparty.id});
  assert(principalBorrow.ok===true&&principalBorrow.operation?.kind==='debt_inflow'&&principalBorrow.operation?.kind!=='income','Основная сумма нового займа ошибочно попала в обычный доход');
  assert(principalRepay.ok===true&&principalRepay.operation?.kind==='debt_outflow'&&principalRepay.operation?.kind!=='expense','Погашение основной суммы ошибочно попало в обычный расход');

  const property=truth.makeCapitalContribution({id:'asset:home',sourceType:'asset',sourceId:'home',className:'property',label:'Жильё',scope:'household',effect:'asset',liquid:false,amount:250000,currency:'EUR',baseCurrency:'EUR'});
  const mortgage=truth.makeCapitalContribution({id:'debt:mortgage',sourceType:'debt',sourceId:'mortgage',className:'liability',label:'Ипотека',scope:'household',effect:'liability',liquid:false,amount:180000,currency:'EUR',baseCurrency:'EUR'});
  assert(property.ok===true&&mortgage.ok===true,'Актив или ипотека не преобразованы в канонические вклады капитала');
  const equity=truth.sumCapitalContributions([property.contribution,mortgage.contribution],{scope:'household'});
  assert(equity.ok===true,'Сценарий актив + ипотека не рассчитан');
  assert(equity.assets===250000&&equity.liabilities===180000&&equity.netCapital===70000,'Чистая доля собственности рассчитана неверно');

  return{ok:true,caseCount:20};
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

export function runValuationCases(){
  const at=Date.parse('2026-08-08T10:00:00Z');
  const base=truth.convertToBaseValue({amount:125.55,currency:'EUR',baseCurrency:'EUR'});
  assert(base.ok===true&&base.baseAmount===125.55&&base.converted===false,'Базовая валюта должна считаться 1:1');

  const usd=truth.convertToBaseValue({amount:1000,currency:'USD',baseCurrency:'EUR',valuation:{rateToBase:0.86,source:'indicative-market',valuedAt:at}});
  assert(usd.ok===true&&usd.baseAmount===860,'Иностранная валюта пересчитана неверно');
  assert(usd.valuationSource==='indicative-market'&&usd.valuedAt===at,'Источник или дата курса потеряны');

  const missing=truth.makeCapitalContribution({id:'wallet:usd',sourceType:'wallet',className:'money',scope:'household',effect:'asset',liquid:true,amount:1000,currency:'USD',baseCurrency:'EUR'});
  assert(missing.ok===true&&missing.contribution.resolved===false,'Сумма без курса ошибочно признана оценённой');
  const mixed=truth.sumCapitalContributions([
    truth.makeCapitalContribution({id:'wallet:eur',sourceType:'wallet',className:'money',scope:'household',effect:'asset',liquid:true,amount:100,currency:'EUR',baseCurrency:'EUR'}).contribution,
    missing.contribution
  ],{scope:'household'});
  assert(mixed.ok===true&&mixed.netCapital===100,'Неоценённая иностранная валюта была молча сложена с базовой');
  assert(mixed.allValued===false&&mixed.unresolved.length===1,'Неоценённый компонент не вынесен в предупреждение');

  const badDate=truth.convertToBaseValue({amount:1,currency:'USD',baseCurrency:'EUR',valuation:{rateToBase:0.86,source:'indicative-market'}});
  assert(badDate.ok===false&&badDate.error==='valuation_date_required','Пересчёт без даты оценки не заблокирован');

  return{ok:true,caseCount:8};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const financial=runFinancialTruthCases();
  const debt=runDebtCapitalCases();
  const valuation=runValuationCases();
  console.log(JSON.stringify({status:'PASS',stage:'FP81-23',financial,debt,valuation}));
}

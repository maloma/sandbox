import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const truth=require('../familypilot-financial-truth.js');

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

if(import.meta.url===`file://${process.argv[1]}`){
  const result=runFinancialTruthCases();
  console.log(JSON.stringify({status:'PASS',stage:'FP81-19',...result}));
}

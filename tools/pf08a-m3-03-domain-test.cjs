const assert=require('node:assert/strict');
const attention=require('../familypilot-payment-attention.js');

const DAY=86400000;
const today=new Date(2026,6,23).getTime();
const state={
  currentMemberId:'member-anna',activeWalletId:'wallet-household-main',config:{},
  wallets:[
    {id:'wallet-household-main',type:'household_default',allowedMemberIds:['member-anna'],archivedAt:null},
    {id:'wallet-household-second',type:'household_shared',allowedMemberIds:['member-anna'],archivedAt:null},
    {id:'wallet-anna',type:'personal',ownerMemberId:'member-anna',allowedMemberIds:['member-anna'],archivedAt:null},
    {id:'wallet-martin',type:'personal',ownerMemberId:'member-martin',allowedMemberIds:['member-martin'],archivedAt:null}
  ],
  obligationRules:[
    {id:'rule-overdue',name:'Аренда'},
    {id:'rule-today',name:'Интернет'},
    {id:'rule-soon',name:'Газ'},
    {id:'rule-later',name:'Страховка'},
    {id:'rule-private',name:'Чужой платёж'}
  ],
  obligationOccurrences:[
    {id:'occ-overdue',ruleId:'rule-overdue',walletId:'wallet-household-main',dueAt:today-DAY,status:'planned',sequence:1,expectedAmount:800,currency:'EUR'},
    {id:'occ-today',ruleId:'rule-today',walletId:'wallet-household-main',dueAt:today,status:'planned',sequence:1,expectedAmount:20,currency:'EUR'},
    {id:'occ-soon',ruleId:'rule-soon',walletId:'wallet-household-second',dueAt:today+3*DAY,status:'planned',sequence:1,expectedAmount:35,currency:'EUR'},
    {id:'occ-later',ruleId:'rule-later',walletId:'wallet-household-main',dueAt:today+4*DAY,status:'planned',sequence:1,expectedAmount:50,currency:'EUR'},
    {id:'occ-paid',ruleId:'rule-today',walletId:'wallet-household-main',dueAt:today,status:'paid',sequence:2,expectedAmount:20,currency:'EUR'},
    {id:'occ-private',ruleId:'rule-private',walletId:'wallet-martin',dueAt:today,status:'planned',sequence:1,expectedAmount:10,currency:'EUR'}
  ]
};
const scopeApi={
  activeWallet:s=>s.wallets.find(wallet=>wallet.id===s.activeWalletId),
  accessibleWallets:s=>s.wallets.filter(wallet=>!wallet.archivedAt&&(!Array.isArray(wallet.allowedMemberIds)||wallet.allowedMemberIds.includes(s.currentMemberId))),
  isPersonalWallet:wallet=>wallet?.type==='personal'
};

assert.equal(attention.leadDaysForRule(state,'rule-soon'),3);
let groups=attention.groupedAttention(state,scopeApi,today);
assert.deepEqual(groups.overdue.map(item=>item.occurrence.id),['occ-overdue']);
assert.deepEqual(groups.today.map(item=>item.occurrence.id),['occ-today']);
assert.deepEqual(groups.upcoming.map(item=>item.occurrence.id),['occ-soon']);
assert.ok(!attention.attentionItems(state,scopeApi,today).some(item=>item.occurrence.id==='occ-private'));
assert.ok(!attention.attentionItems(state,scopeApi,today).some(item=>item.occurrence.id==='occ-paid'));

attention.setRuleLeadDays(state,'rule-later',7);
groups=attention.groupedAttention(state,scopeApi,today);
assert.ok(groups.upcoming.some(item=>item.occurrence.id==='occ-later'));

attention.setRuleLeadDays(state,'rule-soon',0);
groups=attention.groupedAttention(state,scopeApi,today);
assert.ok(!groups.upcoming.some(item=>item.occurrence.id==='occ-soon'));

state.activeWalletId='wallet-anna';
assert.equal(attention.attentionItems(state,scopeApi,today).length,0);

console.log(JSON.stringify({status:'PASS',marker:'PF08A_M3_03_DOMAIN_PASS',defaultLeadDays:3,overduePersists:true,dueToday:true,upcomingWindow:true,paidHidden:true,scopeIsolation:true},null,2));

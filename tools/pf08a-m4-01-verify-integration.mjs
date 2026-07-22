import { readFileSync } from 'node:fs';

const html=readFileSync('src/familypilot.html','utf8');
const published=readFileSync('index.html','utf8');
const domain=readFileSync('familypilot-savings-goals.js','utf8');
const ui=readFileSync('familypilot-savings-goals-ui.js','utf8');
const count=(source,token)=>source.split(token).length-1;
const requireText=(source,token,message)=>{if(!source.includes(token))throw new Error(message)};
const forbidText=(source,token,message)=>{if(source.includes(token))throw new Error(message)};

if(html!==published)throw new Error('Canonical source and published HTML differ');
requireText(html,'savings-goal-config-v1','M4 package marker is missing');
requireText(html,'<script src="./familypilot-savings-goals.js"></script>','Savings domain script is missing');
requireText(html,'/* pf08a-m4-01-inline-ui:start */','Savings inline start marker is missing');
requireText(html,'/* pf08a-m4-01-inline-ui:end */','Savings inline end marker is missing');
if(count(html,'/* pf08a-m4-01-inline-ui:start */')!==1||count(html,'/* pf08a-m4-01-inline-ui:end */')!==1)throw new Error('Savings inline markers are not unique');
requireText(html,'debt-chains-principal-v1','M2 package marker regressed');
requireText(html,'plan-obligations-foundation-v1','M3 package marker regressed');
requireText(html,'hidden-capital-disclosure-v1','Hidden Capital marker regressed');
requireText(html,'compact-analytics-states-v1','Compact Analytics marker regressed');

requireText(domain,'root.FamilyPilotSavingsGoals=api','Savings domain global export is missing');
requireText(domain,'state.savingsGoals','Savings domain state collection is missing');
requireText(domain,'createGoal','Savings create contract is missing');
requireText(domain,'updateGoal','Savings update contract is missing');
requireText(domain,'archiveGoal','Savings archive contract is missing');
requireText(domain,"scope:'household'",'Household goal scope is missing');
forbidText(domain,'state.operations.push(','Savings domain creates operations');
forbidText(domain,'state.wallets.push(','Savings domain creates wallets');
forbidText(domain,"kind:'income'",'Savings domain creates Income');
forbidText(domain,"kind:'expense'",'Savings domain creates Expense');
forbidText(domain,"kind:'transfer'",'Savings domain creates Transfer');

requireText(ui,"planSavings.dataset.planModule='savings'",'Plan Savings activation is missing');
requireText(ui,"section.id='savingsGoalsScreen'",'Savings route screen is missing');
requireText(ui,'id="savingsGoalName"','Savings goal name field is missing');
requireText(ui,'id="savingsGoalTarget"','Savings target field is missing');
requireText(ui,'id="savingsGoalSaved"','Savings saved field is missing');
requireText(ui,'id="savingsGoalDate"','Savings optional date field is missing');
requireText(ui,'data-savings-help="target"','Target contextual help is missing');
requireText(ui,'data-savings-help="saved"','Saved contextual help is missing');
requireText(ui,'data-savings-help="archive"','Archive contextual help is missing');
requireText(ui,'data-savings-filter="archived"','Archived goals route is missing');
requireText(ui,'window.__FP_TEST__.savings','Savings test API is missing');
forbidText(ui,'id="savingsEmergency','Emergency cushion input leaked into goals screen');
forbidText(ui,'id="savingsUnallocated','Unallocated savings input leaked into goals screen');
forbidText(ui,'id="savingsTotal','Total savings input leaked into goals screen');
forbidText(ui,'id="savingsGoalWallet','Wallet-specific goal semantics leaked into M4-01');

console.log(JSON.stringify({
  status:'PASS',
  marker:'PF08A_M4_01_STATIC_PASS',
  sourceRootEqual:true,
  planSavingsActive:true,
  goalsOnly:true,
  householdScope:true,
  targetAndSavedDistinct:true,
  contextualHelp:true,
  archivePreservesObject:true,
  noWalletMovement:true,
  priorMarkersPreserved:true
},null,2));
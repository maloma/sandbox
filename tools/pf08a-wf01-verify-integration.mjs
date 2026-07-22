import { readFileSync } from 'node:fs';

const html=readFileSync('src/familypilot.html','utf8');
const published=readFileSync('index.html','utf8');
const domain=readFileSync('familypilot-wallet-management.js','utf8');
const ui=readFileSync('familypilot-wallet-management-ui.js','utf8');
const count=(source,token)=>source.split(token).length-1;
const requireText=(source,token,message)=>{if(!source.includes(token))throw new Error(message)};
const forbidText=(source,token,message)=>{if(source.includes(token))throw new Error(message)};

if(html!==published)throw new Error('Canonical source and published HTML differ');
requireText(html,'base-currency-wallet-management-v1','WF-01 package marker is missing');
requireText(html,'<script src="./familypilot-wallet-management.js"></script>','Wallet management domain script is missing');
requireText(html,'/* pf08a-wf01-inline-ui:start */','WF-01 inline start marker is missing');
requireText(html,'/* pf08a-wf01-inline-ui:end */','WF-01 inline end marker is missing');
if(count(html,'/* pf08a-wf01-inline-ui:start */')!==1||count(html,'/* pf08a-wf01-inline-ui:end */')!==1)throw new Error('WF-01 inline markers are not unique');
for(const marker of ['savings-goal-config-v1','debt-chains-principal-v1','plan-obligations-foundation-v1','hidden-capital-disclosure-v1','compact-analytics-states-v1'])requireText(html,marker,`Prior marker regressed: ${marker}`);

requireText(domain,'FamilyPilotWalletManagement=api','Wallet management global export is missing');
requireText(domain,'createWallet','Wallet creation contract is missing');
requireText(domain,'updateName','Wallet rename contract is missing');
requireText(domain,'setPersonalCapitalInclusion','Personal capital inclusion contract is missing');
requireText(domain,"type==='personal'",'Personal wallet type is missing');
requireText(domain,"'household_shared'",'Additional shared wallet type is missing');
requireText(domain,'openingBalance:0','Zero-start wallet default is missing');
requireText(domain,'allowedMemberIds:type===\'personal\'?[actorId]:allMembers','Shared/personal access defaults are missing');
forbidText(domain,'state.operations.push(','Wallet domain creates operations');
forbidText(domain,"kind:'income'",'Wallet domain creates Income');
forbidText(domain,"kind:'expense'",'Wallet domain creates Expense');
forbidText(domain,"kind:'transfer'",'Wallet domain creates Transfer');
forbidText(domain,'exchangeRate','FX logic leaked into WF-01');
forbidText(domain,'crypto','Crypto logic leaked into WF-01');

requireText(ui,"screen.id='walletManagementScreen'",'Wallet Management route is missing');
requireText(ui,'id="walletManagementOpen"','More → Wallet Management entry is missing');
requireText(ui,'value="household_shared"','Shared wallet create option is missing');
requireText(ui,'value="personal"','Personal wallet create option is missing');
requireText(ui,'id="walletManagementName"','Wallet name input is missing');
requireText(ui,'id="walletManagementCurrency"','Read-only base currency presentation is missing');
requireText(ui,'id="walletManagementIncluded"','Personal capital inclusion control is missing');
requireText(ui,'window.__FP_TEST__.walletManagement','WF-01 test API is missing');
forbidText(ui,'walletManagementOpeningBalance','Opening balance input leaked into WF-01');
forbidText(ui,'walletManagementCurrencyInput','Currency editing leaked into WF-01');
forbidText(ui,'walletManagementGrant','Access grant control leaked into WF-01');
forbidText(ui,'walletManagementRevoke','Access revoke control leaked into WF-01');
forbidText(ui,'walletManagementDelete','Delete control leaked into WF-01');
forbidText(ui,'walletManagementArchive','Archive control leaked into WF-01');
forbidText(ui,'walletManagementTransfer','Transfer control leaked into WF-01');

console.log(JSON.stringify({status:'PASS',marker:'PF08A_WF01_STATIC_PASS',sourceRootEqual:true,walletManagementRoute:true,sharedAndPersonalCreation:true,baseCurrencyReadOnly:true,personalPrivacyDefault:true,capitalInclusionControl:true,noFinancialOperation:true,noPermissions:true,noFxOrCrypto:true,noLifecycleDestruction:true,priorMarkersPreserved:true},null,2));
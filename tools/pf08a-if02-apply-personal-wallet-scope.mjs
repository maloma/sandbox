import { readFileSync, writeFileSync } from 'node:fs';

const sourcePath = 'src/familypilot.html';
const indexPath = 'index.html';
let source = readFileSync(sourcePath, 'utf8');

const countOf = (value, needle) => value.split(needle).length - 1;

function replaceExactlyOnce(from, to, label) {
  if (source.includes(to)) return;
  const count = countOf(source, from);
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(from, to);
}

function replaceRegexExactlyOnce(pattern, replacement, label) {
  const matches = source.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)) || [];
  if (matches.length !== 1) throw new Error(`${label}: expected one match, found ${matches.length}`);
  source = source.replace(pattern, replacement);
}

function transformLine(prefix, transform, label) {
  const lines = source.split('\n');
  const indexes = lines.map((line, index) => line.startsWith(prefix) ? index : -1).filter(index => index >= 0);
  if (indexes.length !== 1) throw new Error(`${label}: expected one line, found ${indexes.length}`);
  const index = indexes[0];
  const before = lines[index];
  const after = transform(before);
  if (before === after) throw new Error(`${label}: transform made no change`);
  lines[index] = after;
  source = lines.join('\n');
}

function replaceInside(value, from, to, label) {
  const count = countOf(value, from);
  if (count !== 1) throw new Error(`${label}: expected one inner match, found ${count}`);
  return value.replace(from, to);
}

replaceExactlyOnce(
  '<meta name="familypilot-package" content="canonical-runtime-source-v1">',
  '<meta name="familypilot-package" content="canonical-runtime-source-v1">\n<meta name="familypilot-package" content="personal-wallet-scope-v1">',
  'personal wallet package marker'
);

const scopeCss = `\n/* personal-wallet-scope-v1 */\n.page-title{align-items:flex-start}\n.page-title-copy{min-width:0}\n.page-title-copy h1{margin:0}\n.scope-context{display:block;margin-top:3px;color:var(--muted);font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:min(72vw,330px)}\nbody.personal-wallet-scope .capital{border-color:color-mix(in srgb,var(--purple) 44%,var(--line));background:color-mix(in srgb,var(--purple) 5%,var(--card))}\nbody.personal-wallet-scope .scope-context{color:color-mix(in srgb,var(--purple) 70%,var(--ink))}\n`;
if (!source.includes('/* personal-wallet-scope-v1 */')) {
  replaceExactlyOnce('</style>', `${scopeCss}</style>`, 'personal wallet scope CSS');
}

replaceExactlyOnce(
  '<section class="card capital"><div class="capital-head"><div><h2>Капитал · <span style="color:var(--muted)">включённые кошельки</span></h2>',
  '<section class="card capital"><div class="capital-head"><div><h2><span id="capitalTitleText">Капитал</span> · <span id="capitalScopeLabel" style="color:var(--muted)">включённые кошельки</span></h2>',
  'capital scope title'
);

replaceExactlyOnce(
  '<section id="operationsScreen" class="screen"><div class="page-title"><button class="back" data-back>‹</button><h1>Операции</h1></div>',
  '<section id="operationsScreen" class="screen"><div class="page-title"><button class="back" data-back>‹</button><div class="page-title-copy"><h1>Операции</h1><small id="operationsScopeLabel" class="scope-context">Семейный контекст</small></div></div>',
  'operations scope label'
);

replaceExactlyOnce(
  '<section id="analyticsScreen" class="screen"><div class="page-title"><button class="back" data-back>‹</button><h1>Аналитика</h1></div>',
  '<section id="analyticsScreen" class="screen"><div class="page-title"><button class="back" data-back>‹</button><div class="page-title-copy"><h1>Аналитика</h1><small id="analyticsScopeLabel" class="scope-context">Семейный контекст</small></div></div>',
  'analytics scope label'
);

replaceExactlyOnce(
  '<script>\n(()=>{\'use strict\';',
  '<script src="./src/familypilot-scope.js"></script>\n<script>\n(()=>{\'use strict\';',
  'scope module script inclusion'
);

replaceExactlyOnce(
  "{id:'wallet-household-main',type:'household_default',name:'Семейный кошелёк',nativeCurrency:'EUR',ownerMemberId:null,allowedMemberIds:MEMBERS.map(m=>m.id),permissions:{create:true,edit:true,viewHistory:true},includedInHouseholdCapital:true,colorSemantic:'blue',archivedAt:null}",
  "{id:'wallet-household-main',type:'household_default',name:'Семейный кошелёк',nativeCurrency:'EUR',openingBalance:0,ownerMemberId:null,allowedMemberIds:MEMBERS.map(m=>m.id),permissions:{create:true,edit:true,viewHistory:true},includedInHouseholdCapital:true,colorSemantic:'blue',archivedAt:null}",
  'household wallet opening balance'
);

replaceExactlyOnce(
  "{id:'wallet-personal-anna',type:'personal',name:'Личный кошелёк Анны',nativeCurrency:'EUR',ownerMemberId:'member-anna',allowedMemberIds:['member-anna'],permissions:{create:true,edit:true,viewHistory:true},includedInHouseholdCapital:false,colorSemantic:'pistachio',archivedAt:null}",
  "{id:'wallet-personal-anna',type:'personal',name:'Личный кошелёк Анны',nativeCurrency:'EUR',openingBalance:0,ownerMemberId:'member-anna',allowedMemberIds:['member-anna'],permissions:{create:true,edit:true,viewHistory:true},includedInHouseholdCapital:false,colorSemantic:'pistachio',archivedAt:null}",
  'personal wallet opening balance'
);

replaceExactlyOnce(
  "function demo(){const n=now();return{schemaVersion:2,household:{id:'household-demo',baseCurrency:'EUR'},currentMemberId:'member-anna'",
  "function demo(){const n=now();return{schemaVersion:2,household:{id:'household-demo',baseCurrency:'EUR',openingCapital:5200},currentMemberId:'member-anna'",
  'household opening capital fixture'
);

replaceExactlyOnce(
  "state.household=state.household||{id:'household-demo',baseCurrency:'EUR'};state.currentMemberId",
  "state.household=state.household||{id:'household-demo',baseCurrency:'EUR',openingCapital:5200};if(!Number.isFinite(Number(state.household.openingCapital)))state.household.openingCapital=5200;state.currentMemberId",
  'household opening capital normalization'
);

replaceExactlyOnce(
  "for(const w of state.wallets){if(w.type==='personal'&&typeof w.includedInHouseholdCapital!=='boolean')w.includedInHouseholdCapital=false}",
  "for(const w of state.wallets){if(w.type==='personal'&&typeof w.includedInHouseholdCapital!=='boolean')w.includedInHouseholdCapital=false;if(!Number.isFinite(Number(w.openingBalance)))w.openingBalance=0}",
  'wallet opening balance normalization'
);

replaceExactlyOnce(
  "const wallet=id=>state.wallets.find(w=>w.id===id),category=id=>state.categories.find(c=>c.id===id),activeOps=()=>state.operations.filter(o=>o.status==='active');",
  "const wallet=id=>state.wallets.find(w=>w.id===id),category=id=>state.categories.find(c=>c.id===id),activeOps=()=>state.operations.filter(o=>o.status==='active'),scopeApi=window.FamilyPilotScope;\nfunction ensureAccessibleActiveWallet(){const selected=scopeApi.activeWallet(state);if(selected&&selected.id!==state.activeWalletId)state.activeWalletId=selected.id;return selected}\nconst scopeWallet=()=>scopeApi.activeWallet(state),scopeOps=()=>scopeApi.visibleOperations(state),scopeDescriptor=()=>scopeApi.scopeDescriptor(state),scopeCurrency=()=>scopeDescriptor().currency;",
  'shared scope helpers'
);

replaceExactlyOnce(
  "function includedCapitalOps(){const allowed=new Set(state.wallets.filter(w=>w.includedInHouseholdCapital).map(w=>w.id));return activeOps().filter(o=>allowed.has(o.walletId))}",
  "function scopedCapitalSnapshot(){return scopeApi.capitalSnapshot(state)}",
  'scoped capital snapshot helper'
);

transformLine('function catHtml(', line => replaceInside(
  line,
  "money(x.value,state.household.baseCurrency)",
  "money(x.value,scopeCurrency())",
  'home category currency'
), 'catHtml scope currency');

transformLine('function renderCapital(){', () => "function renderCapital(){const snapshot=scopedCapitalSnapshot(),descriptor=scopeDescriptor(),personalOps=descriptor.scope==='personal'?scopeOps():[];$('capitalTitleText').textContent=descriptor.capitalTitle;$('capitalScopeLabel').textContent=descriptor.capitalLabel;$('capitalValue').textContent=money(snapshot.capital,snapshot.currency);setSigned($('capitalChange'),snapshot.change,snapshot.currency);document.body.classList.toggle('personal-wallet-scope',descriptor.scope==='personal');if(personalOps.length){const first=Math.min(...personalOps.map(o=>o.occurredAt));$('capitalStartDate').textContent=new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(first))}else $('capitalStartDate').textContent=descriptor.scope==='personal'?'Нет операций':'17.07.2026';$('capitalEndDate').textContent=new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date())}", 'renderCapital scope');

transformLine('function renderHome(){', () => "function renderHome(){const all=scopeOps(),list=inPeriod(all,periods.home),t=totals(list),diff=t.income-t.expense,currency=scopeCurrency();$('homeIncome').textContent=money(t.income,currency);$('homeExpense').textContent=money(t.expense,currency);setSigned($('homeDiff'),diff,currency);$('topCategories').innerHTML=catHtml(list);$('recentOperations').innerHTML=groupedHtml([...all].sort((a,b)=>b.occurredAt-a.occurredAt).slice(0,5))}", 'renderHome scope');

transformLine('function filteredOperations(){', line => replaceInside(
  line,
  'inPeriod(activeOps(),periods.operations)',
  'inPeriod(scopeOps(),periods.operations)',
  'operations scope source'
), 'filteredOperations scope');

transformLine('function renderOperations(){', line => {
  let value = line;
  value = replaceInside(value, "$('opsIncome').textContent=money(t.income)", "$('opsIncome').textContent=money(t.income,scopeCurrency())", 'operations income currency');
  value = replaceInside(value, "$('opsExpense').textContent=money(t.expense)", "$('opsExpense').textContent=money(t.expense,scopeCurrency())", 'operations expense currency');
  value = replaceInside(value, "setSigned($('opsDiff'),t.income-t.expense)", "setSigned($('opsDiff'),t.income-t.expense,scopeCurrency())", 'operations difference currency');
  value = value.replace('`от ${money(amountMin)}`', '`от ${money(amountMin,scopeCurrency())}`').replace('`до ${money(amountMax)}`', '`до ${money(amountMax,scopeCurrency())}`');
  return value;
}, 'renderOperations scope currency');

transformLine('function analyticsFilteredOperations(){', line => replaceInside(
  line,
  'inPeriod(activeOps(),periods.analytics)',
  'inPeriod(scopeOps(),periods.analytics)',
  'analytics scope source'
), 'analyticsFilteredOperations scope');

transformLine('function analyticsCategoryHtml(', line => replaceInside(
  line,
  "money(x.value,state.household.baseCurrency)",
  "money(x.value,scopeCurrency())",
  'analytics category currency'
), 'analyticsCategoryHtml scope currency');

transformLine('function renderAnalytics(){', line => {
  let value = line;
  value = replaceInside(value, "$('analyticsIncome').textContent=money(t.income)", "$('analyticsIncome').textContent=money(t.income,scopeCurrency())", 'analytics income currency');
  value = replaceInside(value, "$('analyticsExpense').textContent=money(t.expense)", "$('analyticsExpense').textContent=money(t.expense,scopeCurrency())", 'analytics expense currency');
  value = replaceInside(value, "setSigned($('analyticsDiff'),t.income-t.expense)", "setSigned($('analyticsDiff'),t.income-t.expense,scopeCurrency())", 'analytics difference currency');
  return value;
}, 'renderAnalytics scope currency');

transformLine('function categoryFilterCount(', line => replaceInside(
  line,
  "categoryFilterContext==='analytics'?inPeriod(activeOps(),periods.analytics):inPeriod(activeOps(),periods.operations)",
  "categoryFilterContext==='analytics'?inPeriod(scopeOps(),periods.analytics):inPeriod(scopeOps(),periods.operations)",
  'category count scope source'
), 'categoryFilterCount scope');

transformLine('function renderMore(){', () => "function renderMore(){const available=scopeApi.accessibleWallets(state);if(available.length&&!available.some(w=>w.id===state.activeWalletId))state.activeWalletId=available[0].id;$('walletSelect').innerHTML=available.map(w=>`<option value=\"${esc(w.id)}\"${w.id===state.activeWalletId?' selected':''}>${esc(w.name)} · ${esc(w.nativeCurrency)}</option>`).join('');$('themeSelect').value=themePreference();$('actorSelect').innerHTML=MEMBERS.map(m=>`<option value=\"${m.id}\"${m.id===state.currentMemberId?' selected':''}>${m.name}</option>`).join('');$('trashFlagBtn').classList.toggle('on',state.config.trashRetentionEnabled);$('walletContracts').textContent=state.wallets.map(w=>{const rows=[w.name,`тип = ${w.type}`,`валюта = ${w.nativeCurrency}`,`контекст = ${scopeApi.isPersonalWallet(w)?'личный':'семейный'}`,`в семейном капитале = ${w.includedInHouseholdCapital?'да':'нет'}`];if(w.ownerMemberId)rows.push(`владелец = ${memberName(w.ownerMemberId)}`);return rows.join(String.fromCharCode(10))}).join(String.fromCharCode(10,10))}", 'renderMore accessible wallets');

replaceRegexExactlyOnce(
  /function openCapitalInfo\(\)\{[\s\S]*?(?=\nfunction openWalletInfo\(\))/, 
  "function openCapitalInfo(){const descriptor=scopeDescriptor(),snapshot=scopedCapitalSnapshot();if(descriptor.scope==='personal'){const w=descriptor.wallet;$('capitalInfoContent').innerHTML=`<div class=\"schema-box\"><b>${esc(w.name)}</b>\nПоказан личный финансовый контекст выбранного кошелька.\n\nБаланс кошелька: ${money(snapshot.capital,snapshot.currency)}\nИзменение по операциям: ${signed(snapshot.change,snapshot.currency)}\nВ семейном капитале: ${w.includedInHouseholdCapital?'да':'нет'}\n\nПодробные операции этого кошелька не смешиваются с семейными операциями. Доступ и включение в семейный капитал остаются независимыми настройками.</div>`;open('capitalInfo');return}const included=state.wallets.filter(w=>w.includedInHouseholdCapital),excluded=state.wallets.filter(w=>!w.includedInHouseholdCapital),receivable=180,payable=420,net=receivable-payable;$('capitalInfoContent').innerHTML=`<div class=\"schema-box\"><b>Операционный капитал</b>\nКапитал считается по включённым кошелькам и не смешивается с долгами.\n\n<b>Включены в семейный капитал</b>\n${included.map(w=>`${esc(w.name)} · ${esc(w.nativeCurrency)}`).join('\\n')||'Нет'}\n\n<b>Не включены по умолчанию</b>\n${excluded.map(w=>`${esc(w.name)} · личный · владелец ${esc(memberName(w.ownerMemberId))}`).join('\\n')||'Нет'}\n\n<b>Долговая позиция отдельно</b>\nМне должны: +${money(receivable)}\nЯ верну: −${money(payable)}\nЧистая долговая позиция: ${signed(net)}\n\nДолги показываются рядом, но не входят в операционный капитал.</div>`;open('capitalInfo')}",
  'personal capital information'
);

replaceRegexExactlyOnce(
  /function openWalletInfo\(\)\{[\s\S]*?(?=\nfunction toast\()/,
  "function openWalletInfo(){const w=scopeWallet();if(!w)return;const descriptor=scopeDescriptor();$('walletInfoContent').innerHTML=`<div class=\"schema-box\">${esc(w.name)}\nТип: ${descriptor.scope==='personal'?'личный':'семейный'}\nВалюта: ${w.nativeCurrency}\nВ семейном капитале: ${w.includedInHouseholdCapital?'да':'нет'}\nВидимый финансовый контекст: ${descriptor.scope==='personal'?'только этот личный кошелёк':'семейные кошельки'}\n\nАктивный кошелёк выбирается в разделе «Ещё».</div>`;open('walletInfo')}",
  'active wallet information'
);

transformLine('function renderAll(){', () => "function renderAll(){purgeExpiredTrash();ensureAccessibleActiveWallet();applyTheme();const descriptor=scopeDescriptor();$('operationsScopeLabel').textContent=descriptor.operationsLabel;$('analyticsScopeLabel').textContent=descriptor.analyticsLabel;renderPeriods();renderCapital();renderHome();renderOperations();renderAnalytics();renderMore();save()}", 'renderAll scope setup');

replaceExactlyOnce(
  "$('walletSelect').onchange=e=>{state.activeWalletId=e.target.value;save();renderAll();toast(`Основной кошелёк: ${wallet(state.activeWalletId)?.name||'—'}`)}",
  "$('walletSelect').onchange=e=>{state.activeWalletId=e.target.value;save();renderAll();toast(`Активный кошелёк: ${scopeWallet()?.name||'—'}`)}",
  'active wallet selection message'
);

transformLine("if(new URLSearchParams(location.search).has('test'))window.__FP_TEST__=", line => replaceInside(
  line,
  'revisionChanges,renderAll};',
  "revisionChanges,setActiveWallet:id=>{state.activeWalletId=id;save();renderAll()},getActiveWallet:()=>scopeWallet()?.id||null,getScopeDescriptor:()=>({...scopeDescriptor(),wallet:scopeWallet()?{...scopeWallet()}:null}),visibleOperationIds:()=>scopeOps().map(o=>o.id),capitalSnapshot:()=>({...scopedCapitalSnapshot(),wallet:scopeWallet()?{...scopeWallet()}:null}),renderAll};",
  'test scope API'
), 'test scope API exposure');

writeFileSync(sourcePath, source, 'utf8');
writeFileSync(indexPath, source, 'utf8');
console.log(JSON.stringify({
  status: 'PASS',
  source: sourcePath,
  index: indexPath,
  marker: 'personal-wallet-scope-v1',
  bytes: Buffer.byteLength(source)
}, null, 2));

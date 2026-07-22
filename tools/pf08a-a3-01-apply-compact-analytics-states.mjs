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

replaceExactlyOnce(
  '<meta name="familypilot-package" content="personal-wallet-scope-v1">',
  '<meta name="familypilot-package" content="personal-wallet-scope-v1">\n<meta name="familypilot-package" content="compact-analytics-states-v1">',
  'compact Analytics package marker'
);

const analyticsCss = `\n/* compact-analytics-states-v1 */\n.analytics-data-basis{display:block;margin-top:3px;color:var(--muted);font-size:11px;font-weight:750}\n.analytics-operation .missing-category-hint,.cat .missing-category-hint{display:block;margin-top:3px;color:var(--red);font-size:10px;font-weight:750}\n.empty[data-analytics-state]{border:1px dashed var(--line);border-radius:15px;background:var(--card2);margin-top:8px}\n`;
if (!source.includes('/* compact-analytics-states-v1 */')) {
  replaceExactlyOnce('</style>', `${analyticsCss}</style>`, 'compact Analytics CSS');
}

replaceExactlyOnce(
  '<div class="page-title-copy"><h1>Аналитика</h1><small id="analyticsScopeLabel" class="scope-context">Семейный контекст</small></div>',
  '<div class="page-title-copy"><h1>Аналитика</h1><small id="analyticsScopeLabel" class="scope-context">Семейный контекст</small><small id="analyticsDataBasis" class="analytics-data-basis">На основе записанных операций</small></div>',
  'Analytics recorded-data basis label'
);

replaceExactlyOnce(
  '<script src="./familypilot-scope.js"></script>',
  '<script src="./familypilot-scope.js"></script>\n<script src="./familypilot-analytics-state.js"></script>',
  'Analytics state module inclusion'
);

replaceExactlyOnce(
  "const scopeWallet=()=>scopeApi.activeWallet(state),scopeOps=()=>scopeApi.visibleOperations(state),scopeDescriptor=()=>scopeApi.scopeDescriptor(state),scopeCurrency=()=>scopeDescriptor().currency;",
  "const scopeWallet=()=>scopeApi.activeWallet(state),scopeOps=()=>scopeApi.visibleOperations(state),scopeDescriptor=()=>scopeApi.scopeDescriptor(state),scopeCurrency=()=>scopeDescriptor().currency,analyticsStateApi=window.FamilyPilotAnalyticsState;",
  'Analytics state API binding'
);

transformLine('function analyticsFilteredOperations(){', () => "function analyticsPeriodOperations(){return inPeriod(scopeOps(),periods.analytics)}\nfunction analyticsOptionalFiltersActive(){return analyticsSelectedCategoryIds.size>0||!!normalizeName(analyticsSearch)}\nfunction analyticsFilteredOperations(){let list=analyticsPeriodOperations().filter(o=>analyticsMode==='all'||o.kind===analyticsMode);if(analyticsSelectedCategoryIds.size)list=list.filter(o=>analyticsSelectedCategoryIds.has(o.categoryId));const q=normalizeName(analyticsSearch);if(q)list=list.filter(o=>normalizeName(`${categoryName(o.categoryId)} ${o.note||''} ${wallet(o.walletId)?.name||''}`).includes(q));return list.sort(analyticsSort==='amount'?(a,b)=>Number(b.amount)-Number(a.amount)||b.occurredAt-a.occurredAt:(a,b)=>b.occurredAt-a.occurredAt)}\nfunction analyticsStateSnapshot(list=analyticsFilteredOperations()){const periodList=analyticsPeriodOperations(),periodTotals=totals(periodList),descriptor=scopeDescriptor();return analyticsStateApi.classify({scopeCount:scopeOps().length,periodCount:periodList.length,filteredCount:list.length,periodIncome:periodTotals.income,periodExpense:periodTotals.expense,mode:analyticsMode,optionalFiltersActive:analyticsOptionalFiltersActive(),scopeType:descriptor.scope,scopeLabel:descriptor.wallet?.name||descriptor.analyticsLabel})}", 'Analytics state helpers');

transformLine('function analyticsCategoryHtml(', () => "function analyticsCategoryHtml(list,viewState){if(!list.length)return`<div class=\"empty\" data-analytics-state=\"${esc(viewState.state)}\">${esc(viewState.categoryMessage)}</div>`;const total=list.reduce((a,o)=>a+Number(o.amount||0),0),groups=new Map();for(const o of list){const key=`${o.kind}\\u0000${o.categoryId}`,current=groups.get(key)||{id:o.categoryId,kind:o.kind,value:0};current.value+=Number(o.amount||0);groups.set(key,current)}return[...groups.values()].map(x=>({...x,pct:total?x.value/total*100:0,c:category(x.id)})).sort((a,b)=>b.value-a.value).map(x=>{const missing=!x.c,name=x.c?.name||'Категория недоступна';return`<div class=\"cat\" data-category-id=\"${esc(x.id)}\"${missing?' data-missing-category=\"true\"':''}><div><div class=\"cat-row\"><b>${esc(name)}<span class=\"category-kind\">${x.kind==='income'?'Приход':'Расход'}</span>${missing?'<span class=\"missing-category-hint\">Исправить в операции</span>':''}</b><span>${Math.round(x.pct)}%</span></div><div class=\"bar\"><i style=\"width:${Math.max(4,x.pct)}%\"></i></div></div><b>${money(x.value,scopeCurrency())}</b></div>`}).join('')}", 'Analytics category state rendering');

transformLine('function analyticsOperationsHtml(', () => "function analyticsOperationsHtml(list,viewState){return list.length?list.map(o=>{const w=wallet(o.walletId),c=category(o.categoryId),missing=!c;return`<div class=\"analytics-operation ${o.kind}\" data-op-id=\"${esc(o.id)}\"${missing?' data-missing-category=\"true\"':''}><div><strong>${esc(c?.name||'Категория недоступна')}</strong>${missing?'<div class=\"missing-category-hint\">Откройте операцию, чтобы выбрать категорию</div>':''}<div class=\"kind-label\">${o.kind==='income'?'Приход':'Расход'} · ${esc(w?.name||'Кошелёк')}</div>${o.note?`<div class=\"op-note\">${esc(o.note)}</div>`:''}<div class=\"op-date\">${esc(formatDateTime(o.occurredAt))}</div></div><div class=\"op-value\">${o.kind==='income'?'+':'−'}${money(o.amount,w?.nativeCurrency||'EUR')}</div></div>`}).join(''):`<div class=\"empty\" data-analytics-state=\"${esc(viewState.state)}\">${esc(viewState.operationsMessage)}</div>`}", 'Analytics source-operation state rendering');

transformLine('function renderAnalytics(){', () => "function renderAnalytics(){const periodList=analyticsPeriodOperations(),list=analyticsFilteredOperations(),t=totals(list),viewState=analyticsStateSnapshot(list);$('analyticsScreen').dataset.analyticsState=viewState.state;$('analyticsScreen').dataset.analyticsEmptyReason=viewState.emptyReason||'';$('analyticsDataBasis').textContent=viewState.basisLabel;$('analyticsIncome').textContent=money(t.income,scopeCurrency());$('analyticsExpense').textContent=money(t.expense,scopeCurrency());setSigned($('analyticsDiff'),t.income-t.expense,scopeCurrency());document.querySelectorAll('[data-analytics-mode]').forEach(b=>b.classList.toggle('active',b.dataset.analyticsMode===analyticsMode));$('analyticsCategoryTitle').textContent=analyticsSelectedCategoryIds.size?`Категории: ${analyticsSelectedCategoryIds.size}`:analyticsMode==='expense'?'Все категории расходов':analyticsMode==='income'?'Все категории приходов':'Все категории';$('analyticsCategorySubtitle').textContent=analyticsSelectedCategoryIds.size?'Активен множественный фильтр':'Фильтр не применён';$('analyticsSearch').value=analyticsSearch;$('analyticsSortBtn').textContent=analyticsSort==='amount'?'По сумме ↓':'По дате ↓';$('analyticsCategories').innerHTML=analyticsCategoryHtml(list,viewState);$('analyticsOperations').innerHTML=analyticsOperationsHtml(list,viewState);$('analyticsResultCount').textContent=`Найдено: ${list.length}`}", 'Analytics unified state rendering');

transformLine("if(new URLSearchParams(location.search).has('test'))window.__FP_TEST__=", line => {
  const anchor = 'capitalSnapshot:()=>({...scopedCapitalSnapshot(),wallet:scopeWallet()?{...scopeWallet()}:null}),renderAll};';
  const replacement = "capitalSnapshot:()=>({...scopedCapitalSnapshot(),wallet:scopeWallet()?{...scopeWallet()}:null}),setAnalyticsPeriod:(range,anchor)=>{periods.analytics=normPeriod({range,anchor});save();renderAll()},replaceOperationsForTest:operations=>{state.operations=JSON.parse(JSON.stringify(Array.isArray(operations)?operations:[]));normalizeState();save();renderAll()},resetAnalyticsFilters:()=>{analyticsMode='expense';analyticsSelectedCategoryIds.clear();analyticsSearch='';analyticsSort='amount';renderAnalytics()},getAnalyticsViewState:()=>({...analyticsStateSnapshot()}),renderAll};";
  const count = line.split(anchor).length - 1;
  if (count !== 1) throw new Error(`Analytics test API: expected one anchor, found ${count}`);
  return line.replace(anchor, replacement);
}, 'Analytics test API');

writeFileSync(sourcePath, source, 'utf8');
writeFileSync(indexPath, source, 'utf8');
console.log(JSON.stringify({status:'PASS',marker:'compact-analytics-states-v1',source:sourcePath,index:indexPath,bytes:Buffer.byteLength(source)},null,2));

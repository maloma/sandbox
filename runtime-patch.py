from pathlib import Path
import re

p = Path('runtime-source.html')
s = p.read_text(encoding='utf-8')


def rep(old: str, new: str, count: int = 1) -> None:
    global s
    if old not in s:
        raise SystemExit(f'marker not found: {old[:120]!r}')
    s = s.replace(old, new, count)


def refunc(name: str, next_name: str, new_code: str) -> None:
    global s
    pattern = rf'function {re.escape(name)}\b.*?\nfunction {re.escape(next_name)}\b'
    match = re.search(pattern, s, flags=re.S)
    if not match:
        raise SystemExit(f'function block not found: {name} -> {next_name}')
    s = s[:match.start()] + new_code.rstrip() + '\nfunction ' + next_name + s[match.end():]


rep(
    '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">',
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
)

rep(
    '.trash-item-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}',
    '.trash-item-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.trash-item-actions .btn{min-width:0;white-space:normal;overflow-wrap:anywhere;line-height:1.15;padding:9px 6px}.trash-item-actions [data-trash-purge]{grid-column:1/-1}'
)

extra_css = r'''
html.modal-open,body.modal-open{overflow:hidden;overscroll-behavior:none}body.modal-open{position:fixed;width:100%}
.panel,.sheet{min-width:0;overflow-x:hidden;overscroll-behavior:contain}.field,.filter-row,.amount-filter{min-width:0}
.field input,.field textarea,.field select,.input,input[type=date],input[type=month],input[type=datetime-local]{min-width:0;max-width:100%;width:100%;display:block;-webkit-appearance:none;appearance:none}
.sheet-actions,.panel-actions{grid-template-columns:repeat(2,minmax(0,1fr))}.btn{min-width:0;padding:10px 8px;white-space:normal;line-height:1.18;overflow-wrap:anywhere}
.detail-actions{grid-template-columns:repeat(3,minmax(0,1fr))}
#analyticsScreen>.summary,#operationsScreen>.summary{margin-bottom:10px}
.amount-filter{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:7px;margin-top:10px;align-items:end}.amount-filter label{min-width:0;color:var(--muted);font-size:11px;font-weight:800}.amount-filter input{margin-top:5px;min-height:42px;border:1px solid var(--line);border-radius:12px;background:var(--card2);color:var(--ink);padding:8px 10px}.amount-filter.active input{border-color:color-mix(in srgb,var(--green) 58%,var(--line))}.amount-filter-status{grid-column:1/-1;margin-top:0}
.history-item-head{display:flex;justify-content:space-between;gap:8px;align-items:baseline;margin-bottom:7px}.history-item-head b{font-size:12px}.history-item-head small{text-align:right}.history-change{padding:4px 0;border-top:1px dashed var(--line);line-height:1.35}.history-change:first-child{border-top:0}.history-change strong{display:inline}
.category-manager-add{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;margin-top:10px}.category-manager-add input{min-width:0}
@media(max-width:420px){.detail-actions{grid-template-columns:1fr 1fr}.detail-actions .danger{grid-column:1/-1}.category-picker-tools{grid-template-columns:1fr 1fr}.category-picker-tools .input{grid-column:1/-1}.amount-filter{grid-template-columns:1fr 1fr}.amount-filter .mini{grid-column:1/-1}.panel,.sheet{padding-left:14px;padding-right:14px}.entry-head,.detail-head{margin-left:-14px;margin-right:-14px;padding-left:14px;padding-right:14px}}
'''.strip()
rep('@media(max-width:380px){', extra_css + '\n@media(max-width:380px){')

# Operations filter card: add amount range.
old_filter_end = '<button id="trashBtn" class="trash-button" title="Корзина">⌫<span id="trashBadge" class="badge" hidden>0</span></button></div></section>'
new_filter_end = '<button id="trashBtn" class="trash-button" title="Корзина">⌫<span id="trashBadge" class="badge" hidden>0</span></button></div><div id="amountFilter" class="amount-filter"><label>Сумма от<input id="amountFrom" inputmode="decimal" placeholder="0,00"></label><label>Сумма до<input id="amountTo" inputmode="decimal" placeholder="Без ограничения"></label><button id="clearAmountFilter" class="mini" type="button">Сбросить</button><div id="amountFilterStatus" class="selected-count amount-filter-status">Диапазон суммы не задан</div></div></section>'
rep(old_filter_end, new_filter_end)

rep(
    '<div class="summary"><div><span>Приход</span><strong id="opsIncome" class="positive">0 €</strong></div><div><span>Расход</span><strong id="opsExpense" class="negative">0 €</strong></div><div><span>Разница</span><strong id="opsDiff">0 €</strong></div></div>',
    '<div class="summary"><div><span>Расход</span><strong id="opsExpense" class="negative">0 €</strong></div><div><span>Разница</span><strong id="opsDiff">0 €</strong></div><div><span>Приход</span><strong id="opsIncome" class="positive">0 €</strong></div></div>'
)
rep(
    '<div class="summary"><div><span>Приход</span><strong id="analyticsIncome" class="positive">0 €</strong></div><div><span>Расход</span><strong id="analyticsExpense" class="negative">0 €</strong></div><div><span>Разница</span><strong id="analyticsDiff">0 €</strong></div></div>',
    '<div class="summary"><div><span>Расход</span><strong id="analyticsExpense" class="negative">0 €</strong></div><div><span>Разница</span><strong id="analyticsDiff">0 €</strong></div><div><span>Приход</span><strong id="analyticsIncome" class="positive">0 €</strong></div></div>'
)

rep(
    '<div class="sheet-actions"><button class="btn secondary" data-close="operationDetail">Готово</button><button id="detailEditBtn" class="btn primary">Изменить</button></div>',
    '<div class="sheet-actions detail-actions"><button class="btn secondary" data-close="operationDetail">Готово</button><button id="detailEditBtn" class="btn primary">Изменить</button><button id="detailDeleteBtn" class="btn danger">Удалить</button></div>'
)
rep(
    '<div id="newCategoryBox" style="display:none;grid-template-columns:1fr auto;gap:7px;margin-top:7px"><input id="newCategoryInput" placeholder="Новая категория"><button id="saveNewCategoryBtn" class="mini">Добавить</button></div></div><div class="field"><label for="dateInput">Дата и время</label>',
    '<div id="newCategoryBox" style="display:none;grid-template-columns:1fr auto;gap:7px;margin-top:7px"><input id="newCategoryInput" placeholder="Новая категория"><button id="saveNewCategoryBtn" class="mini">Добавить</button></div><div id="categoryError" class="error"></div></div><div class="field"><label for="dateInput">Дата и время</label>'
)
rep(
    '<div class="sheet-actions"><button id="deleteOperationBtn" class="btn danger" hidden>Удалить</button><button id="saveOperationBtn" class="btn primary">Сохранить</button></div>',
    '<div class="sheet-actions"><button id="saveOperationBtn" class="btn primary" style="grid-column:1/-1">Сохранить</button></div>'
)
rep(
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px"><button class="mini" data-cat-kind="expense">Расходы</button><button class="mini" data-cat-kind="income">Приходы</button></div><div id="categoryManagerList" class="category-manager-list"></div>',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px"><button class="mini" data-cat-kind="expense">Расходы</button><button class="mini" data-cat-kind="income">Приходы</button></div><div class="category-manager-add"><input id="managerNewCategoryInput" class="input" placeholder="Новая категория"><button id="managerAddCategoryBtn" class="mini">Добавить</button></div><div id="managerCategoryError" class="error"></div><div id="categoryManagerList" class="category-manager-list"></div>'
)

history_helpers = r'''
const sameMeaning=(field,a,b)=>field==='occurredAt'?isoLocal(a)===isoLocal(b):String(a??'')===String(b??'');
function revisionChanges(r){return(Array.isArray(r?.changes)?r.changes:[{field:r?.field,oldValue:r?.oldValue,newValue:r?.newValue}]).filter(c=>c.field&&!sameMeaning(c.field,c.oldValue,c.newValue))}
function normalizeRevisionHistory(list){const out=[];for(const raw of(Array.isArray(list)?list:[])){const changes=revisionChanges(raw);if(!changes.length)continue;if(Array.isArray(raw.changes)){out.push({...raw,changes});continue}const prev=out[out.length-1],canMerge=prev&&prev._legacy&&!raw.batchId&&prev.changedByMemberId===raw.changedByMemberId&&prev.source===(raw.source||'user')&&Math.abs(Number(prev.changedAt)-Number(raw.changedAt))<1500;if(canMerge){prev.changes.push(...changes);prev.changedAt=Math.max(Number(prev.changedAt)||0,Number(raw.changedAt)||0)}else out.push({id:raw.id||uid('rev'),sequence:out.length+1,changedByMemberId:raw.changedByMemberId,changedAt:raw.changedAt,source:raw.source||'user',batchId:raw.batchId||null,changes,_legacy:true})}return out.map((r,i)=>{const x={...r,sequence:i+1};delete x._legacy;return x})}
'''.strip()
rep(
    "const fieldLabels={amount:'Сумма',occurredAt:'Дата операции',categoryId:'Категория',walletId:'Кошелёк',note:'Комментарий',kind:'Тип операции',status:'Статус'};",
    "const fieldLabels={amount:'Сумма',occurredAt:'Дата операции',categoryId:'Категория',walletId:'Кошелёк',note:'Комментарий',kind:'Тип операции',status:'Статус'};\n" + history_helpers
)
rep("o.revisions=Array.isArray(o.revisions)?o.revisions:[];", "o.revisions=normalizeRevisionHistory(o.revisions);")
rep(
    "let opsTypeFilter='all',selectedCategoryIds=new Set(),pendingCategoryIds=new Set(),categorySearch='',pickerContext='home',detailId='',editKind='expense',managerKind='expense';",
    "let opsTypeFilter='all',selectedCategoryIds=new Set(),pendingCategoryIds=new Set(),categorySearch='',amountMin=null,amountMax=null,pickerContext='home',detailId='',editKind='expense',managerKind='expense';"
)

refunc('filteredOperations', 'renderOperations', r'''function filteredOperations(){let list=inPeriod(activeOps(),periods.operations).filter(o=>opsTypeFilter==='all'||o.kind===opsTypeFilter);if(selectedCategoryIds.size)list=list.filter(o=>selectedCategoryIds.has(o.categoryId));if(amountMin!==null)list=list.filter(o=>Number(o.amount)>=amountMin);if(amountMax!==null)list=list.filter(o=>Number(o.amount)<=amountMax);return list.sort((a,b)=>b.occurredAt-a.occurredAt)}''')

refunc('renderOperations', 'renderAnalytics', r'''function renderOperations(){const list=filteredOperations(),t=totals(list);$('operationsList').innerHTML=groupedHtml(list);$('opsIncome').textContent=money(t.income);$('opsExpense').textContent=money(t.expense);setSigned($('opsDiff'),t.income-t.expense);document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===opsTypeFilter));$('categoryFilterTitle').textContent=selectedCategoryIds.size?`Категории: ${selectedCategoryIds.size}`:'Все категории';$('categoryFilterSubtitle').textContent=selectedCategoryIds.size?'Активен множественный фильтр':'Фильтр не применён';$('amountFilter').classList.toggle('active',amountMin!==null||amountMax!==null);$('amountFrom').value=amountMin===null?'':String(amountMin).replace('.',',');$('amountTo').value=amountMax===null?'':String(amountMax).replace('.',',');$('amountFilterStatus').textContent=amountMin===null&&amountMax===null?'Диапазон суммы не задан':`Сумма: ${amountMin===null?'от 0':`от ${money(amountMin)}`} · ${amountMax===null?'без верхней границы':`до ${money(amountMax)}`}`;const trash=state.operations.filter(o=>o.status==='trash');$('trashBadge').hidden=!trash.length;$('trashBadge').textContent=trash.length}''')

refunc('open', 'activeCategories', r'''let bodyLockY=0;
function syncBodyLock(){const locked=!!document.querySelector('.overlay.open,.modal.open');if(locked&&!document.body.classList.contains('modal-open')){bodyLockY=window.scrollY;document.documentElement.classList.add('modal-open');document.body.classList.add('modal-open');document.body.style.top=`-${bodyLockY}px`}else if(!locked&&document.body.classList.contains('modal-open')){document.documentElement.classList.remove('modal-open');document.body.classList.remove('modal-open');document.body.style.top='';window.scrollTo(0,bodyLockY)}}
function open(id){$(id).classList.add('open');queueMicrotask(syncBodyLock)}
function close(id){$(id).classList.remove('open');queueMicrotask(syncBodyLock)}''')

refunc('openEntry', 'revision', r'''function openEntry(kind,id=''){editKind=kind;const o=id?state.operations.find(x=>x.id===id):null,w=wallet(o?.walletId||state.activeWalletId);$('editingId').value=id;$('entryTitle').textContent=o?'Изменить операцию':kind==='income'?'Добавить приход':'Добавить расход';$('entryHead').className='sheet-head entry-head '+kind;$('entryWalletName').textContent=w.name;$('entryWalletMeta').textContent=`${w.nativeCurrency} · ${w.type==='household_default'?'общий семейный':'личный'}`;$('amountInput').value=o?String(o.amount).replace('.',','):'';fillCategorySelect(kind,o?.categoryId);$('dateInput').value=isoLocal(o?.occurredAt||now());$('noteInput').value=o?.note||'';$('entryError').textContent='';$('categoryError').textContent='';$('newCategoryBox').style.display='none';open('entryModal')}''')

refunc('revision', 'saveOperation', r'''function revisionBatch(op,changes,source='user',batchId=uid('batch')){const actual=changes.filter(c=>!sameMeaning(c.field,c.oldValue,c.newValue));if(!actual.length)return null;const item={id:uid('rev'),sequence:op.revisions.length+1,changedByMemberId:state.currentMemberId,changedAt:now(),source,batchId,changes:actual};op.revisions.push(item);return item}
function revision(op,field,oldValue,newValue,source='user',batchId=null){return revisionBatch(op,[{field,oldValue,newValue}],source,batchId||uid('batch'))}''')

refunc('saveOperation', 'formatHistoryValue', r'''function saveOperation(){const amount=Number($('amountInput').value.trim().replace(',','.'));if(!Number.isFinite(amount)||amount<=0||amount>999999.99){$('entryError').textContent='Сумма должна быть от 0,01 € до 999 999,99 €.';return}const rawDate=$('dateInput').value,id=$('editingId').value,existing=id?state.operations.find(o=>o.id===id):null;let occurredAt=new Date(rawDate).getTime();if(existing&&isoLocal(existing.occurredAt)===rawDate)occurredAt=existing.occurredAt;if(!Number.isFinite(occurredAt)||occurredAt>now()){$('entryError').textContent='Будущая дата операции запрещена.';return}const categoryId=$('categoryInput').value,note=$('noteInput').value.trim(),walletId=existing?existing.walletId:state.activeWalletId;if(existing){const proposed={amount,occurredAt,categoryId,walletId,note,kind:editKind},changes=Object.entries(proposed).filter(([field,value])=>!sameMeaning(field,existing[field],value)).map(([field,newValue])=>({field,oldValue:existing[field],newValue}));if(changes.length){revisionBatch(existing,changes,'user');for(const c of changes)existing[c.field]=c.newValue;existing.lastEditedByMemberId=state.currentMemberId;existing.lastEditedAt=now();toast(`Операция обновлена · полей: ${changes.length}`)}else toast('Изменений нет')}else{const t=now();state.operations.push({id:uid('op'),kind:editKind,amount,categoryId,walletId,note,occurredAt,createdByMemberId:state.currentMemberId,createdAt:t,lastEditedByMemberId:state.currentMemberId,lastEditedAt:t,revisions:[],status:'active',deletedAt:null,deletedByMemberId:null,trashExpiresAt:null,receipt:null,links:{},transferGroupId:null});toast('Операция сохранена')}close('entryModal');renderAll()}''')

refunc('openDetail', 'deleteOperation', r'''function openDetail(id){const o=state.operations.find(x=>x.id===id);if(!o)return;detailId=id;const w=wallet(o.walletId),history=normalizeRevisionHistory(o.revisions);o.revisions=history;$('detailHead').className='sheet-head detail-head '+o.kind;$('detailTitle').textContent=o.kind==='income'?'Приход':'Расход';$('detailAmount').textContent=(o.kind==='income'?'+':'−')+money(o.amount,w.nativeCurrency);$('detailAmount').className='detail-amount '+(o.kind==='income'?'positive':'negative');$('detailCategory').textContent=categoryName(o.categoryId);$('detailWallet').textContent=w.name;$('detailCurrency').textContent=w.nativeCurrency;$('detailOccurred').textContent=formatDateTime(o.occurredAt);$('detailNote').textContent=o.note||'Без комментария';$('detailCreated').textContent=`${memberName(o.createdByMemberId)} · ${formatDateTime(o.createdAt)}`;$('detailEdited').textContent=`${memberName(o.lastEditedByMemberId)} · ${formatDateTime(o.lastEditedAt)}`;$('detailDeletionRow').hidden=o.status!=='trash';$('detailDeletion').textContent=o.status==='trash'?`${memberName(o.deletedByMemberId)} · ${formatDateTime(o.deletedAt)}`:'';$('historyCount').textContent=history.length;$('historyList').innerHTML=history.length?[...history].reverse().map(r=>{const changes=revisionChanges(r);return`<div class="history-item"><div class="history-item-head"><b>Изменение · ${changes.length} ${changes.length===1?'поле':'поля'}</b><small>${esc(memberName(r.changedByMemberId))} · ${esc(formatDateTime(r.changedAt))}</small></div>${changes.map(c=>`<div class="history-change"><strong>${esc(fieldLabels[c.field]||c.field)}</strong>: ${esc(formatHistoryValue(c.field,c.oldValue))} → ${esc(formatHistoryValue(c.field,c.newValue))}</div>`).join('')}</div>`}).join(''):'<div class="history-item"><small>Изменений после создания ещё не было.</small></div>';$('detailEditBtn').hidden=o.status!=='active';$('detailDeleteBtn').hidden=o.status!=='active';open('operationDetail')}''')

refunc('createCategory', 'renameCategory', r'''function createCategory(kind,name){const clean=String(name||'').trim().replace(/\s+/g,' '),norm=normalizeName(clean),kindLabel=kind==='income'?'прихода':'расхода';if(!clean)return{ok:false,error:'Введите название категории.'};if(state.categories.some(c=>!c.archivedAt&&c.kind===kind&&c.normalizedName===norm))return{ok:false,error:`В категориях ${kindLabel} уже есть «${clean}».`};const t=now(),c={id:uid('cat'),kind,name:clean,normalizedName:norm,createdByMemberId:state.currentMemberId,createdAt:t,lastEditedByMemberId:state.currentMemberId,lastEditedAt:t,archivedAt:null,history:[]};state.categories.push(c);save();return{ok:true,category:c}}''')

refunc('renameCategory', 'categoryUseCount', r'''function renameCategory(id,newName){const c=category(id),clean=String(newName||'').trim().replace(/\s+/g,' '),norm=normalizeName(clean),kindLabel=c?.kind==='income'?'прихода':'расхода';if(!c||!clean)return{ok:false,error:'Некорректное название.'};if(state.categories.some(x=>x.id!==id&&!x.archivedAt&&x.kind===c.kind&&x.normalizedName===norm))return{ok:false,error:`В категориях ${kindLabel} уже есть «${clean}».`};const old=c.name;if(old===clean)return{ok:true};c.history.push({id:uid('catrev'),changedByMemberId:state.currentMemberId,changedAt:now(),field:'name',oldValue:old,newValue:clean});c.name=clean;c.normalizedName=norm;c.lastEditedByMemberId=state.currentMemberId;c.lastEditedAt=now();save();return{ok:true}}''')

# Confirm category hard deletion in the UI.
rep(
    "const del=t.closest('[data-cat-delete]');if(del){const r=deleteCategory(del.dataset.catDelete);if(!r.ok)alert(r.error);else renderCategoryManager();renderAll();return}",
    "const del=t.closest('[data-cat-delete]');if(del){const c=category(del.dataset.catDelete),count=categoryUseCount(del.dataset.catDelete);if(count>0){alert(`Категория используется в ${count} операц. Удаление запрещено.`);return}if(c&&!confirm(`Удалить категорию «${c.name}» навсегда? Это действие нельзя отменить.`))return;const r=deleteCategory(del.dataset.catDelete);if(!r.ok)alert(r.error);else{renderCategoryManager();renderAll();toast('Категория удалена')}return}"
)

# Replace the main event binding line with corrected handlers.
old_bind = "$ ('__never__')"
# Direct targeted edits are safer than replacing the whole long line.
rep("$('saveOperationBtn').onclick=saveOperation;$('deleteOperationBtn').onclick=()=>deleteOperation($('editingId').value);$('detailEditBtn').onclick=()=>{", "$('saveOperationBtn').onclick=saveOperation;$('detailDeleteBtn').onclick=()=>deleteOperation(detailId);$('detailEditBtn').onclick=()=>{")
rep(
    "$('addCategoryBtn').onclick=()=>{$('newCategoryBox').style.display=$('newCategoryBox').style.display==='grid'?'none':'grid'};$('saveNewCategoryBtn').onclick=()=>{const r=createCategory(editKind,$('newCategoryInput').value);if(!r.ok){$('entryError').textContent=r.error;return}$('newCategoryInput').value='';$('newCategoryBox').style.display='none';fillCategorySelect(editKind,r.category.id);$('entryError').textContent='';toast('Категория добавлена')};",
    "$('addCategoryBtn').onclick=()=>{$('categoryError').textContent='';$('newCategoryBox').style.display=$('newCategoryBox').style.display==='grid'?'none':'grid'};$('saveNewCategoryBtn').onclick=()=>{const r=createCategory(editKind,$('newCategoryInput').value);if(!r.ok){$('categoryError').textContent=r.error;return}$('newCategoryInput').value='';$('newCategoryBox').style.display='none';fillCategorySelect(editKind,r.category.id);$('categoryError').textContent='';toast('Категория добавлена')};$('managerAddCategoryBtn').onclick=()=>{const r=createCategory(managerKind,$('managerNewCategoryInput').value);if(!r.ok){$('managerCategoryError').textContent=r.error;return}$('managerNewCategoryInput').value='';$('managerCategoryError').textContent='';renderCategoryManager();renderAll();toast('Категория добавлена')};"
)

amount_handlers = r'''const parseRangeValue=v=>{const n=Number(String(v||'').trim().replace(',','.'));return Number.isFinite(n)&&n>=0?n:null};const normalizeRangeInput=e=>{let v=e.target.value.replace(/\s/g,'').replace('.',',').replace(/[^0-9,]/g,''),i=v.indexOf(',');if(i>=0)v=v.slice(0,i+1)+v.slice(i+1).replace(/,/g,'');let[a='',b='']=v.split(',');a=a.slice(0,9);b=b.slice(0,2);e.target.value=i<0?a:`${a},${b}`};$('amountFrom').oninput=e=>{normalizeRangeInput(e);amountMin=parseRangeValue(e.target.value);renderOperations()};$('amountTo').oninput=e=>{normalizeRangeInput(e);amountMax=parseRangeValue(e.target.value);renderOperations()};$('clearAmountFilter').onclick=()=>{amountMin=null;amountMax=null;renderOperations()};'''
rep("$('amountInput').oninput=e=>{", amount_handlers + "$('amountInput').oninput=e=>{")

# Update test API to record one batch per save and expose amount filters.
rep(
    "editOperation:(id,changes)=>{const o=state.operations.find(x=>x.id===id);for(const[field,value]of Object.entries(changes)){if(String(o[field]??'')!==String(value??'')){revision(o,field,o[field],value);o[field]=value}}o.lastEditedByMemberId=state.currentMemberId;o.lastEditedAt=now();save();renderAll()}",
    "editOperation:(id,changes)=>{const o=state.operations.find(x=>x.id===id),actual=Object.entries(changes).filter(([field,value])=>!sameMeaning(field,o[field],value)).map(([field,newValue])=>({field,oldValue:o[field],newValue}));if(actual.length){revisionBatch(o,actual,'user');for(const c of actual)o[c.field]=c.newValue;o.lastEditedByMemberId=state.currentMemberId;o.lastEditedAt=now()}save();renderAll()}"
)
rep(
    "setCategoryFilter:ids=>{selectedCategoryIds=new Set(ids);renderOperations()},renderAll};",
    "setCategoryFilter:ids=>{selectedCategoryIds=new Set(ids);renderOperations()},setAmountFilter:(min,max)=>{amountMin=min??null;amountMax=max??null;renderOperations()},revisionChanges,renderAll};"
)

# Static acceptance assertions.
required = [
    'id="amountFrom"', 'id="amountTo"', 'id="detailDeleteBtn"', 'id="managerAddCategoryBtn"',
    'function revisionBatch', 'normalizeRevisionHistory', "c.kind===kind", "x.kind===c.kind",
    'body.modal-open', 'grid-column:1/-1', 'RESPONSIVE'
]
for marker in required[:-1]:
    if marker not in s:
        raise SystemExit(f'acceptance marker missing: {marker}')
if 'deleteOperationBtn' in s:
    raise SystemExit('obsolete entry delete control remains')

p.write_text(s, encoding='utf-8')
print('patched runtime-source.html', len(s))

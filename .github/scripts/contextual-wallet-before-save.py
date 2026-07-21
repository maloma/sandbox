from pathlib import Path
import re
import gzip
import base64
import hashlib

source_path = Path('src/familypilot.html')
source = source_path.read_text()
assert 'capital-first-thumb-actions-v1' in source
assert 'contextual-wallet-before-save-v1' not in source

source = source.replace(
    '<meta name="familypilot-correction" content="capital-first-thumb-actions-v1">',
    '<meta name="familypilot-correction" content="capital-first-thumb-actions-v1">\n<meta name="familypilot-correction" content="contextual-wallet-before-save-v1">',
    1,
)

source, count = re.subn(
    r'\n?<button id="nonDefaultWalletNotice"[\s\S]*?</button>\n?',
    '\n',
    source,
    count=1,
)
assert count == 1, f'home wallet notice removal count={count}'

source, count = re.subn(
    r'<div class="field"><label>Кошелёк</label><div class="wallet-readonly">[\s\S]*?id="entryWalletMeta"></div></div></div></div>',
    '',
    source,
    count=1,
)
assert count == 1, f'large entry wallet block removal count={count}'

warning = '<div id="entryWalletWarning" class="entry-wallet-warning" hidden><span class="wallet-dot"></span><span><small>Операция будет сохранена в другой кошелёк</small><strong id="entryWalletWarningName"></strong></span></div>'
anchor = '<div id="entryError" class="error"></div><div class="sheet-actions">'
assert source.count(anchor) == 1
source = source.replace(anchor, '<div id="entryError" class="error"></div>' + warning + '<div class="sheet-actions">', 1)

css = '''
/* contextual-wallet-before-save-v1 */
.entry-wallet-warning{width:100%;min-width:0;margin:10px 0 0;border:1px solid color-mix(in srgb,var(--blue) 58%,var(--line));border-radius:13px;background:color-mix(in srgb,var(--blue) 10%,var(--card));display:grid;grid-template-columns:auto minmax(0,1fr);gap:9px;align-items:center;padding:8px 10px;color:var(--ink)}
.entry-wallet-warning[hidden]{display:none}
.entry-wallet-warning>span:last-child{min-width:0}
.entry-wallet-warning small,.entry-wallet-warning strong{display:block}
.entry-wallet-warning small{color:var(--muted);font-size:10px;line-height:1.25}
.entry-wallet-warning strong{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
'''
source = source.replace('</style>', css + '\n</style>', 1)
source = source.replace('#homeScreen>.wallet-notice{margin:0 0 10px}\n', '', 1)

old_context = "function renderWalletContext(){const current=wallet(state.activeWalletId),primary=state.wallets.find(w=>w.type==='household_default'&&!w.archivedAt)||state.wallets.find(w=>!w.archivedAt),notice=$('nonDefaultWalletNotice');const unusual=!!current&&!!primary&&current.id!==primary.id;notice.hidden=!unusual;if(unusual)$('homeWalletNoticeName').textContent=current.name}"
new_context = "function defaultWallet(){return state.wallets.find(w=>w.type==='household_default'&&!w.archivedAt)||state.wallets.find(w=>!w.archivedAt)}\nfunction renderEntryWalletWarning(w){const primary=defaultWallet(),warning=$('entryWalletWarning'),unusual=!!w&&!!primary&&w.id!==primary.id;warning.hidden=!unusual;if(unusual)$('entryWalletWarningName').textContent=w.name}"
assert source.count(old_context) == 1
source = source.replace(old_context, new_context, 1)

old_render_all = "function renderAll(){purgeExpiredTrash();applyTheme();renderPeriods();renderCapital();renderHome();renderOperations();renderAnalytics();renderMore();renderWalletContext();save()}"
new_render_all = "function renderAll(){purgeExpiredTrash();applyTheme();renderPeriods();renderCapital();renderHome();renderOperations();renderAnalytics();renderMore();save()}"
assert source.count(old_render_all) == 1
source = source.replace(old_render_all, new_render_all, 1)

old_open = "function openEntry(kind,id=''){editKind=kind;const o=id?state.operations.find(x=>x.id===id):null,w=wallet(o?.walletId||state.activeWalletId);$('editingId').value=id;$('entryTitle').textContent=o?'Изменить операцию':kind==='income'?'Добавить приход':'Добавить расход';$('entryHead').className='sheet-head entry-head '+kind;$('entryWalletName').textContent=w.name;$('entryWalletMeta').textContent=`${w.nativeCurrency} · ${w.type==='household_default'?'общий семейный':'личный'}`;$('amountInput').value=o?String(o.amount).replace('.',','):'';fillCategorySelect(kind,o?.categoryId);renderQuickCategories(kind,o?.categoryId||$('categoryInput').value);$('dateInput').value=isoLocal(o?.occurredAt||now());$('noteInput').value=o?.note||'';$('entryError').textContent='';$('categoryError').textContent='';$('newCategoryBox').style.display='none';open('entryModal')}"
new_open = "function openEntry(kind,id=''){editKind=kind;const o=id?state.operations.find(x=>x.id===id):null,w=wallet(o?.walletId||state.activeWalletId);$('editingId').value=id;$('entryTitle').textContent=o?'Изменить операцию':kind==='income'?'Добавить приход':'Добавить расход';$('entryHead').className='sheet-head entry-head '+kind;renderEntryWalletWarning(w);$('amountInput').value=o?String(o.amount).replace('.',','):'';fillCategorySelect(kind,o?.categoryId);renderQuickCategories(kind,o?.categoryId||$('categoryInput').value);$('dateInput').value=isoLocal(o?.occurredAt||now());$('noteInput').value=o?.note||'';$('entryError').textContent='';$('categoryError').textContent='';$('newCategoryBox').style.display='none';open('entryModal')}"
assert source.count(old_open) == 1
source = source.replace(old_open, new_open, 1)

old_event = ";$('nonDefaultWalletNotice').onclick=()=>showScreen('more')"
assert source.count(old_event) == 1
source = source.replace(old_event, '', 1)

checks = {
    'HOME-WALLET-NOTICE-REMOVED': 'id="nonDefaultWalletNotice"' not in source,
    'LARGE-ENTRY-WALLET-BLOCK-REMOVED': 'id="entryWalletName"' not in source and 'id="entryWalletMeta"' not in source,
    'WARNING-BEFORE-SAVE': source.index('id="entryWalletWarning"') < source.index('id="saveOperationBtn"'),
    'WARNING-HIDDEN-BY-DEFAULT': 'id="entryWalletWarning" class="entry-wallet-warning" hidden' in source,
    'NONDEFAULT-CONDITIONAL': "w.id!==primary.id" in source and "warning.hidden=!unusual" in source,
    'DEFAULT-WALLET-SILENT': 'function defaultWallet()' in source,
    'CAPITAL-FIRST-PRESERVED': source.index('<section class="card capital">') < source.index('<section class="card balance">'),
    'THUMB-DOCK-PRESERVED': "const dockVisible=['home','operations'].includes(name)" in source,
    'CATEGORY-50-PRESERVED': 'CATEGORY_NAME_MAX=50' in source,
    'MODAL-SCROLL-LOCK-PRESERVED': source.count('function lockBodyNow()') == 1 and source.count('function syncBodyLock()') == 1,
}
failed = [name for name, ok in checks.items() if not ok]
assert not failed, 'failed gates: ' + ', '.join(failed)

source_path.write_text(source)
script_match = re.search(r'<script>\s*([\s\S]*?)</script>', source)
assert script_match
Path('/tmp/familypilot-runtime.js').write_text(script_match.group(1))

index_path = Path('index.html')
index = index_path.read_text()
payload = base64.b64encode(gzip.compress(source.encode(), compresslevel=9, mtime=0)).decode()
index, count = re.subn(r'const b="[A-Za-z0-9+/=]+"', f'const b="{payload}"', index, count=1)
assert count == 1
index_path.write_text(index)

sha = lambda value: hashlib.sha256(value.encode()).hexdigest()
Path('verification/contextual-wallet-before-save-source-gate.txt').write_text('\n'.join([
    'FamilyPilot contextual wallet before Save source gate',
    *[f'{name}: VERIFIED' for name in checks],
    f'SOURCE-SHA256: {sha(source)}',
    f'INDEX-SHA256: {sha(index)}',
    'PACKAGE-CLOSURE: SOURCE-VERIFIED',
    '',
]))
Path('verification/contextual-wallet-before-save-sha.txt').write_text(
    f'SOURCE-SHA256: {sha(source)}\nINDEX-SHA256: {sha(index)}\n'
)

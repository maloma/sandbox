from pathlib import Path
import re

p=Path('runtime-source.html')
s=p.read_text(encoding='utf-8')

def replace_line(prefix,new):
    global s
    pattern=r'^'+re.escape(prefix)+r'.*$'
    s2,n=re.subn(pattern,lambda _m:new,s,count=1,flags=re.M)
    if n!=1: raise SystemExit(f'marker not found: {prefix}')
    s=s2

replace_line('function openEntry(', "function openEntry(kind,id=''){editKind=kind;const o=id?state.operations.find(x=>x.id===id):null,w=wallet(o?.walletId||state.activeWalletId);$('editingId').value=id;$('entryTitle').textContent=o?'Изменить операцию':kind==='income'?'Добавить приход':'Добавить расход';$('entryHead').className='sheet-head entry-head '+kind;$('entryWalletName').textContent=w.name;$('entryWalletMeta').textContent=`${w.nativeCurrency} · ${w.type==='household_default'?'общий семейный':'личный'}`;$('amountInput').value=o?String(o.amount).replace('.',','):'';fillCategorySelect(kind,o?.categoryId);renderQuickCategories(kind,o?.categoryId||$('categoryInput').value);$('dateInput').value=isoLocal(o?.occurredAt||now());$('noteInput').value=o?.note||'';$('entryError').textContent='';$('categoryError').textContent='';$('newCategoryBox').style.display='none';open('entryModal')}")

replace_line('function filterCandidateCategories(', "function filterCandidateCategories(){const mode=categoryFilterContext==='analytics'?analyticsMode:opsTypeFilter,pending=categoryFilterContext==='analytics'?analyticsPendingCategoryIds:pendingCategoryIds;return state.categories.filter(c=>(!c.archivedAt||pending.has(c.id))&&(mode==='all'||c.kind===mode)&&normalizeName(c.name).includes(normalizeName(categorySearch))).sort((a,b)=>a.name.localeCompare(b.name,'ru')||a.kind.localeCompare(b.kind))}")
replace_line('function renderCategoryChecks(', "function renderCategoryChecks(){const cats=filterCandidateCategories(),pending=categoryFilterContext==='analytics'?analyticsPendingCategoryIds:pendingCategoryIds,mode=categoryFilterContext==='analytics'?analyticsMode:opsTypeFilter;$('categoryChecks').innerHTML=cats.length?cats.map(c=>`<label class=\"check-row\"><input type=\"checkbox\" data-filter-category=\"${c.id}\"${pending.has(c.id)?' checked':''}><span>${esc(c.name)}${mode==='all'?` <small class=\"category-kind\">${c.kind==='income'?'Приход':'Расход'}</small>`:''}</span><small>${state.operations.filter(o=>o.categoryId===c.id).length}</small></label>`).join(''):'<div class=\"empty\">Категорий по выбранному типу нет.</div>';$('selectedCategoryCount').textContent=`Выбрано категорий: ${pending.size}`}")

replace_line('function renderCategoryManager(', "function renderCategoryManager(){document.querySelectorAll('[data-cat-kind]').forEach(b=>b.classList.toggle('active',b.dataset.catKind===managerKind));const quick=new Set(state.config.quickCategoryIds[managerKind]||[]),cats=state.categories.filter(c=>c.kind===managerKind).sort((a,b)=>Number(!!a.archivedAt)-Number(!!b.archivedAt)||a.name.localeCompare(b.name,'ru'));$('categoryManagerList').innerHTML=cats.map(c=>{const count=categoryUseCount(c.id);return`<div class=\"category-item\"><div class=\"category-item-head\"><div><strong>${esc(c.name)}${c.archivedAt?'<span class=\"category-status\">В архиве</span>':''}</strong><div><small>операций: ${count}${quick.has(c.id)?' · быстрая':''}</small></div></div></div><div class=\"category-item-actions\"><button data-cat-rename=\"${c.id}\">Переименовать</button><button data-cat-quick=\"${c.id}\"${c.archivedAt?' disabled':''}>${quick.has(c.id)?'Убрать из быстрых':'В быстрые'}</button><button data-cat-archive=\"${c.id}\">${c.archivedAt?'Разархивировать':'Архивировать'}</button>${!c.archivedAt?`<button data-cat-merge=\"${c.id}\">Слить…</button>`:''}<button data-cat-delete=\"${c.id}\">Удалить</button></div></div>`}).join('')}")

p.write_text(s,encoding='utf-8')
print('corrected',len(s))

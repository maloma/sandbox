import { readFileSync, writeFileSync } from 'node:fs';

const sourcePath='src/familypilot.html';
let source=readFileSync(sourcePath,'utf8');
const marker='<meta name="familypilot-package" content="plan-obligations-foundation-v1">';

if(source.includes(marker)){
  console.log(JSON.stringify({status:'SKIPPED',reason:'M3 Plan and obligations patch already applied'},null,2));
  process.exit(0);
}

function replaceOnce(label,before,after){
  const first=source.indexOf(before);
  if(first<0)throw new Error(`${label}: source anchor missing`);
  if(source.indexOf(before,first+before.length)>=0)throw new Error(`${label}: source anchor is not unique`);
  source=source.slice(0,first)+after+source.slice(first+before.length);
}

replaceOnce(
  'package marker',
  '<meta name="familypilot-package" content="hidden-capital-disclosure-v1">',
  '<meta name="familypilot-package" content="hidden-capital-disclosure-v1">\n'+marker
);

replaceOnce(
  'M3 styles',
  '</style>',
  `\n/* plan-obligations-foundation-v1 */
.plan-intro{padding:14px}.plan-intro p{margin:5px 0 0;color:var(--muted);font-size:13px;line-height:1.4}.plan-grid{display:grid;gap:9px}.plan-module{width:100%;min-height:72px;border:1px solid var(--line);border-radius:18px;background:var(--card);color:var(--ink);box-shadow:var(--shadow);display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:11px;align-items:center;padding:11px 13px;text-align:left}.plan-module-icon{width:42px;height:42px;border-radius:14px;background:var(--card2);display:grid;place-items:center;font-size:21px}.plan-module-copy{min-width:0}.plan-module-copy strong,.plan-module-copy small{display:block}.plan-module-copy strong{font-size:15px}.plan-module-copy small{color:var(--muted);font-size:11px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.plan-module-state{font-size:11px;font-weight:900;color:var(--green);white-space:nowrap}.plan-module[disabled]{opacity:.68;cursor:default}.plan-module[disabled] .plan-module-state{color:var(--muted)}
.obligation-toolbar{display:flex;justify-content:space-between;gap:10px;align-items:center}.obligation-toolbar .btn{min-width:130px}.obligation-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.obligation-summary>div{border:1px solid var(--line);border-radius:15px;background:var(--card2);padding:10px 6px;text-align:center}.obligation-summary span,.obligation-summary strong{display:block}.obligation-summary span{font-size:10px;color:var(--muted)}.obligation-summary strong{font-size:17px;margin-top:3px}.obligation-list{display:grid;gap:8px}.obligation-row{width:100%;border:1px solid var(--line);border-radius:16px;background:var(--card2);color:var(--ink);padding:11px 12px;text-align:left;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}.obligation-row strong,.obligation-row small{display:block}.obligation-row strong{font-size:14px}.obligation-row small{font-size:11px;color:var(--muted);margin-top:3px}.obligation-row-value{text-align:right;white-space:nowrap}.obligation-status{display:inline-block;margin-top:4px;border-radius:999px;padding:3px 7px;font-size:10px;font-weight:900;background:var(--line);color:var(--muted)}.obligation-status.due{background:color-mix(in srgb,#f4b400 18%,var(--card));color:#9a6900}.obligation-status.overdue{background:color-mix(in srgb,var(--red) 14%,var(--card));color:var(--red)}.obligation-status.paid{background:color-mix(in srgb,var(--green) 14%,var(--card));color:var(--green)}.obligation-status.postponed{background:color-mix(in srgb,var(--blue) 14%,var(--card));color:var(--blue)}.obligation-status.skipped{background:var(--line);color:var(--muted)}.obligation-detail-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px}.obligation-detail-actions .primary{grid-column:1/-1}.obligation-empty{border:1px dashed var(--line);border-radius:15px;background:var(--card2);padding:18px;text-align:center;color:var(--muted);font-size:13px}.obligation-rule-chip{display:flex;justify-content:space-between;gap:10px;align-items:center;border:1px solid var(--line);border-radius:14px;background:var(--card2);padding:10px 12px;margin-top:7px}.obligation-rule-chip button{border:0;background:transparent;color:var(--green);font-weight:900}.obligation-help{font-size:12px;color:var(--muted);line-height:1.45;margin-top:8px}.obligation-linked{color:var(--green)!important}.obligation-error{min-height:18px;color:var(--red);font-size:12px;margin-top:7px}
@media(max-width:380px){.plan-module{grid-template-columns:38px minmax(0,1fr);}.plan-module-state{grid-column:2}.obligation-toolbar{align-items:stretch;flex-direction:column}.obligation-toolbar .btn{width:100%}}
</style>`
);

replaceOnce(
  'Plan placeholder',
  '<section id="plansScreen" class="screen"><section class="card section"><h2>Планы</h2><p style="color:var(--muted)">Модуль будет подключён отдельным пакетом.</p></section></section>',
  `<section id="plansScreen" class="screen">
  <div class="page-title"><div class="page-title-copy"><h1>План</h1><small id="planScopeLabel" class="scope-context">Семейный контекст</small></div></div>
  <section class="card plan-intro"><h2>Финансовые планы</h2><p>Редкие функции собраны здесь. Обязательства, долги и накопления остаются отдельными финансовыми модулями.</p></section>
  <div class="plan-grid">
    <button class="plan-module" type="button" data-plan-module="obligations"><span class="plan-module-icon">◷</span><span class="plan-module-copy"><strong>Обязательства</strong><small id="planObligationHint">Платежи и сроки</small></span><span id="planObligationState" class="plan-module-state">Открыть</span></button>
    <button class="plan-module" type="button" disabled><span class="plan-module-icon">⇄</span><span class="plan-module-copy"><strong>Долги</strong><small>Я должен и мне должны</small></span><span class="plan-module-state">Позже</span></button>
    <button class="plan-module" type="button" disabled><span class="plan-module-icon">◎</span><span class="plan-module-copy"><strong>Накопления</strong><small>Цели, подушка и свободные накопления</small></span><span class="plan-module-state">Позже</span></button>
  </div>
</section>
<section id="obligationsScreen" class="screen">
  <div class="page-title"><button class="back" type="button" data-obligation-back="plans">‹</button><div class="page-title-copy"><h1>Обязательства</h1><small id="obligationsScopeLabel" class="scope-context">Семейный контекст</small></div></div>
  <section class="card section"><div class="obligation-toolbar"><div><h2>Ожидаемые платежи</h2><small class="analytics-data-basis">Оплата создаёт одну связанную операцию Расход.</small></div><button id="obligationAddBtn" class="btn primary" type="button">Добавить</button></div></section>
  <div id="obligationSummary" class="obligation-summary"></div>
  <section class="card section"><div class="section-head"><h2>Платежи</h2><small id="obligationCount" class="selected-count"></small></div><div id="obligationList" class="obligation-list"></div></section>
  <section class="card section"><div class="section-head"><h2>Правила</h2></div><div id="obligationRules"></div></section>
</section>`
);

replaceOnce(
  'M3 overlays',
  '<div id="toast" class="toast"></div>',
  `<div id="obligationRuleModal" class="modal"><div class="sheet"><div class="sheet-head"><h2 id="obligationRuleTitle">Новое обязательство</h2><button class="close" data-close="obligationRuleModal">Закрыть</button></div><input id="obligationRuleId" type="hidden"><div class="field"><label for="obligationName">Название</label><input id="obligationName" maxlength="80" placeholder="Например, аренда"></div><div class="field"><label for="obligationAmount">Ожидаемая сумма</label><input id="obligationAmount" inputmode="decimal" placeholder="0,00"></div><div class="field"><label for="obligationCadence">Повтор</label><select id="obligationCadence"><option value="once">Один раз</option><option value="monthly">Каждый месяц</option></select></div><div class="field"><label for="obligationDueDate">Дата платежа</label><input id="obligationDueDate" type="date"></div><div class="field"><label for="obligationWallet">Кошелёк</label><select id="obligationWallet"></select></div><div class="field"><label for="obligationCategory">Категория расхода</label><select id="obligationCategory"></select></div><div class="field"><label for="obligationNote">Комментарий</label><textarea id="obligationNote"></textarea></div><div id="obligationRuleError" class="obligation-error"></div><div class="sheet-actions"><button class="btn secondary" data-close="obligationRuleModal">Отмена</button><button id="obligationRuleSave" class="btn primary">Сохранить</button></div></div></div>
<div id="obligationDetailModal" class="modal"><div class="sheet"><div class="sheet-head"><h2 id="obligationDetailTitle">Обязательство</h2><button class="close" data-close="obligationDetailModal">Закрыть</button></div><div id="obligationDetailContent"></div><div class="obligation-detail-actions"><button id="obligationPayBtn" class="btn primary">Оплатить</button><button id="obligationPostponeBtn" class="btn secondary">Перенести</button><button id="obligationSkipBtn" class="btn secondary">Пропустить</button><button id="obligationEditRuleBtn" class="btn secondary">Изменить правило</button></div></div></div>
<div id="obligationPayModal" class="modal"><div class="sheet"><div class="sheet-head"><h2>Оплатить обязательство</h2><button class="close" data-close="obligationPayModal">Закрыть</button></div><div class="field"><label for="obligationPayAmount">Фактическая сумма</label><input id="obligationPayAmount" inputmode="decimal"></div><div class="field"><label for="obligationPayDate">Дата оплаты</label><input id="obligationPayDate" type="date"></div><div class="obligation-help">Будет создана ровно одна операция Расход, связанная с этим платежом.</div><div id="obligationPayError" class="obligation-error"></div><div class="sheet-actions"><button class="btn secondary" data-close="obligationPayModal">Отмена</button><button id="obligationPaySave" class="btn primary">Создать расход</button></div></div></div>
<div id="obligationPostponeModal" class="modal"><div class="sheet"><div class="sheet-head"><h2>Перенести платёж</h2><button class="close" data-close="obligationPostponeModal">Закрыть</button></div><div class="field"><label for="obligationPostponeDate">Новая дата</label><input id="obligationPostponeDate" type="date"></div><div class="obligation-help">Меняется только этот платёж. Правило следующих платежей не переписывается.</div><div id="obligationPostponeError" class="obligation-error"></div><div class="sheet-actions"><button class="btn secondary" data-close="obligationPostponeModal">Отмена</button><button id="obligationPostponeSave" class="btn primary">Перенести</button></div></div></div>
<div id="toast" class="toast"></div>`
);

replaceOnce(
  'obligations script',
  '<script src="./familypilot-scope.js"></script>\n<script src="./familypilot-analytics-state.js"></script>',
  '<script src="./familypilot-scope.js"></script>\n<script src="./familypilot-analytics-state.js"></script>\n<script src="./familypilot-obligations.js"></script>'
);

replaceOnce(
  'obligations state normalization',
  '}normalizeState();\nconst types=',
  `}normalizeState();
const obligationApi=window.FamilyPilotObligations;
if(!obligationApi)throw new Error('FamilyPilotObligations module is unavailable');
obligationApi.normalizeState(state);
const types=`
);

replaceOnce(
  'M3 functions',
  'function themePreference(){',
  `let obligationDetailId='',obligationEditingRuleId='',obligationActionOccurrenceId='';
const obligationStatusLabels={planned:'Запланирован',due:'Сегодня',overdue:'Просрочен',paid:'Оплачен',postponed:'Перенесён',skipped:'Пропущен',cancelled:'Отменён'};
function dateInputValue(value){const d=new Date(value),p=n=>String(n).padStart(2,'0');return \`${'${d.getFullYear()}'}-${'${p(d.getMonth()+1)}'}-${'${p(d.getDate())}'}\`}
function dateFromInput(value){if(!value)return NaN;return new Date(value+'T12:00:00').getTime()}
function m3WalletIds(){const descriptor=scopeDescriptor(),available=scopeApi.accessibleWallets(state);return obligationApi.visibleWalletIds(state,descriptor,available,w=>scopeApi.isPersonalWallet(w))}
function m3Rules(){return obligationApi.visibleRules(state,m3WalletIds())}
function m3Occurrences(){return obligationApi.visibleOccurrences(state,m3WalletIds(),now())}
function ruleForOccurrence(occurrence){return state.obligationRules.find(rule=>rule.id===occurrence?.ruleId)}
function occurrenceStatus(occurrence){return obligationApi.occurrenceDisplayStatus(occurrence,now())}
function obligationCurrency(occurrence){return occurrence?.currency||wallet(occurrence?.walletId)?.nativeCurrency||'EUR'}
function renderPlan(){const descriptor=scopeDescriptor(),occurrences=m3Occurrences(),attention=obligationApi.attentionItems(state,m3WalletIds(),now()),overdue=attention.filter(item=>item.severity==='red').length,due=attention.filter(item=>item.severity==='yellow').length;$('planScopeLabel').textContent=descriptor.analyticsLabel;$('planObligationHint').textContent=overdue?\`Просрочено: ${'${overdue}'}\`:due?\`Сегодня: ${'${due}'}\`:occurrences.length?\`Платежей: ${'${occurrences.length}'}\`:'Платежей пока нет';$('planObligationState').textContent=overdue?'Требует внимания':due?'Сегодня':'Открыть';$('planObligationState').classList.toggle('negative',overdue>0)}
function renderObligations(){const descriptor=scopeDescriptor(),occurrences=m3Occurrences(),rules=m3Rules(),counts={due:0,overdue:0,upcoming:0};for(const occurrence of occurrences){const status=occurrenceStatus(occurrence);if(status==='due')counts.due++;else if(status==='overdue')counts.overdue++;else if(!['paid','skipped','cancelled'].includes(status))counts.upcoming++}$('obligationsScopeLabel').textContent=descriptor.analyticsLabel;$('obligationSummary').innerHTML=\`<div><span>Сегодня</span><strong>${'${counts.due}'}</strong></div><div><span>Просрочено</span><strong class="${'${counts.overdue?\'negative\':\'\'}'}">${'${counts.overdue}'}</strong></div><div><span>Впереди</span><strong>${'${counts.upcoming}'}</strong></div>\`;$('obligationCount').textContent=\`Всего: ${'${occurrences.length}'}\`;$('obligationList').innerHTML=occurrences.length?occurrences.map(occurrence=>{const rule=ruleForOccurrence(occurrence),status=occurrenceStatus(occurrence),currency=obligationCurrency(occurrence),walletName=wallet(occurrence.walletId)?.name||'Кошелёк';return \`<button class="obligation-row" type="button" data-obligation-occurrence="${'${esc(occurrence.id)}'}"><span><strong>${'${esc(rule?.name||\'Обязательство\')}'}</strong><small>${'${esc(new Intl.DateTimeFormat(\'ru-RU\',{day:\'numeric\',month:\'long\',year:\'numeric\'}).format(new Date(occurrence.dueAt)))}'} · ${'${esc(walletName)}'}</small><span class="obligation-status ${'${status}'}">${'${esc(obligationStatusLabels[status]||status)}'}</span></span><span class="obligation-row-value"><strong>${'${money(occurrence.status===\'paid\'&&occurrence.actualAmount!=null?occurrence.actualAmount:occurrence.expectedAmount,currency)}'}</strong>${'${occurrence.linkedOperationId?\'<small class="obligation-linked">связано с расходом</small>\':\'\'}'}</span></button>\`}).join(''):'<div class="obligation-empty">Обязательств в этом финансовом контексте пока нет.</div>';$('obligationRules').innerHTML=rules.length?rules.map(rule=>\`<div class="obligation-rule-chip"><span><strong>${'${esc(rule.name)}'}</strong><small class="meta-note">${'${rule.cadence===\'monthly\'?\'Каждый месяц\':\'Один раз\'}'} · ${'${money(rule.amount,rule.currency)}'}</small></span><button type="button" data-obligation-rule="${'${esc(rule.id)}'}">Изменить</button></div>\`).join(''):'<div class="obligation-empty">Правил пока нет.</div>'}
function fillObligationWallets(selected){const allowed=m3WalletIds(),items=scopeApi.accessibleWallets(state).filter(w=>allowed.has(w.id));$('obligationWallet').innerHTML=items.map(w=>\`<option value="${'${esc(w.id)}'}"${'${w.id===selected?\' selected\':\'\'}'}>${'${esc(w.name)}'} · ${'${esc(w.nativeCurrency)}'}</option>\`).join('')}
function fillObligationCategories(selected){const items=state.categories.filter(c=>c.kind==='expense'&&(!c.archivedAt||c.id===selected)).sort((a,b)=>a.name.localeCompare(b.name,'ru'));$('obligationCategory').innerHTML=items.map(c=>\`<option value="${'${esc(c.id)}'}"${'${c.id===selected?\' selected\':\'\'}'}>${'${esc(c.name)}'}</option>\`).join('')}
function openObligationRuleEditor(ruleId=''){const rule=state.obligationRules.find(item=>item.id===ruleId);obligationEditingRuleId=ruleId;$('obligationRuleId').value=ruleId;$('obligationRuleTitle').textContent=rule?'Изменить обязательство':'Новое обязательство';$('obligationName').value=rule?.name||'';$('obligationAmount').value=rule?String(rule.amount).replace('.',','):'';$('obligationCadence').value=rule?.cadence||'once';$('obligationDueDate').value=dateInputValue(rule?.nextDueAt||now());fillObligationWallets(rule?.walletId||state.activeWalletId);fillObligationCategories(rule?.categoryId);$('obligationNote').value=rule?.note||'';$('obligationRuleError').textContent='';open('obligationRuleModal')}
function saveObligationRule(){const amount=Number($('obligationAmount').value.trim().replace(',','.')),walletId=$('obligationWallet').value,result=(obligationEditingRuleId?obligationApi.updateRule:obligationApi.createRule)(state,...(obligationEditingRuleId?[obligationEditingRuleId]:[]),{name:$('obligationName').value,amount,dueAt:dateFromInput($('obligationDueDate').value),cadence:$('obligationCadence').value,walletId,categoryId:$('obligationCategory').value,currency:wallet(walletId)?.nativeCurrency||'EUR',note:$('obligationNote').value},state.currentMemberId,now());if(!result.ok){$('obligationRuleError').textContent=result.error;return}save();close('obligationRuleModal');renderAll();showScreen('obligations');toast(obligationEditingRuleId?'Обязательство обновлено':'Обязательство добавлено')}
function openObligationDetail(id){const occurrence=state.obligationOccurrences.find(item=>item.id===id);if(!occurrence)return;obligationDetailId=id;const rule=ruleForOccurrence(occurrence),status=occurrenceStatus(occurrence),linked=occurrence.linkedOperationId?state.operations.find(o=>o.id===occurrence.linkedOperationId):null;$('obligationDetailTitle').textContent=rule?.name||'Обязательство';$('obligationDetailContent').innerHTML=\`<div class="detail-grid" style="margin-top:14px"><div class="detail-row"><span>Статус</span><strong><span class="obligation-status ${'${status}'}">${'${esc(obligationStatusLabels[status]||status)}'}</span></strong></div><div class="detail-row"><span>Срок</span><strong>${'${esc(new Intl.DateTimeFormat(\'ru-RU\',{day:\'numeric\',month:\'long\',year:\'numeric\'}).format(new Date(occurrence.dueAt)))}'}</strong></div><div class="detail-row"><span>Ожидается</span><strong>${'${money(occurrence.expectedAmount,obligationCurrency(occurrence))}'}</strong></div><div class="detail-row"><span>Кошелёк</span><strong>${'${esc(wallet(occurrence.walletId)?.name||\'—\')}'}</strong></div><div class="detail-row"><span>Категория</span><strong>${'${esc(categoryName(occurrence.categoryId))}'}</strong></div><div class="detail-row"><span>Повтор</span><strong>${'${rule?.cadence===\'monthly\'?\'Каждый месяц\':\'Один раз\'}'}</strong></div>${'${linked?`<div class="detail-row"><span>Связанный расход</span><strong>${money(linked.amount,wallet(linked.walletId)?.nativeCurrency||\'EUR\')} · ${linked.status===\'active\'?\'активен\':\'в Корзине\'}</strong></div>`:\'\'}'}${'${rule?.note?`<div class="detail-row"><span>Комментарий</span><strong>${esc(rule.note)}</strong></div>`:\'\'}'}</div>\`;const closed=['paid','skipped','cancelled'].includes(occurrence.status);$('obligationPayBtn').hidden=closed;$('obligationPostponeBtn').hidden=closed;$('obligationSkipBtn').hidden=closed;$('obligationEditRuleBtn').hidden=!rule;open('obligationDetailModal')}
function openObligationPay(){const occurrence=state.obligationOccurrences.find(item=>item.id===obligationDetailId);if(!occurrence)return;obligationActionOccurrenceId=occurrence.id;$('obligationPayAmount').value=String(occurrence.expectedAmount).replace('.',',');$('obligationPayDate').value=dateInputValue(now());$('obligationPayDate').max=dateInputValue(now());$('obligationPayError').textContent='';close('obligationDetailModal');open('obligationPayModal')}
function saveObligationPayment(){const result=obligationApi.payOccurrence(state,obligationActionOccurrenceId,{amount:Number($('obligationPayAmount').value.trim().replace(',','.')),occurredAt:dateFromInput($('obligationPayDate').value)},state.currentMemberId,now());if(!result.ok){$('obligationPayError').textContent=result.error;return}save();close('obligationPayModal');renderAll();showScreen('obligations');toast('Оплата сохранена как связанный расход')}
function openObligationPostpone(){const occurrence=state.obligationOccurrences.find(item=>item.id===obligationDetailId);if(!occurrence)return;obligationActionOccurrenceId=occurrence.id;$('obligationPostponeDate').value=dateInputValue(Math.max(occurrence.dueAt,now()+86400000));$('obligationPostponeDate').min=dateInputValue(now());$('obligationPostponeError').textContent='';close('obligationDetailModal');open('obligationPostponeModal')}
function saveObligationPostpone(){const result=obligationApi.postponeOccurrence(state,obligationActionOccurrenceId,dateFromInput($('obligationPostponeDate').value),state.currentMemberId,now());if(!result.ok){$('obligationPostponeError').textContent=result.error;return}save();close('obligationPostponeModal');renderAll();showScreen('obligations');toast('Платёж перенесён')}
function skipObligationOccurrence(){if(!confirm('Пропустить этот платёж без создания расхода?'))return;const result=obligationApi.skipOccurrence(state,obligationDetailId,state.currentMemberId,now());if(!result.ok){alert(result.error);return}save();close('obligationDetailModal');renderAll();showScreen('obligations');toast('Платёж пропущен')}
function themePreference(){`
);

replaceOnce(
  'render pipeline',
  "function renderAll(){purgeExpiredTrash();ensureAccessibleActiveWallet();applyTheme();const descriptor=scopeDescriptor();$('operationsScopeLabel').textContent=descriptor.operationsLabel;$('analyticsScopeLabel').textContent=descriptor.analyticsLabel;renderPeriods();renderCapital();renderHome();renderOperations();renderAnalytics();renderMore();save()}",
  "function renderAll(){purgeExpiredTrash();ensureAccessibleActiveWallet();obligationApi.normalizeState(state);applyTheme();const descriptor=scopeDescriptor();$('operationsScopeLabel').textContent=descriptor.operationsLabel;$('analyticsScopeLabel').textContent=descriptor.analyticsLabel;renderPeriods();renderCapital();renderHome();renderOperations();renderAnalytics();renderPlan();renderObligations();renderMore();save()}"
);

replaceOnce(
  'dynamic M3 click routes',
  "const nav=t.closest('[data-screen]');if(nav){nav.dataset.screen==='operations'?copyHomeToOperations('all'):showScreen(nav.dataset.screen);return}const bal=",
  "const nav=t.closest('[data-screen]');if(nav){nav.dataset.screen==='operations'?copyHomeToOperations('all'):showScreen(nav.dataset.screen);return}const planModule=t.closest('[data-plan-module]');if(planModule){if(planModule.dataset.planModule==='obligations'){showScreen('obligations');renderAll()}return}const obligationBack=t.closest('[data-obligation-back]');if(obligationBack){showScreen(obligationBack.dataset.obligationBack);renderAll();return}const obligationRow=t.closest('[data-obligation-occurrence]');if(obligationRow){openObligationDetail(obligationRow.dataset.obligationOccurrence);return}const obligationRule=t.closest('[data-obligation-rule]');if(obligationRule){openObligationRuleEditor(obligationRule.dataset.obligationRule);return}const bal="
);

replaceOnce(
  'M3 modal backdrops',
  "for(const id of ['picker','capitalInfo','walletInfo','operationDetail','entryModal','categoryFilterModal','categoryManager','categoryMergeModal','trashModal'])",
  "for(const id of ['picker','capitalInfo','walletInfo','operationDetail','entryModal','categoryFilterModal','categoryManager','categoryMergeModal','trashModal','obligationRuleModal','obligationDetailModal','obligationPayModal','obligationPostponeModal'])"
);

replaceOnce(
  'M3 direct handlers',
  "$('themeSelect').onchange=",
  "$('obligationAddBtn').onclick=()=>openObligationRuleEditor();$('obligationRuleSave').onclick=saveObligationRule;$('obligationPayBtn').onclick=openObligationPay;$('obligationPaySave').onclick=saveObligationPayment;$('obligationPostponeBtn').onclick=openObligationPostpone;$('obligationPostponeSave').onclick=saveObligationPostpone;$('obligationSkipBtn').onclick=skipObligationOccurrence;$('obligationEditRuleBtn').onclick=()=>{const occurrence=state.obligationOccurrences.find(item=>item.id===obligationDetailId);close('obligationDetailModal');if(occurrence)openObligationRuleEditor(occurrence.ruleId)};$('themeSelect').onchange="
);

replaceOnce(
  'M3 test API',
  "if(new URLSearchParams(location.search).has('test'))window.__FP_TEST__={",
  "if(new URLSearchParams(location.search).has('test'))window.__FP_TEST__={obligations:{normalize:()=>{obligationApi.normalizeState(state);save();renderAll()},createRule:input=>{const result=obligationApi.createRule(state,input,state.currentMemberId,now());save();renderAll();return result},updateRule:(id,input)=>{const result=obligationApi.updateRule(state,id,input,state.currentMemberId,now());save();renderAll();return result},pay:(id,input={})=>{const result=obligationApi.payOccurrence(state,id,input,state.currentMemberId,now());save();renderAll();return result},postpone:(id,dueAt)=>{const result=obligationApi.postponeOccurrence(state,id,dueAt,state.currentMemberId,now());save();renderAll();return result},skip:id=>{const result=obligationApi.skipOccurrence(state,id,state.currentMemberId,now());save();renderAll();return result},status:id=>{const occurrence=state.obligationOccurrences.find(item=>item.id===id);return occurrence?obligationApi.occurrenceDisplayStatus(occurrence,now()):null},visible:()=>m3Occurrences().map(item=>item.id),attention:()=>obligationApi.attentionItems(state,m3WalletIds(),now()),openPlan:()=>{showScreen('plans');renderAll()},openList:()=>{showScreen('obligations');renderAll()}},"
);

writeFileSync(sourcePath,source);
console.log(JSON.stringify({status:'APPLIED',sourcePath,marker:'plan-obligations-foundation-v1'},null,2));
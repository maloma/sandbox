const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const replaceOnce = (source, pattern, replacement, label) => {
  const next = source.replace(pattern, replacement);
  assert(next !== source, `Patch anchor not found: ${label}`);
  return next;
};

let index = fs.readFileSync('index.html', 'utf8');
const payloadMatch = index.match(/const b="([A-Za-z0-9+/=]+)"/);
assert(payloadMatch, 'Embedded runtime payload not found');
let source = zlib.gunzipSync(Buffer.from(payloadMatch[1], 'base64')).toString('utf8');
const beforeSourceSha = sha256(source);

assert(!source.includes('operation-first-app-shell-v1'), 'Package already applied');

source = replaceOnce(
  source,
  '<title>FamilyPilot</title>',
  '<title>FamilyPilot</title>\n<meta name="familypilot-package" content="operation-first-app-shell-v1">',
  'package marker'
);

source = replaceOnce(
  source,
  /<header class="top">[\s\S]*?<\/header>\s*/,
  '',
  'remove persistent top utility bar'
);

const homeActions = `
<section class="home-primary-actions" aria-label="Добавить операцию">
  <div class="home-action-label">Добавить операцию</div>
  <div class="actions home-actions">
    <button class="action income" data-open-entry="income"><span class="sign">＋</span><span><strong>Приход</strong><small>Добавить доход</small></span></button>
    <button class="action expense" data-open-entry="expense"><span class="sign">−</span><span><strong>Расход</strong><small>Добавить расход</small></span></button>
  </div>
  <button id="nonDefaultWalletNotice" class="wallet-notice" type="button" hidden>
    <span class="wallet-dot"></span><span><small>Операции будут добавляться в</small><strong id="homeWalletNoticeName"></strong></span><i>Изменить ›</i>
  </button>
</section>`;
source = replaceOnce(
  source,
  '<section id="homeScreen" class="screen active">',
  '<section id="homeScreen" class="screen active">' + homeActions,
  'home operation actions'
);

const moreScreen = `
<section id="moreScreen" class="screen">
  <div class="page-title"><h1>Ещё</h1></div>
  <section class="card config-card settings-group">
    <div class="section-head"><div><h2>Основные настройки</h2><small class="settings-subtitle">Редкие параметры не занимают место на Главной.</small></div></div>
    <div class="config-row">
      <div><label for="walletSelect">Основной кошелёк</label><small>Новые операции по умолчанию записываются сюда.</small></div>
      <select id="walletSelect" class="actor-select settings-select"></select>
    </div>
    <div class="config-row">
      <div><label for="themeSelect">Оформление</label><small>Тема приложения.</small></div>
      <select id="themeSelect" class="actor-select settings-select"><option value="system">Как в системе</option><option value="light">Светлая</option><option value="dark">Тёмная</option></select>
    </div>
    <button id="walletContextBtn" class="btn secondary settings-wide-action" type="button">Информация о текущем кошельке</button>
  </section>
  <section class="card config-card settings-group">
    <div class="section-head"><div><h2>Семья и данные</h2><small class="settings-subtitle">Регистрация для локального прототипа не обязательна.</small></div></div>
    <div class="config-row"><div><label>Кто добавляет операции</label><small>Используется для авторства и истории изменений.</small></div><select id="actorSelect" class="actor-select settings-select"></select></div>
    <div class="config-row"><div><label>Корзина на 45 дней</label><small>Влияет только на новые удаления.</small></div><button id="trashFlagBtn" class="switch" aria-label="Переключить режим Корзины"></button></div>
  </section>
  <section class="card section"><h2>Контракты кошельков</h2><div id="walletContracts" class="schema-box"></div></section>
  <section class="card section"><div><h2 id="categoryManagerTitle">Категории расходов</h2><small id="categoryManagerKindHint">Сейчас показаны категории расходов</small></div><p style="color:var(--muted);font-size:13px">Название — до 50 символов. В списках длинный текст остаётся внутри своей области.</p><button id="openCategoryManager" class="btn secondary" style="width:100%">Управление категориями</button></section>
  <section class="card section"><button id="resetBtn" class="btn danger" style="width:100%">Восстановить демоданные</button></section>
</section>
</main>`;
source = replaceOnce(
  source,
  /<section id="moreScreen" class="screen">[\s\S]*?<\/section>\s*<\/main>/,
  moreScreen,
  'rebuild More screen'
);

source = replaceOnce(
  source,
  '<div id="actionDock" class="action-dock">',
  '<div id="actionDock" class="action-dock hidden">',
  'hide dock on initial home'
);
source = replaceOnce(source, '<i>▣</i>Планы', '<i>▣</i>План', 'navigation label');

const responsiveCss = `
/* operation-first-app-shell-v1 */
.app{padding-top:env(safe-area-inset-top);padding-bottom:calc(var(--nav) + 30px + env(safe-area-inset-bottom))}
.app.has-action-dock{padding-bottom:calc(var(--nav) + var(--dock) + 30px + env(safe-area-inset-bottom))}
main{padding-top:10px}
.home-primary-actions{margin:0 0 10px;padding:2px 0 1px}
.home-action-label{color:var(--muted);font-size:12px;font-weight:900;margin:0 2px 7px}
.home-actions .action{height:72px}
.wallet-notice{width:100%;min-width:0;margin-top:8px;border:1px solid color-mix(in srgb,var(--blue) 52%,var(--line));border-radius:15px;background:color-mix(in srgb,var(--blue) 9%,var(--card));color:var(--ink);display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;align-items:center;padding:9px 11px;text-align:left}
.wallet-notice[hidden]{display:none}
.wallet-notice>span:nth-child(2){min-width:0}.wallet-notice small,.wallet-notice strong{display:block}.wallet-notice small{color:var(--muted);font-size:10px}.wallet-notice strong{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wallet-notice i{font-style:normal;color:var(--blue);font-size:12px;font-weight:900;white-space:nowrap}
#moreScreen .settings-group{padding:14px}
#moreScreen .settings-subtitle{display:block;color:var(--muted);font-size:11px;margin-top:3px}
#moreScreen .config-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(128px,174px);gap:12px;align-items:center}
#moreScreen .config-row>div{min-width:0}
#moreScreen .settings-select{width:100%;max-width:174px;min-width:0}
#moreScreen .settings-wide-action{width:100%;margin-top:12px}
.cat>div,.cat-row,.cat-row b,.analytics-operation>div:first-child,.category-item-head>div,.check-row>span,.wallet-readonly>div{min-width:0}
.cat-row{gap:8px}.cat-row b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cat-row>span{flex:none}
.analytics-operation strong,.category-item-head strong,.check-row>span{display:block;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.quick-chip{max-width:min(78vw,280px);overflow:hidden;text-overflow:ellipsis}
.detail-row strong{min-width:0;max-width:70%;overflow-wrap:anywhere}
.field select,.settings-select{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#categoryManager .category-item-head{min-width:0;overflow:hidden}
@media(max-width:380px){#moreScreen .config-row{grid-template-columns:1fr;gap:7px}#moreScreen .settings-select{max-width:none}.home-actions .action{padding-left:9px;padding-right:9px}}
`;
source = replaceOnce(source, '</style>', responsiveCss + '\n</style>', 'responsive CSS contract');

const addMaxlength = id => {
  const pattern = new RegExp(`(<input\\s+[^>]*id="${id}"[^>]*)(>)`);
  const match = source.match(pattern);
  assert(match, `Input not found: ${id}`);
  if (!/maxlength=/.test(match[1])) source = source.replace(pattern, `$1 maxlength="50"$2`);
};
addMaxlength('newCategoryInput');
addMaxlength('managerNewCategoryInput');

source = replaceOnce(
  source,
  /function renderHeader\(\)\{[^\n]*\}\n/,
  `function themePreference(){const value=localStorage.getItem(THEME_KEY)||'dark';return['light','dark','system'].includes(value)?value:'dark'}
function applyTheme(){const preference=themePreference(),resolved=preference==='system'?(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):preference;document.documentElement.dataset.theme=resolved;document.body.dataset.theme=resolved}
function renderWalletContext(){const current=wallet(state.activeWalletId),primary=state.wallets.find(w=>w.type==='household_default'&&!w.archivedAt)||state.wallets.find(w=>!w.archivedAt),notice=$('nonDefaultWalletNotice');const unusual=!!current&&!!primary&&current.id!==primary.id;notice.hidden=!unusual;if(unusual)$('homeWalletNoticeName').textContent=current.name}
`,
  'replace header renderer'
);

source = replaceOnce(
  source,
  /function renderMore\(\)\{[^\n]*\}\n/,
  `function renderMore(){let available=state.wallets.filter(w=>!w.archivedAt&&(!Array.isArray(w.allowedMemberIds)||w.allowedMemberIds.includes(state.currentMemberId)));if(!available.length)available=state.wallets.filter(w=>!w.archivedAt);if(available.length&&!available.some(w=>w.id===state.activeWalletId))state.activeWalletId=available[0].id;$('walletSelect').innerHTML=available.map(w=>\`<option value="\${esc(w.id)}"\${w.id===state.activeWalletId?' selected':''}>\${esc(w.name)} · \${esc(w.nativeCurrency)}</option>\`).join('');$('themeSelect').value=themePreference();$('actorSelect').innerHTML=MEMBERS.map(m=>\`<option value="\${m.id}"\${m.id===state.currentMemberId?' selected':''}>\${m.name}</option>\`).join('');$('trashFlagBtn').classList.toggle('on',state.config.trashRetentionEnabled);$('walletContracts').textContent=state.wallets.map(w=>\`\${w.name}\nтип = \${w.type}\nвалюта = \${w.nativeCurrency}\nв семейном капитале = \${w.includedInHouseholdCapital?'да':'нет'}\${w.ownerMemberId?\`\nвладелец = \${memberName(w.ownerMemberId)}\`:''}\`).join('\n\n')}
`,
  'render More settings'
);

source = replaceOnce(
  source,
  /function renderAll\(\)\{[^\n]*\}\n/,
  `function renderAll(){purgeExpiredTrash();applyTheme();renderPeriods();renderCapital();renderHome();renderOperations();renderAnalytics();renderMore();renderWalletContext();save()}
`,
  'render all'
);

source = replaceOnce(
  source,
  /function showScreen\(name\)\{[^\n]*\}\n/,
  `function showScreen(name){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$(name+'Screen').classList.add('active');document.querySelectorAll('nav [data-screen]').forEach(b=>b.classList.toggle('active',b.dataset.screen===name));const dockVisible=name==='operations';$('actionDock').classList.toggle('hidden',!dockVisible);document.querySelector('.app').classList.toggle('has-action-dock',dockVisible);window.scrollTo(0,0)}
`,
  'screen and dock behavior'
);

source = replaceOnce(
  source,
  /function openWalletInfo\(\)\{[^\n]*\}\n/,
  `function openWalletInfo(){const w=wallet(state.activeWalletId);if(!w)return;$('walletInfoContent').innerHTML=\`<div class="schema-box">\${esc(w.name)}\nТип: \${w.type==='household_default'?'основной семейный':'личный'}\nВалюта: \${w.nativeCurrency}\nВ семейном капитале: \${w.includedInHouseholdCapital?'да':'нет'}\n\nОсновной кошелёк меняется в разделе «Ещё».</div>\`;open('walletInfo')}
`,
  'wallet info'
);

source = replaceOnce(
  source,
  /function createCategory\(kind,name\)\{[^\n]*\}\n/,
  `const CATEGORY_NAME_MAX=50;
function cleanCategoryName(value){return String(value||'').trim().replace(/\\s+/g,' ')}
function categoryNameLength(value){return Array.from(String(value||'')).length}
function createCategory(kind,name){const clean=cleanCategoryName(name),norm=normalizeName(clean),kindLabel=kind==='income'?'прихода':'расхода';if(!clean)return{ok:false,error:'Введите название категории.'};if(categoryNameLength(clean)>CATEGORY_NAME_MAX)return{ok:false,error:\`Название категории — не более \${CATEGORY_NAME_MAX} символов.\`};if(state.categories.some(c=>!c.archivedAt&&c.kind===kind&&c.normalizedName===norm))return{ok:false,error:\`В категориях \${kindLabel} уже есть «\${clean}».\`};const t=now(),c={id:uid('cat'),kind,name:clean,normalizedName:norm,createdByMemberId:state.currentMemberId,createdAt:t,lastEditedByMemberId:state.currentMemberId,lastEditedAt:t,archivedAt:null,history:[]};state.categories.push(c);save();return{ok:true,category:c}}
`,
  'category create limit'
);

source = replaceOnce(
  source,
  /function renameCategory\(id,newName\)\{[^\n]*\}\n/,
  `function renameCategory(id,newName){const c=category(id),clean=cleanCategoryName(newName),norm=normalizeName(clean),kindLabel=c?.kind==='income'?'прихода':'расхода';if(!c||!clean)return{ok:false,error:'Некорректное название.'};if(categoryNameLength(clean)>CATEGORY_NAME_MAX)return{ok:false,error:\`Название категории — не более \${CATEGORY_NAME_MAX} символов.\`};if(state.categories.some(x=>x.id!==id&&!x.archivedAt&&x.kind===c.kind&&x.normalizedName===norm))return{ok:false,error:\`В категориях \${kindLabel} уже есть «\${clean}».\`};const old=c.name;if(old===clean)return{ok:true};c.history.push({id:uid('catrev'),changedByMemberId:state.currentMemberId,changedAt:now(),field:'name',oldValue:old,newValue:clean});c.name=clean;c.normalizedName=norm;c.lastEditedByMemberId=state.currentMemberId;c.lastEditedAt=now();save();return{ok:true}}
`,
  'category rename limit'
);

source = replaceOnce(
  source,
  "prompt('Новое название категории',c.name)",
  'prompt(`Новое название категории (до ${CATEGORY_NAME_MAX} символов)`,c.name)',
  'rename prompt copy'
);

source = replaceOnce(
  source,
  "$('themeBtn').onclick=()=>{localStorage.setItem(THEME_KEY,(localStorage.getItem(THEME_KEY)||'dark')==='dark'?'light':'dark');renderAll()};",
  "$('themeSelect').onchange=e=>{localStorage.setItem(THEME_KEY,e.target.value);renderAll()};$('walletSelect').onchange=e=>{state.activeWalletId=e.target.value;save();renderAll();toast(`Основной кошелёк: ${wallet(state.activeWalletId)?.name||'—'}`)};$('nonDefaultWalletNotice').onclick=()=>showScreen('more');const systemThemeQuery=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;systemThemeQuery?.addEventListener?.('change',()=>{if(themePreference()==='system')applyTheme()});",
  'settings event handlers'
);

source = replaceOnce(
  source,
  "$('actorSelect').onchange=e=>{state.currentMemberId=e.target.value;save();renderMore();toast(`Текущий участник: ${memberName(state.currentMemberId)}`)};",
  "$('actorSelect').onchange=e=>{state.currentMemberId=e.target.value;save();renderAll();toast(`Текущий участник: ${memberName(state.currentMemberId)}`)};",
  'actor change refresh'
);

const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
assert(!duplicateIds.length, `Duplicate IDs: ${duplicateIds.join(', ')}`);
for (const id of ['homeScreen','moreScreen','walletSelect','themeSelect','actorSelect','nonDefaultWalletNotice','newCategoryInput','managerNewCategoryInput']) {
  assert(ids.includes(id), `Required ID missing: ${id}`);
}

const runtimeScript = source.match(/<script>\s*([\s\S]*?)<\/script>/);
assert(runtimeScript, 'Runtime script not found');
fs.writeFileSync('/tmp/familypilot-runtime.js', runtimeScript[1]);

fs.mkdirSync('src', { recursive: true });
fs.mkdirSync('verification', { recursive: true });
fs.writeFileSync('src/familypilot.html', source);

const payload = zlib.gzipSync(Buffer.from(source), { level: 9 }).toString('base64');
index = index.replace(/const b="[A-Za-z0-9+/=]+"/, `const b="${payload}"`);
fs.writeFileSync('index.html', index);

const checks = [
  ['PACKAGE-MARKER', source.includes('operation-first-app-shell-v1')],
  ['PERSISTENT-TOP-BAR-REMOVED', !source.includes('<header class="top">')],
  ['HOME-OPERATIONS-FIRST', source.indexOf('home-primary-actions') < source.indexOf('card capital')],
  ['HOME-DOCK-DUPLICATION-REMOVED', source.includes('action-dock hidden') && source.includes("const dockVisible=name==='operations'")],
  ['WALLET-MOVED-TO-MORE', source.includes('id="walletSelect"') && source.includes('Основной кошелёк')],
  ['THEME-MOVED-TO-MORE', source.includes('id="themeSelect"') && !source.includes('id="themeBtn"')],
  ['PROFILE-INITIAL-REMOVED', !source.includes('aria-label="Профиль"')],
  ['NONDEFAULT-WALLET-CONTEXTUAL', source.includes('id="nonDefaultWalletNotice"') && source.includes('renderWalletContext')],
  ['CATEGORY-LIMIT-50', source.includes('CATEGORY_NAME_MAX=50') && (source.match(/maxlength="50"/g)||[]).length >= 2],
  ['CATEGORY-OVERFLOW-SAFE', source.includes('.cat-row b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}') && source.includes('.quick-chip{max-width:min(78vw,280px);overflow:hidden;text-overflow:ellipsis}')],
  ['READABLE-SOURCE-CREATED', fs.existsSync('src/familypilot.html')],
  ['DUPLICATE-IDS', duplicateIds.length === 0]
];
for (const [name, ok] of checks) assert(ok, `${name} failed`);

const afterSourceSha = sha256(source);
const indexSha = sha256(index);
fs.writeFileSync('verification/operation-first-app-shell-source-gate.txt', [
  'FamilyPilot operation-first app shell source gate',
  ...checks.map(([name]) => `${name}: VERIFIED`),
  `BEFORE-SOURCE-SHA256: ${beforeSourceSha}`,
  `SOURCE-SHA256: ${afterSourceSha}`,
  `INDEX-SHA256: ${indexSha}`,
  'PACKAGE-CLOSURE: SOURCE-VERIFIED',
  ''
].join('\n'));
fs.writeFileSync('verification/operation-first-app-shell-sha.txt', `SOURCE-SHA256: ${afterSourceSha}\nINDEX-SHA256: ${indexSha}\n`);

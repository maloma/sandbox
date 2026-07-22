import { readFileSync, writeFileSync } from 'node:fs';

const sourcePath = 'src/familypilot.html';
let source = readFileSync(sourcePath, 'utf8');
const marker = '<meta name="familypilot-package" content="hidden-capital-disclosure-v1">';

if (source.includes(marker)) {
  console.log(JSON.stringify({ status: 'SKIPPED', reason: 'hidden Capital disclosure already applied' }, null, 2));
  process.exit(0);
}

function replaceOnce(label, before, after) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: source anchor missing`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: source anchor is not unique`);
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

replaceOnce(
  'package marker',
  '<meta name="familypilot-package" content="compact-analytics-states-v1">',
  '<meta name="familypilot-package" content="compact-analytics-states-v1">\n' + marker
);

replaceOnce(
  'personal Capital surface selector',
  'body.personal-wallet-scope .capital{border-color:color-mix(in srgb,var(--purple) 44%,var(--line));background:color-mix(in srgb,var(--purple) 5%,var(--card))}',
  'body.personal-wallet-scope .capital-launch{border-color:color-mix(in srgb,var(--purple) 44%,var(--line));background:color-mix(in srgb,var(--purple) 5%,var(--card))}'
);

replaceOnce(
  'privacy disclosure styles',
  '</style>',
  `\n/* hidden-capital-disclosure-v1 */
.capital-launch{width:100%;min-height:70px;padding:0 18px;display:flex;align-items:center;justify-content:space-between;gap:16px;color:var(--ink);text-align:left;cursor:pointer}
.capital-launch strong{font-size:20px;line-height:1;font-weight:950;letter-spacing:.01em}
.capital-launch-arrow{font-size:30px;line-height:1;color:var(--muted);transform:translateY(-1px)}
.capital-launch:focus-visible{outline:3px solid color-mix(in srgb,var(--green) 48%,transparent);outline-offset:2px}
.capital-detail-summary{display:grid;gap:5px;padding:14px;border:1px solid var(--line);border-radius:17px;background:var(--card);margin:12px 0}
.capital-detail-label{color:var(--muted);font-size:12px;font-weight:800}
.capital-detail-value{font-size:30px;font-weight:950;overflow-wrap:anywhere}
.capital-detail-change{font-size:14px;font-weight:850}
</style>`
);

replaceOnce(
  'Main Capital card',
  '<section class="card capital"><div class="capital-head"><div><h2><span id="capitalTitleText">Капитал</span> · <span id="capitalScopeLabel" style="color:var(--muted)">включённые кошельки</span></h2><div id="capitalValue" class="capital-value">0 €</div><div id="capitalChange" class="capital-change">0 €</div></div><button id="capitalInfoBtn" class="info">i</button></div><svg class="spark" viewBox="0 0 360 50"><path d="M4 39 L95 31 L184 35 L271 21 L356 9" fill="none" stroke="var(--green)" stroke-width="3" stroke-linecap="round"/><circle cx="356" cy="9" r="4" fill="var(--card)" stroke="var(--green)" stroke-width="3"/></svg><div class="dates"><span id="capitalStartDate"></span><span id="capitalEndDate"></span></div></section>',
  '<button id="capitalRevealBtn" class="card capital-launch" type="button" aria-haspopup="dialog" aria-controls="capitalInfo" aria-label="Открыть капитал"><strong>Капитал</strong><span class="capital-launch-arrow" aria-hidden="true">›</span></button>'
);

replaceOnce(
  'Capital dialog title',
  '<div id="capitalInfo" class="overlay"><div class="panel"><div class="panel-head"><h2>Капитал и кошельки</h2>',
  '<div id="capitalInfo" class="overlay"><div class="panel"><div class="panel-head"><h2>Капитал</h2>'
);

const renderStart = source.indexOf('function renderCapital(){');
const renderEnd = source.indexOf('\nfunction renderHome()', renderStart);
if (renderStart < 0 || renderEnd < 0) throw new Error('renderCapital function boundary missing');
source = source.slice(0, renderStart)
  + `function renderCapital(){const descriptor=scopeDescriptor(),walletName=descriptor.wallet?.name||'';document.body.classList.toggle('personal-wallet-scope',descriptor.scope==='personal');$('capitalRevealBtn').setAttribute('aria-label',descriptor.scope==='personal'&&walletName?\`Открыть капитал кошелька \${walletName}\`:'Открыть семейный капитал')}`
  + source.slice(renderEnd);

const infoStart = source.indexOf('function openCapitalInfo(){');
const infoEnd = source.indexOf('\nfunction openWalletInfo()', infoStart);
if (infoStart < 0 || infoEnd < 0) throw new Error('openCapitalInfo function boundary missing');
const openCapitalInfo = `function openCapitalInfo(){const descriptor=scopeDescriptor(),snapshot=scopedCapitalSnapshot(),summary=\`<div class="capital-detail-summary"><span class="capital-detail-label">\${descriptor.scope==='personal'?esc(descriptor.wallet?.name||'Личный кошелёк'):'Семейный капитал'}</span><strong class="capital-detail-value">\${money(snapshot.capital,snapshot.currency)}</strong><span class="capital-detail-change \${snapshot.change>=0?'positive':'negative'}">Изменение по операциям: \${signed(snapshot.change,snapshot.currency)}</span></div>\`;if(descriptor.scope==='personal'){const w=descriptor.wallet;$('capitalInfoContent').innerHTML=summary+\`<div class="schema-box"><b>Личный финансовый контекст</b>

В семейном капитале: \${w.includedInHouseholdCapital?'да':'нет'}

Подробные операции этого кошелька не смешиваются с семейными операциями. Доступ и включение в семейный капитал остаются независимыми настройками.</div>\`;open('capitalInfo');return}const included=state.wallets.filter(w=>w.includedInHouseholdCapital),excluded=state.wallets.filter(w=>!w.includedInHouseholdCapital),receivable=180,payable=420,net=receivable-payable;$('capitalInfoContent').innerHTML=summary+\`<div class="schema-box"><b>Операционный капитал</b>
Капитал считается по включённым кошелькам и не смешивается с долгами.

<b>Включены в семейный капитал</b>
\${included.map(w=>\`\${esc(w.name)} · \${esc(w.nativeCurrency)}\`).join('\\n')||'Нет'}

<b>Не включены по умолчанию</b>
\${excluded.map(w=>\`\${esc(w.name)} · личный · владелец \${esc(memberName(w.ownerMemberId))}\`).join('\\n')||'Нет'}

<b>Долговая позиция отдельно</b>
Мне должны: +\${money(receivable)}
Я верну: −\${money(payable)}
Чистая долговая позиция: \${signed(net)}

Долги показываются рядом, но не входят в операционный капитал.</div>\`;open('capitalInfo')}`;
source = source.slice(0, infoStart) + openCapitalInfo + source.slice(infoEnd);

replaceOnce(
  'Capital click binding',
  "$('capitalInfoBtn').onclick=openCapitalInfo;",
  "$('capitalRevealBtn').onclick=openCapitalInfo;"
);

writeFileSync(sourcePath, source, 'utf8');
console.log(JSON.stringify({ status: 'PASS', source: sourcePath, marker: 'hidden-capital-disclosure-v1' }, null, 2));

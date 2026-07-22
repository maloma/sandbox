import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const sourcePath = 'src/familypilot.html';
const indexPath = 'index.html';
const mode = process.argv.includes('--verify') ? 'verify' : 'write';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const countOf = (value, needle) => value.split(needle).length - 1;

let source = readFileSync(sourcePath, 'utf8');

function replaceExactlyOnce(from, to, label) {
  if (source.includes(to)) return;
  const count = countOf(source, from);
  if (count !== 1) {
    throw new Error(`${label}: expected exactly one source match, found ${count}`);
  }
  source = source.replace(from, to);
}

function ensureCanonicalSource() {
  const contextualMarker = '<meta name="familypilot-correction" content="contextual-wallet-before-save-v1">';
  const canonicalMarkers = `${contextualMarker}\n<meta name="familypilot-correction" content="analytics-period-entry-state-wallet-pulse-v1">\n<meta name="familypilot-correction" content="wallet-warning-visible-double-pulse-v1">\n<meta name="familypilot-package" content="canonical-runtime-source-v1">`;
  replaceExactlyOnce(contextualMarker, canonicalMarkers, 'canonical correction markers');

  replaceExactlyOnce(
    'state.operations.filter(o=>o.categoryId===c.id).length',
    'categoryFilterCount(c.id)',
    'period-scoped category count'
  );

  replaceExactlyOnce(
    'function renderCategoryChecks(){',
    "function categoryFilterCount(id){const list=categoryFilterContext==='analytics'?inPeriod(activeOps(),periods.analytics):inPeriod(activeOps(),periods.operations);return list.filter(o=>o.categoryId===id).length}\nfunction renderCategoryChecks(){",
    'period-scoped category helper'
  );

  replaceExactlyOnce(
    "$(`categoryError`).textContent='';$(`newCategoryBox`).style.display='none';open('entryModal')".replaceAll('`', "'"),
    "$(`categoryError`).textContent='';$(`newCategoryInput`).value='';$(`newCategoryBox`).style.display='none';open('entryModal')".replaceAll('`', "'"),
    'transient category draft reset'
  );

  replaceExactlyOnce(
    "function renderEntryWalletWarning(w){const primary=defaultWallet(),warning=$('entryWalletWarning'),unusual=!!w&&!!primary&&w.id!==primary.id;warning.hidden=!unusual;if(unusual)$('entryWalletWarningName').textContent=w.name}",
    "function renderEntryWalletWarning(w){const primary=defaultWallet(),warning=$('entryWalletWarning'),unusual=!!w&&!!primary&&w.id!==primary.id;warning._attentionObserver?.disconnect();warning._attentionObserver=null;warning.hidden=!unusual;warning.classList.remove('wallet-attention');if(unusual){$('entryWalletWarningName').textContent=w.name;requestAnimationFrame(()=>{const root=warning.closest('.entry-sheet'),observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting&&e.intersectionRatio>=.6))return;observer.disconnect();warning._attentionObserver=null;warning.classList.remove('wallet-attention');void warning.offsetWidth;warning.classList.add('wallet-attention');setTimeout(()=>warning.classList.remove('wallet-attention'),1500)},{root,threshold:[.6]});warning._attentionObserver=observer;observer.observe(warning)})}}",
    'visibility-triggered non-default wallet attention'
  );

  const walletCss = `\n/* wallet-warning-visible-double-pulse-v1 */\n@keyframes walletWarningAttention{0%,100%{border-color:color-mix(in srgb,var(--blue) 55%,var(--line));box-shadow:none}38%{border-color:var(--red);box-shadow:0 0 0 3px color-mix(in srgb,var(--red) 18%,transparent)}}\n.entry-wallet-warning.wallet-attention{animation:walletWarningAttention .55s ease-out 2}\n@media(prefers-reduced-motion:reduce){.entry-wallet-warning.wallet-attention{animation:none;border-color:color-mix(in srgb,var(--red) 62%,var(--line))}}\n`;
  if (!source.includes('/* wallet-warning-visible-double-pulse-v1 */')) {
    replaceExactlyOnce('</style>', `${walletCss}</style>`, 'wallet attention CSS');
  }
}

function verifyCanonical(sourceText, indexText) {
  const required = [
    'canonical-runtime-source-v1',
    'analytics-period-entry-state-wallet-pulse-v1',
    'wallet-warning-visible-double-pulse-v1',
    'function categoryFilterCount(id)',
    "$('newCategoryInput').value=''",
    'IntersectionObserver',
    'walletWarningAttention',
    'localStorage',
    'entryWalletWarning'
  ];

  for (const token of required) {
    if (!sourceText.includes(token)) throw new Error(`required canonical token missing: ${token}`);
  }

  const forbidden = [
    "fetch('./src/familypilot.html",
    'document.write(source)',
    'replaceOnce(',
    '<div id="boot">Загрузка FamilyPilot…</div>',
    '<iframe'
  ];

  for (const token of forbidden) {
    if (indexText.includes(token)) throw new Error(`forbidden root-loader token present: ${token}`);
  }

  if (sourceText !== indexText) throw new Error('index.html is not byte-identical to src/familypilot.html');
  if (countOf(sourceText, 'canonical-runtime-source-v1') !== 1) throw new Error('canonical marker count must equal one');
  if (countOf(sourceText, '<!doctype html>') !== 1) throw new Error('document must contain one doctype');
  if (countOf(sourceText, '</html>') !== 1) throw new Error('document must contain one closing html tag');

  return {
    source_sha256: sha256(sourceText),
    index_sha256: sha256(indexText),
    bytes: Buffer.byteLength(sourceText),
    required_tokens: required.length,
    forbidden_tokens_checked: forbidden.length
  };
}

ensureCanonicalSource();

if (mode === 'write') {
  writeFileSync(sourcePath, source, 'utf8');
  writeFileSync(indexPath, source, 'utf8');
}

const sourceOnDisk = mode === 'write' ? readFileSync(sourcePath, 'utf8') : source;
const indexOnDisk = readFileSync(indexPath, 'utf8');
const result = verifyCanonical(sourceOnDisk, indexOnDisk);
console.log(JSON.stringify({ mode, ...result }, null, 2));

import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const sourcePath = 'src/familypilot.html';
const indexPath = 'index.html';
const sourceScopePath = 'src/familypilot-scope.js';
const rootScopePath = 'familypilot-scope.js';
const source = readFileSync(sourcePath, 'utf8');
const index = readFileSync(indexPath, 'utf8');
const sourceScopeCode = readFileSync(sourceScopePath, 'utf8');
const rootScopeCode = readFileSync(rootScopePath, 'utf8');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const equal = (actual, expected, message) => {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) throw new Error(`${message}: expected ${right}, got ${left}`);
};

const sandbox = {};
sandbox.globalThis = sandbox;
vm.runInNewContext(sourceScopeCode, sandbox, { filename: sourceScopePath });
const scope = sandbox.FamilyPilotScope;
assert(scope, 'FamilyPilotScope was not attached');

const state = {
  household: { id: 'h1', baseCurrency: 'EUR', openingCapital: 5200 },
  currentMemberId: 'anna',
  activeWalletId: 'household',
  wallets: [
    { id: 'household', type: 'household_default', name: 'Семейный кошелёк', nativeCurrency: 'EUR', allowedMemberIds: ['anna', 'martin'], includedInHouseholdCapital: true, openingBalance: 0, archivedAt: null },
    { id: 'personal-anna', type: 'personal', name: 'Личный кошелёк Анны', nativeCurrency: 'EUR', ownerMemberId: 'anna', allowedMemberIds: ['anna'], includedInHouseholdCapital: false, openingBalance: 0, archivedAt: null },
    { id: 'personal-martin', type: 'personal', name: 'Личный кошелёк Мартина', nativeCurrency: 'EUR', ownerMemberId: 'martin', allowedMemberIds: ['martin'], includedInHouseholdCapital: false, openingBalance: 0, archivedAt: null }
  ],
  operations: [
    { id: 'h-income', walletId: 'household', kind: 'income', amount: 100, status: 'active' },
    { id: 'h-expense', walletId: 'household', kind: 'expense', amount: 20, status: 'active' },
    { id: 'a-income', walletId: 'personal-anna', kind: 'income', amount: 50, status: 'active' },
    { id: 'a-expense', walletId: 'personal-anna', kind: 'expense', amount: 5, status: 'active' },
    { id: 'a-trash', walletId: 'personal-anna', kind: 'expense', amount: 500, status: 'trash' },
    { id: 'm-income', walletId: 'personal-martin', kind: 'income', amount: 999, status: 'active' }
  ]
};

equal(scope.accessibleWallets(state).map(wallet => wallet.id), ['household', 'personal-anna'], 'Anna accessible wallets');
equal(scope.visibleOperations(state).map(operation => operation.id), ['h-income', 'h-expense'], 'household visible operations exclude personal wallets');
let capital = scope.capitalSnapshot(state);
equal({ scope: capital.scope, capital: capital.capital, change: capital.change }, { scope: 'household', capital: 5280, change: 80 }, 'household capital');
equal(scope.scopeDescriptor(state).capitalLabel, 'включённые кошельки', 'household capital label');

state.activeWalletId = 'personal-anna';
equal(scope.visibleOperations(state).map(operation => operation.id), ['a-income', 'a-expense'], 'personal visible operations');
capital = scope.capitalSnapshot(state);
equal({ scope: capital.scope, capital: capital.capital, change: capital.change }, { scope: 'personal', capital: 45, change: 45 }, 'personal capital');
equal(scope.scopeDescriptor(state).capitalLabel, 'Личный кошелёк Анны', 'personal capital label');

state.activeWalletId = 'household';
state.wallets.find(wallet => wallet.id === 'personal-anna').includedInHouseholdCapital = true;
equal(scope.visibleOperations(state).map(operation => operation.id), ['h-income', 'h-expense'], 'household detail remains isolated after personal capital opt-in');
capital = scope.capitalSnapshot(state);
equal({ capital: capital.capital, change: capital.change }, { capital: 5325, change: 125 }, 'household aggregate may include opted-in personal wallet');

state.currentMemberId = 'martin';
equal(scope.accessibleWallets(state).map(wallet => wallet.id), ['household', 'personal-martin'], 'Martin accessible wallets');
state.activeWalletId = 'personal-anna';
equal(scope.activeWallet(state).id, 'household', 'inaccessible personal wallet falls back safely');

const requiredSourceTokens = [
  'personal-wallet-scope-v1',
  '<script src="./familypilot-scope.js"></script>',
  'id="capitalTitleText"',
  'id="capitalScopeLabel"',
  'id="operationsScopeLabel"',
  'id="analyticsScopeLabel"',
  'const scopeWallet=()=>scopeApi.activeWallet(state)',
  'scopeOps=()=>scopeApi.visibleOperations(state)',
  'function scopedCapitalSnapshot(){return scopeApi.capitalSnapshot(state)}',
  "inPeriod(scopeOps(),periods.operations)",
  "inPeriod(scopeOps(),periods.analytics)",
  "categoryFilterContext==='analytics'?inPeriod(scopeOps(),periods.analytics):inPeriod(scopeOps(),periods.operations)",
  'setActiveWallet:id=>',
  'visibleOperationIds:()=>scopeOps().map(o=>o.id)',
  'capitalSnapshot:()=>'
];
for (const token of requiredSourceTokens) assert(source.includes(token), `required source token missing: ${token}`);

const forbiddenSourceTokens = [
  '<script src="./src/familypilot-scope.js"></script>',
  'function renderHome(){const list=inPeriod(activeOps(),periods.home)',
  'function filteredOperations(){let list=inPeriod(activeOps(),periods.operations)',
  'function analyticsFilteredOperations(){let list=inPeriod(activeOps(),periods.analytics)',
  "categoryFilterContext==='analytics'?inPeriod(activeOps(),periods.analytics):inPeriod(activeOps(),periods.operations)",
  'function renderCapital(){const list=includedCapitalOps()',
  "toast(`Основной кошелёк:"
];
for (const token of forbiddenSourceTokens) assert(!source.includes(token), `forbidden old scope token present: ${token}`);

assert(source === index, 'index.html must be byte-identical to src/familypilot.html');
assert(sourceScopeCode === rootScopeCode, 'root and source scope modules must be byte-identical');
assert(!index.includes("fetch('./src/familypilot.html"), 'old root fetch loader returned');
assert(!index.includes('document.write(source)'), 'old root document.write loader returned');
assert((source.match(/personal-wallet-scope-v1/g) || []).length >= 2, 'personal wallet marker must cover metadata and CSS');

const inlineScripts = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1].trim())
  .filter(Boolean);
assert(inlineScripts.length === 1, `expected one inline application script, found ${inlineScripts.length}`);
new vm.Script(inlineScripts[0], { filename: sourcePath });
new vm.Script(sourceScopeCode, { filename: sourceScopePath });

console.log(JSON.stringify({
  status: 'PASS',
  household_visible_operations: ['h-income', 'h-expense'],
  personal_visible_operations: ['a-income', 'a-expense'],
  household_capital_without_personal: 5280,
  personal_capital: 45,
  household_capital_with_personal_opt_in: 5325,
  source_sha256: sha256(source),
  index_sha256: sha256(index),
  source_scope_sha256: sha256(sourceScopeCode),
  root_scope_sha256: sha256(rootScopeCode),
  source_bytes: Buffer.byteLength(source),
  scope_bytes: Buffer.byteLength(sourceScopeCode),
  syntax_validation: 'PASS'
}, null, 2));

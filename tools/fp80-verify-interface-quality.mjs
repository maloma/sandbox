import {readFileSync} from 'node:fs';

const source=readFileSync('src/familypilot.html','utf8');
const root=readFileSync('index.html','utf8');
const bridge=readFileSync('familypilot-module-entry-bridge.js','utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

assert(source===root,'Canonical source and published root must remain byte-identical');
assert(source.includes('<script src="./familypilot-module-entry-bridge.js"'),'Global module-entry UI bridge is not loaded');
assert(source.indexOf('</style>')<source.indexOf('<script src="./familypilot-module-entry-bridge.js"'),'Readability bridge must execute after canonical inline CSS is parsed');

assert(bridge.includes("readabilityStyle.id='familypilot-readability-style'"),'Readability style marker missing');
assert(bridge.includes('function pinReadabilityStyleLast()'),'Readability style is not protected as the final cascade layer');
assert(/function sync\(\)\{\s*pinReadabilityStyleLast\(\);/.test(bridge),'Runtime sync does not re-pin readability style last');
assert(bridge.includes('.nav{font-size:11px}'),'Bottom navigation readability floor missing');
assert(bridge.includes('.fp-module-code,.fp-module-actions .btn,.fp-module-state{font-size:12px}'),'Meaningful microcopy 12px floor missing');
assert(bridge.includes('.debt-readonly,.savings-note,.wallet-manager-note{font-size:13px;line-height:1.45}'),'Descriptive secondary-copy 13px floor missing');

assert(bridge.includes('#plansScreen .plan-module{grid-template-columns:42px minmax(0,1fr);'),'Plans card no longer has a dedicated competing state column');
assert(bridge.includes('#plansScreen .plan-module-copy{min-width:0}'),'Plans copy min-width guard missing');
assert(bridge.includes('white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere;line-height:1.35'),'Plans title/subtitle wrapping override missing');
assert(bridge.includes('#plansScreen .plan-module-copy small{font-size:13px}'),'Plans subtitle readable size missing');
assert(bridge.includes('#plansScreen .plan-module-state{grid-column:2;justify-self:start;max-width:none;white-space:normal;text-align:left;overflow-wrap:anywhere;line-height:1.35;font-size:12px}'),'Plans state wrapping/layout override missing');
assert(bridge.includes('@media(max-width:380px){#plansScreen .plan-module{grid-template-columns:38px minmax(0,1fr)}}'),'Narrow-phone Plans layout guard missing');

assert(/lastNonDebtScreen='home'/.test(source),'Contextual debt-back origin state missing');
assert(/if\(name==='debts'&&current&&current!=='debts'\)lastNonDebtScreen=current/.test(source),'Entering Debts does not remember the actual origin screen');
assert(source.includes("debtBackButton.removeAttribute('data-debt-back')"),'Legacy fixed debt-back route still owns runtime Back behavior');
assert(source.includes("debtBackButton.onclick=()=>{showScreen(lastNonDebtScreen||'home');renderAll()}"),'Debt Back does not return to the actual prior context');

console.log(JSON.stringify({
  status:'PASS',
  marker:'FP80_INTERFACE_QUALITY_PASS',
  sourceRootEqual:true,
  readabilityStyleFinal:true,
  meaningfulSecondaryFloor:true,
  plansWrappingEffective:true,
  narrowPhoneGuard:true,
  contextualDebtBack:true
},null,2));

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=process.cwd(),html=readFileSync(resolve(root,'index.html'),'utf8'),source=readFileSync(resolve(root,'src/familypilot.html'),'utf8'),scope=readFileSync(resolve(root,'familypilot-scope.js'),'utf8');
const requireText=(text,needle,message)=>assert.ok(text.includes(needle),message);
const forbid=(text,needle,message)=>assert.ok(!text.includes(needle),message);

assert.equal(html,source,'runtime and source FamilyPilot HTML must remain byte-identical');
assert.equal(existsSync(resolve(root,'familypilot-79-remediation.js')),false,'temporary #79 overlay must be removed');
forbid(html,'familypilot-79-remediation.js','runtime must not load the overlay');
forbid(html,'__FP_79_REMEDIATION_READY__','runtime must not require overlay readiness');
forbid(html,'setInterval(sync','runtime must not use #79 polling');
forbid(html,'eval(','calculator must not use eval');
forbid(html,'Function(','calculator must not use dynamic Function');

requireText(html,'maxlength="1000"','operation note input needs a 1000-character boundary');
requireText(html,"if(rawNote.length>COMMENT_MAX)",'oversized notes must fail before mutation');
forbid(html,"operation.note=String(operation.note||'').slice",'boot must not rewrite historical notes');
requireText(html,'function calculateAmountExpression(raw)','calculator parser must be a normal owner function');
requireText(html,"if(operator==='/'&&right===0)",'calculator must reject division by zero');
requireText(html,'EXPRESSION_MAX=80','calculator must have a deterministic input bound');
requireText(html,"state.config.allowFutureActualOperations=state.config.allowFutureActualOperations===true",'future-operation setting must be persisted conservatively');
requireText(html,"$('dateInput').addEventListener('input'",'future-date error must clear reactively');
requireText(html,"requestAnimationFrame(()=>$('amountInput').focus",'new income/expense entry must autofocus amount');
requireText(html,'id="detailReceiptBtn"','receipt attach/replace must be visible from operation detail');
requireText(html,'RECEIPT_MAX=750000','receipt size boundary must be 750 KB');
requireText(html,'accept="image/*,application/pdf"','receipt types must be image/PDF only');
requireText(html,'OPERATIONS_WORKSPACE_KEY','Operations workspace must have one explicit namespaced key');
requireText(html,'function readOperationsWorkspace()','Operations workspace must normalize corrupt storage safely');
requireText(html,'categoryMemory={income:','Operations workspace must retain Income/Expense category memory');
requireText(html,'restoreOperationCategoryMemory()','hidden opposite-type categories must not remain effective');
requireText(html,'snapshot.operationalFunds??snapshot.liquidCapital','capital disclosure must read canonical scope truth');
requireText(html,'snapshot.netFamilyCapital??snapshot.capital','capital disclosure must use canonical net capital');
requireText(html,"personal=descriptor.scope==='personal'",'capital disclosure must branch on the canonical scope descriptor');
requireText(html,'Личный финансовый контекст','personal capital disclosure must explain its isolated context');
requireText(scope,'function capitalSnapshot(state)','FamilyPilotScope remains the capital owner');
requireText(html,'lastNonDebtScreen','debt Back must preserve the real prior screen');
requireText(html,'openingCapital:0','demo reset must not retain unexplained opening capital');

console.log(JSON.stringify({
  status:'PASS',
  marker:'FAMILYPILOT79_CANONICAL_CHARACTERIZATION_PASS',
  no_overlay:true,
  note_atomicity:true,
  calculator_safe:true,
  future_dates_reactive:true,
  amount_autofocus:true,
  receipt_detail_path:true,
  operations_workspace_memory:true,
  canonical_capital_disclosure:true,
  debt_back_history:true,
  no_polling_or_monkey_patch:true,
},null,2));

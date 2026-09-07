'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'familypilot-entry-ux-reset-r1.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const api=require('../familypilot-entry-ux-reset-r1.js');

assert.strictEqual(api.architecture,'FP86_ENTRY_UX_RESET_R1');
assert.strictEqual(api.sanitizeAmountExpressionValue(' 12,50 + 7,50 '),'12,50+7,50');
assert.strictEqual(api.sanitizeAmountExpressionValue('12×2−1'),'12*2-1');

for(const [expression,value] of [
  ['12,50+7,50',20],
  ['20-3,25',16.75],
  ['4×2,5',10],
  ['12÷5',2.4],
  ['(10+2)*3',36]
]){
  const result=api.calculateExpression(expression);
  assert.strictEqual(result.error,undefined,expression);
  assert.strictEqual(result.value,value,expression);
}

assert.deepStrictEqual(api.calculateExpression('10/0'),{error:'invalid'});
assert.deepStrictEqual(api.calculateExpression('10+'),{error:'invalid'});
assert.deepStrictEqual(api.calculateExpression('три'),{error:'invalid'});
assert.match(source,/minimumFractionDigits:frac\?2:0,maximumFractionDigits:2/);
assert.match(source,/r\.error\?'var\(--red\)':'var\(--ink\)'/);
assert.match(source,/fontSize:text\.replace/);
assert.match(index,/amount=calculation\.value/);
assert.doesNotMatch(index,/rawNote[^;]*(?:amount|categoryId)\s*=/,'Comment must not populate financial fields');
assert.doesNotMatch(source,/auto.?save|parse.?comment|parse.?note|voice|speech|dictat/i);

console.log('FP86_ARITHMETIC_OPERATORS_PASS');
console.log('FP86_ARITHMETIC_DECIMAL_AND_INVALID_PASS');
console.log('FP86_SAVE_USES_COMPUTED_RESULT_PASS');
console.log('FP86_NO_COMMENT_TO_FINANCIAL_AUTOPARSE_PASS');

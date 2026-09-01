'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const adapter=fs.readFileSync(path.join(root,'familypilot-voice-v1-form-adapter.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const reset=fs.readFileSync(path.join(root,'FP86_ENTRY_UX_RESET_R1.md'),'utf8');

assert.match(reset,/V1\/V2\/V3 correction chain is frozen/);
assert.match(reset,/not V4/);
assert.match(adapter,/architecture:RESET_ID/);
assert.match(adapter,/FP86_ENTRY_UX_RESET_R1/);
assert.match(adapter,/fp-unsaved-inline/);
assert.doesNotMatch(adapter,/fp-unsaved-confirm\{position:fixed/);
assert.doesNotMatch(adapter,/document\.body\.appendChild\(w\)/);
assert.match(adapter,/sheet\.insertBefore\(w,head\.nextSibling\)/);
assert.match(adapter,/Максимум 999 999,99\./);
assert.match(adapter,/placeCloudAccount/);
assert.match(adapter,/more\.insertBefore\(cloud,settingsGroup\.nextSibling\)/);
assert.match(adapter,/\.fp-hints-hidden \.meta-note/);
assert.match(adapter,/\.fp-hints-hidden \.field-help/);
assert.match(index,/Максимум одной операции: 999 999,99 €/,'legacy source is intentionally adapted at runtime in Reset R1');
assert.match(index,/id="fpCloudAccount"/,'legacy cloud block exists in source and must be relocated by Reset R1');

console.log('FP86_ENTRY_UX_RESET_R1_ARCHITECTURE_PASS');
console.log('FP86_RESET_NOT_V4_PASS');
console.log('FP86_CONFIRM_INSIDE_ENTRY_SHEET_PASS');
console.log('FP86_COMPACT_MAXIMUM_COPY_PASS');
console.log('FP86_CLOUD_BLOCK_RELOCATION_CONTRACT_PASS');
console.log('FP86_HINTS_ON_OFF_LAYOUT_CONTRACT_PASS');

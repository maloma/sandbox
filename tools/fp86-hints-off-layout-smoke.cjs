'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const adapter=fs.readFileSync(path.join(root,'familypilot-voice-v1-form-adapter.js'),'utf8');

assert.match(adapter,/HP='familypilot\.hints\.enabled\.v1'/);
assert.match(adapter,/body\?\.classList\.toggle\('fp-hints-hidden',!h\)/);
assert.match(adapter,/\.fp-hints-hidden \.meta-note/);
assert.match(adapter,/\.fp-hints-hidden \.field-help/);
assert.match(adapter,/#amountLimitHint\{display:block/);
assert.doesNotMatch(adapter,/\.fp-hints-hidden \.fp-voice-live/,'live recognition feedback must remain visible when hints are disabled');
assert.doesNotMatch(adapter,/\.fp-hints-hidden \.fp-unsaved-inline/,'save/discard confirmation must remain functional when hints are disabled');
assert.doesNotMatch(adapter,/\.fp-hints-hidden #fpCloudAccount/,'account/cloud settings must not disappear with learning hints');

console.log('FP86_HINTS_OFF_LAYOUT_BEHAVIOR_PASS');

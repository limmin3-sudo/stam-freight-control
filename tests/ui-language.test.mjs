import test from 'node:test';
import assert from 'node:assert/strict';
import {englishUI} from '../integration/log/ui-language.mjs';
import {WORKSPACE_EN} from '../integration/log/ui-english.mjs';
test('complete translations take precedence over numeric fragments within the same sentence',()=>{
 const source=Object.keys(WORKSPACE_EN).find(s=>s.startsWith('빌드 12913470'));
 assert.equal(englishUI(source),WORKSPACE_EN[source]);
 assert.equal(englishUI('  '+source+'  '),'  '+WORKSPACE_EN[source]+'  ');
 assert.equal(englishUI('선택한 계약 7개'),'7 selected contracts');
});

import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {splitMissionText,parseMissionText} from '../ocr.mjs';
import {prepareMissionDb,enrichMission} from '../mission-match.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../data/'+p,import.meta.url))),db=prepareMissionDb(read('hauling-missions.json'),{commodities:Object.fromEntries(Object.entries(read('ai-korean.json').goods).map(([en,ko])=>[ko,en]))});
const medium=['중형 신입 화물 계약자 필요 [200-4,000 평판]','¤ 322,500','레드 윈드 노선화물',...['질소|24','유기물|12','란타 배설물|14'].flatMap(row=>{const [c,n]=row.split('|');return [`${c}을(를) 0/${n} SCU 잭슨 교환소에 배송하십시오.`,`브리오 함선 폐기장에서 ${c}을(를) 접수하십시오.`,`라야리 맥그래스 연구 기지 [McGrath]에서 ${c}을(를) 접수하십시오.`];})].join('\n');
const large=['대형 신입 화물 계약자 필요 [100-4,000 평판]','¤ 747,000','레드 윈드 노선화물',...['카나드 뷰','셰퍼드의 안식처'].flatMap(d=>['함선 탄약|32','수소|32','의료 보급품|20'].flatMap(row=>{const [c,n]=row.split('|');return [`${c}을(를) 0/${n} SCU ${d}에 배송하십시오.`,`아크콥 채광 구역 056에서 ${c}을(를) 접수하십시오.`];}))].join('\n');
test('headings separate pasted contracts without ---; wiki matches stay independent',()=>{
 // Before splitting, combining these goods gives no single matching mission type.
 assert.equal(enrichMission(parseMissionText(medium+'\n\n'+large),db)._wiki,undefined);
 const chunks=splitMissionText(medium+'\n\n'+large);assert.equal(chunks.length,2);
 const missions=chunks.map(t=>enrichMission(parseMissionText(t),db));
 assert.deepEqual(missions.map(m=>m.reward),[322500,747000]);assert.deepEqual(missions.map(m=>m.cargo.reduce((n,c)=>n+c.scu,0)),[50,168]);
 assert.ok(missions.every(m=>m._wiki?.candidates===1));assert.deepEqual(missions[0].cargo.map(c=>c.maxBoxSize),[8,8,4,4,2,2]);assert.deepEqual(missions[1].cargo.map(c=>c.maxBoxSize),[16,16,2,16,16,2]);
});
test('HTML line breaks, Markdown headings and trailing backslashes preserve contract boundaries and rewards',()=>{
 const pasted='### '+medium.replaceAll('\n','&#xA;')+'\n\n'+large.replaceAll('\n','\\\n');
 const chunks=splitMissionText(pasted);assert.equal(chunks.length,2);
 const ms=chunks.map(t=>enrichMission(parseMissionText(t),db));assert.ok(ms.every(m=>m._wiki));assert.deepEqual(ms.map(m=>m.reward),[322500,747000]);
 assert.equal(parseMissionText('### '+medium.replaceAll('\n','&#xA;')).cargo.length,6);
});
test('explicit separators and a wrapped reputation line still parse as before',()=>{
 assert.equal(splitMissionText(medium+'\n---\n'+large).length,2);
 assert.equal(splitMissionText(medium.replace(' [200-4,000 평판]','\n[200-4,000 평판]')).length,1);
});

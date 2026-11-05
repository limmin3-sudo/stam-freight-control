import test from 'node:test';import assert from 'node:assert/strict';
import {SLIDES,CHAPTERS,searchSlides} from '../guide-data.mjs';
test('guide navigation has unique deep links, six quick-start steps and complete bilingual text',()=>{
 assert.equal(new Set(SLIDES.map(s=>s.id)).size,SLIDES.length);assert.equal(SLIDES.filter(s=>s.quick).length,6);
 for(const s of SLIDES){assert.match(s.id,/^[a-z][a-z-]+$/);assert.ok(CHAPTERS[s.chapter]);assert.ok(s.steps.length>0&&s.steps.length<=4);for(const lang of ['ko','en'])for(const item of [s.title,s.summary,...s.steps])assert.ok(item[lang]?.trim(),s.id+' '+lang);}
});
test('guide search reaches every slide in both languages and tolerates common input mistakes',()=>{
 for(const s of SLIDES)for(const lang of ['ko','en'])assert.ok(searchSlides(s.title[lang]).some(x=>x.id===s.id),s.id+' '+lang);
 for(const [query,id] of [['Game.log','log-file'],['수신함','inbox-card'],['container','containers'],['그리드','grids'],['contaner','containers'],['cryopod','cryopods'],['reset','reset']])assert.ok(searchSlides(query).some(s=>s.id===id),query);
 assert.equal(searchSlides('zzzz-no-such-feature').length,0);
});

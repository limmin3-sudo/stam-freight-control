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

import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {guideSpeech} from '../guide-speech.mjs';
test('guide photographs exist in both languages and each state is used once',()=>{
 const images=SLIDES.map(s=>s.image).filter(s=>s&&s!=='folder');assert.equal(new Set(images).size,images.length);
 const hashes=new Set();for(const image of images){const file=new URL(`../assets/guide/${image}-ko.webp`,import.meta.url);if(existsSync(file)){const hash=createHash('sha256').update(readFileSync(file)).digest('hex');assert.ok(!hashes.has(hash),'Repeated screenshot: '+image);hashes.add(hash);}}
 for(const image of images)for(const lang of ['ko','en'])assert.ok(existsSync(new URL(`../assets/guide/${image}-${lang}.webp`,import.meta.url)),image+' '+lang);
});
test('guide partners give independently worded guidance in both languages',()=>{
 for(const slide of SLIDES)for(const lang of ['ko','en']){const aide=guideSpeech(slide,'aide',lang),nav=guideSpeech(slide,'standard',lang);assert.ok(aide&&nav);assert.notEqual(aide,nav);assert.ok(!aide.includes(slide.summary[lang])||!nav.includes(slide.summary[lang]),slide.id);}
});

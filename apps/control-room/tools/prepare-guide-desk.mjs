import fs from 'node:fs/promises';
import postcss from 'postcss';
const source = new URL('../../../docs/cinematics/lounge-guide/', import.meta.url);
const output = new URL('../src/', import.meta.url);
const media = new URL('assets/guide/', output);
await fs.mkdir(media, {recursive:true});
const assets = {
 'approach.mp4':'../guide-restoration-20261112/approved-approach/original.mp4',
 'idle-ab.mp4':'../guide-restoration-20261112/idle-loop/original.mp4',
 'return.mp4':'../guide-restoration-20261112/approved-return/original.mp4',
 'lounge-start.png':'../guide-restoration-20261112/01-lounge-start.png',
 'desk-end.png':'../guide-restoration-20261112/02-desk-end-edited.png',
 'lounge-return.png':'../guide-restoration-20261112/01-lounge-start.png',
};
for(const [name,path] of Object.entries(assets)) await fs.copyFile(new URL(path,source),new URL(name,media));
const html=await fs.readFile(new URL('desk-arrival-preview.html',source),'utf8');
const symbols=html.slice(html.indexOf('<svg class="symbols"'),html.indexOf('<header class="toolbar"'));
let markup=symbols+html.slice(html.indexOf('<main '),html.indexOf('</main>')+7);
// Keep the rim paths in the visible SVG. Scoped selectors do not reliably cross
// the SVG use shadow tree; direct paths preserve the approved transparent rim.
const widePaths=markup.match(/<symbol id="wide-frame-shape"[^>]*>([\s\S]*?)<\/symbol>/)?.[1];
if(!widePaths)throw Error('Missing approved frame');
markup=markup.replace(/<use href="#wide-frame-shape"\s*\/>/,widePaths);
markup=markup.replace('선택한 영상의 실제 마지막 프레임','고해상도 안내데스크 사진');
markup=markup.replace('</main>',`<div class="guide-media-controls"><button id="sound" type="button" aria-pressed="false">소리 켜기</button><button id="skip" class="guide-skip" type="button">이동 건너뛰기</button><button id="toggle" type="button" aria-expanded="false" aria-controls="stage" disabled>홀로그램 펼치기</button></div><span id="status" class="guide-status" aria-live="polite"></span></main>`);
for(const [from,to] of Object.entries({'selected-approach.mp4':'__APPROACH__','selected-idle.mp4':'__IDLE__','selected-return.mp4':'__RETURN__','actual-first-frame.png':'__LOUNGE__','actual-last-frame.png':'__DESK__','return-last-frame.png':'__RETURN_END__'})) markup=markup.replaceAll(from,to);
await fs.writeFile(new URL('guide-desk-template.html',output),markup);
const base=await fs.readFile(new URL('hologram-design-v2.css',source),'utf8');
const inline=[...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(x=>x[1]).join('\n');
const css=postcss.parse(base+'\n'+inline);
css.walkAtRules('font-face',rule=>rule.remove());
css.walkRules(rule=>{rule.selectors=rule.selectors.map(s=>s==='body'?'.guide-desk':`.guide-desk ${s}`);});
await fs.writeFile(new URL('guide-desk.css',output),css.toString()+`
.space-experience[data-screen=guide] .space-main{display:block;overflow:auto;padding:0;background:#061018}
.guide-desk{width:100%;min-width:0;background:#061018;font-family:SUIT,system-ui,sans-serif}
.guide-desk .stage{width:min(100%,calc((100dvh - 92px)*16/9));aspect-ratio:16/9;margin:auto}
.guide-desk .guide-media-controls{position:absolute;top:2%;right:2%;z-index:5;display:flex;gap:8px}
.guide-desk .guide-media-controls button{border:1px solid #83d6e970;background:#092c3cd9;color:#e8fbff;padding:8px 12px;border-radius:3px;font-size:12px}
.guide-desk .guide-status{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
.guide-desk .guide-skip{display:none}
.guide-desk .stage:is([data-state=playing],[data-state=returning]) .guide-skip{display:block}
.guide-desk .stage:not([data-state=arrived]) #toggle{display:none}
.guide-desk .stage[data-state=closing-action] .end-frame{visibility:visible}
.guide-desk .stage[data-state=closing-action] #approach{visibility:hidden}
.guide-desk .stage[data-state=closing-action][data-idle=playing] #idle{visibility:visible;opacity:1}
.guide-desk[data-motion=false] .ui{transition-duration:1ms!important;transition-delay:0ms!important}
@media(max-width:650px){
 .guide-desk .stage{width:100%;aspect-ratio:13/20}
 .guide-desk .scene{object-fit:cover;object-position:70% center}
 .guide-desk .unified{left:2%;top:44%;width:96%;height:53%}
 .guide-desk .unified .unified-content{inset:5% 4.5%}
 .guide-desk .unified-header{gap:2cqw}
 .guide-desk .unified-header h2{font-size:5cqw}
 .guide-desk .unified-header small{font-size:2.6cqw}
 .guide-desk .unified-header>.icon{width:6cqw;height:6cqw}
 .guide-desk .unified-context{font-size:2.2cqw}
 .guide-desk .unified-line{margin:2.4cqw 0 3cqw}
 .guide-desk .unified-body{gap:4cqw;grid-template-columns:44% minmax(0,1fr)}
 .guide-desk .unified-functions h3{font-size:3.3cqw;white-space:normal;margin-bottom:2.3cqw}
 .guide-desk .unified .actions{gap:1.8cqw}
 .guide-desk .unified .holo-action{font-size:max(12px,3cqw);min-height:10.2cqw;padding:1.5cqw;gap:1.5cqw}
 .guide-desk .unified .icon{width:4.5cqw;height:4.5cqw}
 .guide-desk .unified .greeting{font-size:3.4cqw;line-height:1.55}
 .guide-desk .unified-dialogue::before{left:-2cqw}
 .guide-desk .unified .dialog-divider{margin:2.2cqw 0}
 .guide-desk .unified .replies{gap:2cqw}
 .guide-desk .unified .replies .holo-action{font-size:max(12px,3cqw);min-height:12cqw;padding:1.8cqw;gap:1.5cqw}
 .guide-desk .unified .replies .icon{width:4cqw;height:4cqw}
 .guide-desk .guide-media-controls{gap:5px}
 .guide-desk .guide-media-controls button{font-size:11px;padding:7px 9px}
}
`);
let js=await fs.readFile(new URL('desk-arrival-preview.js',source),'utf8');
js=`export function mountGuideDesk(root, options) {\nconst byId = id => root.querySelector('[id="'+id+'"]');\nconst word = text => options.translate?.(text) ?? text;\n`+js;
js=js.replaceAll('document.getElementById(', 'byId(').replaceAll("document.addEventListener('keydown'", "root.addEventListener('keydown'");
js=js.replaceAll("byId('replay').addEventListener", "byId('replay')?.addEventListener").replaceAll("byId('arrival').addEventListener", "byId('arrival')?.addEventListener");
js=js.replace(/\.textContent = ([^;]+);/g,'.textContent = word($1);');
js=js.replace("returnVideo.addEventListener('ended', async () => {",'async function completeReturn() {');
js=js.replace("status.textContent = word('라운지');\n});", "status.textContent = word('라운지');\n  options.onLounge();\n}\nreturnVideo.addEventListener('ended', completeReturn);");
js=js.replace("if (current !== sequence || stage.dataset.state !== 'closing-return') return;", "if (current !== sequence || stage.dataset.state !== 'closing-return') return;\n    if (options.motion === false) { stopIdle(); options.onLounge(); return; }");
js=js.replace("clearTimers();\n    showPanels(false);\n  }\n});\nshowPanels(false);\nplayFromStart();", "event.preventDefault();\n    returnToLounge();\n  }\n});\n"+`
async function navigate(screen) {
  if(['playing','ready','returning'].includes(stage.dataset.state)){
    cancelPending();video.pause();idle.pause();returnVideo.pause();options.onNavigate(screen);return;
  }
  if (screen === 'lounge') return returnToLounge();
  if (stage.dataset.state !== 'arrived') return;
  const current=cancelPending();
  stage.dataset.state='closing-action';
  toggle.disabled=true;showPanels(false);
  await waitForPanelExit();
  if(current===sequence){stopIdle();options.onNavigate(screen);}
}
const actions=[...stage.querySelectorAll('.actions button')];
actions[0].addEventListener('click',()=>navigate('mission'));
actions[1].addEventListener('click',()=>{byId('greeting').textContent=word('미션 콘솔에서 함선과 출발지를 고른 뒤 계약을 담아 주세요. 항로와 적재를 확인하면 출항할 수 있어요.');});
actions[2].addEventListener('click',()=>navigate('information'));
const replies=[...stage.querySelectorAll('.replies button')];
replies[0].addEventListener('click',()=>{byId('greeting').textContent=word('먼저 미션 콘솔에서 이번 운송에 담을 계약을 선택해 주세요. 확인한 계약으로 항로를 계산할 수 있어요.');});
replies[1].addEventListener('click',()=>navigate('mission'));
byId('skip').addEventListener('click',()=>{
  if(stage.dataset.state==='playing')jumpToArrival();
  else if(stage.dataset.state==='returning'){returnVideo.pause();completeReturn();}
});
video.muted=!options.sound;returnVideo.muted=!options.sound;
sound.setAttribute('aria-pressed',String(!!options.sound));
sound.textContent=word(options.sound?'소리 끄기':'소리 켜기');
showPanels(false);
if(options.startWithApproach&&options.motion!==false)playFromStart();else jumpToArrival();
return {navigate,destroy(){cancelPending();video.pause();idle.pause();returnVideo.pause();}};
`);
js+='\n}\n';
js=js.replace(/root\.addEventListener\('keydown', event => \{([\s\S]*?)\n\}\);/,"const onKeyDown = event => {$1\n};\nroot.addEventListener('keydown', onKeyDown);");
js=js.replace('destroy(){cancelPending();',"destroy(){root.removeEventListener('keydown', onKeyDown);cancelPending();");
if(js.includes('document.')||!js.includes('return {navigate,destroy()'))throw Error('Controller extraction failed');
await fs.writeFile(new URL('guide-desk-controller.mjs',output),js);
console.log('Guide runtime prepared from approved preview; six source assets copied without changes.');

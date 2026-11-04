import {chapters} from './guide-data.mjs';
const $=id=>document.getElementById(id);let current=0;
const symbols={bridge:'STAM / CONTROL',download:'01 / CONNECT',link:'LOCAL / READ ONLY',ready:'FLIGHT / READY',contracts:'CONTRACT / RECEIVED',cargo:'CARGO / DESTINATION',route:'ROUTE / ESTIMATED'};
function visual(kind){
 const ship='<path d="M340 90 375 240 445 320 405 342 363 292 340 372 317 292 275 342 235 320 305 240Z" fill="#132b39" stroke="#68d9e4" stroke-width="2"/><path d="M340 130V310M315 245h50M305 275h70" stroke="#e8f9ff" opacity=".6"/>';
 return `<svg viewBox="0 0 680 460" role="presentation"><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#8bdde8" opacity=".1"/></pattern><radialGradient id="halo"><stop stop-color="#2a8398" stop-opacity=".38"/><stop offset="1" stop-color="#09151e" stop-opacity="0"/></radialGradient></defs><rect width="680" height="460" fill="url(#grid)"/><ellipse cx="340" cy="230" rx="290" ry="210" fill="url(#halo)"/><circle cx="340" cy="230" r="160" stroke="#67c6d8" stroke-dasharray="4 10" fill="none" opacity=".3"/>${kind==='cargo'?'<g fill="#31859a44" stroke="#6de0e7"><path d="M160 200 300 130 440 200 300 270Z M160 200V300L300 370V270 M440 200V300L300 370 M300 130V270 M230 165 370 235V335 M230 235V335 M370 165 230 235"/><path d="M460 240 510 215 560 240 510 265Z M460 240V290L510 315 560 290V240 M510 265V315"/></g>':ship}<g fill="#bcecf5" font-family="monospace" font-size="12"><text x="30" y="36">${symbols[kind]}</text><text x="30" y="427">STAM FREIGHT CONTROL</text><text x="490" y="427">BRIEFING / DEMO</text></g><path d="M30 60V90M30 60H60M650 60H620M650 60V90M30 390V360M30 390H60M650 390H620M650 390V360" stroke="#f0b16d" fill="none"/></svg>`;
}
for(const [i,c] of chapters.entries()){const b=document.createElement('button');b.type='button';b.textContent=c.section;b.onclick=()=>navigate(i);$('chapters').append(b);}
function render(){const c=chapters[current];$('section').textContent=c.section;$('slide-title').textContent=c.title;$('lead').textContent=c.lead;$('note').textContent=c.note;$('steps').replaceChildren();
 for(const [title,body] of c.steps){const li=document.createElement('li'),strong=document.createElement('strong'),p=document.createElement('p');strong.textContent=title;p.textContent=body;li.append(strong,p);$('steps').append(li);}
 $('visual').innerHTML=visual(c.visual);[...$('chapters').children].forEach((b,i)=>{b.setAttribute('aria-current',i===current?'step':'false');});$('counter').textContent=`${current+1} / ${chapters.length}`;$('previous').disabled=current===0;$('next').disabled=current===chapters.length-1;
}
function navigate(i){current=Math.max(0,Math.min(chapters.length-1,i));history.replaceState(null,'','#'+chapters[current].id);render();$('slide').focus({preventScroll:true});}
function fromHash(){current=Math.max(0,chapters.findIndex(c=>c.id===location.hash.slice(1)));render();}
$('previous').onclick=()=>navigate(current-1);$('next').onclick=()=>navigate(current+1);
document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||['INPUT','TEXTAREA','VIDEO'].includes(e.target.tagName))return;if(e.key==='ArrowRight'){e.preventDefault();navigate(current+1);}if(e.key==='ArrowLeft'){e.preventDefault();navigate(current-1);}});
window.addEventListener('hashchange',fromHash);fromHash();

$('return-main').onclick=e=>{if(history.length===1){e.preventDefault();window.close();setTimeout(()=>location.assign('index.html'),150);}};

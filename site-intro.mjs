import {isEn} from './i18n.mjs';
export function mountSiteIntro(){
 const root=document.querySelector('.site-intro');if(!root)return;
 const copy=isEn?{headline:'Complex contracts.\nOne clear plan.',lead:'Bring your contracts together. Plan your route and preview the load.',start:'Prepare a haul ↗',play:'▶ Watch the film',map:'Explore the flight deck ↓',features:['Bring your contracts together','Plan around your ship','Preview the load in 3D']}:{headline:'복잡한 미션도\n한 번에.',lead:'받은 미션을 모아 경로를 짜고, 적재 계획까지 함께 세웁니다.',start:'운송 준비 시작 ↗',play:'▶ 소개 영상',map:'운항 지도 보기 ↓',features:['받은 미션을 정리하고','함선에 맞춰 경로를 짜고','적재까지 3D로 확인합니다']};
 for(const key of ['headline','lead','start','play','map'])root.querySelector('[data-intro='+key+']').textContent=copy[key];root.querySelectorAll('[data-intro-feature]').forEach((n,i)=>n.textContent=copy.features[i]);
 const ambient=root.querySelector('.intro-atmosphere'),panel=root.querySelector('.intro-player'),video=panel.querySelector('video'),play=root.querySelector('[data-intro=play]'),close=panel.querySelector('button'),reduce=matchMedia('(prefers-reduced-motion: reduce)');let visible=false;
 video.volume=.55;video.setAttribute('aria-label',isEn?'STAM introduction film':'STAM 소개 영상');close.setAttribute('aria-label',isEn?'Close introduction film':'소개 영상 닫기');

 const refresh=()=>{if(visible&&!document.hidden&&!reduce.matches&&panel.hidden)ambient.play().catch(()=>{});else ambient.pause();if(document.hidden||!visible)video.pause();};
 const end=()=>{video.pause();panel.hidden=true;root.classList.remove('playing');refresh();play.focus({preventScroll:true});};
 play.onclick=()=>{ambient.pause();panel.hidden=false;root.classList.add('playing');video.play().catch(()=>{});close.focus({preventScroll:true});};close.onclick=end;panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();end();}});video.addEventListener('ended',end);
 root.querySelector('[data-intro=start]').onclick=()=>document.querySelector('#flight-open')?.click();root.querySelector('[data-intro=map]').onclick=()=>document.querySelector('.workspace')?.scrollIntoView({behavior:reduce.matches?'instant':'smooth',block:'start'});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;refresh();},{threshold:.12}).observe(root);document.addEventListener('visibilitychange',refresh);reduce.addEventListener('change',refresh);
}

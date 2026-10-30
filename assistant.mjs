// 항해사: a polite step-by-step guide for planning a run. First visit opens it automatically;
// afterwards the full page is the default and the guide is one click away ("항해사 호출").
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('ko-KR').format(Math.round(n));
import {V,VOICE_LIST,VOICE_PORTRAITS,voiceId,setVoice} from './voice.mjs';
const SEEN='sfc-aide-seen';
const EMBLEM=`<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="ag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7ff3ff"/><stop offset="1" stop-color="#2a7fa8"/></linearGradient></defs><circle cx="32" cy="32" r="29" fill="none" stroke="url(#ag)" stroke-width="2"/><circle cx="32" cy="32" r="21" fill="none" stroke="#2a5a70" stroke-width="1"/><path d="M32 9 L37 30 L55 32 L37 34 L32 55 L27 34 L9 32 L27 30 Z" fill="url(#ag)" opacity=".9"/><circle cx="32" cy="32" r="3.5" fill="#06121b"/></svg>`;

export function createAssistant(app){
 const root=document.createElement('div');root.className='aide-overlay';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','항해사 운항 안내');document.body.append(root);
 let step='welcome',typing=null,poll=null;
 const stepsOrder=['choose','welcome','ship','start','shots','confirm','boxes','brief'];
 function frame(title,sub,body,buttons,{compact=false}={}){const idx=Math.max(0,stepsOrder.indexOf(step));
  root.classList.toggle('compact',compact);root.classList.toggle('partner-picker',step==='choose');root.classList.toggle('partner-intro',step==='welcome');
  root.innerHTML=`<div class="aide-card"><button class="aide-close" type="button" aria-label="닫기">×</button>
   <div class="aide-top"><div class="aide-emblem">${EMBLEM}</div><div><div class="aide-role">STAM FREIGHT CONTROL · ${V().role}</div><div class="aide-steps">${stepsOrder.slice(1).map((s,i)=>`<i class="${i+1<idx?'done':i+1===idx?'now':''}"></i>`).join('')}</div></div></div>
   ${step==='welcome'?`<div class="aide-intro-portrait"><img src="${VOICE_PORTRAITS[voiceId()]}" alt="${V().role} 인물 사진"><span>${V().role}</span></div>`:''}<h2 class="aide-title"></h2>${sub?`<p class="aide-sub">${sub}</p>`:''}<div class="aide-body">${body||''}</div><div class="aide-actions">${buttons}</div></div>`;
  root.querySelector('.aide-close').onclick=close;type(root.querySelector('.aide-title'),title);}
 function type(el,text){clearInterval(typing);if(matchMedia('(prefers-reduced-motion: reduce)').matches){el.textContent=text;return;}let i=0;el.textContent='';typing=setInterval(()=>{el.textContent=text.slice(0,++i);if(i>=text.length)clearInterval(typing);},22);}
 const on=(sel,fn)=>{const el=root.querySelector(sel);if(el)el.onclick=fn;};
 function go(s){step=s;clearInterval(poll);({choose,welcome,ship,start,shots,confirm,boxes,brief})[s]();}

 function choose(){
  frame('오늘 함께할 파트너를 선택하세요.','선택한 파트너가 미션 접수부터 마지막 배송까지 안내합니다.',
   `<div class="aide-voices aide-choose" role="group" aria-label="운항 파트너 선택">${VOICE_LIST.map(([id,name,desc])=>`<button type="button" data-voice="${id}" aria-label="${name} 선택"><img class="partner-photo" src="${VOICE_PORTRAITS[id]}" alt="${name} 인물 사진"><span class="partner-copy"><b>${name}</b><small>${desc}</small><span class="aide-choose-link">함께 시작 →</span></span></button>`).join('')}</div>`,
   '<button class="quiet" id="a-skip">전체 화면으로 바로 가기</button>');
  root.querySelector('.aide-role').textContent='STAM FREIGHT CONTROL · 운항 파트너';
  root.querySelector('.aide-steps').hidden=true;
  root.querySelectorAll('[data-voice]').forEach(b=>b.onclick=()=>{setVoice(b.dataset.voice);app.voiceChanged?.();go('welcome');});on('#a-skip',close);
 }

 function welcome(){const n=app.missions().length;
  frame(V().welcome,`${V().welcomeSub}${n?`<br><span class="aide-note">${V().left(n)}</span>`:''}`,'',
   `${n?'<button class="primary" id="a-resume">이어서 브리핑 받기</button><button id="a-fresh">새로 시작하기</button>':'<button class="primary" id="a-go">운항 계획 시작</button>'}<button class="quiet" id="a-partner">파트너 다시 선택</button><button class="quiet" id="a-skip">전체 화면으로 바로 가기</button>`);
  on('#a-partner',()=>go('choose'));on('#a-go',()=>go('ship'));on('#a-resume',()=>go('confirm'));on('#a-fresh',()=>{app.clearMissions();go('ship');});on('#a-skip',close);}
 function ship(){const s=app.ship(),d=app.driveSetup();
  frame(V().ship(s.name),V().shipSub(fmt(s.capacity)),`<label class="aide-field">운용 함선<select id="a-ship">${app.shipOptions()}</select></label><div class="aide-drive-presets" role="group" aria-label="드라이브 초기 설정">${[['factory','기본 장착',d.factory||'미확인'],['auto','민수 A등급',d.auto],['custom','사용자 설정','평균 속도 직접 지정']].map(([v,t,desc])=>`<button type="button" data-drive-mode="${v}" aria-pressed="${d.mode===v}" ${v==='factory'&&!d.factory?'disabled':''}><b>${t}</b><small>${esc(desc)}</small></button>`).join('')}</div>${d.mode==='custom'?`<label class="aide-field">평균 퀀텀 속도 (km/s)<input id="a-drive-speed" type="number" min="1000" max="2000000" value="${d.quantumSpeed}" required></label>`:''}`,
   `<button class="primary" id="a-next">${V().shipOk}</button><button class="quiet" id="a-back">이전</button>`);
  root.querySelector('#a-ship').value=s.id;root.querySelector('#a-ship').onchange=e=>{app.setShip(e.target.value);ship();};
  root.querySelectorAll('[data-drive-mode]').forEach(b=>b.onclick=()=>{app.setDriveSetup(b.dataset.driveMode);ship();});const speed=root.querySelector('#a-drive-speed');if(speed)speed.onchange=()=>{if(speed.reportValidity())app.setDriveSetup('custom',Number(speed.value));};
  on('#a-next',()=>go('start'));on('#a-back',()=>go('welcome'));}
 function start(){const cur=app.start();
  frame(V().start,V().startSub,`<label class="aide-field">현재 위치<input id="a-loc" list="a-locs" placeholder="예: 뉴배비지, 에버러스, Everus, 파이로 6" value="${esc(cur?app.locationLabel(cur):'')}" autocomplete="off"><datalist id="a-locs">${app.locationList()}</datalist></label><p class="aide-note" id="a-loc-hint"></p>`,
   `<button class="primary" id="a-next">${V().startOk}</button><button class="quiet" id="a-back">이전</button>`);
  const input=root.querySelector('#a-loc'),hint=root.querySelector('#a-loc-hint');input.oninput=()=>{const hit=app.findLocation(input.value);hint.textContent=hit?`→ ${app.locationLabel(hit)}`:'';};input.oninput();setTimeout(()=>input.focus(),50);
  on('#a-next',()=>{const hit=app.findLocation(input.value);if(!hit){hint.textContent=V().notFound;return;}app.setStart(hit);go('shots');});on('#a-back',()=>go('ship'));}
 function shots(){
  frame(V().shots,V().shotsSub,`<label class="aide-drop" id="a-drop"><input type="file" id="a-files" accept="image/png,image/jpeg,image/webp" multiple><b>＋ 계약 스샷 올리기</b><span>스샷은 이 브라우저 안에서만 읽습니다</span></label><p class="aide-note" id="a-progress"></p>`,
   `<button class="primary" id="a-next" ${app.missions().length?'':'disabled'}>읽은 계약 확인하기</button><button id="a-manual">직접 입력하겠습니다</button><button class="quiet" id="a-demo">예시로 둘러보기</button><button class="quiet" id="a-back">이전</button>`);
  const drop=root.querySelector('#a-drop'),progress=root.querySelector('#a-progress');
  const read=async files=>{if(!files.length)return;progress.textContent=V().reading;poll=setInterval(()=>{progress.textContent=V().reading;},300);try{await app.readShots(files);}finally{clearInterval(poll);}progress.textContent=V().readDone(app.missions().length);go('confirm');};
  root.querySelector('#a-files').onchange=e=>read([...e.target.files]);drop.ondragover=e=>{e.preventDefault();drop.classList.add('drag');};drop.ondragleave=()=>drop.classList.remove('drag');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('drag');read([...e.dataTransfer.files]);};
  root.onpaste=e=>{const imgs=[...e.clipboardData.items].filter(i=>i.type.startsWith('image/')).map(i=>i.getAsFile()).filter(Boolean);if(imgs.length){e.preventDefault();read(imgs);}};
  on('#a-next',()=>go('confirm'));on('#a-manual',async()=>{await app.editMission(-1);if(app.missions().length)go('confirm');});on('#a-demo',()=>{app.demo();go('confirm');});on('#a-back',()=>go('start'));}
 function confirm(){const ms=app.missions();if(!ms.length){go('shots');return;}
  const cards=ms.map((m,i)=>{const total=m.cargo.reduce((a,c)=>a+(c.scu||0),0),issues=app.issues(m);return `<li class="aide-mission"><div><b>${esc(m.company||m.title||'계약')}</b> <span class="aide-id">${esc(m.id)}</span><br><span>${m.cargo.map(c=>`${esc(app.placeName(c.pickupId,c._pickupText))} → ${esc(app.placeName(c.dropoffId,c._dropoffText))}`).join('<br>')}</span></div><div class="aide-mission-side"><b>${fmt(total)} SCU</b>${m.reward?`<small>${fmt(m.reward)} aUEC</small>`:''}${issues.map(t=>`<em>${esc(t)}</em>`).join('')}<button type="button" data-edit="${i}">수정</button></div></li>`;}).join('');
  frame(V().confirm(ms.length),V().confirmSub,`<ul class="aide-missions">${cards}</ul>`,
   `<button class="primary" id="a-next">${V().confirmOk}</button><button id="a-more">스샷 더 올리기</button><button class="quiet" id="a-back">이전</button>`);
  root.querySelectorAll('[data-edit]').forEach(b=>b.onclick=async()=>{await app.editMission(Number(b.dataset.edit));go('confirm');});
  on('#a-next',()=>{const bad=ms.find(m=>app.issues(m).some(t=>t.includes('위치')));if(bad){root.querySelector('.aide-sub').textContent=V().locationIssue(bad.id);return;}go(app.missingBoxes().length?'boxes':'brief');});on('#a-more',()=>go('shots'));on('#a-back',()=>go('shots'));}
 function boxes(){const groups=app.missingBoxes();
  frame(V().boxes,V().boxesSub,
   `<ul class="aide-boxes">${groups.map((g,i)=>`<li><div><b>${esc(g.missionId)}</b> · ${esc(app.placeName(g.dropoffId))} · ${g.scu} SCU</div><input data-g="${i}" placeholder="예: 16x4, 2x10" autocomplete="off"><small data-h="${i}"></small></li>`).join('')}</ul>`,
   `<button class="primary" id="a-next">${V().boxesOk}</button><button class="quiet" id="a-back">이전</button>`);
  root.querySelectorAll('[data-g]').forEach(inp=>inp.oninput=()=>{const g=groups[inp.dataset.g],parsed=app.parseBoxes(inp.value),h=root.querySelector(`[data-h="${inp.dataset.g}"]`);if(!inp.value.trim()){h.textContent='';return;}if(!parsed){h.textContent='형식 확인 필요';return;}const sum=parsed.reduce((a,b)=>a+b.size*b.count,0);h.textContent=sum===g.scu?'✓ 합계 일치':`합계 ${sum} SCU · ${g.scu} SCU와 다릅니다`;});
  on('#a-next',()=>{root.querySelectorAll('[data-g]').forEach(inp=>{const g=groups[inp.dataset.g],parsed=app.parseBoxes(inp.value);if(parsed&&parsed.reduce((a,b)=>a+b.size*b.count,0)===g.scu)app.setBoxes(g,parsed);});go('brief');});on('#a-back',()=>go('confirm'));}
 function brief(){const p=app.plan();
  if(!p){frame(V().fail,V().failSub,`<p class="aide-note">${esc(app.notice())}</p>`,'<button class="primary" id="a-back">계약 다시 보기</button>');on('#a-back',()=>go('confirm'));return;}
  const low=Math.max(1,Math.round(p.seconds/60*.8)),high=Math.ceil(p.seconds/60*1.3),reward=p.totalReward||0,rate=reward?`${fmt(reward/(p.seconds*1.3/3600))}–${fmt(reward/(p.seconds*.8/3600))}`:'',blocked=p.visits.filter(v=>v.blocked?.length).length;
  const legs=p.visits.slice(0,6).map((v,i)=>`<li><span class="aide-n">${i+1}</span>${esc(app.placeName(v.locationId))}<small>${v.events.map(e=>e.type==='pickup'?'픽업':e.type==='delivery'?'배송':'복귀').filter((x,k,a)=>a.indexOf(x)===k).join('·')} · 약 ${Math.max(1,Math.round(v.seconds/60))}분</small></li>`).join('')+(p.visits.length>6?`<li class="aide-more">외 ${p.visits.length-6}곳</li>`:'');
  frame(V().brief,V().briefSub(p.visits.length,`${low}–${high}`,reward?fmt(reward):'',rate,blocked),`<ol class="aide-legs">${legs}</ol>`,
   `<button class="primary" id="a-launch">${V().launch}</button><button id="a-full">전체 계획 보기</button><button class="quiet" id="a-back">이전</button>`,{compact:true});
  app.showWholeRoute();on('#a-launch',()=>{close();app.startRun();});on('#a-full',close);on('#a-back',()=>go('confirm'));}
 function close(){clearInterval(typing);clearInterval(poll);root.hidden=true;document.body.classList.remove('aide-open');try{localStorage.setItem(SEEN,'1');}catch{}}
 function open(s='choose'){root.hidden=false;document.body.classList.add('aide-open');go(s);}
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();}});
 return {open,close,firstVisit:()=>{try{return !localStorage.getItem(SEEN);}catch{return true;}}};
}

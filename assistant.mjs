// 항해사: a polite step-by-step guide for planning a run. First visit opens it automatically;
// afterwards the full page is the default and the guide is one click away (floating "파트너 호출" button).
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('ko-KR').format(Math.round(n));
import {V,VOICE_LIST,VOICE_PORTRAITS,voiceId,setVoice} from './voice.mjs';
const SIZES=[1,2,4,8,16,24,32];
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
  const pr=V().profile,profile=pr?`<div class="aide-profile"><div class="aide-profile-head"><span>운항 파트너 프로필</span><b>${esc(V().role)}</b><small>${esc(pr.callsign)}</small></div><p class="aide-profile-intro">${esc(pr.intro)}</p><ul class="aide-profile-career">${pr.career.map(c=>`<li>${esc(c)}</li>`).join('')}</ul><div class="aide-profile-meta"><span><small>특기</small>${esc(pr.specialty)}</span><span><small>좌우명</small>${esc(pr.motto)}</span></div></div>`:'';
  frame(V().welcome,`${V().welcomeSub}${n?`<br><span class="aide-note">${V().left(n)}</span>`:''}`,profile,
   `${n?'<button class="primary" id="a-resume">이어서 브리핑 받기</button><button id="a-fresh">새로 시작하기</button>':'<button class="primary" id="a-go">운항 계획 시작</button>'}<button class="quiet" id="a-guide">📖 사용법 보기</button><button class="quiet" id="a-partner">파트너 다시 선택</button><button class="quiet" id="a-skip">전체 화면으로 바로 가기</button>`);
  on('#a-guide',()=>app.showGuide?.());on('#a-partner',()=>go('choose'));on('#a-go',()=>go('ship'));on('#a-resume',()=>go('confirm'));on('#a-fresh',()=>{app.clearMissions();go('ship');});on('#a-skip',close);}
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
  frame(V().shots,V().shotsSub,`<label class="aide-drop" id="a-drop"><input type="file" id="a-files" accept="image/png,image/jpeg,image/webp" multiple><b>＋ 계약 스샷 올리기</b><span>스샷은 이 브라우저 안에서만 읽습니다</span></label><p class="aide-note" id="a-progress"></p><details class="aide-ai-paste" open><summary><b>스샷 인식이 잘 안 되면 · AI 앱으로 읽기</b><span>ChatGPT · Claude 구독만으로 사용 · 추가 요금 없음</span></summary><ol class="aide-howto"><li><b>요청 문장 복사</b>를 누릅니다.</li><li>ChatGPT나 Claude 앱에 계약 스샷을 올리고, 복사한 문장을 붙여 넣어 보냅니다. 여러 장을 한 번에 올려도 됩니다. <b>Ctrl+Alt+PrtSc</b>로 게임 화면을 캡처한 뒤 AI 앱 입력창에 <b>Ctrl+V</b>로 바로 붙여 넣으면 파일 저장 없이 편하게 보낼 수 있습니다.</li><li>AI가 옮겨 적은 글을 전부 복사해 아래 칸에 붙여 넣고 <b>글자로 계약 만들기</b>를 누릅니다.</li></ol><div class="aide-paste-row"><button type="button" id="a-copy-prompt">요청 문장 복사</button><span class="aide-note">게임 화면이 넓고 글씨가 작아 기본 인식이 실패할 때 훨씬 정확합니다.</span></div><textarea id="a-text" rows="5" spellcheck="false" placeholder="AI가 옮겨 적은 글을 여기에 붙여 넣으세요. 미션이 여러 개면 사이에 --- 가 들어갑니다."></textarea><button type="button" class="primary" id="a-text-go">글자로 계약 만들기</button><p class="aide-note" id="a-text-msg" role="status"></p></details>`,
   `<button class="primary" id="a-next" ${app.missions().length?'':'disabled'}>읽은 계약 확인하기</button><button id="a-manual">직접 입력하겠습니다</button><button class="quiet" id="a-demo">예시로 둘러보기</button><button class="quiet" id="a-back">이전</button>`);
  const drop=root.querySelector('#a-drop'),progress=root.querySelector('#a-progress');
  const read=async files=>{if(!files.length)return;progress.textContent=V().reading;poll=setInterval(()=>{progress.textContent=V().reading;},300);try{await app.readShots(files);}finally{clearInterval(poll);}progress.textContent=V().readDone(app.missions().length);go('confirm');};
  root.querySelector('#a-files').onchange=e=>read([...e.target.files]);drop.ondragover=e=>{e.preventDefault();drop.classList.add('drag');};drop.ondragleave=()=>drop.classList.remove('drag');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('drag');read([...e.dataTransfer.files]);};
  root.onpaste=e=>{const imgs=[...e.clipboardData.items].filter(i=>i.type.startsWith('image/')).map(i=>i.getAsFile()).filter(Boolean);if(imgs.length){e.preventDefault();read(imgs);}};
  const textMsg=root.querySelector('#a-text-msg'),textBox=root.querySelector('#a-text');
  on('#a-copy-prompt',()=>navigator.clipboard.writeText(app.aiPrompt()).then(()=>{textMsg.textContent='요청 문장을 복사했습니다. AI 앱에 스샷과 함께 붙여 넣어 주세요.';}).catch(()=>{textBox.value=app.aiPrompt();textBox.select();textMsg.textContent='자동 복사가 막혀 칸에 문장을 넣었습니다. Ctrl+C로 복사한 뒤 칸을 비워 주세요.';}));
  on('#a-text-go',()=>{if(!textBox.value.trim()){textMsg.textContent='AI가 옮겨 적은 글을 먼저 붙여 넣어 주세요.';return;}const r=app.importText(textBox.value);if(!r.added){textMsg.textContent='배송 문장(…SCU …에 배송하십시오)을 찾지 못했습니다. 주 목표 문장이 들어 있는지 확인해 주세요.';return;}go('confirm');});
  on('#a-next',()=>go('confirm'));on('#a-manual',async()=>{await app.editMission(-1);if(app.missions().length)go('confirm');});on('#a-demo',()=>{app.demo();go('confirm');});on('#a-back',()=>go('start'));}
 function confirm(){const ms=app.missions();if(!ms.length){go('shots');return;}
  const cards=ms.map((m,i)=>{const total=m.cargo.reduce((a,c)=>a+(c.scu||0),0),issues=app.issues(m);return `<li class="aide-mission"><div><b>${esc(m.company||m.title||'계약')}</b><br><span>${m.cargo.map(c=>`${esc(app.placeName(c.pickupId,c._pickupText))} → ${esc(app.placeName(c.dropoffId,c._dropoffText))}${c._scuAssumed?` <em class="scu-assumed">${c.scu} SCU · 수량 가정</em>`:''}`).join('<br>')}</span></div><div class="aide-mission-side"><b>${fmt(total)} SCU</b>${m.reward?`<small>${fmt(m.reward)} aUEC</small>`:''}${issues.map(t=>`<em>${esc(t)}</em>`).join('')}<button type="button" data-edit="${i}">수정</button></div></li>`;}).join('');
  frame(V().confirm(ms.length),V().confirmSub,`<ul class="aide-missions">${cards}</ul>`,
   `<button class="primary" id="a-next">${V().confirmOk}</button><button id="a-more">스샷 더 올리기</button><button class="quiet" id="a-back">이전</button>`);
  root.querySelectorAll('[data-edit]').forEach(b=>b.onclick=async()=>{await app.editMission(Number(b.dataset.edit));go('confirm');});
  on('#a-next',()=>{const bad=ms.find(m=>app.issues(m).some(t=>t.includes('위치')));if(bad){root.querySelector('.aide-sub').textContent=V().locationIssue(bad.id);return;}go(app.missingBoxes().length?'boxes':'brief');});on('#a-more',()=>go('shots'));on('#a-back',()=>go('shots'));}
 function boxes(){const groups=app.missingBoxes();
  frame(V().boxes,V().boxesSub,
   `<p class="aide-note aide-skip-note">경로만 보실 거면 상자를 입력하지 않고 그냥 넘어가셔도 됩니다. 방문 순서·시간은 SCU로 계산되고, 적재 배치만 가정한 상자로 대략 표시됩니다.</p><ul class="aide-boxes">${groups.map((g,i)=>`<li><div class="aide-box-head"><b>${g.items.map(c=>`${esc(c.commodity)} ${c.scu}`).join(' · ')}</b><span>→ ${esc(app.placeName(g.dropoffId))}</span><em>${g.scu} SCU</em></div><div class="aide-box-counts">${SIZES.map(size=>`<label><span>${size} SCU</span><input data-g="${i}" data-size="${size}" type="number" min="0" max="10000" inputmode="numeric" aria-label="${size} SCU 상자 개수"></label>`).join('')}</div><small data-h="${i}"></small></li>`).join('')}</ul>`,
   `<button class="primary" id="a-next">${V().boxesOk}</button><button class="quiet" id="a-back">이전</button>`);
  const counts=i=>[...root.querySelectorAll(`[data-g="${i}"]`)].map(inp=>({size:Number(inp.dataset.size),count:Number(inp.value)||0})).filter(b=>b.count>0);
  root.querySelectorAll('[data-g]').forEach(inp=>inp.oninput=()=>{const i=inp.dataset.g,g=groups[i],boxes=counts(i),h=root.querySelector(`[data-h="${i}"]`),sum=boxes.reduce((a,b)=>a+b.size*b.count,0);h.classList.toggle('bad',sum>0&&sum!==g.scu);if(sum===g.scu)groups.forEach((o,j)=>{if(String(j)===i||o.mix!==g.mix)return;const inputs=[...root.querySelectorAll(`[data-g="${j}"]`)];if(inputs.some(x=>x.value))return;for(const x of inputs){const b=boxes.find(b=>b.size===Number(x.dataset.size));x.value=b?b.count:'';}const oh=root.querySelector(`[data-h="${j}"]`);oh.classList.remove('bad');oh.textContent='✓ 같은 품목 조합이라 위와 같은 구성으로 채웠습니다';});
   h.textContent=!sum?'':sum===g.scu?`✓ ${boxes.reduce((a,b)=>a+b.count,0)}상자 · 합계 일치 · 다음부터 같은 품목 조합은 자동으로 채웁니다`:`합계 ${sum} SCU · ${g.scu} SCU와 다릅니다`;});
  on('#a-next',()=>{groups.forEach((g,i)=>{const boxes=counts(i);if(boxes.length&&boxes.reduce((a,b)=>a+b.size*b.count,0)===g.scu)app.setBoxes(g,boxes);});go('brief');});on('#a-back',()=>go('confirm'));}
 function brief(){const p=app.plan();
  if(!p){frame(V().fail,V().failSub,`<p class="aide-note">${esc(app.notice())}</p>`,'<button class="primary" id="a-back">계약 다시 보기</button>');on('#a-back',()=>go('confirm'));return;}
  const low=Math.max(1,Math.round(p.seconds/60*.8)),high=Math.ceil(p.seconds/60*1.3),reward=p.totalReward||0,rate=reward?`${fmt(reward/(p.seconds*1.3/3600))}–${fmt(reward/(p.seconds*.8/3600))}`:'',blocked=p.visits.filter(v=>v.blocked?.length).length;
  const legs=p.visits.slice(0,6).map((v,i)=>`<li><span class="aide-n">${i+1}</span>${esc(app.placeName(v.locationId))}<small>${v.events.map(e=>e.type==='pickup'?'픽업':e.type==='delivery'?'배송':'복귀').filter((x,k,a)=>a.indexOf(x)===k).join('·')} · 약 ${Math.max(1,Math.round(v.seconds/60))}분</small></li>`).join('')+(p.visits.length>6?`<li class="aide-more">외 ${p.visits.length-6}곳</li>`:'');
  frame(V().brief,V().briefSub(p.visits.length,`${low}–${high}`,reward?fmt(reward):'',rate,blocked),`<ol class="aide-legs">${legs}</ol>`,
   `<button class="primary" id="a-launch">${V().launch}</button><button id="a-full">전체 계획 보기</button><button class="quiet" id="a-back">이전</button>`,{compact:true});
  app.showWholeRoute();on('#a-launch',()=>{close();app.startRun();});on('#a-full',close);on('#a-back',()=>go('confirm'));}
 function close(){clearInterval(typing);clearInterval(poll);root.hidden=true;document.body.classList.remove('aide-open');try{localStorage.setItem(SEEN,'1');}catch{}app.closed?.();}
 function open(s='choose'){root.hidden=false;document.body.classList.add('aide-open');go(s);}
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();}});
 return {open,close,firstVisit:()=>{try{return !localStorage.getItem(SEEN);}catch{return true;}}};
}

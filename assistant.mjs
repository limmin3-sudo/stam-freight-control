// 항해사: a polite step-by-step guide for planning a run. First visit opens it automatically;
// afterwards the full page is the default and the guide is one click away ("항해사 호출").
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('ko-KR').format(Math.round(n));
const SEEN='sfc-aide-seen';
const EMBLEM=`<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="ag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7ff3ff"/><stop offset="1" stop-color="#2a7fa8"/></linearGradient></defs><circle cx="32" cy="32" r="29" fill="none" stroke="url(#ag)" stroke-width="2"/><circle cx="32" cy="32" r="21" fill="none" stroke="#2a5a70" stroke-width="1"/><path d="M32 9 L37 30 L55 32 L37 34 L32 55 L27 34 L9 32 L27 30 Z" fill="url(#ag)" opacity=".9"/><circle cx="32" cy="32" r="3.5" fill="#06121b"/></svg>`;

export function createAssistant(app){
 const root=document.createElement('div');root.className='aide-overlay';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','항해사 운항 안내');document.body.append(root);
 let step='welcome',typing=null,poll=null;
 const stepsOrder=['welcome','ship','start','shots','confirm','boxes','brief'];
 function frame(title,sub,body,buttons,{compact=false}={}){const idx=Math.max(0,stepsOrder.indexOf(step));
  root.classList.toggle('compact',compact);
  root.innerHTML=`<div class="aide-card"><button class="aide-close" type="button" aria-label="닫기">×</button>
   <div class="aide-top"><div class="aide-emblem">${EMBLEM}</div><div><div class="aide-role">STAM FREIGHT CONTROL · 항해사</div><div class="aide-steps">${stepsOrder.slice(1).map((s,i)=>`<i class="${i+1<idx?'done':i+1===idx?'now':''}"></i>`).join('')}</div></div></div>
   <h2 class="aide-title"></h2>${sub?`<p class="aide-sub">${sub}</p>`:''}<div class="aide-body">${body||''}</div><div class="aide-actions">${buttons}</div></div>`;
  root.querySelector('.aide-close').onclick=close;type(root.querySelector('.aide-title'),title);}
 function type(el,text){clearInterval(typing);if(matchMedia('(prefers-reduced-motion: reduce)').matches){el.textContent=text;return;}let i=0;el.textContent='';typing=setInterval(()=>{el.textContent=text.slice(0,++i);if(i>=text.length)clearInterval(typing);},22);}
 const on=(sel,fn)=>{const el=root.querySelector(sel);if(el)el.onclick=fn;};
 function go(s){step=s;clearInterval(poll);({welcome,ship,start,shots,confirm,boxes,brief})[s]();}

 function welcome(){const n=app.missions().length;
  frame('환영합니다, 함장님.',`STAM 화물 관제 항해사입니다. 오늘 운항 계획을 함께 세워 보시겠습니까?${n?`<br><span class="aide-note">지난번에 받으신 계약 ${n}건이 남아 있습니다.</span>`:''}`,'',
   `${n?'<button class="primary" id="a-resume">이어서 브리핑 받기</button><button id="a-fresh">새로 시작하기</button>':'<button class="primary" id="a-go">운항 계획 시작</button>'}<button class="quiet" id="a-skip">전체 화면으로 바로 가기</button>`);
  on('#a-go',()=>go('ship'));on('#a-resume',()=>go('confirm'));on('#a-fresh',()=>{app.clearMissions();go('ship');});on('#a-skip',close);}
 function ship(){const s=app.ship();
  frame(`오늘은 ${s.name}로 준비했습니다.`,`화물칸 ${fmt(s.capacity)} SCU 기준으로 적재를 계산하겠습니다. 다른 함선으로 나가십니까?`,`<label class="aide-field">운용 함선<select id="a-ship">${app.shipOptions()}</select></label>`,
   '<button class="primary" id="a-next">이 함선으로 하겠습니다</button><button class="quiet" id="a-back">이전</button>');
  root.querySelector('#a-ship').value=s.id;root.querySelector('#a-ship').onchange=e=>{app.setShip(e.target.value);const n=app.ship();root.querySelector('.aide-sub').textContent=`화물칸 ${fmt(n.capacity)} SCU 기준으로 적재를 계산하겠습니다.`;};
  on('#a-next',()=>go('start'));on('#a-back',()=>go('welcome'));}
 function start(){const cur=app.start();
  frame('지금 어디에 계십니까?','그곳에서 출발하는 경로로 짜 드리겠습니다. 이름 일부만 입력하셔도 찾아 드립니다.',`<label class="aide-field">현재 위치<input id="a-loc" list="a-locs" placeholder="예: 뉴배비지, 에버러스, Everus, 파이로 6" value="${esc(cur?app.locationLabel(cur):'')}" autocomplete="off"><datalist id="a-locs">${app.locationList()}</datalist></label><p class="aide-note" id="a-loc-hint"></p>`,
   '<button class="primary" id="a-next">여기서 출발하겠습니다</button><button class="quiet" id="a-back">이전</button>');
  const input=root.querySelector('#a-loc'),hint=root.querySelector('#a-loc-hint');input.oninput=()=>{const hit=app.findLocation(input.value);hint.textContent=hit?`→ ${app.locationLabel(hit)}`:'';};input.oninput();setTimeout(()=>input.focus(),50);
  on('#a-next',()=>{const hit=app.findLocation(input.value);if(!hit){hint.textContent='위치를 찾지 못했습니다. 목록에서 골라 주십시오.';return;}app.setStart(hit);go('shots');});on('#a-back',()=>go('ship'));}
 function shots(){
  frame('수주하신 계약 화면을 올려 주십시오.','여러 장을 한 번에 주셔도 됩니다. 끌어다 놓거나 Ctrl+V로 붙여 넣으셔도 됩니다.',`<label class="aide-drop" id="a-drop"><input type="file" id="a-files" accept="image/png,image/jpeg,image/webp" multiple><b>＋ 계약 스샷 올리기</b><span>스샷은 이 브라우저 안에서만 읽습니다</span></label><p class="aide-note" id="a-progress"></p>`,
   `<button class="primary" id="a-next" ${app.missions().length?'':'disabled'}>읽은 계약 확인하기</button><button id="a-manual">직접 입력하겠습니다</button><button class="quiet" id="a-demo">예시로 둘러보기</button><button class="quiet" id="a-back">이전</button>`);
  const drop=root.querySelector('#a-drop'),progress=root.querySelector('#a-progress');
  const read=async files=>{if(!files.length)return;progress.textContent='계약서를 읽고 있습니다…';poll=setInterval(()=>{progress.textContent=app.notice()||'계약서를 읽고 있습니다…';},300);try{await app.readShots(files);}finally{clearInterval(poll);}progress.textContent=`계약 ${app.missions().length}건을 확인했습니다.`;go('confirm');};
  root.querySelector('#a-files').onchange=e=>read([...e.target.files]);drop.ondragover=e=>{e.preventDefault();drop.classList.add('drag');};drop.ondragleave=()=>drop.classList.remove('drag');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('drag');read([...e.dataTransfer.files]);};
  root.onpaste=e=>{const imgs=[...e.clipboardData.items].filter(i=>i.type.startsWith('image/')).map(i=>i.getAsFile()).filter(Boolean);if(imgs.length){e.preventDefault();read(imgs);}};
  on('#a-next',()=>go('confirm'));on('#a-manual',async()=>{await app.editMission(-1);if(app.missions().length)go('confirm');});on('#a-demo',()=>{app.demo();go('confirm');});on('#a-back',()=>go('start'));}
 function confirm(){const ms=app.missions();if(!ms.length){go('shots');return;}
  const cards=ms.map((m,i)=>{const total=m.cargo.reduce((a,c)=>a+(c.scu||0),0),issues=app.issues(m);return `<li class="aide-mission"><div><b>${esc(m.company||m.title||'계약')}</b> <span class="aide-id">${esc(m.id)}</span><br><span>${m.cargo.map(c=>`${esc(app.placeName(c.pickupId,c._pickupText))} → ${esc(app.placeName(c.dropoffId,c._dropoffText))}`).join('<br>')}</span></div><div class="aide-mission-side"><b>${fmt(total)} SCU</b>${m.reward?`<small>${fmt(m.reward)} aUEC</small>`:''}${issues.map(t=>`<em>${esc(t)}</em>`).join('')}<button type="button" data-edit="${i}">수정</button></div></li>`;}).join('');
  frame(`계약 ${ms.length}건을 확인했습니다. 맞습니까?`,'잘못 읽힌 곳이 있으면 수정해 주십시오. 같은 화물이어도 계약마다 따로 싣겠습니다.',`<ul class="aide-missions">${cards}</ul>`,
   '<button class="primary" id="a-next">네, 맞습니다</button><button id="a-more">스샷 더 올리기</button><button class="quiet" id="a-back">이전</button>');
  root.querySelectorAll('[data-edit]').forEach(b=>b.onclick=async()=>{await app.editMission(Number(b.dataset.edit));go('confirm');});
  on('#a-next',()=>{const bad=ms.find(m=>app.issues(m).some(t=>t.includes('위치')));if(bad){root.querySelector('.aide-sub').textContent=`${bad.id}의 위치를 확인하지 못했습니다. 수정에서 골라 주십시오.`;return;}go(app.missingBoxes().length?'boxes':'brief');});on('#a-more',()=>go('shots'));on('#a-back',()=>go('shots'));}
 function boxes(){const groups=app.missingBoxes();
  frame('상자 구성을 모르는 화물이 있습니다.','아시면 크기x개수로 적어 주십시오 (예: 16x4, 2x10). 한 번 적어 주시면 같은 종류의 계약에는 다음부터 알아서 채우겠습니다. 모르시면 그냥 진행하셔도 됩니다.',
   `<ul class="aide-boxes">${groups.map((g,i)=>`<li><div><b>${esc(g.missionId)}</b> · ${esc(app.placeName(g.dropoffId))} · ${g.scu} SCU</div><input data-g="${i}" placeholder="예: 16x4, 2x10" autocomplete="off"><small data-h="${i}"></small></li>`).join('')}</ul>`,
   '<button class="primary" id="a-next">이대로 계산해 주십시오</button><button class="quiet" id="a-back">이전</button>');
  root.querySelectorAll('[data-g]').forEach(inp=>inp.oninput=()=>{const g=groups[inp.dataset.g],parsed=app.parseBoxes(inp.value),h=root.querySelector(`[data-h="${inp.dataset.g}"]`);if(!inp.value.trim()){h.textContent='';return;}if(!parsed){h.textContent='형식을 확인해 주십시오';return;}const sum=parsed.reduce((a,b)=>a+b.size*b.count,0);h.textContent=sum===g.scu?'✓ 합계 일치':`합계 ${sum} SCU · ${g.scu} SCU와 다릅니다`;});
  on('#a-next',()=>{root.querySelectorAll('[data-g]').forEach(inp=>{const g=groups[inp.dataset.g],parsed=app.parseBoxes(inp.value);if(parsed&&parsed.reduce((a,b)=>a+b.size*b.count,0)===g.scu)app.setBoxes(g,parsed);});go('brief');});on('#a-back',()=>go('confirm'));}
 function brief(){const p=app.plan();
  if(!p){frame('경로를 짜지 못했습니다.',esc(app.notice()||'계약 내용을 다시 확인해 주십시오.'),'','<button class="primary" id="a-back">계약 다시 보기</button>');on('#a-back',()=>go('confirm'));return;}
  const low=Math.max(1,Math.round(p.seconds/60*.8)),high=Math.ceil(p.seconds/60*1.3),reward=p.totalReward||0,rate=reward?`${fmt(reward/(p.seconds*1.3/3600))}–${fmt(reward/(p.seconds*.8/3600))}`:'',blocked=p.visits.filter(v=>v.blocked?.length).length;
  const legs=p.visits.slice(0,6).map((v,i)=>`<li><span class="aide-n">${i+1}</span>${esc(app.placeName(v.locationId))}<small>${v.events.map(e=>e.type==='pickup'?'픽업':e.type==='delivery'?'배송':'복귀').filter((x,k,a)=>a.indexOf(x)===k).join('·')} · 약 ${Math.max(1,Math.round(v.seconds/60))}분</small></li>`).join('')+(p.visits.length>6?`<li class="aide-more">외 ${p.visits.length-6}곳</li>`:'');
  frame('준비됐습니다, 함장님.',`들르실 곳 ${p.visits.length}곳, 약 ${low}–${high}분 걸립니다.${reward?` 예상 수익은 ${fmt(reward)} aUEC, 시간당 약 ${rate} aUEC입니다.`:''}${blocked?` 하역 중 다른 상자를 옮겨야 하는 곳이 ${blocked}곳 있습니다.`:''}`,`<ol class="aide-legs">${legs}</ol>`,
   '<button class="primary" id="a-launch">출항합니다</button><button id="a-full">전체 계획 보기</button><button class="quiet" id="a-back">이전</button>',{compact:true});
  app.showWholeRoute();on('#a-launch',()=>{close();app.startRun();});on('#a-full',close);on('#a-back',()=>go('confirm'));}
 function close(){clearInterval(typing);clearInterval(poll);root.hidden=true;document.body.classList.remove('aide-open');try{localStorage.setItem(SEEN,'1');}catch{}}
 function open(s='welcome'){root.hidden=false;document.body.classList.add('aide-open');go(s);}
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();}});
 return {open,close,firstVisit:()=>{try{return !localStorage.getItem(SEEN);}catch{return true;}}};
}

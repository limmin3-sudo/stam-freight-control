import {jumpSegments} from './route-display.mjs';
// Run progress: the game is not connected, so the captain presses one big button per stop
// (접수 완료 / 배송 완료) and the whole page moves on to the next leg. State survives reloads.
import {V,VOICE_PORTRAITS,voiceId} from './voice.mjs';
import {placeLabel} from './aliases.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('ko-KR').format(Math.round(n));
const mmss=s=>{s=Math.max(0,Math.floor(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0');};
const KEY='sfc-run';

export function createExecution(root,{onAdvance,onReset,onReplanFrom,colorOf,nameOf,onFinish}){
 let plan=null,names=new Map(),run=load()||blank();
 function blank(){return {planKey:'',index:0,log:[],started:false,elapsed:0,since:null,finished:false,picked:[],delivered:[],aboard:[],startId:null};}
 function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch{return null;}}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(run));}catch{}}
 const elapsed=()=>run.elapsed+(run.since?(Date.now()-run.since)/1000:0);
 const keyOf=p=>p?JSON.stringify(p.visits.map(v=>[v.locationId,v.events.map(e=>[e.shipmentId,e.type])])):'';
 const nm=id=>names.get(id)?placeLabel(names.get(id)):id;
 const kindOf=v=>{const t=new Set(v.events.map(e=>e.type));return t.has('pickup')&&t.has('delivery')?'both':t.has('pickup')?'pickup':t.has('delivery')?'delivery':t.has('return')?'return':'waypoint';};
 const BTN={pickup:'📦 접수 완료',delivery:'✅ 배송 완료',both:'✔ 이 거점 완료',return:'↩ 복귀 완료',waypoint:'◇ 경유 완료'};
 const say=t=>{const el=root.querySelector('.aide-line');if(el){el.textContent=t;el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');}};
 function cargoLine(v){return v.events.map(e=>{const s=plan.shipments[e.shipmentIndex],boxes=s?.boxes?.length||0;return `<li><span class="dest-dot" style="background:${s?colorOf(s.dropoffId):'#8aa0b2'}"></span>${e.type==='pickup'?'<b class="pickup">↑ 픽업</b>':e.type==='delivery'?'<b class="delivery">↓ 배송</b>':e.type==='waypoint'?'<b>◇ 경유</b>':'<b>↩ 복귀</b>'} ${esc(s?nm(s.dropoffId):'경유')} · ${esc(e.commodity)} ${e.scu||''}${e.scu?' SCU':''}${boxes?` · ${boxes}상자`:''}${e.type==='pickup'&&s?` → ${esc(nm(s.dropoffId))}`:''}</li>`;}).join('');}
 function remainingSeconds(){if(!plan)return 0;const i=Math.min(run.index,plan.visits.length);const done=i?plan.visits[i-1].elapsed:0;return Math.max(0,plan.seconds-done);}
 function render(){
  if(!plan){root.hidden=true;document.body.classList.remove('run-active');return;}root.hidden=false;document.body.classList.toggle('run-active',run.started&&!run.finished);
  const total=plan.visits.length,i=run.index,v=plan.visits[i],next=plan.visits[i+1],reward=plan.totalReward||0;
  if(run.finished){const sec=elapsed(),rate=reward&&sec>0?reward/(sec/3600):0;
   root.innerHTML=`<div class="run-summary"><div class="eyebrow">MISSION COMPLETE / 운항 완료</div><h2>${V().done}</h2><p class="subtle">${V().doneSub}</p><div class="run-sum-grid"><div><span>총 운항 시간</span><b>${mmss(sec)}</b></div><div><span>예상 수익</span><b>${reward?fmt(reward)+' aUEC':'—'}</b></div><div><span>시간당</span><b>${rate?fmt(rate)+' aUEC':'—'}</b></div><div><span>거점</span><b>${run.log.length}곳</b></div></div>
    <table class="run-log"><thead><tr><th>#</th><th>거점</th><th>실측</th><th>예상</th></tr></thead><tbody>${run.log.map((l,k)=>`<tr><td>${k+1}</td><td>${esc(l.name)}</td><td>${mmss(l.seconds)}</td><td>${Math.max(1,Math.round(l.est/60))}분</td></tr>`).join('')}</tbody></table>
    <div class="run-buttons"><button id="run-new" class="primary">새 운항 준비</button><button id="run-keep" class="quiet">이 계획 다시 보기</button></div></div>`;
   root.querySelector('#run-new').onclick=()=>{run=blank();save();onReset?.('new');};root.querySelector('#run-keep').onclick=()=>{run=blank();run.planKey=keyOf(plan);save();render();onAdvance?.(0);};return;}
  const kind=kindOf(v),pct=Math.round(i/total*100);
  root.innerHTML=`<div class="run-head"><div><div class="eyebrow">LIVE RUN / 운항 진행 · ${i+1}/${total} 거점</div><h2><span class="run-num">${i+1}</span>${esc(nm(v.locationId))}</h2></div>
   <div class="run-meters"><div><span>운항 시간</span><b id="run-clock">${mmss(elapsed())}</b></div><div><span>남은 예상</span><b id="run-left"></b></div><div><span>시간당 수익</span><b id="run-rate">—</b></div></div></div>
   <div class="run-track">${plan.visits.map((x,k)=>`<i class="${k<i?'done':k===i?'now':''}" title="${k+1}. ${esc(nm(x.locationId))}"></i>`).join('')}<span style="width:${pct}%"></span></div>
   <div class="aide"><img class="run-partner-photo" src="${VOICE_PORTRAITS[voiceId()]}" alt="${V().role}"><div class="run-partner-speech"><span class="aide-badge">${V().role}</span><span class="aide-line">${esc(run.lastLine||(run.started?V().atStop(nm(v.locationId)):V().ready))}</span></div></div>
   <div class="run-body"><div class="run-now"><ul class="run-cargo">${cargoLine(v)}</ul>${v.blocked?.length?`<p class="blocked-badge">⚠ 하역 전에 다른 상자 ${new Set(v.blocked.flatMap(x=>x.blockers.map(o=>o.boxId))).size}개를 먼저 옮겨야 할 수 있습니다.</p>`:''}
    <button id="run-done" class="run-big ${kind}">${BTN[kind]} <kbd>Space</kbd></button></div>
    <div class="run-next">${next?`<span>다음</span><b>${esc(nm(next.locationId))}</b><small>약 ${Math.max(1,Math.round(next.seconds/60))}분${next.leg.jumps?' · 게이트웨이 이동·항성계 점프: '+jumpSegments(next.leg,names).map(j=>esc(j.entryName)+' → 점프 → '+esc(j.exitName)).join(' · '):''}</small>`:'<span>다음</span><b>마지막 거점</b>'}</div></div>
   <div class="run-buttons"><button id="run-undo" class="quiet" ${run.log.length>(run.undoFloor||0)?'':'disabled'}>↶ 되돌리기</button><button id="run-skip" class="quiet">이 거점 나중에</button><button id="run-replan" class="quiet">여기서 경로 다시 짜기</button><button id="run-pause" class="quiet">${run.since?'타이머 일시정지':run.started?'타이머 재개':'타이머 시작'}</button><button id="run-stop" class="quiet danger">운항 종료</button></div>
   ${run.log.length?`<details class="run-history"><summary>지난 구간 기록 ${run.log.length}개</summary><table class="run-log"><thead><tr><th>#</th><th>거점</th><th>실측</th><th>예상</th></tr></thead><tbody>${run.log.map((l,k)=>`<tr><td>${k+1}</td><td>${esc(l.name)}</td><td>${mmss(l.seconds)}</td><td>${Math.max(1,Math.round(l.est/60))}분</td></tr>`).join('')}</tbody></table></details>`:''}`;
  root.querySelector('#run-done').onclick=complete;root.querySelector('#run-undo').onclick=undo;root.querySelector('#run-skip').onclick=()=>replanFrom(true);root.querySelector('#run-replan').onclick=()=>replanFrom(false);
  root.querySelector('#run-pause').onclick=()=>{if(run.since){run.elapsed=elapsed();run.since=null;}else{run.started=true;run.since=Date.now();}save();render();};
  root.querySelector('#run-stop').onclick=()=>{if(!confirm('운항 기록을 지우고 종료할까요? 실린 화물은 게임에서 직접 확인하세요.'))return;run=blank();save();render();onReset?.('stop');};
  tick();}
 function tick(){if(!plan||run.finished)return;const c=root.querySelector('#run-clock');if(!c)return;const sec=elapsed();c.textContent=mmss(sec);const left=remainingSeconds();root.querySelector('#run-left').textContent=left?`${Math.max(1,Math.round(left/60*.8))}–${Math.ceil(left/60*1.3)}분`:'0분';
  const reward=plan.totalReward||0,proj=sec+left;root.querySelector('#run-rate').textContent=reward&&run.started&&sec>30?fmt(reward/(proj/3600))+' aUEC':reward?'출항 후 계산':'보상 미입력';}
 function complete(){if(!plan||run.finished)return;const v=plan.visits[run.index],now=elapsed();if(!run.started){run.started=true;run.startedAt=Date.now();run.since=Date.now();run.startId=v.locationId;}
  const prevAt=run.log.length?run.log.at(-1).at:0;run.log.push({visit:run.index,locationId:v.locationId,name:nm(v.locationId),at:now,seconds:Math.max(0,now-prevAt),est:v.seconds,events:v.events.map(e=>({type:e.type,shipmentId:e.shipmentId}))});
  for(const e of v.events){if(e.type==='pickup'&&!run.picked.includes(e.shipmentId))run.picked.push(e.shipmentId);if(e.type==='delivery'&&!run.delivered.includes(e.shipmentId))run.delivered.push(e.shipmentId);}run.aboard=v.packing?.boxes||[];
  const kind=kindOf(v);run.index++;
  if(run.index>=plan.visits.length){run.finished=true;run.elapsed=elapsed();run.since=null;run.lastLine='';save();render();onFinish?.({id:`${run.planKey}|${run.startedAt||run.startId||''}`,seconds:run.elapsed,startId:run.startId,stops:plan.visits.length});return;}
  const n=plan.visits[run.index],unload=n.events.filter(e=>e.type==='delivery'),load=n.events.filter(e=>e.type==='pickup');
  run.lastLine=V().next(nm(v.locationId),kind==='pickup'?'접수':kind==='delivery'?'배송':'작업',nm(n.locationId),Math.max(1,Math.round(n.seconds/60)))+(n.leg.jumps?V().jump((n.leg.gateways||[])[0]||'게이트웨이'):'')+(unload.length?V().cargo(true,[...new Set(unload.map(e=>e.missionId))].join(', ')):load.length?V().cargo(false,[...new Set(load.map(e=>e.missionId))].join(', ')):'');
  save();render();onAdvance?.(run.index);}
 function undo(){if(run.log.length<=(run.undoFloor||0))return;const last=run.log.pop();run.index=last.visit;for(const e of last.events){if(e.type==='pickup')run.picked=run.picked.filter(x=>x!==e.shipmentId);if(e.type==='delivery')run.delivered=run.delivered.filter(x=>x!==e.shipmentId);}
  run.aboard=run.index?plan.visits[run.index-1].packing?.boxes||[]:plan.initialPacking?.boxes||[];run.finished=false;run.lastLine=V().undo(last.name);save();render();onAdvance?.(run.index);}
 function replanFrom(skip){if(!plan)return;const here=run.log.length?run.log.at(-1).locationId:(run.startId||plan.visits[0].locationId);
  const avoid=skip?plan.visits[run.index]?.locationId:null;const ok=onReplanFrom?.({startId:here,resume:{picked:[...run.picked],delivered:[...run.delivered],aboard:run.aboard},avoidFirst:avoid});
  if(ok){run.lastLine=skip?V().defer(nm(avoid)):V().replan;save();render();}}
 setInterval(tick,1000);
 document.addEventListener('keydown',e=>{if(document.querySelector('.map-ui-hidden'))return;if(!plan||run.finished||!document.body.classList.contains('map-fullscreen')&&!run.started)return;if(e.target.closest?.('input,select,textarea,button,dialog'))return;if(e.code==='Space'||e.key==='Enter'){e.preventDefault();complete();}});
 window.addEventListener('beforeunload',()=>{if(run.since){run.elapsed=elapsed();run.since=Date.now();}save();});
 return {
  setPlan(p,byId,{keepRun=false}={}){plan=p;if(byId)names=byId;if(!p){render();return;}const k=keyOf(p);
   if(keepRun){run.undoFloor=run.log.length;run.planKey=k;run.index=0;run.finished=false;}else if(run.planKey!==k){if(run.started&&!run.finished&&run.planKey){/* plan changed outside of replan: keep timer, restart stops */run.planKey=k;run.index=0;}else{run=blank();run.planKey=k;}}
   if(run.index>=p.visits.length)run.index=Math.max(0,p.visits.length-1);save();render();},
  start(){if(!plan)return;if(!run.started){run.started=true;run.since=Date.now();run.startId=plan.visits[0]?.locationId;run.lastLine=V().first(nm(plan.visits[0].locationId));}save();render();onAdvance?.(run.index);},
  resumeContext:()=>run.started&&!run.finished&&run.planKey?{startId:run.log.at(-1)?.locationId||run.startId||plan?.settings?.startId,resume:{picked:[...run.picked],delivered:[...run.delivered],aboard:run.aboard}}:null,
  refresh:()=>{run.lastLine='';save();render();},replanHere:()=>replanFrom(false),isActive:()=>!!plan&&run.started&&!run.finished,current:()=>run.index,complete,undo};
}

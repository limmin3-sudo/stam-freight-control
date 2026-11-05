import {isDeparture,currentPosition} from './route-departure.mjs';
import {containerText} from './cargo-summary.mjs';
import {jumpSegments,stepNumbers} from './route-display.mjs';
import {L} from './i18n.mjs';
// Run progress: the game is not connected, so the captain presses one big button per stop
// (접수 완료 / 배송 완료 / 점프 완료) and the whole page moves on to the next step. State survives reloads.
// Each system jump is its own step before the stop it leads to: run.index stays the visit index and run.jump counts
// the jumps already done on the leg into that visit.
import {V,VOICE_PORTRAITS,voiceId} from './voice.mjs';
import {placeLabel} from './aliases.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('ko-KR').format(Math.round(n));
const mmss=s=>{s=Math.max(0,Math.floor(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0');};
const KEY='sfc-run';

export function createExecution(root,{onAdvance,onReset,onReplanFrom,colorOf,nameOf,onFinish,containerLabel}){
 let plan=null,names=new Map(),run=load()||blank();
 function blank(){return {planKey:'',index:0,jump:0,log:[],started:false,elapsed:0,since:null,finished:false,picked:[],delivered:[],aboard:[],startId:null};}
 function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch{return null;}}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(run));}catch{}}
 const elapsed=()=>run.elapsed+(run.since?(Date.now()-run.since)/1000:0);
 const keyOf=p=>p?JSON.stringify(p.visits.map(v=>[v.locationId,v.events.map(e=>[e.shipmentId,e.type])])):'';
 const nm=id=>names.get(id)?placeLabel(names.get(id)):id;
 const kindOf=v=>{if(isDeparture(v))return 'departure';const t=new Set(v.events.map(e=>e.type));return t.has('pickup')&&t.has('delivery')?'both':t.has('pickup')?'pickup':t.has('delivery')?'delivery':t.has('return')?'return':'waypoint';};
 const BTN={departure:'🚀 출발 완료',jump:'🌀 점프 완료',pickup:'📦 접수 완료',delivery:'✅ 배송 완료',both:'✔ 이 거점 완료',return:'↩ 복귀 완료',waypoint:'◇ 경유 완료'};
 const say=t=>{const el=root.querySelector('.aide-line');if(el){el.textContent=t;el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');}};
 function cargoLine(v){if(isDeparture(v))return `<li><b>출발지</b> ${esc(nm(v.locationId))} · ${L('출발하면 출발 완료를 눌러 주세요.','Press Departed when you leave.')}<br>${L('다음 거점까지 이동한 뒤 화물을 접수합니다.','Travel to the next stop to collect cargo.')}</li>`;return v.events.map(e=>{const s=plan.shipments[e.shipmentIndex],boxes=s?.boxes?.length||0;return `<li><span class="dest-dot" style="background:${s?colorOf(s.dropoffId):'#8aa0b2'}"></span>${e.type==='pickup'?'<b class="pickup">↑ 적재</b>':e.type==='delivery'?'<b class="delivery">↓ 하역</b>':e.type==='waypoint'?'<b>◇ 경유</b>':'<b>↩ 복귀</b>'} ${e.type==='pickup'&&s?`→ ${esc(nm(s.dropoffId))} · `:''}${esc(e.commodity)} ${e.scu||''}${e.scu?' SCU':''}${boxes?` · ${containerText(s.boxes)}${s.estimated?' · '+esc(containerLabel?.(s)||L('자동 구성','Automatic layout')):''}`:''}</li>`;}).join('');}
 const cargoNames=events=>{const names=[...new Set(events.map(e=>e.commodity).filter(Boolean))];return names.slice(0,3).join(', ')+(names.length>3?` 외 ${names.length-3}종`:'');};
 function remainingSeconds(){if(!plan)return 0;const i=Math.min(run.index,plan.visits.length);const done=i?plan.visits[i-1].elapsed:0;return Math.max(0,plan.seconds-done);}
 const segsOf=i=>plan.visits[i]?jumpSegments(plan.visits[i].leg,names):[];
 const jumpPending=()=>{const segs=segsOf(run.index),k=run.jump||0;return k<segs.length?{seg:segs[k],k}:null;};
 const jumpTitle=j=>`${esc(j.entryName)} → 점프 → ${esc(j.exitName)}`;
 function departureLine(v){return voiceId()==='aide'?L(`${nm(v.locationId)}에서 시작해요, 함장님! 출발하시면 눌러 주세요. 다음 픽업지까지 안내할게요!`,`We start at ${nm(v.locationId)}, Captain! Press Departed when you leave and I will guide you to the first pickup.`):L(`${nm(v.locationId)}에서 출발합니다. 출발 완료를 누르시면 첫 픽업지까지 안내하겠습니다.`,`Departing from ${nm(v.locationId)}. Press Departed for guidance to the first pickup.`);}
 function render(){
  if(!plan){root.hidden=true;document.body.classList.remove('run-active');return;}root.hidden=false;document.body.classList.toggle('run-active',run.started&&!run.finished);
  const total=plan.visits.length,i=run.index,v=plan.visits[i],next=plan.visits[i+1],reward=plan.totalReward||0;
  if(run.finished){const sec=elapsed(),rate=reward&&sec>0?reward/(sec/3600):0;
   root.innerHTML=`<div class="run-summary"><div class="eyebrow">MISSION COMPLETE / 운항 완료</div><h2>${V().done}</h2><p class="subtle">${V().doneSub}</p><div class="run-sum-grid"><div><span>총 운항 시간</span><b>${mmss(sec)}</b></div><div><span>예상 수익</span><b>${reward?fmt(reward)+' aUEC':'—'}</b></div><div><span>시간당</span><b>${rate?fmt(rate)+' aUEC':'—'}</b></div><div><span>거점</span><b>${run.log.length}곳</b></div></div>
    <table class="run-log"><thead><tr><th>#</th><th>거점</th><th>실측</th><th>예상</th></tr></thead><tbody>${run.log.map((l,k)=>`<tr><td>${k+1}</td><td>${esc(l.name)}</td><td>${mmss(l.seconds)}</td><td>${l.est==null?'—':Math.max(1,Math.round(l.est/60))+'분'}</td></tr>`).join('')}</tbody></table>
    <div class="run-buttons"><button id="run-new" class="primary">새 운항 준비</button><button id="run-keep" class="quiet">이 계획 다시 보기</button></div></div>`;
   root.querySelector('#run-new').onclick=()=>{run=blank();save();onReset?.('new');};root.querySelector('#run-keep').onclick=()=>{run=blank();run.planKey=keyOf(plan);save();render();onAdvance?.(0);};return;}
  const steps=stepNumbers(plan.visits,names),jp=jumpPending(),cur=jp?steps.jumps[i][jp.k]:steps.stop[i],kind=jp?'jump':kindOf(v),pct=Math.round((cur-1)/steps.total*100);
  // What comes after the current step: the next jump on the way, or the next stop.
  const nextJump=jp?(segsOf(i)[jp.k+1]?{seg:segsOf(i)[jp.k+1],n:steps.jumps[i][jp.k+1]}:null):(segsOf(i+1)[0]?{seg:segsOf(i+1)[0],n:steps.jumps[i+1][0]}:null);
  const nextStop=jp?{v,n:steps.stop[i]}:next?{v:next,n:steps.stop[i+1]}:null;
  const dots=plan.visits.flatMap((x,k)=>[...segsOf(k).map((j,q)=>{const done=k<i||k===i&&q<(run.jump||0)||k===i&&!jp,now=k===i&&jp?.k===q;return `<i class="jump ${done?'done':now?'now':''}" title="${steps.jumps[k][q]}. 항성계 점프 · ${esc(j.entryName)} → ${esc(j.exitName)}"></i>`;}),`<i class="${k<i?'done':k===i&&!jp?'now':''}" title="${steps.stop[k]}. ${esc(nm(x.locationId))}"></i>`]).join('');
  // Two columns that line up with the map / cargo split in flight mode: what to press on the left, what the partner says
  // (with this stop's cargo) on the right.
  root.innerHTML=`<div class="run-cols"><div class="run-col-main"><div class="run-head"><div><div class="eyebrow">LIVE RUN / 운항 진행 · ${cur}/${steps.total} 단계</div><h2><span class="run-num${jp?' jump':''}">${cur}</span>${jp?`<span class="run-jump-title">항성계 점프 <small>${esc(jp.seg.fromSystem.toUpperCase())} → ${esc(jp.seg.toSystem.toUpperCase())}</small><b>${jumpTitle(jp.seg)}</b></span>`:esc(nm(v.locationId))}</h2></div>
   <div class="run-meters"><div><span>운항 시간</span><b id="run-clock">${mmss(elapsed())}</b></div><div><span>남은 예상</span><b id="run-left"></b></div><div><span>시간당 수익</span><b id="run-rate">—</b></div></div></div>
   <div class="run-track">${dots}<span style="width:${pct}%"></span></div>
   <div class="run-body"><div class="run-now">
    <button id="run-done" class="run-big ${kind}">${BTN[kind]} <kbd>Space</kbd></button></div>
    <div class="run-next${nextJump?' jump':''}">${nextJump?`<span>다음 · ${nextJump.n}</span><b>항성계 점프</b><small>${jumpTitle(nextJump.seg)}</small>`:nextStop?`<span>다음 · ${nextStop.n}</span><b>${esc(nm(nextStop.v.locationId))}</b><small>약 ${Math.max(1,Math.round(nextStop.v.seconds/60))}분${jp?' · 점프 포함 구간':''}</small>`:'<span>다음</span><b>마지막 거점</b>'}</div></div>
   <div class="run-buttons"><button id="run-undo" class="quiet" ${run.log.length>(run.undoFloor||0)?'':'disabled'}>↶ 되돌리기</button><button id="run-skip" class="quiet">이 거점 나중에</button><button id="run-replan" class="quiet">여기서 경로 다시 짜기</button><button id="run-pause" class="quiet">${run.since?'타이머 일시정지':run.started?'타이머 재개':'타이머 시작'}</button><button id="run-stop" class="quiet danger">운항 종료</button></div>
   ${run.log.length?`<details class="run-history"><summary>지난 구간 기록 ${run.log.length}개</summary><table class="run-log"><thead><tr><th>#</th><th>거점</th><th>실측</th><th>예상</th></tr></thead><tbody>${run.log.map((l,k)=>`<tr><td>${k+1}</td><td>${esc(l.name)}</td><td>${mmss(l.seconds)}</td><td>${l.est==null?'—':Math.max(1,Math.round(l.est/60))+'분'}</td></tr>`).join('')}</tbody></table></details>`:''}</div><div class="run-col-talk"><div class="aide"><img class="run-partner-photo" src="${VOICE_PORTRAITS[voiceId()]}" alt="${V().role}"><div class="run-partner-speech"><span class="aide-badge">${V().role}</span><span class="aide-line">${esc((/미션 ID|계약 건/.test(run.lastLine||"")?"":run.lastLine)||(isDeparture(v)?departureLine(v):run.started?V().atStop(nm(v.locationId)):V().ready))}</span><ul class="run-cargo">${jp?`<li><b class="jump">◆ 점프</b> ${esc(jp.seg.entryName)}에서 점프해 ${esc(jp.seg.exitName)}로 나갑니다. 화물 작업은 없습니다.</li>`:cargoLine(v)}</ul>${!jp&&v.blocked?.length?`<p class="blocked-badge">⚠ 하역 전에 다른 상자 ${new Set(v.blocked.flatMap(x=>x.blockers.map(o=>o.boxId))).size}개를 먼저 옮겨야 할 수 있습니다.</p>`:''}</div></div></div></div>`;
  root.querySelector('#run-done').onclick=complete;root.querySelector('#run-undo').onclick=undo;root.querySelector('#run-skip').onclick=()=>replanFrom(true);root.querySelector('#run-replan').onclick=()=>replanFrom(false);
  root.querySelector('#run-pause').onclick=()=>{if(run.since){run.elapsed=elapsed();run.since=null;}else{run.started=true;run.startedAt=run.startedAt||Date.now();run.since=Date.now();}save();render();};
  root.querySelector('#run-stop').onclick=()=>{if(!confirm('운항 기록을 지우고 종료할까요? 실린 화물은 게임에서 직접 확인하세요.'))return;run=blank();save();render();onReset?.('stop');};
  tick();}
 function tick(){if(!plan||run.finished)return;const c=root.querySelector('#run-clock');if(!c)return;const sec=elapsed();c.textContent=mmss(sec);const left=remainingSeconds();root.querySelector('#run-left').textContent=left?`${Math.max(1,Math.round(left/60*.8))}–${Math.ceil(left/60*1.3)}분`:'0분';
  const reward=plan.totalReward||0,proj=sec+left;root.querySelector('#run-rate').textContent=reward&&run.started&&sec>30?fmt(reward/(proj/3600))+' aUEC':reward?'출항 후 계산':'보상 미입력';}
 function complete(){if(!plan||run.finished)return;const v=plan.visits[run.index],now=elapsed();if(!run.started){run.started=true;run.startedAt=Date.now();run.since=Date.now();run.startId=run.startId||plan.settings.startId;}
  const jp=jumpPending();
  if(jp){const prevAt=run.log.length?run.log.at(-1).at:0;run.log.push({visit:run.index,jump:jp.k,locationId:jp.seg.exitId,name:`점프 · ${jp.seg.entryName} → ${jp.seg.exitName}`,at:now,seconds:Math.max(0,now-prevAt),est:null,events:[]});
   run.positionId=jp.seg.exitId;run.jump=jp.k+1;const more=jumpPending();
   run.lastLine=more?V().jumpDone(jp.seg.exitName,`${more.seg.entryName} → 점프 → ${more.seg.exitName}`):V().jumpDone(jp.seg.exitName,nm(v.locationId));
   save();render();onAdvance?.(run.index);return;}
  const prevAt=run.log.length?run.log.at(-1).at:0;run.log.push({visit:run.index,locationId:v.locationId,name:nm(v.locationId),at:now,seconds:Math.max(0,now-prevAt),est:v.seconds,meters:v.leg?.meters??null,events:v.events.map(e=>({type:e.type,shipmentId:e.shipmentId}))});
  for(const e of v.events){if(e.type==='pickup'&&!run.picked.includes(e.shipmentId))run.picked.push(e.shipmentId);if(e.type==='delivery'&&!run.delivered.includes(e.shipmentId))run.delivered.push(e.shipmentId);}run.aboard=v.packing?.boxes||[];
  run.positionId=v.locationId;const kind=kindOf(v);run.index++;run.jump=0;
  if(run.index>=plan.visits.length){run.finished=true;run.elapsed=elapsed();run.since=null;run.lastLine='';save();render();onFinish?.({id:`${run.planKey}|${run.startedAt||run.startId||''}`,seconds:run.elapsed,startId:run.startId,stops:run.log.filter(l=>l.jump==null).length,distanceMeters:run.log.filter(l=>l.jump==null).every(l=>Number.isFinite(l.meters))?run.log.filter(l=>l.jump==null).reduce((n,l)=>n+l.meters,0):null});return;}
  const n=plan.visits[run.index],unload=n.events.filter(e=>e.type==='delivery'),load=n.events.filter(e=>e.type==='pickup');
  run.lastLine=V().next(nm(v.locationId),kind==='pickup'?L('접수','pickup'):kind==='delivery'?L('배송','delivery'):kind==='departure'?L('출발','departure'):L('작업','work'),nm(n.locationId),Math.max(1,Math.round(n.seconds/60)))+(segsOf(run.index).length?V().jump(segsOf(run.index)[0].entryName):'')+(!segsOf(run.index).length&&unload.length?V().cargo(true,cargoNames(unload)):!segsOf(run.index).length&&load.length?V().cargo(false,cargoNames(load)):'');
  save();render();onAdvance?.(run.index);}
 function undo(){if(run.log.length<=(run.undoFloor||0))return;const last=run.log.pop();delete run.positionId;run.positionId=currentPosition(run,plan);run.index=last.visit;
  if(last.jump!=null){run.jump=last.jump;run.finished=false;run.lastLine=V().undo('항성계 점프');save();render();onAdvance?.(run.index);return;}
  run.jump=segsOf(run.index).length;for(const e of last.events){if(e.type==='pickup')run.picked=run.picked.filter(x=>x!==e.shipmentId);if(e.type==='delivery')run.delivered=run.delivered.filter(x=>x!==e.shipmentId);}
  run.aboard=run.index?plan.visits[run.index-1].packing?.boxes||[]:plan.initialPacking?.boxes||[];run.finished=false;run.lastLine=V().undo(last.name);save();render();onAdvance?.(run.index);}
 function replanFrom(skip,startId){if(!plan)return;const here=startId||currentPosition(run,plan);
  const avoid=skip?plan.visits[run.index]?.locationId:null;const ok=onReplanFrom?.({startId:here,resume:{picked:[...run.picked],delivered:[...run.delivered],aboard:run.aboard},avoidFirst:avoid,showDeparture:isDeparture(plan.visits[run.index])});
  if(ok){run.positionId=here;run.lastLine=skip?V().defer(nm(avoid)):V().replan;save();render();}}
 setInterval(tick,1000);
 document.addEventListener('keydown',e=>{if(document.body.classList.contains('aide-open')||document.querySelector('.cargo-grid-selecting')||document.querySelector('.map-ui-hidden'))return;if(!plan||run.finished||!document.body.classList.contains('map-fullscreen')&&!run.started)return;if(e.target.closest?.('input,select,textarea,button,dialog'))return;if(e.code==='Space'||e.key==='Enter'){e.preventDefault();complete();}});
 window.addEventListener('beforeunload',()=>{if(run.since){run.elapsed=elapsed();run.since=Date.now();}save();});
 return {
  reset(){const next=blank();localStorage.setItem(KEY,JSON.stringify(next));run=next;render();},
  setPlan(p,byId,{keepRun=false}={}){plan=p;if(byId)names=byId;if(!p){render();return;}const k=keyOf(p);
   // Upgrade an existing run's indices when the only new step is the departure.
   if(!keepRun&&isDeparture(p.visits[0])&&run.planKey===keyOf({...p,visits:p.visits.slice(1)})){run.planKey=k;if(run.started){run.index++;run.log=run.log.map(l=>({...l,visit:l.visit+1}));if(!run.log.length)run.startId=p.settings.startId;}}
   if(keepRun){run.undoFloor=run.log.length;run.planKey=k;run.index=0;run.jump=0;run.finished=false;}else if(run.planKey!==k){if(run.started&&!run.finished&&run.planKey){/* plan changed outside of replan: keep timer, restart stops */run.planKey=k;run.index=0;run.jump=0;}else{run=blank();run.planKey=k;}}
   if(run.index>=p.visits.length)run.index=Math.max(0,p.visits.length-1);save();render();},
  start(){if(!plan)return;if(!run.started){run.started=true;run.startedAt=Date.now();run.since=Date.now();run.startId=plan.settings.startId;run.positionId=plan.settings.startId;run.lastLine=isDeparture(plan.visits[0])?departureLine(plan.visits[0]):V().first(nm(plan.visits[0].locationId))+(segsOf(0).length?V().jump(segsOf(0)[0].entryName):'');}save();render();onAdvance?.(run.index);},
  resumeContext:()=>run.started&&!run.finished&&run.planKey?{startId:currentPosition(run,plan),resume:{picked:[...run.picked],delivered:[...run.delivered],aboard:run.aboard}}:null,
  refresh:()=>{run.lastLine='';save();render();},replanHere:startId=>replanFrom(false,startId),isActive:()=>!!plan&&run.started&&!run.finished,current:()=>run.index,complete,undo};
}

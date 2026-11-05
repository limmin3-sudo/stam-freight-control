import {mountContextHelp} from './context-help.mjs';
import {mountSiteIntro} from './site-intro.mjs';
import {createPlanReset} from './plan-reset.mjs';
import {commodityReference} from './commodity-labels.mjs';
import {mountLocationSearch} from './location-search.mjs';
import {mountAiLabels} from './localization.mjs';
import {createInbox} from './integration/inbox-view.mjs';
import {groupConfiguration,containerText,configurationBasis,configurationLabel,wikiConfiguration} from './cargo-summary.mjs';
import {startTranslation,languageButton,isEn} from './i18n.mjs';
import {createUpdates} from './updates.mjs';
import {jumpSegments,stepNumbers} from './route-display.mjs';
import {createRouteEditor} from './route-editor.mjs';
import {createAccount} from './account.mjs';
import {createHistory} from './history.mjs';
import {createGuide} from './guide.mjs';
import {createPerformance} from './performance.mjs';
import {createLocationManager} from './location-manager.mjs';
import {DEFAULT_SHIP,capacity,withStacking,selectShipGrids} from './ships.mjs';
import {createFleet} from './fleet.mjs';
import {createWorkbench} from './workbench.mjs';
import {createFeedback} from './feedback.mjs';
import {prepareMissionDb} from './mission-match.mjs';
import {splitMissionText,parseMissionText,recognizeImage,stopOCR,setCommodityNames,MISREADS} from './ocr.mjs';
import {DEFAULTS,COLORS,packBoxes} from './engine.mjs';
import {createStarMap,createCargoView} from './scene.mjs';
import {createExecution} from './execution.mjs';
import {planRoute,planRoutesOnly,isDeparture} from './route-departure.mjs';
import {createAssistant} from './assistant.mjs';
import {matchLocation,loadAiNames,placeLabel,suggestLocations} from './aliases.mjs';import {voiceId,setVoice,V,VOICE_PORTRAITS,routePolicy} from './voice.mjs';
import {destinationGroups,useWikiConfiguration} from './recipes.mjs';
import {hullKind} from './ships.mjs';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Destination colours, in delivery order (rainbow-ish, neighbours contrast strongly). 1st = blue, 2nd = red, …
const DEST_COLORS=['#3b82f6','#ef4444','#facc15','#22c55e','#a855f7','#f97316','#22d3ee','#ec4899','#a3e635','#6366f1','#14b8a6','#d6a36a'];
const DEST_NAMES=['파랑','빨강','노랑','초록','보라','주황','하늘','분홍','연두','남색','청록','갈색'];
let destOrder=new Map();
function computeDestOrder(){destOrder=new Map();if(!plan)return;for(const v of plan.visits)for(const e of v.events)if(e.type==='delivery'){const id=plan.shipments[e.shipmentIndex].dropoffId;if(!destOrder.has(id))destOrder.set(id,destOrder.size);}}
const destIndex=id=>destOrder.has(id)?destOrder.get(id):-1,destColor=id=>destIndex(id)<0?'#8aa0b2':DEST_COLORS[destIndex(id)%DEST_COLORS.length];
const destDot=id=>`<span class="dest-dot" style="background:${destColor(id)}" title="${destIndex(id)+1}번째 도착지 · ${DEST_NAMES[destIndex(id)%DEST_NAMES.length]||''}"></span>`;
const fmtDist=m=>!m?'':m>=1e9?(m/1e9).toFixed(m>=1e10?0:1)+' Gm':m>=1e6?Math.round(m/1e6)+' Mm':Math.max(1,Math.round(m/1e3))+' km';
const fmt=n=>new Intl.NumberFormat('ko-KR').format(n),minutes=s=>Math.round(s/60),binName=i=>ship.grids[i]?.name||('구역 '+(i+1));
let inbox=null,editDraft=null,editSaved=false,displayGoods={},initialized=false,planReset=null;
let missionDb=null,guide=null,history=null,assistant=null,data,byId,missions=[],files=[],plan=null,selectedStop=-1,map,cargoView,execution,editIndex=-1,token='',busy=false;
let settings={...DEFAULTS},apiUrl='',ship=DEFAULT_SHIP,fleet,performancePanel,workbench,ocrCancelled=false,mode='detail';
try{if(localStorage.getItem('vh-mode')==='simple')mode='simple';}catch{}
try{settings={...DEFAULTS,...JSON.parse(localStorage.getItem('vh-settings')||'{}'),includeReturn:false};apiUrl=localStorage.getItem('vh-api')||'';missions=JSON.parse(localStorage.getItem('vh-missions')||'[]');}catch{}
function notify(message,error=false){for(const target of [$('notice'),...document.querySelectorAll('.desk-dialog[open] .desk-dialog-notice')]){target.textContent=message;target.classList.toggle('error',error);}}
function editable(){return true;}
function renderCargo(){if(!plan||plan.simple||selectedStop<0)return;const v=plan.visits[selectedStop],filter=$('cargo-filter').value,before=$('cargo-phase').value==='before'||filter==='__unload__',packing=before?(selectedStop?plan.visits[selectedStop-1].packing:(plan.initialPacking||packBoxes([],[],ship))):v.packing;const boxIds=filter==='__unload__'?v.events.filter(e=>e.type==='delivery').flatMap(e=>plan.shipments[e.shipmentIndex].boxes.map(b=>b.boxId)):null;$('cargo-phase').value=before?'before':'after';document.querySelectorAll('[data-cargo-phase]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cargoPhase===$('cargo-phase').value)));$('cargo-step').textContent=`${selectedStop+1}번 거점 작업 ${before?'전':'후'} 예상`;const colored={...packing,boxes:packing.boxes.map(b=>({...b,color:destColor(b.dropoffId)}))};const leaving=new Set(v.events.filter(e=>e.type==='delivery').flatMap(e=>plan.shipments[e.shipmentIndex].boxes.map(b=>b.boxId))),order=new Map((before?[]:v.loadOrder||[]).map((id,i)=>[id,i+1]));
 // Before: highlight boxes coming off here. After: number the boxes just loaded in loading order.
 cargoView?.update(colored,{missionId:filter==='__unload__'?'':filter,boxIds,focusIds:before?[...leaving]:[],loadIds:before?[]:[...order.keys()],leaving:before||!leaving.size?[]:(selectedStop?plan.visits[selectedStop-1].packing:(plan.initialPacking||packBoxes([],[],ship))).boxes.filter(b=>leaving.has(b.boxId)).map(b=>({...b,color:destColor(b.dropoffId)})),ship,access:plan.access,order,nameOf:id=>`${destIndex(id)+1}번째 도착 · ${locationText(id)}`});renderCargoDetails(packing);}
// Left sidebar card under the account box: the ship in use and the plan settings at a glance (opens Flight setup).
function renderShipPanel(){const box=$('ship-panel-facts');if(!box||!ship)return;$('ship-panel-name').textContent=ship.name;const p=settings.performance||{},start=byId?.get($('start-location')?.value),scu=missions.reduce((a,m)=>a+m.cargo.reduce((b,c)=>b+(Number(c.scu)||0),0),0);
 const rows=[['화물칸',`${capacity(ship)} SCU · 사용 ${ship.grids.filter(g=>!g.disabled).length}/${ship.grids.length}`],['퀀텀',p.drive?.name?`${p.drive.name}${p.drive.size?' (S'+p.drive.size+')':''}`:'평균 속도 직접 입력'],['출발',start?placeLabel(start):'—'],['계획',mode==='simple'?'간편 경로':'상세 적재'],['계약',missions.length?`${missions.length}건 · ${scu} SCU`:'없음']];
 box.innerHTML=rows.map(([k,v])=>`<span><i>${esc(k)}</i>${esc(v)}</span>`).join('');}
function save(){renderShipPanel();try{localStorage.setItem('vh-missions',JSON.stringify(missions));localStorage.setItem('vh-settings',JSON.stringify(settings));localStorage.setItem('vh-start',$('start-location').value);return true;}catch{notify('브라우저 저장 공간을 쓸 수 없습니다. 이 탭에서는 계속 작업할 수 있습니다.');return false;}}
function optionMarkup(selected=''){let out='<option value="">위치 선택</option>';for(const sys of ['stanton','pyro','nyx'])out+=`<optgroup label="${sys.toUpperCase()}">`+data.locations.filter(l=>l.system===sys&&l.type!=='Star'&&!['Nyx I','Nyx II','Nyx III'].includes(l.name)).sort((a,b)=>a.name.localeCompare(b.name)).map(l=>`<option value="${esc(l.id)}" ${selected===l.id?'selected':''}>${esc(placeLabel(l))}</option>`).join('')+'</optgroup>';return out;}
function locationText(id){const l=byId?.get(id);return l?placeLabel(l):'위치 확인 필요';}
function setSystem(s){document.querySelectorAll('[data-system]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.system===s)));$('system-name').textContent=s.toUpperCase();$('location-count').textContent=data.locations.filter(l=>l.system===s).length+'개 좌표';map?.setSystem(s);}
function renderMissions(updateWorkbench=true){inbox?.refresh();
 $('mission-count').textContent=missions.length;
 $('missions').innerHTML=missions.length?missions.map((m,i)=>{const total=m.cargo.reduce((a,c)=>a+(c.scu||0),0),unresolved=m.cargo.some(c=>!byId.has(c.pickupId)||!byId.has(c.dropoffId)),unknown=destinationGroups(m).some(g=>groupConfiguration(m,g,settings.unknownBox).estimated);return `<article class="mission-card" style="--mission-color:${COLORS[i%COLORS.length]}"><div class="mission-top"><span class="mission-id">${esc(m.company||m.title||'계약')}</span><div><button data-edit="${i}">수정</button> <button data-delete="${i}" aria-label="${esc(m.id)} 삭제">×</button></div></div><strong>${esc(m.company||m.title||'운송 미션')} · ${fmt(total)} SCU</strong><p>${m.cargo.map(c=>esc(c._pickupText&&!c.pickupId?c._pickupText:locationText(c.pickupId))+' → '+esc(c._dropoffText&&!c.dropoffId?c._dropoffText:locationText(c.dropoffId))+(c._scuAssumed?` <em class="scu-assumed">${c.scu} SCU · 수량 가정</em>`:'')).join('<br>')}</p>${unresolved?'<span class="badge">위치 확인 필요</span>':unknown?`<span class="badge">${m._wiki?'위키 기준 자동 구성':'미션 유형 미확인'}</span>`:''}</article>`;}).join(''):'<div class="empty-note">스샷에서 읽은 미션 목록<br>같은 화물이어도 미션별로 따로 관리</div>';
 $('missions').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEditor(Number(b.dataset.edit)));$('missions').querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{if(!editable())return;missions.splice(Number(b.dataset.delete),1);renderMissions();replan();save();});
 if(updateWorkbench)workbench?.render();
}
function emptyPlan(){execution?.setPlan(null,byId);plan=null;selectedStop=-1;renderMapOverlay();map?.setRoute(null,-1);cargoView?.update(packBoxes([],[],ship),{ship});$('route-distance').textContent='—';$('route-jumps').textContent='항성계 점프 포함';$('eta').textContent='—';$('peak').innerHTML='— <em>/ '+capacity(ship)+' SCU</em>';$('stops').textContent='—';$('reward').textContent='—';$('itinerary').innerHTML='<div class="empty-note">미션과 위치가 확정되면 방문 순서 표시</div>';$('cargo-legend').replaceChildren();$('cargo-table').replaceChildren();$('cargo-instructions').textContent=ship.grids.length+'개 그리드 · '+capacity(ship)+' SCU · 미션별로 나눠 적재';$('warnings').replaceChildren();$('plan-status').textContent='미션을 추가하면 경로가 표시됩니다.';$('cargo-step').textContent='출발 전';}
function replan(){
 settings.routePolicy=routePolicy();
 if(!editable())return;
 if(!missions.length){emptyPlan();return;}
 // During a run, changes re-plan from where the captain is now, keeping the cargo that is aboard.
 const activeContext=execution?.resumeContext();
 if(activeContext&&mode!=='simple'){
  if(execution.isActive()){execution.replanHere();return;}
  // Restoring an active trip must start from saved aboard coordinates, before
  // a changed packing policy can build a fresh layout for the same visit key.
  try{plan=planRoute(data,missions,activeContext.startId,{...settings,ship,resume:activeContext.resume});$('start-location').value=activeContext.startId;selectedStop=0;renderPlan();execution.setPlan(plan,byId,{keepRun:true});save();}catch(e){emptyPlan();notify(e.message,true);}return;
 }
 const simple=mode==='simple';
 if(missions.some(m=>m.cargo.some(c=>!byId.has(c.pickupId)||!byId.has(c.dropoffId)||(!simple&&(!Number.isInteger(c.scu)||c.scu<1))))){emptyPlan();notify(simple?'간편 경로는 픽업지·배송지만 있으면 됩니다. 위치가 확인되지 않은 미션을 수정하십시오.':'스샷의 위치 이름과 수량을 확인하십시오. 미션의 ‘수정’에서 바로잡을 수 있습니다.',true);return;}
 try{const manualContext=Array.isArray(settings.manualStops)?execution?.resumeContext():null;const planSettings=manualContext?{...settings,resume:manualContext.resume}:settings;plan=simple?planRoutesOnly(data,missions.map(m=>({...m,cargo:m.cargo.map(c=>({...c,scu:Number.isInteger(c.scu)?c.scu:0}))})),manualContext?.startId||$('start-location').value,planSettings):planRoute(data,missions,manualContext?.startId||$('start-location').value,{...planSettings,ship});selectedStop=0;renderPlan();execution?.setPlan(plan,byId);save();}catch(e){emptyPlan();notify(e.message,true);}
}
// Each system jump is its own numbered row in the visit order (same numbers as the run panel and map labels);
// clicking it selects the stop it leads to.
function jumpRows(visit,i,numbers,compact=false){
 return jumpSegments(visit.leg,byId).map((j,q)=>compact
  ?`<button type="button" class="map-route-item map-route-jump" data-jump-of="${i}"><span class="map-route-n">${numbers[q]}</span><span class="map-route-text"><b>항성계 점프</b><small>${esc(j.entryName)} → 점프 → ${esc(j.exitName)}</small></span></button>`
  :`<button type="button" class="stop stop-jump" data-jump-of="${i}"><span class="stop-number">${numbers[q]}</span><span class="stop-content"><span class="stop-head"><span>항성계 점프</span><span class="stop-time">${esc(j.fromSystem.toUpperCase())} → ${esc(j.toSystem.toUpperCase())}</span></span><span class="stop-event" style="display:block"><span class="jump">◆ 게이트웨이 이동</span> ${esc(j.entryName)} → 점프 → ${esc(j.exitName)}</span><span class="stop-foot">이동 시간은 다음 거점 예상에 포함 · 점프 후 「점프 완료」</span></span></button>`).join('');
}
function renderPlan(){
 $('route-distance').textContent=fmtDist(plan.visits.reduce((sum,v)=>sum+(v.leg.meters||0),0));$('route-jumps').textContent='항성계 점프 '+plan.visits.reduce((sum,v)=>sum+(v.leg.jumps||0),0)+'회';
 computeDestOrder();const low=Math.max(1,Math.round(plan.seconds/60*.8)),high=Math.ceil(plan.seconds/60*1.3);$('eta').textContent=`${low}–${high}분`;$('peak').innerHTML=plan.simple?`${fmt(plan.peak)} <em>SCU · 용량 미계산</em>`:`${fmt(plan.peak)} <em>/ ${plan.capacity} SCU</em>`;$('stops').textContent=plan.visits.length+'곳';const total=missions.reduce((a,m)=>a+(Number(m.reward)||0),0),scu=plan.shipments.reduce((a,s)=>a+(s.scu||0),0),hrLow=plan.seconds*1.3/3600,hrHigh=plan.seconds*.8/3600;plan.totalReward=total;$('reward').innerHTML=total?`<span class="metric-value">${fmt(total)}</span> <em>aUEC</em>`:'—';$('reward-rate').innerHTML=total?`<b>시간당 ${fmt(Math.round(total/hrLow/1000)*1000)}–${fmt(Math.round(total/hrHigh/1000)*1000)} aUEC</b> · SCU당 ${fmt(Math.round(total/Math.max(1,scu)))}`:'보상 입력 시 시간당 수익 계산';$('jumps').textContent=plan.visits.reduce((a,v)=>a+v.leg.jumps,0)+'회 행성계 점프';$('packing-state').textContent=plan.simple?'간편 경로 · 입력된 SCU 합계':plan.warnings.length?'상자 크기 가정 포함':'입력된 상자 크기로 확인';$('plan-status').textContent=plan.manual?'직접 수정한 경로 · 작업·적재 확인':plan.settings.routePolicy==='delivery-first'?'계약 완료 우선 · 가까운 픽업 함께 처리':plan.simple?'재방문 최소화 · 이동거리 우선 · 용량 미반영':'재방문 최소화 · 이동거리 우선 · 적재 한도 확인';
 const steps=stepNumbers(plan.visits,byId);$('itinerary').innerHTML=plan.visits.map((v,i)=>`${jumpRows(v,i,steps.jumps[i])}<button type="button" class="stop ${i===selectedStop?'active':''}" data-stop="${i}"><span class="stop-number">${steps.stop[i]}</span><span class="stop-content"><span class="stop-head"><span>${esc(locationText(v.locationId))}</span><span class="stop-time"><b>${isDeparture(v)?'출발지':`이 구간 약 ${Math.max(1,minutes(v.seconds))}분`}</b>${v.leg.meters?' · '+fmtDist(v.leg.meters):''} · 누적 ${minutes(v.elapsed)}분</span></span>${v.events.map(e=>`<span class="stop-event" style="display:block">${e.type!=='return'&&plan.shipments[e.shipmentIndex]?destDot(plan.shipments[e.shipmentIndex].dropoffId):''}<span class="${e.type}">${e.type==='departure'?'출발':e.type==='pickup'?'↑ 픽업':e.type==='waypoint'?'◇ 경유':e.type==='return'?'↩ 복귀':'↓ 배송'}</span> ${e.type==='departure'?esc(locationText(v.locationId)):esc(plan.shipments[e.shipmentIndex]?locationText(plan.shipments[e.shipmentIndex].dropoffId):e.type==='waypoint'?'경유':e.missionId)}${e.type==='departure'?'':' · '+esc(e.commodity)} ${e.scu||''}${e.scu?' SCU':''}${plan.shipments[e.shipmentIndex]?.boxes?.length?' · '+containerText(plan.shipments[e.shipmentIndex].boxes):''}</span>`).join('')}<span class="load-bar" style="display:block"><span style="width:${v.load/(plan.capacity||Math.max(1,plan.peak))*100}%"></span></span><span class="stop-foot" style="display:block">작업 후 ${v.load} SCU${plan.simple?'':' · '+v.packing.boxes.length+'상자'}${v.leg.jumps?' · ⇄ '+esc((v.leg.gateways||[]).join(' → '))+' 경유 점프':''}${v.blocked?.length?` · <b class="blocked-badge">⚠ 먼저 옮길 상자 ${new Set(v.blocked.flatMap(x=>x.blockers.map(o=>o.boxId))).size}</b>`:''}</span></span></button>`).join('');
 $('itinerary').querySelectorAll('[data-stop]').forEach(b=>b.onclick=()=>selectStop(Number(b.dataset.stop),true));$('itinerary').querySelectorAll('[data-jump-of]').forEach(b=>b.onclick=()=>selectStop(Number(b.dataset.jumpOf),true));
 $('warnings').innerHTML=plan.warnings.map(w=>`<div class="warning">${esc(w)}</div>`).join('');selectStop(selectedStop,false);
}
// Full-window map: route list, "this stop" card and the cargo 3D view float over the map. The normal page layout is unchanged.
// 운항 모드 = full-window map. The live-run panel (#execution) moves onto the map and returns to the plan page afterwards.

// 「지도만 크게 보기」: the map alone, full screen, with no flight panels on top.
function setMapSolo(on){const wrap=$('map-wrap');wrap.classList.toggle('map-expanded',on);wrap.classList.toggle('map-solo',on);$('map-overlay').hidden=true;
 const button=$('map-ui-toggle');button.textContent=on?'지도 닫기':'지도만 크게 보기';button.setAttribute('aria-pressed',String(on));button.setAttribute('aria-expanded','false');}
// 운항 모드: full screen split into map (left), cargo 3D (right) and the flight progress bar (bottom).
// The real map, cargo view and execution panel are moved in and returned to their places on exit.
const runHomes=new Map();
function setMapExpanded(on){if(on===!$('run-desk').hidden)return;if(on)setMapSolo(false);
 document.body.classList.toggle('map-fullscreen',on);$('run-desk').hidden=!on;
 for(const b of [$('map-expand'),$('run-view')]){b.textContent=on?'메인 화면으로 돌아가기':'관제 모드';b.setAttribute('aria-pressed',String(on));}
 const parts=[[$('map-wrap'),'run-desk-map'],[$('cargo-view'),'run-desk-cargo'],[$('execution'),'run-desk-bar']];
 if(on){for(const [el,slot] of parts){runHomes.set(el,{parent:el.parentNode,next:el.nextSibling});$(slot).append(el);}}
 else for(const [el] of parts){const home=runHomes.get(el);if(home)home.parent.insertBefore(el,home.next);}
 if(plan&&selectedStop>=0)selectStop(selectedStop,false);
 // Leave no focused toggle behind: Space/Enter must complete the stop, not press this button again.
 document.activeElement?.blur?.();}
function startInlineRun(){if(!plan){notify('미션을 입력하고 경로를 먼저 계산하십시오.',true);return;}execution?.start();$('execution').scrollIntoView({behavior:'smooth',block:'center'});}
function openMapCargo(){$('map-cargo-host').append($('cargo-view'));$('map-cargo-host').hidden=false;renderMapOverlay();}
function closeMapCargo(){if($('map-cargo-host').hidden)return;const home=document.querySelector('.cargo-caption').parentNode;home.insertBefore($('cargo-view'),home.querySelector('.cargo-caption'));$('map-cargo-host').hidden=true;renderMapOverlay();}
// Cargo by destination for one stop: colour + destination + commodity/SCU (mission codes stay internal).
function cargoByDest(events,type){const out=new Map();for(const e of events){if(e.type!==type)continue;const s=plan.shipments[e.shipmentIndex];if(!s)continue;const g=out.get(s.dropoffId)||out.set(s.dropoffId,new Map()).get(s.dropoffId);g.set(e.commodity,(g.get(e.commodity)||0)+(e.scu||0));}return out;}
function commodityText(g){return [...g].map(([c,n])=>`${esc(c)} ${n} SCU`).join(' · ');}
function boxText(boxes){if(!boxes.length)return '';const bins=new Set(),sizes=new Map();for(const b of boxes){bins.add(binName(b.bin).split(' · ')[0]);sizes.set(b.size,(sizes.get(b.size)||0)+1);}return `${[...bins].join('·')} · ${[...sizes].sort((a,b)=>b[0]-a[0]).map(([s,n])=>`${s} SCU×${n}`).join(' · ')}`;}
function missionLabel(id){const m=missions.find(x=>x.id===id);return m?(m.company||m.title||'계약')+(m.reward?` · ${m.reward.toLocaleString('ko-KR')} aUEC`:''):'계약';}
function boxGroups(boxes){const g=new Map();for(const b of boxes){const k=b.missionId+'|'+b.size+'|'+b.dropoffId;const e=g.get(k)||{missionId:b.missionId,size:b.size,dropoffId:b.dropoffId,count:0,bins:new Set()};e.count++;e.bins.add(binName(b.bin).split(' · ')[0]);g.set(k,e);}return [...g.values()];}
function renderMapOverlay(){
 if(!$('map-wrap').classList.contains('map-expanded'))return;const card=$('map-stop-card');
 if(!plan||selectedStop<0){$('map-route-list').innerHTML='<p class="map-empty">미션을 입력하면 방문 순서가 나옵니다.</p>';card.hidden=true;return;}
 const steps=stepNumbers(plan.visits,byId);$('map-route-list').innerHTML=plan.visits.map((v,i)=>{const up=v.events.filter(e=>e.type==='pickup'),down=v.events.filter(e=>e.type==='delivery');return `${jumpRows(v,i,steps.jumps[i],true)}<button type="button" class="map-route-item ${i===selectedStop?'active':''}" data-map-stop="${i}"><span class="map-route-n">${steps.stop[i]}</span><span class="map-route-text"><b>${esc(locationText(v.locationId))}</b><small>${isDeparture(v)?'출발지':''}${up.length?`↑ 픽업 ${up.reduce((a,e)=>a+e.scu,0)} SCU`:''}${up.length&&down.length?' · ':''}${down.length?`↓ 배송 ${down.reduce((a,e)=>a+e.scu,0)} SCU`:''}${isDeparture(v)?'':` · 약 ${Math.max(1,minutes(v.seconds))}분`}</small></span></button>`;}).join('');
 $('map-route-list').querySelectorAll('[data-map-stop]').forEach(b=>b.onclick=()=>selectStop(Number(b.dataset.mapStop),true));$('map-route-list').querySelectorAll('[data-jump-of]').forEach(b=>b.onclick=()=>selectStop(Number(b.dataset.jumpOf),true));
 $('map-route-list').querySelector('.active')?.scrollIntoView({block:'nearest'});
 const v=plan.visits[selectedStop],n=plan.visits.length;let rows='';
 const before=plan.simple?null:selectedStop?plan.visits[selectedStop-1].packing:(plan.initialPacking||packBoxes([],[],ship)),after=new Map((v.packing?.boxes||[]).map(b=>[b.boxId,b]));
 const downBoxes=before?before.boxes.filter(b=>b.dropoffId===v.locationId):[],upBoxes=plan.simple?[]:(v.loadOrder||[]).map(id=>after.get(id)).filter(Boolean);
 for(const [dest,g]of cargoByDest(v.events,'delivery'))rows+=`<li class="down">${destDot(dest)}↓ 하역 <b>${commodityText(g)}</b>${downBoxes.length?`<small>${boxText(downBoxes)}</small>`:''}</li>`;
 for(const [dest,g]of cargoByDest(v.events,'pickup'))rows+=`<li class="up">${destDot(dest)}↑ 적재 <b>→ ${esc(locationText(dest))}</b> · ${commodityText(g)}${upBoxes.length?`<small>${boxText(upBoxes.filter(b=>b.dropoffId===dest))}</small>`:''}</li>`;
 if(!plan.simple){
   if(v.blocked?.length)rows+=`<li class="warn">⚠ 하역 전에 먼저 옮길 상자 ${new Set(v.blocked.flatMap(x=>x.blockers.map(o=>o.boxId))).size}개 · 적재 3D에서 확인</li>`;}
 card.hidden=false;card.innerHTML=`<div class="map-stop-head"><span>${selectedStop+1} / ${n}번째 거점</span><small>${isDeparture(v)?'출발지':`이 구간 약 ${Math.max(1,minutes(v.seconds))}분`}${v.leg.jumps?' · 점프 경유':''}</small></div><h3>${esc(locationText(v.locationId))}</h3><ul class="map-stop-rows">${rows||'<li>이 거점에서 할 화물 작업이 없습니다.</li>'}</ul><div class="map-stop-actions"><button type="button" id="map-cargo-detail" class="quiet">적재 상세</button>${plan.simple?'':`<button type="button" id="map-cargo-open" class="quiet">${$('map-cargo-host').hidden?'적재 3D 보기':'적재 3D 닫기'}</button>`}${selectedStop<n-1?'<button type="button" id="map-next-stop" class="quiet">다음 거점 보기 ▸</button>':''}</div>`;
 $('map-cargo-detail')&&($('map-cargo-detail').onclick=openCargoDetail);
 $('map-cargo-open')&&($('map-cargo-open').onclick=()=>$('map-cargo-host').hidden?openMapCargo():closeMapCargo());$('map-next-stop')&&($('map-next-stop').onclick=()=>selectStop(selectedStop+1,true));
}
function selectStop(i,focus){
 if(!plan)return;selectedStop=i;const v=plan.visits[i],l=byId.get(v.locationId);document.querySelectorAll('[data-stop]').forEach(b=>b.classList.toggle('active',Number(b.dataset.stop)===i));$('cargo-step').textContent=`${i+1}번 거점 작업 후`;
 if(map?.selectedSystem()!==l.system)setSystem(l.system);map?.setRoute(plan,i);if(focus)(map?.focusLeg?map.focusLeg(i):map?.focus(v.locationId));renderMapOverlay();
 if(plan.simple)return;
 const oldFilter=$('cargo-filter').value,beforePacking=i?plan.visits[i-1].packing:(plan.initialPacking||packBoxes([],[],ship));$('cargo-filter').innerHTML='<option value="">전체 화물</option>'+(v.events.some(e=>e.type==='delivery')?'<option value="__unload__">이 거점에서 내릴 상자</option>':'')+[...new Set([...v.packing.boxes,...beforePacking.boxes].map(b=>b.missionId))].map(id=>`<option value="${esc(id)}">${esc(missionLabel(id))}</option>`).join('');if([...$('cargo-filter').options].some(o=>o.value===oldFilter))$('cargo-filter').value=oldFilter;
 // Each stop opens on its own work: pickups show the hold after loading here, delivery-only stops show it before unloading.
 const loads=v.events.some(e=>e.type==='pickup');$('cargo-phase').value=loads?'after':'before';if(loads&&$('cargo-filter').value==='__unload__')$('cargo-filter').value='';renderCargo();

}
function openCargoDetail(){
 if(mode==='simple'){setMode('detail');if(!plan||plan.simple){notify('미션의 수량·상자 구성을 확인한 뒤 상세 적재를 계산하십시오.',true);return;}}
 if(!plan||selectedStop<0){notify('미션을 입력하고 거점을 선택하면 적재 상세를 볼 수 있습니다.',true);return;}
 let dialog=$('cargo-detail-dialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='cargo-detail-dialog';dialog.className='cargo-detail-dialog';dialog.setAttribute('aria-label','적재 상세');document.body.append(dialog);}
 const draw=()=>{renderCargo();const phase=$('cargo-phase').value;dialog.innerHTML=`<div class="dialog-title"><h2>적재 상세 · ${esc(locationText(plan.visits[selectedStop].locationId))}</h2><button type="button" data-detail-close aria-label="닫기">×</button></div><div class="cargo-phase-buttons" role="group" aria-label="적재 표시 시점">${['before','after'].map(value=>`<button type="button" data-detail-phase="${value}" aria-pressed="${phase===value}">${isEn?(value==='before'?'Before stop operations':'After stop operations'):(value==='before'?'거점 작업 전':'거점 작업 후')}</button>`).join('')}</div><div class="cargo-legend">${$('cargo-legend').innerHTML}</div><div class="cargo-instructions">${$('cargo-instructions').innerHTML}</div><h3>그리드별 상자 목록</h3><div class="cargo-detail-table">${$('cargo-table').innerHTML||'이 시점의 화물칸은 비어 있습니다.'}</div>`;dialog.querySelector('[data-detail-close]').onclick=()=>dialog.close();dialog.querySelectorAll('[data-detail-phase]').forEach(b=>b.onclick=()=>{$('cargo-phase').value=b.dataset.detailPhase;if($('cargo-filter').value==='__unload__')$('cargo-filter').value='';draw();});};
 draw();dialog.showModal();
}
function renderCargoDetails(packing){
 const v=plan.visits[selectedStop],boxById=new Map(packing.boxes.map(b=>[b.boxId,b])),where=b=>`${binName(b.bin)} · 칸 ${b.cell.map(x=>x+1).join(',')}`;
 const dests=[...new Set(packing.boxes.map(b=>b.dropoffId))].sort((a,b)=>destIndex(a)-destIndex(b));
 $('cargo-legend').innerHTML=dests.map(id=>`<span>${destDot(id)}${destIndex(id)+1}번째 도착 · ${esc(locationText(id))}</span>`).join('')||'<span class="subtle">빈 화물칸</span>';
 let html='';
 if(v?.loadOrder?.length){const order=v.loadOrder.map(id=>boxById.get(id)).filter(Boolean);html+=`<div class="load-order"><b>적재 순서 · 안쪽부터</b> <span class="subtle">(나중에 내릴 상자를 먼저 안쪽에)</span><ol>${order.map(b=>`<li>${destDot(b.dropoffId)}${esc(locationText(b.dropoffId))} · ${b.size} SCU → ${esc(where(b))}</li>`).join('')}</ol></div>`;}
 if(v?.blocked?.length){html+=`<div class="blocked-note"><b>⚠ 이 거점 하역 전에 옮길 상자</b><ul>${v.blocked.map(x=>`<li>${destDot(x.dropoffId)}${esc(locationText(x.dropoffId))} ${x.size} SCU를 꺼내려면 → ${x.blockers.map(o=>`${destDot(o.dropoffId)}${esc(locationText(o.dropoffId))} ${o.size} SCU`).join(', ')} 먼저 이동</li>`).join('')}</ul></div>`;}
 const groups=new Map();for(const b of packing.boxes){const k=b.dropoffId;const arr=groups.get(k)||[];arr.push(b);groups.set(k,arr);}
 html+=[...groups].sort((a,b)=>destIndex(a[0])-destIndex(b[0])).map(([id,boxes])=>{const bins=[...new Set(boxes.map(b=>binName(b.bin)))],ms=[...new Set(boxes.map(b=>b.missionId))];return `<div>${destDot(id)}<b>${destIndex(id)+1}번째 도착 · ${esc(locationText(id))}</b> · ${boxes.length}상자 / ${boxes.reduce((a,b)=>a+b.size,0)} SCU<br><span>${esc(bins.join(', '))}</span></div>`;}).join('');
 $('cargo-instructions').innerHTML=html||'이 시점 화물칸 비어 있음';
 $('cargo-table').innerHTML=packing.bins.map((bin,index)=>bin.boxes.length?`<p><b>${binName(index)} · ${bin.used}/${bin.grid.w*bin.grid.h*bin.grid.l} SCU</b><br>${bin.boxes.map(b=>`${destDot(b.dropoffId)}${esc(locationText(b.dropoffId))} / ${esc(b.commodity)} / ${b.size} SCU / 칸 ${b.cell.map(x=>x+1).join(',')}`).join('<br>')}</p>`:'').join('');
}
async function addFiles(incoming,auto=true){const valid=[...incoming].filter(f=>['image/jpeg','image/png','image/webp'].includes(f.type));if(files.length+valid.length>12){notify('스샷은 한 번에 12장까지 올릴 수 있습니다.',true);return;}for(const f of valid){if(f.size>15*1024*1024){notify(`${f.name}: 15MB 이하 이미지만 올릴 수 있습니다.`,true);continue;}files.push({file:f,url:URL.createObjectURL(f),processed:false});}renderUploads();if(auto&&$('auto-read').checked&&!busy&&$('read-method').value==='local')analyze();}
function renderUploads(){$('uploads').innerHTML=files.map((f,i)=>`<div class="upload-thumb"><img src="${f.url}" alt="${esc(f.file.name)}"><button data-file="${i}" aria-label="스크린샷 삭제">×</button></div>`).join('');$('uploads').querySelectorAll('[data-file]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.file);URL.revokeObjectURL(files[i].url);files.splice(i,1);renderUploads();});$('analyze').disabled=!files.length||busy;$('ocr-stop').hidden=!busy;}
async function encode(file){const bitmap=await createImageBitmap(file),scale=Math.min(1,2200/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();return canvas.toDataURL('image/jpeg',.9);}
const norm=s=>String(s||'').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'');
function resolveLocation(name,system){if(!name)return '';const n=norm(name),candidates=data.locations.filter(l=>(!system||l.system===system)&&norm(l.name)===n);if(candidates.length===1)return candidates[0].id;return matchLocation(name,data.locations,{system:system||null,fuzzy:String(name).length<=40})?.id||'';}
function validateMissions(value){if(!Array.isArray(value)||value.length>30)throw Error('미션은 최대 30개까지 넣을 수 있습니다.');const ids=new Set();for(const m of value){if(typeof m.id!=='string'||!m.id.trim()||ids.has(m.id)||!Array.isArray(m.cargo)||!m.cargo.length)throw Error('미션 ID 중복 또는 화물 누락을 확인하십시오.');ids.add(m.id);for(const c of m.cargo){if(c.scu!==null&&(!Number.isInteger(c.scu)||c.scu<=0||c.scu>10000))throw Error(`${m.id}: SCU를 확인하십시오.`);if(c.boxes&&!Array.isArray(c.boxes))throw Error('상자 목록 형식을 확인하십시오.');}}return value;}
async function analyzeAI(){
 if(!editable())return;
 const endpoint=apiUrl||(['localhost','127.0.0.1'].includes(location.hostname)?location.origin:'');if(!endpoint||!token){notify('설정에서 AI 서버 주소와 접속 토큰을 입력하십시오.');openSettings();return;}
 busy=true;renderUploads();$('analyze').textContent='스크린샷 읽는 중…';notify('미션별 화물과 배송지를 읽는 중입니다. 같은 미션의 여러 화면은 합쳐서 처리합니다.');
 try{const images=await Promise.all(files.map(f=>encode(f.file)));const response=await fetch(endpoint.replace(/\/$/,'')+'/analyze',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({images,locations:data.locations.filter(l=>l.qt).map(l=>({name:l.name,system:l.system}))}),signal:AbortSignal.timeout(180000)});let result;try{result=await response.json();}catch{throw Error('AI 서버 응답이 올바르지 않습니다. 서버 주소를 확인하십시오.');}if(!response.ok)throw Error(result.error||'스샷을 읽지 못했습니다.');
  const incoming=result.missions.map((m,i)=>({id:m.missionId||`SCREENSHOT-${Date.now()}-${i+1}`,title:m.title||'',company:m.company||'',reward:m.reward||0,cargo:m.cargo.map(c=>({commodity:c.commodity||'화물',scu:c.scu,maxBoxSize:c.maxBoxSize||null,pickupId:resolveLocation(c.pickupName,c.pickupSystem),dropoffId:resolveLocation(c.dropoffName,c.dropoffSystem),_pickupText:c.pickupName,_dropoffText:c.dropoffName,boxes:c.boxes||[]}))})).map(m=>workbench.apply(m));validateMissions(incoming);
  let replaced=0;for(const m of incoming){const i=missions.findIndex(x=>x.id===m.id);if(i>=0){missions[i]=m;replaced++;}else missions.push(m);}renderMissions();save();notify(`${incoming.length}개 미션을 읽었어${replaced?` · 중복 ID ${replaced}개 갱신`:''}. ${result.warnings?.join(' ')||'수량과 배송지를 확인하십시오.'}`);replan();
 }catch(e){notify(e.name==='TimeoutError'?'AI 응답이 너무 오래 걸립니다. 이미지 수를 줄여 다시 시도하십시오.':e.message,true);}finally{busy=false;$('analyze').innerHTML='스크린샷 읽고 계획하기 <span>↗</span>';renderUploads();}
}
// Transcribed contracts are separated by explicit --- lines or new mission headings.
const AI_PROMPT=`첨부한 스타시티즌 운송 미션 화면을 앱에 붙여넣을 수 있는 일반 텍스트로 옮겨 주십시오.

출력 형식 — 계약마다 아래 순서를 지켜 주십시오.
화면에 표시된 미션 제목 전체
보상 ¤ 화면에 표시된 금액
계약 발주자 화면에 표시된 발주처
주 목표의 배송·접수 문장 전부 (화면 순서대로 한 줄에 한 문장)

반드시 지킬 규칙:
- 계약이 여러 개면 각 계약 사이에 --- 만 적힌 줄을 반드시 넣어 주십시오. 제목·발주처·품목이 같아도 서로 다른 계약은 합치지 마세요.
- 같은 계약이 여러 화면에 이어지면 중복된 부분만 한 번 적고, 이어지는 주 목표를 빠짐없이 적어 주십시오. 확실하지 않으면 임의로 합치지 마세요.
- 제목의 크기·랭크·평판, 보상 금액, 발주처를 생략하지 마세요. 보상 줄은 반드시 '보상 ¤ 금액', 발주처 줄은 '계약 발주자 이름' 형식으로 적어 주십시오.
- 품목명·지명·대괄호 [ ] 안의 영어 이름·0/수량 SCU를 원문 그대로 적어 주십시오. 번역·이름 교정·수량 계산·상자 크기 추정은 하지 마세요.
- 하나의 배송 목표 아래 픽업지가 여러 곳이면 접수 문장을 모두 적어 주십시오. 총 SCU를 픽업지별로 임의 분배하거나 같은 문장처럼 보여도 지우지 마세요.
- 읽히지 않는 부분은 [확인 필요]로 표시하고 지어내지 마세요. 세부 내역 설명과 다른 메뉴는 빼 주십시오.
- 출력에는 계약 텍스트와 구분선만 넣어 주십시오. 설명·표·목록 기호·마크다운 제목·코드 블록을 넣지 마세요. 실제 줄바꿈을 쓰고 HTML 줄바꿈 코드나 줄 끝 역슬래시는 쓰지 마세요.`;
// The two copy buttons share this request and differ only by interface language.
const AI_PROMPT_EN=`Transcribe the attached Star Citizen hauling mission screens as plain text for import into an app.

For each contract, use this order:
The complete mission title as displayed
Reward: the displayed amount and currency
Contracted By: the displayed contractor
Every Deliver / Collect / Pick up line from the Primary Objectives, in screen order, one sentence per line

Required rules:
- Put a line containing only --- between separate contracts. Never merge different contracts just because their title, contractor or commodities are the same.
- If one contract continues across screenshots, transcribe overlapping content once and retain all continuing objectives. Do not merge contracts when uncertain.
- Keep the full title, including size, rank and reputation, the reward and contractor. Always prefix the reward with 'Reward:' and the contractor with 'Contracted By:'.
- Preserve commodity and location names, bracketed aliases, quantities and 0/quantity SCU exactly as shown. Do not translate, correct names, calculate quantities or infer container sizes.
- If one delivery lists several pickup locations, retain every pickup line. Do not divide its total SCU between pickups or remove lines merely because they look similar.
- Mark unreadable text as [needs checking]; never invent it. Omit the details description and other menus.
- Output only contract text and separators. No commentary, tables, bullets, Markdown headings or code fences. Use real line breaks, without HTML line-break entities or trailing backslashes.`;
const aiPrompt=()=>isEn?AI_PROMPT_EN:AI_PROMPT;
function importMissionText(text){
 const chunks=splitMissionText(text);let added=0,skipped=0;
 for(const chunk of chunks){const parsed=parseMissionText(chunk,data.locations);if(!parsed.cargo.length){skipped++;continue;}const id='M-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,5).toUpperCase();let m={id,title:parsed.title,company:parsed.company,reward:parsed.reward,returnId:parsed.returnId,cargo:parsed.cargo,_rawText:chunk,_sourceName:'텍스트 붙여넣기',_gameMissionId:parsed.missionId,_ocrWarnings:parsed.warnings};m=workbench.apply(m);missions.push(m);added++;}
 if(added){renderMissions();replan();save();}return {added,skipped,warnings:[...new Set(missions.slice(-added).flatMap(m=>(m._ocrWarnings||[]).filter(w=>!/실제 상자 구성/.test(w))))]};
}
function importText(){
 if(!editable()||busy)return;if(!$('mission-text').value.trim()){notify('AI 앱이 옮겨 적은 글을 먼저 붙여 넣어 주십시오.',true);return;}
 const {added,skipped,warnings}=importMissionText($('mission-text').value);
 if(!added){notify('배송 문장(…SCU …에 배송하십시오)을 찾지 못했습니다. 주 목표 문장이 들어 있는지 확인하십시오.',true);return;}
 $('mission-text').value='';notify(`${added}개 미션을 글자로 입력했습니다.${skipped?` 배송 문장이 없는 ${skipped}개 묶음은 건너뛰었습니다.`:''}${warnings.length?' ⚠ '+warnings.join(' '):''} 아래에서 장소와 상자 구성을 확인하십시오.`,warnings.length>0);$('manifest-workbench').scrollIntoView({behavior:'smooth',block:'start'});
}
async function analyze(){
 if($('read-method').value==='ai')return analyzeAI();if(!editable()||busy)return;const pending=files.filter(f=>!f.processed);if(!pending.length){notify('새 스샷을 추가하거나 아래에서 미션을 수정하십시오.');return;}busy=true;ocrCancelled=false;renderUploads();notify('글자 인식 준비 중입니다. 처음 한 번은 인식 모델을 내려받습니다. 사진은 서버로 보내지 않습니다.');
 try{for(let i=0;i<pending.length;i++){if(ocrCancelled)break;const f=pending[i];$('analyze').textContent='인식 '+(i+1)+' / '+pending.length;const r=await recognizeImage(f.file,{language:$('ocr-language').value,onProgress:m=>{if(m.status==='recognizing text')notify((i+1)+'/'+pending.length+'장 · 글자 인식 '+Math.round((m.progress||0)*100)+'%');}});if(ocrCancelled)break;const parsed=parseMissionText(r.text,data.locations),bitmap=await createImageBitmap(f.file),cv=document.createElement('canvas'),scale=Math.min(1,800/bitmap.width);cv.width=Math.round(bitmap.width*scale);cv.height=Math.round(bitmap.height*scale);cv.getContext('2d').drawImage(bitmap,0,0,cv.width,cv.height);bitmap.close();const id='M-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,5).toUpperCase();let m={id,title:parsed.title,company:parsed.company,reward:parsed.reward,returnId:parsed.returnId,cargo:parsed.cargo,_rawText:r.text,_sourceName:f.file.name,_sourcePreview:cv.toDataURL('image/jpeg',.65),_gameMissionId:parsed.missionId,_ocrWarnings:parsed.warnings};m=workbench.apply(m);missions.push(m);f.processed=true;renderMissions();replan();save();notify(parsed.warnings.join(' '));}if(!ocrCancelled){notify('스샷 내용을 자동 입력했습니다. 아래 미션별 화물 확인에서 빈 값·잘못 읽힌 값·상자 구성을 확인하십시오.');$('manifest-workbench').scrollIntoView({behavior:'smooth',block:'start'});}}
 catch(e){if(!ocrCancelled)notify('인식이 끝나지 않았어: '+e.message+' · 직접 입력은 계속 사용할 수 있습니다.',true);await stopOCR();}
 finally{busy=false;$('analyze').innerHTML='스샷 읽고 자동 입력 <span>↗</span>';renderUploads();}
}
function setMode(next,recalc=true){const previous=mode;mode=next==='simple'?'simple':'detail';if(recalc&&previous!==mode&&!editable()){mode=previous;return;}document.body.classList.toggle('simple-mode',mode==='simple');document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));try{localStorage.setItem('vh-mode',mode);}catch{}if(recalc){if(missions.length)replan();else emptyPlan();}}
function toggleCargoGrid(index){
 const grid=ship.grids[index];if(!grid)return;
 const aboard=execution?.resumeContext()?.resume.aboard||[];
 if(!grid.disabled&&aboard.some(b=>b.bin===index)){notify('이미 화물이 실린 그리드는 끌 수 없습니다. 하역 후 변경하십시오.',true);return;}
 const disabled=new Set(ship.grids.filter(g=>g.disabled).map(g=>g.id));if(grid.disabled)disabled.delete(grid.id);else disabled.add(grid.id);
 settings.disabledGrids={...settings.disabledGrids,[ship.id]:[...disabled]};syncShip();save();
 if(!capacity(ship))notify('사용할 화물 그리드를 하나 이상 켜 주십시오.',true);else if(plan||!missions.length)notify(grid.disabled?'그리드를 켰습니다. 적재 계산에 포함합니다.':'그리드를 껐습니다. 적재 계산에서 제외합니다.');
}
function syncShip(){const base=fleet.getShip();ship=withStacking(selectShipGrids(base,settings.disabledGrids?.[base.id]));if(performancePanel)settings.performance=performancePanel.setShip(ship);$('ship-badge-name').textContent=ship.name;renderShipPanel();$('ship-badge-capacity').textContent=capacity(ship)+' SCU';$('cargo-heading').textContent=ship.name+' 적재 배치';const caption=document.querySelector('.cargo-caption');if(caption)caption.textContent='화물 그리드만 표시 · 주황 화살표 = 기수 방향'+(hullKind(ship)==='hull-b'?' · 드래그로 돌려 좌현·우현을 확인':' · 드래그로 회전')+' · 그리드 위치는 그리드 수정에서 변경';if($('grid-summary'))$('grid-summary').textContent=ship.grids.length+'개 그리드 · '+capacity(ship)+' SCU · 미션별로 나눠 적재';replan();if(!missions.length)emptyPlan();}
function openSettings(){const field={'quantum-speed':'quantumSpeed','jump-minutes':'jumpMinutes','dock-minutes':'dockMinutes','surface-minutes':'surfaceMinutes','surface-distance':'surfaceDistanceKm','box-seconds':'secondsPerBox','unknown-box':'unknownBox'};for(const [id,k] of Object.entries(field))$(id).value=settings[k];$('voice').value=voiceId();$('api-url').value=apiUrl;$('api-token').value=token;$('settings').showModal();}
function applySettings(){const vals={'quantumSpeed':Number($('quantum-speed').value),'jumpMinutes':Number($('jump-minutes').value),'dockMinutes':Number($('dock-minutes').value),'surfaceMinutes':Number($('surface-minutes').value),'surfaceDistanceKm':Number($('surface-distance').value),'secondsPerBox':Number($('box-seconds').value),'unknownBox':Number($('unknown-box').value)};for(const id of ['quantum-speed','jump-minutes','dock-minutes','surface-minutes','surface-distance','box-seconds'])if(!$(id).reportValidity())return;const url=$('api-url').value.trim();if(url){let u;try{u=new URL(url);}catch{notify('서버 주소가 올바르지 않습니다.',true);return;}if(u.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(u.hostname)){notify('외부 AI 서버는 HTTPS 주소만 사용할 수 있습니다.',true);return;}}setVoice($('voice').value);settings.routePolicy=routePolicy();execution?.refresh?.();settings={...settings,...vals};apiUrl=url;token=$('api-token').value;try{localStorage.setItem('vh-api',apiUrl);}catch{}$('settings').close();save();replan();}
function cargoEditor(c={commodity:'',scu:32,boxes:[]}){const row=document.createElement('div');row.className='edit-cargo-row';row._receivedCargo=c;row.innerHTML=`<label>화물 종류<input class="commodity" required value="${esc(isEn?c.commodity:(displayGoods[c.commodity]||c.commodity))}"></label><label>수량 (SCU)<input class="scu" required type="number" min="1" max="10000" value="${c.scu}" ${c._quantityBounds&&!c.scu?`placeholder="${isEn?'Check amount':'수량 확인'}${Number.isFinite(c._quantityBounds.max)?' · max '+c._quantityBounds.max:''}"`: ''}></label><label class="wide">픽업지 ${c._pickupText&&!c.pickupId?'· 읽은 이름: '+esc(c._pickupText):''}<select class="pickup" required>${optionMarkup(c.pickupId)}</select></label><label class="wide">배송지 ${c._dropoffText&&!c.dropoffId?'· 읽은 이름: '+esc(c._dropoffText):''}<select class="dropoff" required>${optionMarkup(c.dropoffId)}</select></label><label>미션 최대 상자 크기 (선택)<select class="max-box"><option value="">미확인</option>${[1,2,4,8,16,24,32].map(size=>`<option value="${size}" ${c.maxBoxSize===size?'selected':''}>${size} SCU</option>`).join('')}</select></label><label class="wide">상자 크기×개수 (선택)<input class="boxes" placeholder="32x2, 16x1" value="${esc(c.boxes?.map(b=>b.size+'x'+b.count).join(', ')||'')}"></label><button type="button" class="remove-cargo quiet">이 화물 삭제</button>`;if(!isEn)commodityReference(row.querySelector('.commodity'));row.querySelector('.remove-cargo').onclick=()=>row.remove();$('edit-cargo').append(row);}
function openEditor(index,draft=null){if(!editable())return;editIndex=index;editDraft=draft;editSaved=false;const m=missions[index]||draft||{id:'M-'+String(missions.length+1).padStart(2,'0'),company:'',title:'',reward:0,cargo:[{commodity:'운송 화물',scu:32,boxes:[]}]};const form=$('edit-form');form.elements.missionId.value=m.id;form.elements.missionId.readOnly=!!draft?._logInbox;let hint=form.querySelector('.inbox-review-note');if(hint)hint.remove();if(draft?._logInbox){hint=document.createElement('p');hint.className='inbox-review-note';hint.textContent=isEn?'Review the received details. Fill any missing cargo or stops. Saving adds this contract to your plan.':'수신한 내용을 확인하십시오. 빠진 화물·수량·거점은 직접 채울 수 있습니다. 저장하면 운송 계획에 등록합니다.';form.querySelector('.dialog-title').after(hint);}form.elements.company.value=m.company;form.elements.title.value=m.title;form.elements.reward.value=m.reward;$('edit-cargo').replaceChildren();m.cargo.forEach(cargoEditor);$('mission-editor').showModal();}
function submitEditor(e){e.preventDefault();try{if(editDraft?._logInbox&&!inbox.cardCurrent(editDraft))throw Error(isEn?'The contract record has changed. Reopen it from the inbox.':'계약 기록이 바뀌었습니다. 수신함에서 다시 열어 확인하십시오.');const form=$('edit-form'),rows=[...$('edit-cargo').children];if(!rows.length)throw Error('화물을 하나 이상 추가하십시오.');const cargo=rows.map(r=>{const raw=r.querySelector('.boxes').value.trim();return {...(r._receivedCargo||{}),commodity:Object.entries(displayGoods).find(([,ko])=>ko===r.querySelector('.commodity').value)?.[0]||r.querySelector('.commodity').value,scu:Number(r.querySelector('.scu').value),maxBoxSize:Number(r.querySelector('.max-box').value)||null,pickupId:r.querySelector('.pickup').value,dropoffId:r.querySelector('.dropoff').value,boxes:raw?raw.split(',').map(x=>{const match=x.trim().match(/^(1|2|4|8|16|24|32)\s*[x×*]\s*(\d+)$/i);if(!match)throw Error('상자는 32x2, 16x1 형식으로 입력하십시오.');return {size:Number(match[1]),count:Number(match[2])};}):[]};});let m={...(missions[editIndex]||editDraft||{}),id:form.elements.missionId.value.trim(),company:form.elements.company.value,title:form.elements.title.value,reward:Number(form.elements.reward.value),cargo};m=workbench.enrich(m);const next=[...missions];if(editIndex>=0)next[editIndex]=m;else next.push(m);validateMissions(next);missions=next;editSaved=true;$('mission-editor').close();inbox?.refresh();renderMissions();replan();save();}catch(e){alert(e.message);}}
function addReceived(draft){
 if(missions.some(m=>m.id===draft.id))return false;
 if(!inbox.cardCurrent(draft))throw Error(isEn?'The contract changed. Select its card again.':'계약 정보가 바뀌었습니다. 카드를 다시 선택하십시오.');
 const m=workbench.enrich(draft),next=[...missions,m];validateMissions(next);missions=next;renderMissions();replan();save();return true;
}
async function reviewReceived(draft,index){
 openEditor(index,draft);await waitDialog($('mission-editor'));return editSaved;
}
function demo(){if(!editable())return;const find=name=>data.locations.find(l=>l.name===name)?.id;missions=[{id:'RW-001',company:'Red Wind',title:'허스턴 일대 운송 예시',reward:21000,cargo:[{commodity:'Construction Materials',scu:96,pickupId:find('Everus Harbor'),dropoffId:find('Seraphim Station'),boxes:[{size:24,count:4}]}]},{id:'CV-002',company:'Covalex',title:'화물 구분 예시',reward:26000,cargo:[{commodity:'Construction Materials',scu:80,pickupId:find('Everus Harbor'),dropoffId:find('Baijini Point'),boxes:[{size:16,count:5}]}]},{id:'DS-003',company:'Dead Saints',title:'파이로 연결 예시',reward:43000,cargo:[{commodity:'Processed Food',scu:64,pickupId:find('Orbituary'),dropoffId:find('Checkmate'),boxes:[{size:32,count:2}]}]}];$('start-location').value=find('Everus Harbor');renderMissions();notify('예시 미션입니다. 스샷을 올리면 실제 미션으로 바뀝니다.');replan();}
function parseBoxText(t){const parts=String(t||'').split(/[,\s]+/).filter(Boolean),out=[];for(const p of parts){const m=p.match(/^(1|2|4|8|16|24|32)\s*[x×*]\s*(\d+)$/i);if(!m)return null;out.push({size:Number(m[1]),count:Number(m[2])});}return out.length?out:null;}
function waitDialog(d){return new Promise(r=>{if(!d.open){r();return;}d.addEventListener('close',()=>r(),{once:true});});}
function refreshAideButton(){$('map-partner-photo').src=VOICE_PORTRAITS[voiceId()];$('map-partner-name').textContent=V().role;}
function makeAssistant(){return createAssistant({
 driveSetup:()=>performancePanel.choices(),setDriveSetup:(mode,speed)=>performancePanel.setMode(mode,speed),
 voiceChanged(){settings.routePolicy=routePolicy();execution?.refresh();refreshAideButton();save();if(missions.length)replan();},openFlightSettings(){const d=$('flight-dialog');d.querySelector('.desk-dialog-notice').textContent='';if(!d.open)d.showModal();},closed(){guide?.openOnce();},showGuide(){guide?.open();},
 mountInbox:(host,onChange)=>inbox.mount(host,{onChange}),reviewReceived,
 missions:()=>missions,clearMissions:()=>planReset.open(),
 ship:()=>({id:ship.id,name:ship.name,capacity:capacity(ship),activeGrids:ship.grids.filter(g=>!g.disabled).length,totalGrids:ship.grids.length}),shipOptions:()=>$('ship-select')?.innerHTML||'',setShip(id){const sel=$('ship-select');if(!sel)return;sel.value=id;sel.dispatchEvent(new Event('change'));},
 start:()=>$('start-location').value,setStart(id){$('start-location').value=id;save();if(execution?.isActive())execution.replanHere(id);else if(missions.length)replan();},
 locationLabel:id=>{const l=byId.get(id);return l?`${placeLabel(l)} · ${l.system.toUpperCase()}`:'';},
 locationList:()=>data.locations.filter(l=>l.qt||['Planet','Moon'].includes(l.type)).map(l=>`<option value="${esc(placeLabel(l))} · ${l.system.toUpperCase()}"></option>`).join(''),
 suggestLocations:t=>suggestLocations(t,data.locations.filter(l=>$('start-location').querySelector(`option[value="${CSS.escape(l.id)}"]`))),
 findLocation(t){const v=String(t||'').trim();if(!v)return null;const exact=data.locations.find(l=>`${placeLabel(l)} · ${l.system.toUpperCase()}`===v);return (exact||matchLocation(v,data.locations,{fuzzy:true}))?.id||null;},
 async readShots(list){await addFiles(list,false);await analyze();},aiPrompt,importText(t){if(!editable()||busy)return {added:0,skipped:0};return importMissionText(t);},notice:()=>$('notice').textContent,
 async editMission(i){openEditor(i);await waitDialog($('mission-editor'));},demo(){demo();},
 issues(m){const out=[];if(m.cargo.some(c=>!byId.has(c.pickupId)||!byId.has(c.dropoffId)))out.push('위치 확인 필요');if(m.cargo.some(c=>!Number.isInteger(c.scu)||c.scu<1))out.push('SCU 확인 필요');return out;},
 placeName:(id,raw)=>byId.get(id)?placeLabel(byId.get(id)):raw||'위치 확인 필요',stepNumbers:visits=>stepNumbers(visits,byId),jumpSegments:leg=>jumpSegments(leg,byId),
 boxGroups(){const out=[];missions.forEach((m,mi)=>{for(const g of destinationGroups(m)){if(byId.has(g.dropoffId)&&g.scu>0){const config=groupConfiguration(m,g,settings.unknownBox);out.push({mi,missionId:m.id,wiki:m._wiki,pickupId:g.pickupId,dropoffId:g.dropoffId,scu:g.scu,...config,wikiConfig:wikiConfiguration(m,g,settings.unknownBox),wikiItems:g.cargo.map(c=>({commodity:c.commodity,scu:c.scu,entityCount:c._entityCount,unitScu:c._entity?.unitScu,sourceQuantity:c._sourceQuantity,split:c._scuAssumed,...wikiConfiguration(m,{...g,cargo:[c],scu:c.scu},settings.unknownBox)})),items:g.cargo.map(c=>({commodity:c.commodity||'품목 미확인',scu:c.scu})),mix:g.cargo.map(c=>String(c.commodity||'').replace(/\s/g,'')+':'+c.scu).sort().join('|')});}}});return out;},
 parseBoxes:parseBoxText,useWikiBoxes(g){missions[g.mi]=workbench.enrich(useWikiConfiguration(missions[g.mi],g));renderMissions();save();},setBoxes(g,boxes){const m=missions[g.mi];if(!m)return;m.destinationBoxes=(m.destinationBoxes||[]).filter(d=>d.pickupId!==g.pickupId||d.dropoffId!==g.dropoffId);m.destinationBoxes.push({pickupId:g.pickupId,dropoffId:g.dropoffId,boxes,origin:'manual'});const group=destinationGroups(m).find(x=>x.pickupId===g.pickupId&&x.dropoffId===g.dropoffId),filled=group&&workbench.remember(m,group,boxes);if(filled)missions=filled;renderMissions();save();},
 plan(){replan();return plan;},showWholeRoute(){map?.home();},
 startRun(){startInlineRun();}
});}
function setupDeskDialogs(){
 $('flight-open').onclick=()=>assistant.open('welcome');$('ship-panel').onclick=()=>{const d=$('flight-dialog');d.querySelector('.desk-dialog-notice').textContent='';if(!d.open)d.showModal();};
 $('flight-dialog').querySelector('[data-desk-close]').onclick=()=>$('flight-dialog').close();
 for(const [button,id] of [['contracts-open','contracts-dialog'],['manifest-open','manifest-dialog']]){
  const dialog=$(id);$(button).onclick=()=>{dialog.querySelector('.desk-dialog-notice').textContent='';if(!dialog.open)dialog.showModal();};
  dialog.querySelector('[data-desk-close]').onclick=()=>dialog.close();
 }
}
async function init(){
 mountSiteIntro();
 setupDeskDialogs();
 data=await fetch('./data/locations.json').then(r=>{if(!r.ok)throw Error('지도 데이터를 불러오지 못했습니다.');return r.json();});await loadAiNames();
 let aiNames={};try{const r=await fetch('./data/ai-korean.json');if(r.ok){aiNames=await r.json();displayGoods=aiNames.goods||{};setCommodityNames([...Object.keys(displayGoods),...Object.values(displayGoods)]);}}catch{}
 try{const r=await fetch('./data/hauling-missions.json');if(r.ok)missionDb=prepareMissionDb(await r.json(),{commodities:Object.fromEntries(Object.entries(aiNames.goods||{}).map(([en,ko])=>[ko,en]))});}catch{}
const locationManager=createLocationManager(data,{canEdit:()=>{if(busy){notify('스샷 읽기가 끝난 뒤 장소를 변경하십시오.',true);return false;}return editable();},beforeApply:save,notify});data=locationManager.data;byId=new Map(data.locations.map(l=>[l.id,l]));$('start-location').innerHTML=optionMarkup();let savedStart;try{savedStart=localStorage.getItem('vh-start');}catch{}$('start-location').value=byId.has(savedStart)?savedStart:data.locations.find(l=>l.name==='Everus Harbor').id;$('data-version').textContent=`${data.meta.version} · ${data.meta.downloaded} 스냅샷`;
 fleet=await createFleet($('fleet-controls'),{canEdit:editable,onChange:()=>syncShip()});ship=withStacking(fleet.getShip());performancePanel=await createPerformance($('fleet-controls'),{canEdit:editable,onChange:p=>{settings.performance=p;replan();save();}});$('performance-options').append(document.querySelector('.performance-panel'));settings.performance=performancePanel.setShip(ship);workbench=createWorkbench($('manifest-workbench'),{getMissions:()=>missions,locations:data.locations,version:data.meta.version,canEdit:editable,notify,missionDb:()=>missionDb,getUnknownBox:()=>settings.unknownBox,onUpdate:next=>{missions=next;renderMissions(false);replan();save();}});$('ocr-stop').onclick=async()=>{ocrCancelled=true;await stopOCR();notify('읽기를 멈췄습니다. 이미 입력된 미션은 그대로 남습니다.');};
 execution=createExecution($('execution'),{containerLabel:s=>configurationLabel({estimated:s.estimated,basis:configurationBasis(missions.find(m=>m.id===s.missionId)?.cargo.filter(c=>c.pickupId===s.pickupId&&c.dropoffId===s.dropoffId&&c.commodity===s.commodity)||[])},isEn),onFinish:({id,seconds,startId,stops,distanceMeters})=>{delete settings.manualStops;save();history?.record({id,at:Date.now(),ship:ship.name,shipId:ship.id,missions:missions.map(m=>({id:m.id,title:m.title||'',company:m.company||'',reward:m.reward||0,scu:m.cargo.reduce((a,c)=>a+(Number(c.scu)||0),0)})),reward:missions.reduce((a,m)=>a+(Number(m.reward)||0),0),scu:missions.reduce((a,m)=>a+m.cargo.reduce((x,c)=>x+(Number(c.scu)||0),0),0),seconds,stops,distanceMeters,route:plan?`${locationText(startId||plan.visits[0]?.locationId)} → ${locationText(plan.visits.at(-1)?.locationId)}`:''});},onAdvance:i=>{if(plan?.manual){settings.manualStops=plan.visits.slice(i).filter(v=>!isDeparture(v)).map(v=>v.locationId);save();}if(plan&&i<plan.visits.length){$('cargo-phase').value='before';selectStop(i,true);}},onReset:why=>{if(why==='new'){missions=[];renderMissions();emptyPlan();save();assistant?.open('shots');}else replan();},colorOf:id=>destColor(id),
   onReplanFrom:({startId,resume,avoidFirst,showDeparture})=>{try{const next=planRoute(data,missions,startId,{...settings,routePolicy:routePolicy(),ship,resume,avoidFirst,showDeparture});plan=next;$('start-location').value=startId;selectedStop=0;renderPlan();execution.setPlan(plan,byId,{keepRun:true});save();return true;}catch(e){notify(e.message,true);return false;}}});const buildEditedPlan=stops=>{const context=execution.resumeContext(),opts={...settings,routePolicy:routePolicy(),manualStops:stops,ship,...(context?{resume:context.resume}:{})},start=context?.startId||$('start-location').value;return mode==='simple'?planRoutesOnly(data,missions,start,opts):planRoute(data,missions,start,opts);};
 const routeEditor=createRouteEditor({getStops:()=>plan?plan.visits.slice(execution.isActive()?execution.current():0).filter(v=>!isDeparture(v)).map(v=>v.locationId):[],locations:data.locations,nameOf:locationText,preview:buildEditedPlan,apply:stops=>{const next=buildEditedPlan(stops),context=execution.resumeContext();settings.manualStops=stops;if(context?.startId)$('start-location').value=context.startId;plan=next;selectedStop=0;renderPlan();execution.setPlan(plan,byId,{keepRun:!!context});save();notify('직접 수정한 순서로 경로·시간·적재를 갱신했습니다.');return next;}});
 $('route-edit').onclick=()=>{if(!plan){notify('먼저 미션을 입력하고 경로를 계산하십시오.',true);return;}routeEditor.open();};
 $('map-route-edit').onclick=()=>$('route-edit').click();
 $('cargo-detail-open').onclick=openCargoDetail;$('cargo-switch-detail').onclick=()=>setMode('detail');$('cargo-filter').onchange=renderCargo;document.querySelectorAll('[data-cargo-phase]').forEach(b=>b.onclick=()=>{$('cargo-phase').value=b.dataset.cargoPhase;$('cargo-phase').dispatchEvent(new Event('change'));});$('cargo-phase').onchange=()=>{if($('cargo-filter').value==='__unload__')$('cargo-filter').value='';renderCargo();};$('run-view').onclick=()=>setMapExpanded($('run-desk').hidden);$('run-desk-close').onclick=()=>setMapExpanded(false);const cargoHome=$('cargo-view').parentNode,modal=document.createElement('dialog');modal.className='cargo-large';modal.innerHTML='<button type="button">닫기</button><div class="cargo-large-host"></div>';document.body.append(modal);$('cargo-expand').onclick=()=>{modal.querySelector('.cargo-large-host').append($('cargo-view'));modal.showModal();};modal.querySelector('button').onclick=()=>modal.close();modal.addEventListener('close',()=>cargoHome.insertBefore($('cargo-view'),cargoHome.querySelector('.cargo-caption')));try{$('storage-note').value=localStorage.getItem('vh-storage-note')||'';}catch{}$('storage-note').oninput=()=>{try{localStorage.setItem('vh-storage-note',$('storage-note').value);}catch{}};
 try{map=createStarMap($('star-map'),$('map-labels'),data,(l,text)=>{$('map-selection').hidden=false;$('map-selection').textContent=text||`${placeLabel(l)} · ${l.system.toUpperCase()} · ${l.type}`;if(map&&l.system!==map.selectedSystem())setSystem(l.system);});cargoView=createCargoView($('cargo-view'),{onGridToggle:toggleCargoGrid,isGridLocked:i=>(execution?.resumeContext()?.resume.aboard||[]).some(b=>b.bin===i)});if(/[?&]debug/.test(location.search)){window.__map=map;window.__cargo=cargoView;}}catch(e){$('star-map').innerHTML='<div class="empty-note" style="padding:65px 20px">3D 화면을 시작하지 못했습니다. 브라우저의 하드웨어 가속을 확인하십시오. 경로와 적재 목록은 계속 쓸 수 있습니다.</div>';console.error(e);}
 document.querySelectorAll('[data-system]').forEach(b=>b.onclick=()=>setSystem(b.dataset.system));$('map-reset').onclick=()=>map?.home();$('map-top').onclick=()=>map?.home(true);if($('map-quality')&&map?.quality){$('map-quality').value=map.quality();$('map-quality').onchange=()=>map.setQuality($('map-quality').value);}mountLocationSearch($('map-search'),data.locations,hit=>{if(hit.system!==map?.selectedSystem())setSystem(hit.system);map?.flyTo(hit.id);$('map-selection').hidden=false;$('map-selection').textContent=placeLabel(hit)+' · '+hit.system.toUpperCase();});$('settings-open').onclick=openSettings;$('settings-save').onclick=applySettings;$('screenshots').onchange=e=>{addFiles(e.target.files);e.target.value='';};$('dropzone').ondragover=e=>{e.preventDefault();$('dropzone').classList.add('dragging');};$('dropzone').ondragleave=()=>$('dropzone').classList.remove('dragging');$('dropzone').ondrop=e=>{e.preventDefault();$('dropzone').classList.remove('dragging');addFiles(e.dataTransfer.files);};document.addEventListener('paste',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;const images=[...e.clipboardData.items].filter(i=>i.type.startsWith('image/')).map(i=>i.getAsFile()).filter(Boolean);if(images.length)addFiles(images);});$('analyze').onclick=analyze;$('map-expand').onclick=()=>setMapExpanded($('run-desk').hidden);$('map-ui-toggle').onclick=()=>{setMapSolo(!$('map-wrap').classList.contains('map-solo'));};$('map-route-toggle').onclick=()=>{const c=$('map-route-panel').classList.toggle('collapsed');$('map-route-toggle').textContent=c?'펼치기':'접기';};$('map-cargo-close').onclick=closeMapCargo;$('text-import').onclick=importText;$('copy-ai-prompt').onclick=()=>navigator.clipboard.writeText(aiPrompt()).then(()=>notify('요청 문장을 복사했습니다. AI 앱에 스샷과 함께 붙여 넣어 주십시오.')).catch(()=>{$('mission-text').value=AI_PROMPT;$('mission-text').select();notify('자동 복사가 막혀 있어 아래 칸에 문장을 넣었습니다. Ctrl+C로 복사한 뒤 칸을 비워 주십시오.',true);});$('demo').onclick=demo;$('manual-add').onclick=()=>openEditor(-1);$('edit-cancel').onclick=()=>$('mission-editor').close();$('edit-form').onsubmit=submitEditor;$('cargo-add').onclick=()=>cargoEditor();$('clear').textContent=isEn?'Reset plan':'계획 초기화';$('clear').onclick=()=>planReset.open();$('replan').onclick=()=>{delete settings.manualStops;replan();save();if(plan)$('flight-dialog').close();};$('start-location').onchange=()=>{if(!editable()){try{$('start-location').value=localStorage.getItem('vh-start')||'';}catch{}return;}if(execution?.isActive())execution.replanHere($('start-location').value);else replan();save();};$('json-export').onclick=()=>{$('json-input').value=JSON.stringify(missions,null,2);};$('json-import').onclick=()=>{if(!editable())return;try{missions=validateMissions(JSON.parse($('json-input').value)).map(m=>workbench.apply(m));renderMissions();replan();if(save())notify(`${missions.length}개 계약을 불러왔습니다.`);}catch(e){notify(e.message,true);}};
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{if(b.dataset.mode!==mode)setMode(b.dataset.mode);});setMode(mode,false);
 planReset=createPlanReset({summary:()=>({contracts:missions.length,stops:plan?.visits.length||0}),onReset:()=>{
 if(busy)throw Error(isEn?'Wait for contract reading to finish before resetting.':'계약 읽기가 끝난 뒤 초기화하십시오.');
 const nextSettings={...settings};delete nextSettings.manualStops;
 const previous=new Map(['vh-missions','vh-settings','sfc-run'].map(k=>[k,localStorage.getItem(k)]));
 try{localStorage.setItem('vh-missions','[]');localStorage.setItem('vh-settings',JSON.stringify(nextSettings));execution.reset();}catch(error){for(const [key,value] of previous){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}catch{}}throw Error(isEn?'Could not save the reset. The current plan was preserved.':'초기화를 저장하지 못했습니다. 현재 계획을 유지합니다.');}
 missions=[];settings=nextSettings;emptyPlan();renderMissions();save();notify(isEn?'Current hauling plan reset.':'현재 운송 계획을 초기화했습니다.');
 }});$('plan-reset-open').textContent=isEn?'Reset plan':'계획 초기화';$('plan-reset-open').onclick=()=>planReset.open();
 guide=createGuide($('guide-open'),{beforeNavigate:beforePageChange});mountContextHelp(guide);createFeedback($('feedback-open'),{notify,context:()=>({ship:ship?.name||'',contracts:missions.length,mode,stops:plan?.visits?.length||0})});history=createHistory(null,{notify});createAccount($('account-btn'),{notify,shipName:id=>[...($('ship-select')?.options||[])].find(o=>o.value===id)?.textContent||id,openHistory:()=>history.open(),resetHistory:()=>history.reset()});mountAiLabels(aiNames);inbox=createInbox({places:data.locations,missions:()=>missions,review:reviewReceived,add:addReceived,notify,missionDb:()=>missionDb});assistant=makeAssistant();$('map-partner').onclick=()=>assistant.open('choose');refreshAideButton();organizeTopnav();
 // Enrich saved contracts without changing their canonical identities.
 try{validateMissions(missions);missions=missions.map(m=>workbench.enrich({...m,cargo:m.cargo.map(c=>MISREADS[c.commodity]?{...c,commodity:MISREADS[c.commodity]}:c)}));save();}catch{missions=[];}renderMissions();setSystem('stanton');syncShip();initialized=true;if(assistant.firstVisit())assistant.open();
}
function organizeTopnav(){const nav=document.querySelector('.topnav'),more=document.createElement('details');more.className='topnav-more';more.innerHTML=`<summary>${isEn?'Manage':'관리'} <span aria-hidden="true">⌄</span></summary><div class="topnav-more-panel"></div>`;for(const id of ['locations-open','settings-open']){const button=$(id);if(button)more.lastElementChild.append(button);}nav.insertBefore(more,nav.querySelector('.lang-switch'));document.addEventListener('click',e=>{if(!more.contains(e.target))more.open=false;});more.addEventListener('keydown',e=>{if(e.key==='Escape'){more.open=false;more.querySelector('summary').focus();}});}
function beforePageChange(){if(!initialized)return false;if(busy){notify(isEn?'Wait for contract reading to finish.':'계약 읽기가 끝난 뒤 이동하십시오.',true);return false;}if(document.querySelector('dialog[open]')){notify(isEn?'Save or close the open editor first.':'열린 창의 입력을 저장하거나 닫은 뒤 이동하십시오.',true);return false;}return save();}
// Use the real header height so the map fills its column on wrapped/mobile menus too.
const deskSizeObserver=new ResizeObserver(entries=>{for(const {target} of entries)document.documentElement.style.setProperty(target.matches('.topbar')?'--header-height':target.matches('.map-toolbar')?'--map-toolbar-height':'--map-controls-height',target.getBoundingClientRect().height+'px');});
for(const target of document.querySelectorAll('.topbar,.map-toolbar,.map-actions'))deskSizeObserver.observe(target);
createUpdates({beforeReload:beforePageChange});
document.querySelector('.intel-open').onclick=e=>{if(beforePageChange()===false)e.preventDefault();};
document.querySelector('.topnav')?.append(languageButton());startTranslation();
init().catch(e=>notify(e.message+' · start.cmd로 실행하거나 GitHub Pages에서 열어 주십시오.',true));

import {chapters as koreanChapters} from './guide-data.mjs';
import {englishChapters} from './guide-data-en.mjs';
import {en,t,language,mountPageLanguage} from './language.mjs';
const chapters=koreanChapters.map((c,i)=>en?{...c,...englishChapters[i]}:c);
const $=id=>document.getElementById(id);let current=0;
const screens={
 bridge:{file:'flight-deck.jpg',alt:t('STAM 관제의 함선 설정, 중앙 지도와 방문 순서','STAM flight setup, central starmap and stop sequence'),tip:t('왼쪽에서 출항을 준비하고, 오른쪽에서 방문 순서를 확인해요. 적재 3D는 지도 아래에 있어요, 함장님.','Get ready on the left and check your stops on the right. Cargo 3D is below the map, Captain.')},
 download:{file:'launcher.png',alt:t('Windows 관제 연결 앱의 로그 선택 화면','Windows companion log selection'),tip:t('압축을 전부 풀고 STAM.exe를 실행해 주세요. 로그를 연결하면 관제로 안내할게요.','Extract the whole ZIP and launch STAM.exe. Connect your log and I’ll bring up the flight deck.')},
 ready:{file:'partner-ready.jpg',alt:t('오퍼레이터와 항해사 선택 화면','Bridge Operator and Chief Navigator selection'),tip:t('함장님 스타일에 맞는 파트너를 골라 주세요. 함선과 출발지도 함께 확인하면 돼요.','Choose your flight partner, Captain. Then check your ship and departure point.')},
 contracts:{file:'contract-reception.jpg',alt:t('게임에서 수락한 운송 계약의 접수 상태','Reception of hauling contracts accepted in game'),tip:t('들어온 계약은 여기에서 확인해요. 필요한 내용이 빠졌다면 그 계약만 따로 확인할 수 있어요.','Incoming contracts appear here. If something is missing, open that contract and check the details.')},
 cargo:{file:'cargo-layout.jpg',alt:t('배송지별로 구분한 실제 STAM 적재 계획 화면','STAM cargo plan grouped by delivery location'),tip:t('같은 색은 같은 배송지예요. 어디에 내릴 화물인지 확인하고 가까이 모아 주세요.','Matching colours mean the same destination. Keep those containers close together for unloading.')},
 route:{file:'route-map.jpg',alt:t('STAM 항성계 지도에 표시된 운송 항로','Hauling route on the STAM starmap'),tip:t('다음 거점을 확인하고 출발하세요. 이동 중 항로를 바꿀 때도 실린 화물부터 챙겨드릴게요.','Check your next stop and get under way. If you change the route, I’ll keep the cargo aboard in place.')}
};
const navigatorTips={bridge:t('함장님, 좌측에서 함선과 계약을 확인하십시오. 방문 순서는 우측, 적재 배치는 지도 아래에서 확인할 수 있습니다.','Captain, review ship and contracts on the left. The stop sequence is on the right; cargo layout is below the chart.'),download:t('ZIP 전체를 푼 뒤 STAM.exe를 실행하십시오. 로그 연결이 확인되면 관제를 엽니다.','Extract the complete ZIP, then launch STAM.exe. Once the log is connected, proceed to the flight deck.'),ready:t('함선과 출발지를 확인하십시오. 선택한 파트너의 운송 방식으로 항로를 준비하겠습니다.','Confirm your ship and departure. The selected partner’s hauling priorities will determine the route.'),contracts:t('접수된 계약과 목표를 확인하십시오. 정보가 부족한 계약은 해당 항목에서 보완할 수 있습니다.','Review received contracts and objectives. Open an incomplete contract to supply its missing details.'),cargo:t('같은 색으로 표시한 화물은 배송지가 같습니다. 하역 동선을 확보하며 가까이 배치하십시오.','Matching colours indicate a shared destination. Keep that cargo together and preserve unloading access.'),route:t('다음 거점과 방문 순서를 확인하십시오. 재계산할 때도 현재 실린 화물의 위치는 유지하겠습니다.','Check the next stop and visit sequence. Recalculation will preserve the positions of cargo already aboard.')};
let guidePartner='operator',gesturesPaused=matchMedia('(prefers-reduced-motion: reduce)').matches,gestureTimers=[];
try{guidePartner=localStorage.getItem('stam-guide-partner')==='navigator'?'navigator':'operator';}catch{}
function actorVisual(line,log=false){if(guidePartner==='navigator')line=log?t('함장님, LIVE 폴더의 <strong>Game.log</strong>를 선택하십시오. 확장명을 숨기면 <strong>Game</strong>으로 표시됩니다.','Captain, select <strong>Game.log</strong> in LIVE. With file extensions hidden, it appears as <strong>Game</strong>.'):navigatorTips[chapters[current].visual]||line;return `<div class="guide-presenter" data-partner="${guidePartner}"><div class="presenter-controls"><button type="button" data-guide-partner="operator" aria-pressed="${guidePartner==='operator'}">${t('오퍼레이터','Operator')}</button><button type="button" data-guide-partner="navigator" aria-pressed="${guidePartner==='navigator'}">${t('항해사','Navigator')}</button><button type="button" class="gesture-toggle">${gesturesPaused?t('동작 재생','Resume gestures'):t('동작 멈춤','Pause gestures')}</button></div><div class="presenter-body" role="img" aria-label="${guidePartner==='navigator'?t('수석 항해사','Chief Navigator'):t('브리지 오퍼레이터','Bridge Operator')} 전신 안내 동작"><i class="presenter-pose visible" data-pose="0"></i><i class="presenter-pose" data-pose="1"></i></div><div class="presenter-speech"><small>${guidePartner==='navigator'?'SENIOR NAVIGATOR':'BRIDGE OPERATOR'}</small><p ${log?'id="operator-file-line"':''}>${line}</p></div></div>`;}
function animatePresenter(kind){
 gestureTimers.forEach(clearTimeout);gestureTimers=[];
 const actor=$('visual').querySelector('.guide-presenter');if(!actor)return;
 for(const button of actor.querySelectorAll('[data-guide-partner]'))button.onclick=()=>{guidePartner=button.dataset.guidePartner;try{localStorage.setItem('stam-guide-partner',guidePartner);}catch{}render();};
 actor.querySelector('.gesture-toggle').onclick=()=>{gesturesPaused=!gesturesPaused;render();};
 const point=kind==='log-file'?4:kind==='cargo'?4:kind==='contracts'?2:kind==='route'?3:2;
 const target=$('visual').querySelector('.presenter-target');
 const poses=[...actor.querySelectorAll('.presenter-pose')];let active=0;
 const show=pose=>{const next=1-active;poses[next].dataset.pose=String(pose);poses[next].classList.add('visible');poses[active].classList.remove('visible');active=next;actor.dataset.gesture=String(pose);target?.classList.toggle('pointed',[2,3,4].includes(pose));};
 if(gesturesPaused){show(point);actor.classList.add('gestures-paused');return;}
 const cycle=()=>{for(const [delay,pose] of [[600,1],[1700,point],[5400,5],[7800,0]])gestureTimers.push(setTimeout(()=>show(pose),delay));gestureTimers.push(setTimeout(cycle,10500));};cycle();
}
function logFileVisual(){return `<div class="log-file-stage">
 <div class="explorer-demo" role="img" aria-label="LIVE 폴더 예시. Game.log 텍스트 문서가 선택되어 있습니다.">
  <div class="explorer-title"><span class="folder-icon" aria-hidden="true"></span> LIVE <span>파일 선택</span></div>
  <div class="explorer-path">StarCitizen <b>›</b> LIVE</div>
  <div class="explorer-columns"><span>이름</span><span>유형</span></div>
  <div class="explorer-row"><span>📁 Bin64</span><span>파일 폴더</span></div>
  <div class="explorer-row"><span>📁 data</span><span>파일 폴더</span></div>
  <div class="explorer-row"><span>📁 logbackups</span><span>파일 폴더</span></div>
  <div class="explorer-row"><span>▧ Data.p4k</span><span>PAK 파일</span></div>
  <div class="explorer-row selected-log presenter-target"><span>▤ <b id="guide-log-name">Game</b><em>이 파일</em></span><span>텍스트 문서</span></div>
  <div class="explorer-row"><span>▤ launcherData.json</span><span>JSON 파일</span></div>
  <div class="explorer-row"><span>◈ StarCitizen_Launcher</span><span>응용 프로그램</span></div>
  <button id="guide-extensions" type="button" aria-pressed="false">파일 확장명 표시해 보기</button>
  <p class="explorer-caption">Windows 탐색기 화면 예시 · 설치 위치는 PC마다 달라요</p>
 </div>
 ${actorVisual(t('함장님, 여기 <strong>Game</strong> 파일이에요. 확장명을 켜면 <strong>Game.log</strong>로 보여요. 이 파일을 선택해 주세요.','Captain, select this <strong>Game</strong> file. Show file extensions and you’ll see its full name: <strong>Game.log</strong>.'),true)}
 </div>`;}
function visual(kind){
 if(kind==='log-file')return logFileVisual();
 const base=screens[kind]||screens.bridge;const screen={...base,file:en&&base.file.endsWith('.jpg')?base.file.replace('.jpg','-en.jpg'):base.file};
 return `<div class="guide-screen" data-scene="${kind}"><div class="presenter-screen"><a href="assets/onboarding/${screen.file}" target="_blank" rel="noopener" aria-label="${screen.alt} 크게 보기"><img src="assets/onboarding/${screen.file}" alt="${screen.alt}" decoding="async"></a><div class="presenter-target" aria-hidden="true"></div></div>${actorVisual(screen.tip)}</div>`;
}


function translateVisual(html){if(!en)return html;for(const [ko,english]of Object.entries({' 전신 안내 동작':' full-body briefing gestures','LIVE 폴더 예시. Game.log 텍스트 문서가 선택되어 있습니다.':'LIVE folder example with the Game.log text document selected.','파일 선택':'Select file','파일 폴더':'File folder','PAK 파일':'PAK file','텍스트 문서':'Text document','JSON 파일':'JSON file','응용 프로그램':'Application','이 파일':'Select this','이름':'Name','유형':'Type','Windows 탐색기 화면 예시 · 설치 위치는 PC마다 달라요':'File Explorer example · Your installation path may differ','파일 확장명 표시해 보기':'Show file extensions',' 크게 보기':' · Enlarge'}))html=html.split(ko).join(english);return html;}
if(en){
 document.title='Flight briefing · STAM';
 const copy={'.masthead-section':'Flight briefing','.guide-header nav a:first-child':'Download app','#return-main':'Return to control ↗','.guide-heading>p:first-child':'FREIGHT CONTROL / FLIGHT BRIEFING','.guide-heading h1':'Your next haul starts here.','.guide-heading>p:last-child':'From the first contract to the final unload. Your flight, step by step.','#previous':'← Previous','#next':'Next →','.video-section .eyebrow':'MISSION BRIEF','.video-section h2':'Your 24-second preflight briefing.','.legal':'STAM · Unofficial, non-commercial fan tool. Star Citizen and associated trademarks belong to Cloud Imperium Games. Not an official CIG product.'};
 for(const [selector,value]of Object.entries(copy))document.querySelector(selector).textContent=value;
 $('chapters').setAttribute('aria-label','Briefing chapters');document.querySelector('video').setAttribute('aria-label','STAM flight briefing video');
}
mountPageLanguage(document.querySelector('.guide-header nav'));
window.addEventListener('pagehide',()=>gestureTimers.forEach(clearTimeout));

const zoom=document.createElement('dialog');zoom.className='guide-image-zoom';const zoomClose=document.createElement('button');zoomClose.type='button';zoomClose.textContent=t('닫기','Close');zoomClose.onclick=()=>zoom.close();const zoomImage=document.createElement('img');zoom.append(zoomClose,zoomImage);document.body.append(zoom);
$('visual').addEventListener('click',e=>{const a=e.target.closest('.presenter-screen a');if(!a)return;e.preventDefault();zoomImage.src=a.href;zoomImage.alt=a.querySelector('img').alt;zoom.showModal();});
for(const [i,c] of chapters.entries()){const b=document.createElement('button');b.type='button';b.textContent=c.section;b.onclick=()=>navigate(i);$('chapters').append(b);}
function render(){const c=chapters[current];$('section').textContent=c.section;$('slide-title').textContent=c.title;$('lead').textContent=c.lead;$('note').textContent=c.note;$('steps').replaceChildren();
 for(const [title,body] of c.steps){const li=document.createElement('li'),strong=document.createElement('strong'),p=document.createElement('p');strong.textContent=title;p.textContent=body;li.append(strong,p);$('steps').append(li);}
 $('visual').innerHTML=translateVisual(visual(c.visual));$('slide').classList.toggle('log-file-slide',c.visual==='log-file');animatePresenter(c.visual);
 const extensions=$('guide-extensions');if(extensions)extensions.onclick=()=>{const show=extensions.getAttribute('aria-pressed')!=='true';extensions.setAttribute('aria-pressed',String(show));$('guide-log-name').textContent=show?'Game.log':'Game';extensions.textContent=show?t('확장명 숨김 예시로 돌아가기','Show the hidden-extension example'):t('파일 확장명 표시해 보기','Show file extensions');$('operator-file-line').replaceChildren(document.createTextNode(show?t('맞아요, Game.log! 이 파일을 선택하면 돼요, 함장님.','That’s it, Captain—Game.log. Select this file.'):t('Game으로 보일 때는 확장명을 켜서 Game.log인지 확인해 주세요!','If it appears as Game, show file extensions and check that it is Game.log.')));};
[...$('chapters').children].forEach((b,i)=>{b.setAttribute('aria-current',i===current?'step':'false');});$('counter').textContent=`${current+1} / ${chapters.length}`;$('previous').disabled=current===0;$('next').disabled=current===chapters.length-1;
}
function navigate(i){current=Math.max(0,Math.min(chapters.length-1,i));history.replaceState(null,'','#'+chapters[current].id);render();$('slide').focus({preventScroll:true});}
function fromHash(){current=Math.max(0,chapters.findIndex(c=>c.id===location.hash.slice(1)));render();}
$('previous').onclick=()=>navigate(current-1);$('next').onclick=()=>navigate(current+1);
document.addEventListener('keydown',e=>{if(e.target.closest('dialog')||e.altKey||e.ctrlKey||e.metaKey||['INPUT','TEXTAREA','VIDEO'].includes(e.target.tagName))return;if(e.key==='ArrowRight'){e.preventDefault();navigate(current+1);}if(e.key==='ArrowLeft'){e.preventDefault();navigate(current-1);}});
window.addEventListener('hashchange',fromHash);fromHash();

const returnFrom=new URLSearchParams(location.search).get('from');const returnPage=(returnFrom==='flight-deck.html'?'flight-deck.html':'index.html')+'?lang='+language;$('return-main').href=returnPage;

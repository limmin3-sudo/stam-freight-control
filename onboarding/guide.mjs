import {chapters} from './guide-data.mjs';
const $=id=>document.getElementById(id);let current=0;
const screens={
 bridge:{file:'flight-deck.jpg',alt:'STAM 관제의 함선 설정, 중앙 지도와 방문 순서',tip:'왼쪽에서 출항을 준비하고, 오른쪽에서 방문 순서를 확인해요. 적재 3D는 지도 아래에 있어요, 함장님.'},
 download:{file:'launcher.png',alt:'Windows 관제 연결 앱의 로그 선택과 좌표 연결 화면',tip:'압축을 전부 풀고 STAM.exe를 실행해 주세요. 로그를 연결하면 관제로 안내할게요.'},
 ready:{file:'partner-ready.jpg',alt:'오퍼레이터와 항해사 선택 화면',tip:'함장님 스타일에 맞는 파트너를 골라 주세요. 함선과 출발지도 함께 확인하면 돼요.'},
 contracts:{file:'contract-reception.jpg',alt:'게임에서 수락한 운송 계약의 접수 상태',tip:'들어온 계약은 여기에서 확인해요. 필요한 내용이 빠졌다면 그 계약만 따로 확인할 수 있어요.'},
 cargo:{file:'cargo-layout.jpg',alt:'배송지별로 구분한 실제 STAM 적재 계획 화면',tip:'같은 색은 같은 배송지예요. 어디에 내릴 화물인지 확인하고 가까이 모아 주세요.'},
 route:{file:'route-map.jpg',alt:'STAM 항성계 지도에 표시된 운송 항로',tip:'다음 거점을 확인하고 출발하세요. 이동 중 항로를 바꿀 때도 실린 화물부터 챙겨드릴게요.'}
};
function logFileVisual(){return `<div class="log-file-stage">
 <div class="explorer-demo" role="img" aria-label="LIVE 폴더 예시. Game.log 텍스트 문서가 선택되어 있습니다.">
  <div class="explorer-title"><span class="folder-icon" aria-hidden="true"></span> LIVE <span>파일 선택</span></div>
  <div class="explorer-path">StarCitizen <b>›</b> LIVE</div>
  <div class="explorer-columns"><span>이름</span><span>유형</span></div>
  <div class="explorer-row"><span>📁 Bin64</span><span>파일 폴더</span></div>
  <div class="explorer-row"><span>📁 data</span><span>파일 폴더</span></div>
  <div class="explorer-row"><span>📁 logbackups</span><span>파일 폴더</span></div>
  <div class="explorer-row"><span>▧ Data.p4k</span><span>PAK 파일</span></div>
  <div class="explorer-row selected-log"><span>▤ <b id="guide-log-name">Game</b><em>이 파일</em></span><span>텍스트 문서</span></div>
  <div class="explorer-row"><span>▤ launcherData.json</span><span>JSON 파일</span></div>
  <div class="explorer-row"><span>◈ StarCitizen_Launcher</span><span>응용 프로그램</span></div>
  <button id="guide-extensions" type="button" aria-pressed="false">파일 확장명 표시해 보기</button>
  <p class="explorer-caption">Windows 탐색기 화면 예시 · 설치 위치는 PC마다 달라요</p>
 </div>
 <aside class="log-operator"><img src="assets/partners/aide.jpg" alt="브리지 오퍼레이터"><span class="operator-tag">BRIDGE OPERATOR</span><p id="operator-file-line">함장님, 여기 <strong>Game</strong>이라고 보이는 파일이에요.<br>확장명을 켜서 <strong>Game.log</strong>인지 확인해 주세요!</p></aside>
 <svg class="operator-pointer" viewBox="0 0 900 460" aria-hidden="true"><defs><marker id="log-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#ffd18a"/></marker></defs><path d="M700 350 C590 390 630 280 540 280" fill="none" stroke="#ffd18a" stroke-width="3" marker-end="url(#log-arrow)"/></svg>
 </div>`;}
function visual(kind){
 if(kind==='log-file')return logFileVisual();
 const screen=screens[kind]||screens.bridge;
 return `<div class="guide-screen"><a href="assets/onboarding/${screen.file}" target="_blank" rel="noopener" aria-label="${screen.alt} 크게 보기"><img src="assets/onboarding/${screen.file}" alt="${screen.alt}" decoding="async"></a><div class="guide-operator-tip"><img src="assets/partners/aide.jpg" alt="브리지 오퍼레이터"><p>${screen.tip}</p></div></div>`;
}

for(const [i,c] of chapters.entries()){const b=document.createElement('button');b.type='button';b.textContent=c.section;b.onclick=()=>navigate(i);$('chapters').append(b);}
function render(){const c=chapters[current];$('section').textContent=c.section;$('slide-title').textContent=c.title;$('lead').textContent=c.lead;$('note').textContent=c.note;$('steps').replaceChildren();
 for(const [title,body] of c.steps){const li=document.createElement('li'),strong=document.createElement('strong'),p=document.createElement('p');strong.textContent=title;p.textContent=body;li.append(strong,p);$('steps').append(li);}
 $('visual').innerHTML=visual(c.visual);$('slide').classList.toggle('log-file-slide',c.visual==='log-file');
 const extensions=$('guide-extensions');if(extensions)extensions.onclick=()=>{const show=extensions.getAttribute('aria-pressed')!=='true';extensions.setAttribute('aria-pressed',String(show));$('guide-log-name').textContent=show?'Game.log':'Game';extensions.textContent=show?'확장명 숨김 예시로 돌아가기':'파일 확장명 표시해 보기';$('operator-file-line').replaceChildren(document.createTextNode(show?'맞아요, Game.log! 이 파일을 선택하면 돼요, 함장님.':'Game으로 보일 때는 확장명을 켜서 Game.log인지 확인해 주세요!'));};
[...$('chapters').children].forEach((b,i)=>{b.setAttribute('aria-current',i===current?'step':'false');});$('counter').textContent=`${current+1} / ${chapters.length}`;$('previous').disabled=current===0;$('next').disabled=current===chapters.length-1;
}
function navigate(i){current=Math.max(0,Math.min(chapters.length-1,i));history.replaceState(null,'','#'+chapters[current].id);render();$('slide').focus({preventScroll:true});}
function fromHash(){current=Math.max(0,chapters.findIndex(c=>c.id===location.hash.slice(1)));render();}
$('previous').onclick=()=>navigate(current-1);$('next').onclick=()=>navigate(current+1);
document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||['INPUT','TEXTAREA','VIDEO'].includes(e.target.tagName))return;if(e.key==='ArrowRight'){e.preventDefault();navigate(current+1);}if(e.key==='ArrowLeft'){e.preventDefault();navigate(current-1);}});
window.addEventListener('hashchange',fromHash);fromHash();

const returnFrom=new URLSearchParams(location.search).get('from');const returnPage=returnFrom==='flight-deck.html'?'flight-deck.html':'index.html';$('return-main').href=returnPage;
$('return-main').onclick=e=>{if(history.length===1){e.preventDefault();window.close();setTimeout(()=>location.assign(returnPage),150);}};

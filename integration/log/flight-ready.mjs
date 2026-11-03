import {DEFAULT_SHIP,validateShip} from '../../ships.mjs';
import {personalNavigation} from './personal-locations.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};

// Previous preferences are planning suggestions, not live ship/position telemetry.
export function createFlightReady(host,{session,onStart,onPartner,onSettings=()=>{},onAdvance=()=>false,canAdvance=()=>false}){
 const root=el('section');root.id='flight-ready';
 const heading=el('h2','출항 준비'),line=el('p'),partners=el('div');partners.className='ready-partners';
 const buttons=[];
 for(const [id,name,picture] of [['operator','브리지 오퍼레이터','aide'],['navigator','수석 항해사','navigator']]){
  const b=el('button');b.type='button';const img=el('img');img.src=new URL(`../../assets/partners/${picture}.jpg`,import.meta.url);img.alt='';img.width=36;img.height=36;b.append(img,el('span',name));
  b.onclick=()=>{session.setPreferences({partner:id});onPartner(id);render();};partners.append(b);buttons.push([id,b]);
 }
 const summary=el('p');summary.className='ready-ship-summary';
 const settings=el('details'),controls=el('div');settings.append(el('summary','함선·출발지 수정'),controls);
 const ship=el('select'),start=el('select'),search=el('input');ship.setAttribute('aria-label','출항 준비 함선');start.setAttribute('aria-label','출항 준비 출발지');search.setAttribute('aria-label','출항 준비 지명 검색');search.placeholder='출발지 찾기';search.type='search';
 controls.append(ship,search,start);const confirm=el('button','이 설정으로 준비');confirm.type='button';controls.append(confirm);
 const count=el('p'),action=el('button','계약 수신 대기');action.id='flight-ready-action';action.type='button';action.className='ready-primary';
 const note=el('p','계약을 받으시면 이곳에 자동으로 들어옵니다.');note.setAttribute('role','status');
 root.append(heading,partners,line,summary,settings,count,action,note);host.append(root);
 let ships=[DEFAULT_SHIP],places=[],confirmed=false,busy=false,active=false,selected=0,blocked=0,pending=0,disposed=false;
 function options(node,rows,value){node.replaceChildren();const empty=el('option','선택해 주세요');empty.value='';node.append(empty);for(const r of rows){const o=el('option',r.name);o.value=r.id;node.append(o);}node.value=value;}
 function fillStarts(){const q=search.value.trim().toLowerCase();const matches=places.filter(p=>!q||[p.name,...(p.aliases||[])].some(n=>n.toLowerCase().includes(q))).slice(0,40);const current=places.find(p=>p.id===session.preferences.startId);if(current&&!matches.some(p=>p.id===current.id))matches.unshift(current);options(start,matches,session.preferences.startId);}
 function render(){if(disposed)return;const p=session.preferences,knownShip=ships.find(s=>s.id===p.shipId),knownStart=places.find(s=>s.id===p.startId);
  if(!knownShip||!knownStart)confirmed=false;
  for(const [id,b] of buttons){b.setAttribute('aria-pressed',String(id===p.partner));b.disabled=busy;}
  line.textContent=p.partner==='operator'?'함장님, 계약을 받아 주세요. 가까운 배송부터 정리할게요.':'계약을 받으시면 항로와 적재 순서를 준비하겠습니다.';
  summary.textContent=`${knownShip?.name||'함선 선택 필요'} · ${knownStart?.name||'출발지 확인 필요'} · ${confirmed?'직접 확인':p.shipId||p.startId?'이전 설정 · 확인 필요':'운항 정보 확인 필요'}`;
  count.textContent=`선택한 계약 ${selected}건${blocked?` · 화물 확인 필요 ${blocked}건`:''}${pending?` · 수신 대기 ${pending}건`:''}`;
  ship.disabled=start.disabled=search.disabled=busy;action.disabled=busy||(!selected&&!active);confirm.disabled=!knownShip||!knownStart||busy;
  action.textContent=busy?'항로를 계산하고 있습니다…':active?(canAdvance()?'운송 중 · 다음 구간':'운송 안내 중'):!selected?'계약 수신 대기':!confirmed?'함선·출발지 확인':blocked?'화물 정보 확인':'항로 계산·안내 시작';
  if(active)action.disabled=busy||!canAdvance();
 }
 ship.onchange=()=>{session.setPreferences({shipId:ship.value});confirmed=false;active=false;onSettings();render();};
 start.onchange=()=>{session.setPreferences({startId:start.value});confirmed=false;active=false;onSettings();render();};
 search.oninput=fillStarts;
 confirm.onclick=()=>{confirmed=ships.some(s=>s.id===session.preferences.shipId)&&places.some(p=>p.id===session.preferences.startId);settings.open=!confirmed;note.textContent=confirmed?'출항 준비가 됐습니다. 안내를 시작할 계약을 확인해 주세요.':'함선과 출발지를 확인해 주세요.';render();};
 action.onclick=async()=>{if(busy||!selected)return;if(active){if(!onAdvance())note.textContent='다음 구간을 시작하지 못했습니다. 항로를 확인해 주세요.';render();return;}if(!confirmed){settings.open=true;note.textContent='저장된 함선과 출발지가 이번 운항과 맞는지 확인해 주세요.';ship.focus();return;}
  if(blocked){note.textContent='선택한 계약에 확인할 화물이 있습니다. 아래 계약 목록에서 확인하거나 이번 항로에서 빼 주세요.';document.getElementById('planning-contracts')?.scrollIntoView({block:'nearest'});return;}
  busy=true;note.textContent='항로와 적재 순서를 준비하고 있습니다.';render();
  try{const started=await onStart();active=started===true;note.textContent=active?'항로 안내를 시작합니다. 지도에는 예상 이동이 표시됩니다.':'항로를 준비하지 못했습니다. 지도 위 안내를 확인해 주세요.';}catch{note.textContent='항로를 준비하지 못했습니다. 다시 시도해 주세요.';}finally{busy=false;render();}};
 async function loadShips(){try{const r=await fetch(new URL('../../data/ships.json',import.meta.url));if(!r.ok)throw Error();const base=await r.json();ships=[DEFAULT_SHIP,...base.filter(s=>s.id!==DEFAULT_SHIP.id)];for(const value of session.savedShips())try{const s=validateShip(value);if(!ships.some(p=>p.id===s.id))ships.push(s);}catch{}if(disposed)return;options(ship,ships,session.preferences.shipId);render();}catch{note.textContent='함선 목록을 불러오지 못했습니다. 다시 연결한 뒤 화면을 열어 주세요.';}}
 options(ship,ships,session.preferences.shipId);fillStarts();render();loadShips();
 return {root,update(value){({selected=0,blocked=0,pending=0}=value);render();},setLocations(data,edits){places=personalNavigation(data,edits).locations;fillStarts();render();},
  guidance(value){active=value;render();},refresh(){options(ship,ships,session.preferences.shipId);fillStarts();render();},destroy(){disposed=true;root.remove();}};
}

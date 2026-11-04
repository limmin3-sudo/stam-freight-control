import {createPlanChoiceStore} from './plan-choice-store.mjs';
import {connectLive} from './live-client.mjs';
import {definitionIndex} from './catalog.mjs';
import {locationIndex} from './locations.mjs';
import {receptionChanges} from './manual-adapter.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
export async function createManualReception({host,button,missions,active,add,open,notify,mapData}){
 const json=async path=>{const r=await fetch(new URL(path,import.meta.url));if(!r.ok)throw Error('계약 목록을 불러오지 못했습니다.');return r.json();};
 const [catalog,locations]=await Promise.all([json('../../data/log-mission-index.json').then(definitionIndex),json('../../data/log-location-index.json').then(locationIndex)]);
 const key=k=>k.replace(/^stam-plan-choices-v1:/,'stam-flight-deck-choices-v1:');
 const choices=createPlanChoiceStore({getItem:k=>localStorage.getItem(key(k)),setItem:(k,v)=>localStorage.setItem(key(k),v)});
 const handled=new Set(),deferred=new Set(),awaiting=new Set();
 function remember(ids,choice){const saved=choices.snapshot();if(saved.error)throw Error(saved.error);const rows=new Map(saved.choices.map(r=>[r.id,r.choice]));for(const id of ids)rows.set(id,choice);choices.save([...rows].map(([id,choice])=>({id,choice})));}
 function restoreChoices(){const saved=choices.snapshot();if(saved.error)throw Error(saved.error);handled.clear();deferred.clear();awaiting.clear();for(const r of saved.choices){(r.choice==='deferred'?deferred:handled).add(r.id);if(r.choice==='awaiting')awaiting.add(r.id);}}
let latest=null,view={rows:[],add:[]},phase='로그 연결 대기',error='';
 const summary=()=>`${phase} · 계획에 연결 ${view.rows.filter(r=>r.present).length}건 · 정보 확인 ${view.rows.filter(r=>r.state==='pending').length}건${error?' · '+error:''}`;
 function refresh(auto=true){
  if(!latest)return;
  try{restoreChoices();}catch(e){view={rows:[],add:[],blocked:e.message};render();return;}
  view=receptionChanges(latest,missions(),catalog,locations,{active:active(),handled,deferred,mapData});
  if(active()){const incoming=view.rows.filter(r=>r.state==='ready'&&!r.present&&!r.handled&&!r.deferred);if(incoming.length)try{remember(incoming.map(r=>r.id),'awaiting');}catch(e){error=e.message;render();return;}}
  if(auto&&view.add.length){try{remember(view.add.map(m=>m.id),'excluded');add(view.add);view.add.forEach(m=>handled.add(m.id));error='';view=receptionChanges(latest,missions(),catalog,locations,{active:active(),handled,deferred,mapData});}catch(e){error=e.message;}}
  render();
 }
 function render(){
  button.textContent=phase;button.dataset.connected=String(phase==='로그 연결됨');host.replaceChildren(el('h2','계약 접수'));
  const status=el('p',view.blocked||summary());status.setAttribute('role','status');host.append(status);
  host.append(el('small','현재 로그에 남아 있는 수락 기록을 불러옵니다. 실제 진행 중인 계약과 남은 화물은 게임에서도 확인해 주세요.'));
  if(!latest)host.append(el('p','연결 앱에서 Game.log를 선택해 주세요. 스크린샷·텍스트 입력도 계속 사용할 수 있습니다.'));
  for(const row of view.rows){
   const card=el('article');card.dataset.contractId=row.id;card.className='reception-contract';card.append(el('strong',row.title));
   const state=el('p',row.state==='ended'||row.state==='blocked'?row.reason:row.present?'항로에 연결됨':row.deferred?'다음 계획에 보관 중':row.handled?(awaiting.has(row.id)?'현재 항로에 합류할지 선택해 주세요.':'이번 계획에서 제외됨'):row.state==='ready'?'항로 연결 준비 완료':row.reason);card.append(state);
   if(row.cargo)card.append(el('small',row.cargo.map(c=>`${c.commodity} ${c.scu} SCU`).join(' · ')));
   if(row.state==='ready'&&!row.present){const use=el('button',active()?'현재 항로에 합류':'항로에 연결');use.type='button';use.onclick=()=>{try{remember([row.id],'excluded');add([row.mission]);handled.add(row.id);deferred.delete(row.id);error='';refresh(false);}catch(e){error=e.message;notify(error,true);render();}};card.append(use);
    if(!row.deferred){const later=el('button','다음 계획으로');later.type='button';later.onclick=()=>{try{remember([row.id],'deferred');deferred.add(row.id);refresh(false);}catch(e){error=e.message;render();}};card.append(later);}}
   host.append(card);
  }
 }
 button.onclick=()=>{refresh(false);open();};
 const connection=connectLive({onSnapshot(snapshot){latest=snapshot;refresh();},onStatus(status){phase=['watching','catching-up'].includes(status.phase)?'로그 연결됨':status.phase==='paused'?'로그 수신 일시정지':'로그 연결 확인 중';button.textContent=phase;},onError(){phase='로그 연결 재시도 중';render();},onDisconnect(){phase='로그 연결 종료';render();}});
 render();return {summary,prepareScreen:()=>connection?.prepareScreen(),refresh:()=>refresh(false),disconnect:()=>connection?.disconnect()};
}

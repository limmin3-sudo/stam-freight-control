import {createRewardStore,rewardCandidates,rewardKey} from './reward-store.mjs';
import {renderRewards} from './progress-view.mjs';
import {partnerSpeaker,partnerVoice} from './partner-voice.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
export function createRewardPanel(host,{storage,partner=()=> 'navigator'}={}){
 const store=createRewardStore(storage);let current={rewards:[],contracts:[]},live=false,error=null,selected=new Map();
 function render(){
  if(!live){renderRewards(host,current.rewards);return;}
  const open=!!host.querySelector('details')?.open,saved=store.snapshot(),records=saved.records;
  // Keep selections during unrelated log updates; no preselected contract, even when only one fits.
  host.replaceChildren();host.hidden=!records.length&&!current.rewards?.length&&!error&&!saved.error;if(host.hidden)return;
  const details=el('details');details.open=open;details.append(el('summary',`지급 알림 ${records.length}건`));
  details.append(el('p','이 브라우저의 지급 기록입니다. 운송 외 지급도 포함될 수 있으며 기존 운항 수입에는 중복 합산하지 않습니다. 다른 기기에는 동기화하지 않습니다.'));
  if(error||saved.error){const note=el('p',error||saved.error);note.setAttribute('role','alert');details.append(note);}
  if(!saved.error&&records.length)details.append(el('strong',`지급 알림 합계 · ${records.reduce((sum,r)=>sum+r.amount,0).toLocaleString()} aUEC`));
  const blocked=!!(saved.error||error||current.identity?.mixedPlayers),byId=new Map((current.contracts||[]).map(c=>[c.missionId,c])),candidates=rewardCandidates(current.contracts||[]);
  for(const r of [...records].sort((a,b)=>b.at.localeCompare(a.at)).slice(0,50)){
   const row=el('div');row.className='credit-observation';row.dataset.reward=rewardKey(r);
   const id=r.missionId||r.linkedMissionId,c=id?byId.get(id):null,name=c?.title|| (id?`계약 ${id}`:'');
   row.append(el('strong',`${r.amount.toLocaleString()} aUEC`),el('span',r.missionId?`${c?'계약 ID 일치':'지급 계약 ID'} · ${name}`:r.linkedMissionId?`직접 연결 · ${name}`:'계약 연결 미확인'),el('small',new Date(r.at).toLocaleString()));
   if(id){row.append(el('small',c?.progress?.outcome==='conflict'?'계약 종료 기록이 서로 다릅니다. 연결을 다시 확인해 주세요.':c?.progress?.outcome==='completed'?'완료 기록 확인':r.linkedMissionId?'이전에 직접 연결한 기록입니다. 현재 로그에서는 완료를 다시 확인하지 못했습니다.':'계약 완료는 별도 확인이 필요합니다.'));}
   if(!r.missionId){
    if(r.linkedMissionId){const undo=el('button','연결 해제');undo.type='button';undo.disabled=blocked;undo.onclick=()=>apply(()=>store.link(rewardKey(r),null,current.contracts),rewardKey(r));row.append(undo);}
    else if(candidates.length){
     const label=el('label','완료 계약 선택'),select=el('select');select.dataset.reward=rewardKey(r);select.setAttribute('aria-label','보상을 연결할 완료 계약');
     const blank=el('option','계약을 선택하세요');blank.value='';select.append(blank);
     for(const c of candidates){const option=el('option',`${c.title||'운송 계약'} · ${c.missionId}`);option.value=c.missionId;select.append(option);}
     select.value=candidates.some(c=>c.missionId===selected.get(rewardKey(r)))?selected.get(rewardKey(r)):'';select.disabled=blocked;
     const save=el('button','선택한 계약에 연결');save.type='button';save.disabled=blocked||!select.value;select.onchange=()=>{selected.set(rewardKey(r),select.value);save.disabled=blocked||!select.value;};save.onclick=()=>apply(()=>store.link(rewardKey(r),select.value,current.contracts),rewardKey(r));label.append(select);row.append(label,save);
    }else row.append(el('small','완료한 운송 계약이 확인되면 직접 연결할 수 있습니다.'));
   }
   details.append(row);
  }
  if(records.some(r=>!r.missionId&&!r.linkedMissionId))details.append(partnerSpeaker(partner(),partnerVoice(partner()).rewardUnassigned));
  if(records.length>50)details.append(el('p','최근 50건을 표시합니다. 합계에는 보관된 전체 기록이 포함됩니다.'));
  host.append(details);
 }
 function apply(action,key){try{action();selected.delete(key);error=null;}catch(e){error=e.message;}render();}
 return {refresh:render,update(snapshot,{persistent=false}={}){current=snapshot||{rewards:[],contracts:[]};live=persistent;error=null;if(live){if(current.identity?.mixedPlayers)error='서로 다른 캐릭터의 로그가 섞여 있어 지급 보관과 계약 연결을 멈췄습니다.';else try{store.observe(current.rewards||[]);}catch(e){error=e.message;}}render();}};
}

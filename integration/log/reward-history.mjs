import {completionTotals} from './completion-store.mjs';
// Read-only views of the separate payout ledger. These totals are never run income.
export const rewardKind=r=>r.missionId?'log-id':r.linkedMissionId?'manual':'unassigned';
export function rewardDate(at){const d=new Date(at);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function rewardPage(records,{kind='all',from='',to='',page=0}={}){
 if(!['all','log-id','manual','unassigned'].includes(kind))throw Error('지급 기록 분류를 확인해 주세요.');
 if([from,to].some(v=>v&&!/^\d{4}-\d{2}-\d{2}$/.test(v))||(from&&to&&from>to))throw Error('조회 시작일과 종료일을 확인해 주세요.');
 const filtered=records.filter(r=>(kind==='all'||rewardKind(r)===kind)&&(!from||rewardDate(r.at)>=from)&&(!to||rewardDate(r.at)<=to)).sort((a,b)=>b.at.localeCompare(a.at)||a.notificationId.localeCompare(b.notificationId)||a.amount-b.amount||String(a.missionId).localeCompare(String(b.missionId)));
 const pages=Math.max(1,Math.ceil(filtered.length/50)),index=Math.min(pages-1,Math.max(0,Number.isSafeInteger(page)?page:0));
 return {rows:filtered.slice(index*50,index*50+50),page:index,pages,count:filtered.length,total:filtered.reduce((sum,r)=>sum+r.amount,0),storedCount:records.length,storedTotal:records.reduce((sum,r)=>sum+r.amount,0)};
}
export function rewardExport(records){
 return JSON.stringify({format:'stam-payout-observations',version:1,currency:'aUEC',records:records.map(({at,amount,notificationId,missionId,linkedMissionId})=>({at,amount,notificationId,missionId,linkedMissionId}))},null,2);
}
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
export function createRewardHistory(store,completions){
 let host,signature=null,filters={kind:'all',from:'',to:'',page:0};
 function render(){
  if(!host?.isConnected)return;
  const existing=host.querySelector('.payout-filters'),draft=existing?{kind:existing.querySelector('select').value,from:existing.querySelectorAll('input')[0].value,to:existing.querySelectorAll('input')[1].value}:filters;
  host.replaceChildren();host.className='payout-history';host.setAttribute('aria-label','지급 기록');
  const done=completions?.snapshot()||{records:[],error:null},ledger=store.snapshot();
  if(!done.error&&!ledger.error){const totals=completionTotals(done.records,ledger.records),summary=el('section');summary.className='history-totals';summary.setAttribute('aria-label','연동 운송 실적');for(const [label,value] of [['완료 계약',totals.completed+'건'],['확인된 계약 수입',totals.income.toLocaleString()+' aUEC'],['보상 연결 계약',totals.paidContracts+'건'],['연결 대기 지급',totals.unassigned.toLocaleString()+' aUEC']]){const item=el('div');item.append(el('small',label),el('b',value));summary.append(item);}host.append(el('h3','연동 운송 실적'),summary,el('p','계약 완료와 연결된 지급을 집계합니다. 예전 수동 운항의 입력 보상과는 중복 합산하지 않습니다.'));}else if(done.error)host.append(el('p',done.error));
  host.append(el('h3','지급 기록'));
  const saved=store.snapshot();signature=JSON.stringify([saved,done]);if(saved.error){const note=el('p',saved.error);note.setAttribute('role','alert');host.append(note);return;}
  const controls=el('form');controls.className='payout-filters';
  const kind=el('select');kind.setAttribute('aria-label','지급 기록 분류');
  for(const [value,label] of [['all','전체 지급'],['unassigned','계약 미연결'],['log-id','로그 ID 연결'],['manual','직접 연결']]){const option=el('option',label);option.value=value;kind.append(option);}kind.value=draft.kind;
  const dates=['from','to'].map((key,i)=>{const label=el('label',i?'종료일':'시작일'),input=el('input');input.type='date';input.value=draft[key];input.setAttribute('aria-label',i?'지급 조회 종료일':'지급 조회 시작일');label.append(input);controls.append(label);return input;});
  const apply=el('button','조회');apply.type='submit';controls.prepend(kind);controls.append(apply);controls.onsubmit=e=>{e.preventDefault();filters={kind:kind.value,from:dates[0].value,to:dates[1].value,page:0};render();};host.append(controls);
  let result;try{result=rewardPage(saved.records,filters);filters.page=result.page;}catch(e){const note=el('p',e.message);note.setAttribute('role','alert');host.append(note);return;}
  const total=el('p',`조회 결과 ${result.count}건 · ${result.total.toLocaleString()} aUEC / 전체 보관 ${result.storedCount}건 · ${result.storedTotal.toLocaleString()} aUEC`);total.className='payout-totals';total.setAttribute('role','status');host.append(total);
  const list=el('ol');list.className='payout-list';
  for(const r of result.rows){const row=el('li'),id=r.missionId||r.linkedMissionId;row.append(el('strong',`${r.amount.toLocaleString()} aUEC`),el('span',new Date(r.at).toLocaleString()),el('small',({'log-id':'로그 ID 연결',manual:'직접 연결',unassigned:'계약 미연결'})[rewardKind(r)]));if(id)row.append(el('small',`계약 ${id}`));list.append(row);}host.append(list);
  if(!result.count)host.append(el('p',saved.records.length?'조건에 맞는 지급 기록이 없습니다.':'아직 보관된 지급 알림이 없습니다.'));
  const nav=el('div');nav.className='payout-pages';
  for(const [label,delta] of [['이전 기록',-1],['다음 기록',1]]){const b=el('button',label);b.type='button';b.disabled=delta<0?result.page===0:result.page+1>=result.pages;b.onclick=()=>{filters.page+=delta;render();};nav.append(b);}
  nav.append(el('span',`${result.page+1} / ${result.pages}`));host.append(nav);
  const download=el('button','지급 기록 내보내기');download.type='button';download.disabled=!saved.records.length;
  const note=el('p','전체 보관 기록을 JSON 파일로 저장합니다. 로그 원문·계약 제목·플레이어 정보는 포함하지 않습니다. 현재는 파일 가져오기를 지원하지 않습니다.');
  download.onclick=()=>{const latest=store.snapshot();if(latest.error){render();return;}const url=URL.createObjectURL(new Blob([rewardExport(latest.records)],{type:'application/json'})),a=el('a');a.href=url;a.download='stam-payout-observations.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};host.append(download,note);
 }
 return {mount(element){host=element;filters={kind:'all',from:'',to:'',page:0};render();},refresh(){if(host?.isConnected&&(!host.closest('dialog')||host.closest('dialog').open)&&JSON.stringify([store.snapshot(),completions?.snapshot()||{records:[],error:null}])!==signature)render();}};
}

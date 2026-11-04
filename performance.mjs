import {createPerformanceStore,resolvePerformance,driveChoices,performanceKey} from './performance-core.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
let resources;
async function loadData(){
 resources??=Promise.allSettled(['ship-performance','quantum-drives'].map(async name=>{const url=new URL(`./data/${name}.json`,import.meta.url);url.search=new URL(import.meta.url).search;const r=await fetch(url);if(!r.ok)throw Error('함선 성능 자료를 불러오지 못했습니다.');return r.json();}));
 const [profiles,drives]=await resources;if(profiles.status==='rejected'){resources=null;throw profiles.reason;}
 return {data:profiles.value,catalog:drives.status==='fulfilled'?drives.value:null};
}
export async function createPerformance(anchor,{onChange=()=>{},canEdit=()=>true,storage=globalThis.localStorage}={}){
 const {data,catalog}=await loadData(),store=createPerformanceStore(storage);
 const root=el('section');root.className='performance-panel';anchor.after(root);let ship,disposed=false,lastRender='';
 const message=el('p');message.setAttribute('role','status');message.className='performance-message';
 const getFor=s=>resolvePerformance(data,catalog,s,store.get(s));
 const get=()=>getFor(ship);
 function commit(next){if(!canEdit()){render();return;}try{resolvePerformance(data,catalog,ship,next||{});store.save(ship,next);render();onChange(get());}catch(e){message.textContent=e.message;}}
 function render(){
  if(!ship||disposed)return;const opened=root.querySelector('details')?.open;let p,custom;
  try{p=get();custom=store.get(ship);}catch(e){const reset=el('button','이 함선 추천값으로 복원');reset.type='button';reset.disabled=!canEdit();reset.onclick=()=>commit(null);root.replaceChildren(el('p',e.message),reset,message);lastRender='';return;}
  const renderKey=JSON.stringify([ship.id,performanceKey(ship),custom,canEdit()]);if(renderKey===lastRender)return;lastRender=renderKey;root.replaceChildren();
  const profile=data.profiles[performanceKey(ship)],automatic=resolvePerformance(data,catalog,ship,{}),list=driveChoices(data,catalog,ship);
  root.append(el('strong',`${p.drive?.name||'평균속도 직접 입력'}${p.drive?' · S'+p.drive.size:''}`),el('p',`SCM ${p.scm??'미확인'} m/s · NAV 최고 ${p.maxSpeed??'미확인'} m/s`));
  const details=el('details');details.open=opened||false;details.append(el('summary','드라이브·비행 속도 변경'));
  const label=el('label','퀀텀 드라이브'),select=el('select');select.setAttribute('aria-label','퀀텀 드라이브');select.dataset.p='driveMode';
  const option=(value,text)=>{const o=el('option',text);o.value=value;select.append(o);};
  if(automatic.drive)option('auto',`추천 · ${automatic.drive.name} S${automatic.drive.size}`);
  if(profile?.factoryDrive)option('factory',`기본 장착 · ${profile.factoryDrive.name} S${profile.factoryDrive.size}`);
  for(const d of list)option('catalog:'+d.id,`${d.name} · ${d.grade?d.grade+'급':'등급 미확인'} · ${d.class||'분류 미확인'} · S${d.size}`);
  option('custom','평균 퀀텀 속도 직접 입력');select.value=p.driveMode==='catalog'?'catalog:'+custom.driveId:p.driveMode;label.append(select);details.append(label);
  select.onchange=()=>{const value=select.value;commit({...custom,driveMode:value.startsWith('catalog:')?'catalog':value,driveId:value.startsWith('catalog:')?value.slice(8):undefined});};
  if(p.drive){
   const stats=el('p',`최고 ${(p.drive.maxSpeed/1000000).toFixed(1)} Mm/s · 준비 ${p.drive.spool}초 · 재사용 대기 ${p.drive.cooldown}초`);details.append(stats);
   const source=el('a','드라이브 자료 · Star Citizen Wiki');source.href=p.drive.sourceUrl||'https://api.star-citizen.wiki';source.target='_blank';source.rel='noopener noreferrer';details.append(source);
  }
  const fields=el('div');fields.className='performance-fields';
  for(const [key,text] of [['scm','SCM (m/s)'],['maxSpeed','NAV 최고 (m/s)'],['approachSpeed','지상 접근 평균 (m/s)'],...(p.driveMode==='custom'?[['quantumSpeed','평균 퀀텀 속도 (km/s)']]:[])]){
   const row=el('label',text),input=el('input');input.type='number';input.min=key==='quantumSpeed'?'1000':'1';input.max=key==='quantumSpeed'?'2000000':'10000';input.step='any';input.value=p[key]??'';input.placeholder='미확인';input.setAttribute('aria-label',text);input.dataset.p=key;input.disabled=!canEdit();
   input.onchange=()=>{if(input.value&&!input.reportValidity())return;commit({...custom,[key]:input.value?Number(input.value):null});};row.append(input);fields.append(row);
  }
  details.append(fields,el('p','접근 평균은 기본 SCM의 65%로 계산합니다. 실제 비행과 다르면 직접 조정해 주세요.'));
  const reset=el('button','이 함선 추천값으로 복원');reset.type='button';reset.disabled=!canEdit();reset.onclick=()=>commit(null);details.append(reset);
  select.disabled=!canEdit();
  details.append(el('p',`${data.version} · 공개 자료 기준. 현재 게임의 장착 상태·버전·구매 가능 여부는 별도 확인이 필요합니다.`));
  if(!profile)details.append(el('p','함선 성능 미확인 · 평균 퀀텀 속도 180,000 km/s는 계획용 기본 가정입니다. 실제 값에 맞게 입력해 주세요.'));
  details.append(el('p','슬롯 크기에 맞춘 후보입니다. 기체별 교체 제한은 게임에서 확인해 주세요.'));
  if(!list.length)details.append(el('p',p.slot?'이 슬롯의 추가 드라이브 목록을 확인하지 못했습니다.':'드라이브 슬롯 미확인 · 다른 함선의 부품을 대신 선택하지 않습니다.'));
  root.append(details,message);message.textContent='';
 }
 return {root,get,getFor,setShip(s){ship=s;render();return get();},refresh:render,destroy(){disposed=true;root.remove();},
  choices:()=>({mode:get().driveMode,auto:resolvePerformance(data,catalog,ship,{}).drive?.name||'미확인',factory:data.profiles[performanceKey(ship)]?.factoryDrive?.name||null,quantumSpeed:get().quantumSpeed}),
  setMode(mode,speed){if(!['auto','factory','custom'].includes(mode))return;commit({...store.get(ship),driveMode:mode,...speed!==undefined?{quantumSpeed:speed}:{}});}};
}

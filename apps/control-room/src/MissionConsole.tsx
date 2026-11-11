import { useState } from 'react';
import type { Locale } from './navigation';
import { itinerary, jobVolume, placeName, samples, ships } from './mission-trial';
import type { useLogReceipts } from './use-log-receipts';
import type { Draft, Job, Place, Shipment } from './mission-trial';
import { HudFrame, InterfaceGlyph } from './InterfaceGlyph';
import './mission-console.css';
import {CargoPanel} from './CargoPanel';

type Props = {draft:Draft; locale:Locale; change:(d:Draft)=>void; receipts:ReturnType<typeof useLogReceipts>};
function JobDetails({job,locale}:{job:Job;locale:Locale}) {
  const n=locale==='ko'?0:1;
  const en=locale==='en';
  const rows=job.shipments;
  if(!rows.length) return <span>{en?'Awaiting cargo details':'화물 정보 미확인'}</span>;
  if(rows.length===1 && !job.state) {
    const row=rows[0]!;
    return <span className="receipt-route">{placeName(row.from,n)} → {placeName(row.to,n)}</span>;
  }
  const pickups=new Set(rows.map(row=>row.from).filter(Boolean)).size;
  const deliveries=new Set(rows.map(row=>row.to).filter(Boolean)).size;
  const kinds=new Set(rows.map(row=>row.cargo[n])).size;
  return <details className="shipment-details"><summary>
    {en?`${pickups} pickups · ${deliveries} deliveries · ${kinds} cargo types`:`픽업 ${pickups}곳 · 배송 ${deliveries}곳 · 화물 ${kinds}종`}
  </summary><ul>{rows.map(row=><li key={row.id}><strong>{row.cargo[n]} · {row.scu?row.scu+' SCU':(en?'Pickup share unknown':'픽업 수량 미확인')}</strong>
    <span>{placeName(row.from,n)} → {placeName(row.to,n)}</span></li>)}</ul>
    {Object.entries(job.reservations||{}).map(([id,scu])=><p key={id}>{placeName(id,n)} · {en?'Reserved delivery total':'배송 총량 예약'} {scu} SCU</p>)}
    {job.hints?.filter(h=>!job.reservations?.[h.place]).map((h,i)=><p key={i}>{en?'Logged delivery goal':'로그 배송 목표'} · {h.cargo} {h.scu} SCU · {h.name||placeName(h.place,n)}</p>)}</details>;
}
export function MissionConsole({draft:d,locale,change,receipts}:Props) {
  const t = (ko:string,en:string)=>locale==='en'?en:ko;
  const n = locale==='ko'?0:1;
  const [form,setForm] = useState<Job|null>(null);
  const [reviewCargo,setReviewCargo]=useState(false);
  const edit = (patch:Partial<Draft>)=>change({...d,...patch,reviewed:false});
  const [sampleMode,setSampleMode]=useState(receipts.phase==='idle');
  const showLog = !sampleMode || receipts.phase!=='idle' && !d.received;
  const cards=showLog?receipts.cards:(d.received?samples:[]);
  const available = cards.filter(s=>(!s.state||s.state==='ready')&&!d.jobs.some(j=>j.id===s.id));
  const [checked,setChecked] = useState<string[]>([]);
  const chosen = available.filter(j=>checked.includes(j.id));
  const where = (p:Place)=>placeName(p,n);
  const relevantPlaces = new Set(['hurston','crusader','arccorp','microtech',d.start]);
  for(const job of [...d.jobs,...receipts.cards]) for(const row of job.shipments) {
    if(row.from) relevantPlaces.add(row.from);
    if(row.to) relevantPlaces.add(row.to);
  }
  const options = [...relevantPlaces].map(p=><option key={p} value={p}>{where(p)}</option>);
  const total = d.jobs.reduce((a,j)=>a+jobVolume(j),0);
  const pay = d.jobs.reduce((a,j)=>a+j.pay,0);
  const peak = Math.max(0,...d.jobs.map(jobVolume));
  const oversize = peak>ships[d.ship];
  const newRow = ():Shipment=>({id:crypto.randomUUID(),cargo:['',''],from:d.start,to:d.start==='microtech'?'arccorp':'microtech',scu:1});
  const updateRow = (id:string,patch:Partial<Shipment>)=>setForm(current=>current && ({
    ...current,shipments:current.shipments.map(row=>row.id===id?{...row,...patch}:row)
  }));
  const invalidRows = form?.shipments.some(row=>row.from===row.to || !row.cargo[n].trim() || row.scu<1);
  return <div className="manifest">
    <div className="manifest-config">
      <label>{t('파트너','Partner')}<select value={d.partner} onChange={e=>edit({partner:e.target.value as Draft['partner']})}><option value="operator">{t('브리지 오퍼레이터','Bridge operator')}</option><option value="navigator">{t('수석 항해사','Senior navigator')}</option></select></label>
      <label>{t('함선','Ship')}<select value={d.ship} onChange={e=>edit({ship:e.target.value as Draft['ship']})}>{Object.keys(ships).map(s=><option key={s}>{s}</option>)}</select></label>
      <label>{t('출발지','Departure')}<select value={d.start} onChange={e=>edit({start:e.target.value as Place})}>{options}</select></label>
    </div>
    <div className="manifest-cols"><div className="manifest-work">
      <div className="manifest-head"><InterfaceGlyph kind="mission"/><div><small>FLIGHT MANIFEST</small><h2>{t('이번 운송 계약','Flight manifest')} <em>{String(d.jobs.length).padStart(2,'0')}</em></h2></div>
      <button onClick={()=>setForm({id:crypto.randomUUID(),title:['',''],shipments:[newRow()],pay:0})}>{t('+ 직접 입력','+ Manual entry')}</button></div>
      {!d.jobs.length && <p className="manifest-empty">{t('아직 이번 운송에 담은 계약이 없습니다.','Your manifest is empty.')}<br/>{t('아래 수신함에서 고르거나 직접 입력하세요.','Choose a received contract below or enter one manually.')}</p>}
      {d.jobs.map(j=><div key={j.id} className="manifest-row"><div><b>{j.title[n]} · {jobVolume(j)} SCU</b><JobDetails job={j} locale={locale}/></div>{!j.state&&<button onClick={()=>setForm({...j})}>{t('수정','Edit')}</button>}<button onClick={()=>edit({jobs:d.jobs.filter(k=>k.id!==j.id)})}>{t('빼기','Remove')}</button></div>)}
      {form && <form className="manifest-editor" onSubmit={e=>{e.preventDefault(); if(invalidRows)return;
        const saved={...form,title:form.title[n].trim()?form.title:form.shipments[0]!.cargo};
        edit({jobs:d.jobs.some(j=>j.id===form.id)?d.jobs.map(j=>j.id===form.id?saved:j):[...d.jobs,saved]});setForm(null)}}>
        <label>{t('계약명','Contract name')}<input autoFocus maxLength={70} value={form.title[n]} onChange={e=>setForm({...form,title:[e.target.value,e.target.value]})}/></label>
        <label>{t('보상','Reward')} · aUEC<input required min="0" max="999999999" type="number" value={form.pay} onChange={e=>setForm({...form,pay:Number(e.target.value)})}/></label>
        {form.shipments.map((row,i)=><fieldset key={row.id}><legend>{t('운송 항목','Shipment')} {i+1}</legend>
          <label>{t('화물명','Cargo')}<input required maxLength={70} value={row.cargo[n]} onChange={e=>updateRow(row.id,{cargo:[e.target.value,e.target.value]})}/></label>
          <label>SCU<input required min="1" max="9999" type="number" value={row.scu||''} onChange={e=>updateRow(row.id,{scu:Number(e.target.value)})}/></label>
          <label>{t('픽업','Pickup')}<select value={row.from} onChange={e=>updateRow(row.id,{from:e.target.value as Place})}>{options}</select></label>
          <label>{t('배송','Delivery')}<select value={row.to} onChange={e=>updateRow(row.id,{to:e.target.value as Place})}>{options}</select></label>
          {row.from===row.to&&<span>{t('픽업지와 다른 배송지를 선택하세요.','Choose a different delivery port.')}</span>}
          {form.shipments.length>1&&<button type="button" onClick={()=>setForm({...form,shipments:form.shipments.filter(s=>s.id!==row.id)})}>{t('항목 빼기','Remove shipment')}</button>}
        </fieldset>)}
        <div><button type="button" onClick={()=>setForm({...form,shipments:[...form.shipments,newRow()]})}>{t('+ 운송 항목','+ Shipment')}</button> <button type="submit" disabled={invalidRows}>{t('계약 저장','Save contract')}</button> <button type="button" onClick={()=>setForm(null)}>{t('취소','Cancel')}</button></div>
      </form>}
      <div className="manifest-inbox"><small>INBOX</small><h3>{t('계약 수신함','Contract inbox')}</h3>
      <div className="receipt-sources"><label>{t('게임 로그에서 계약 읽기','Read contracts from game log')}<input type="file" accept=".log" onChange={e=>{
        const file=e.target.files?.[0];e.target.value='';if(!file)return;setChecked([]);setSampleMode(false);receipts.read(file);
      }}/></label>
      {(!d.received || showLog)&&<button onClick={()=>{setSampleMode(true);setChecked([]);if(!d.received)change({...d,received:true});}}>{t(`예시 계약 ${samples.length}건 보기`,`View ${samples.length} sample contracts`)}</button>}
      {!showLog&&receipts.phase!=='idle'&&<button onClick={()=>{setChecked([]);setSampleMode(false)}}>{t('읽은 로그 보기','View log receipts')}</button>}</div>
      {showLog&&<p role="status">{({idle:'',reading:t('게임 로그를 읽고 있습니다.','Reading game log…'),loaded:t(`로그에서 읽은 계약 ${receipts.cards.length}건`,`${receipts.cards.length} contracts from log`),mixed:t('여러 플레이어의 기록이 섞였습니다. 현재 Game.log를 선택하세요.','Mixed player records. Select your current Game.log.'),error:t('이 로그를 읽을 수 없습니다. 파일을 다시 선택하세요.','Could not read this log. Select the file again.')})[receipts.phase]}</p>}
      {cards.length>0&&<><div className="receipt-grid">{cards.map(j=>{
        const added=d.jobs.some(job=>job.id===j.id);
        const locked=j.state && j.state!=='ready';
        const status=added?t('운송에 담김','In manifest'):j.state==='ended'?t('종료된 계약','Ended'):j.state==='conflict'?t('기록 충돌','Conflicting records'):j.state==='incomplete'?t('정보 확인 필요','Incomplete'):t('수신 계약','Received');
        const selected=!added && checked.includes(j.id);
        return <article className="receipt-card" data-state={added?'added':selected?'checked':'new'} key={j.id}>
          <label><span className="receipt-top"><span>{status}</span><input type="checkbox" checked={selected||added} disabled={added||locked} aria-label={j.title[n]+' · '+t('계약 선택','Select contract')} onChange={e=>setChecked(e.target.checked?[...checked,j.id]:checked.filter(id=>id!==j.id))}/></span>
          <strong>{j.title[n]}</strong></label><JobDetails job={j} locale={locale}/>
          <span className="receipt-bottom"><b>{j.state==='incomplete'?t('상세 확인','See details'):jobVolume(j)+' SCU'}</b><b>{j.rewardUnknown?t('보상 미확인','Reward unknown'):j.pay.toLocaleString()+' aUEC'}</b></span>
        </article>;
      })}</div>
      <div className="receipt-actions"><span aria-live="polite">{t('선택','Selected')} {chosen.length}</span><button disabled={!chosen.length} onClick={()=>{edit({jobs:[...d.jobs,...chosen]});setChecked([])}}>{t('선택한 계약 담기','Add selected contracts')}</button></div></>}</div>
    </div><aside className="manifest-summary"><div className="dispatch-band"><small>STAM / DISPATCH</small><span aria-hidden="true">▰ ▰ ▰</span></div><h2>{t('출항 준비','Departure brief')}</h2>
      <span>{t('예상 계약 보상','Contract rewards')}</span><strong>{pay.toLocaleString()} <i>aUEC</i></strong>
      {d.jobs.some(j=>j.rewardUnknown)&&<p>{t('보상 미확인 계약은 합계에서 제외했습니다.','Contracts with unknown rewards are excluded.')}</p>}
      <dl><dt>{t('총 운송량','Total freight')}</dt><dd>{total} SCU</dd><dt>{t('함선 적재 용량','Ship capacity')}</dt><dd>{ships[d.ship]} SCU</dd></dl>
      <div className="cargo-instrument"><div><span>{t('최대 동시 적재량','Peak cargo load')}</span><b>{peak} / {ships[d.ship]} SCU</b></div><div className="cargo-cells" aria-hidden="true">{Array.from({length:24},(_,i)=><i key={i} data-on={i<Math.ceil(24*peak/ships[d.ship])} data-limit={oversize}/>)}</div></div>
      <p>{oversize?t('한 계약의 화물이 함선 용량을 초과합니다. 함선이나 계약을 변경하세요.','A contract exceeds ship capacity. Change the ship or manifest.'):!d.jobs.length?t('계약을 한 건 이상 담으면 항로를 확인할 수 있습니다.','Add a contract to preview the route.'):t('계약 순서대로 픽업과 배송을 검토합니다.','Review pickups and deliveries in contract order.')}</p>
      <button className="cargo-review-toggle" aria-expanded={reviewCargo} onClick={()=>setReviewCargo(!reviewCargo)}>{t('출항 전 적재 3D 검토','Review cargo in 3D')}</button>
      <button className="manifest-primary dispatch-launch" disabled={!d.jobs.length||oversize||!!form} onClick={()=>{change({...d,reviewed:true});location.hash='#/map?lang='+locale}}><HudFrame/><InterfaceGlyph kind="map"/><span>{t('예시 항로 검토','Review sample route')}</span><b aria-hidden="true">↗</b></button>
    </aside></div>{reviewCargo&&<div className="departure-cargo-review"><CargoPanel draft={d} locale={locale}/></div>}</div>;
}

export function TrialBrief({draft:d,locale,operations=false}:{draft:Draft;locale:Locale;operations?:boolean}) {
  const n=locale==='ko'?0:1, en=locale==='en';
  const stops=itinerary(d);
  const [cargoOpen,setCargoOpen]=useState(false);
  return <section className="trial-brief"><small>{operations?'OPERATIONS':'DEPARTURE BRIEF'}</small>
    <h2>{operations?(en?'First stop':'첫 거점 작업'):(en?'Planned calls':'이번 운송의 방문 순서')}</h2>
    <ol>{(operations?stops.slice(0,1):stops).map((s,i)=><li key={i}><b>{placeName(s.place,n)}</b>
      {s.tasks.length?s.tasks.map(({load,job,shipment})=><span className="trial-task" key={job.id+':'+shipment.id+':'+load}>
        {load?(en?'Load ':'픽업 '):(en?'Unload ':'배송 ')}{shipment.cargo[n]} {shipment.scu?shipment.scu+' SCU':(en?'· share unknown':'· 분배 미확인')} · {job.title[n]}
        {load?' → ':' ← '}{placeName(load?shipment.to:shipment.from,n)}</span>):<span>{en?'Depart':'출발'}</span>}
      {[...new Set(s.tasks.filter(task=>!task.load&&task.job.reservations?.[s.place]).map(task=>task.job))].map(job=><span key={job.id}>{job.title[n]} · {en?'Delivery total':'배송 총량'} {job.reservations?.[s.place]} SCU</span>)}</li>)}</ol>
    {!operations&&<><button className="cargo-review-toggle" aria-expanded={cargoOpen} onClick={()=>setCargoOpen(!cargoOpen)}>{en?'Review cargo in 3D':'적재 3D 검토'}</button>{cargoOpen&&<CargoPanel draft={d} locale={locale}/>}</>}
    <div><a href={'#/mission?lang='+locale}>{en?'Edit manifest':'계약 수정'}</a>{!operations&&<a className="manifest-primary" href={'#/operations?lang='+locale}>{en?'Open operations':'운항 관제로'} →</a>}</div>
  </section>;
}

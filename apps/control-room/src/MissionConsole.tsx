import {ConsoleDial} from './ConsoleDial';
import { useRef, useState } from 'react';
import type { Locale } from './navigation';
import { itinerary, jobVolume, placeName, samples, ships, shipName, routeReady } from './mission-trial';
import type { useLogReceipts } from './use-log-receipts';
import type { Draft, Job, Place, Shipment } from './mission-trial';
import { InterfaceGlyph } from './InterfaceGlyph';
import './mission-console.css';
import {PortSearch} from './PortSearch';
import {reviewReceipt,reservationBoxes} from './receipt-edit.mjs';
import {useDismissedReceipts} from './use-dismissed-receipts';
import {CargoPanel} from './CargoPanel';

import {BoxInputs,ContractFields,invalidCargo} from './ContractFields';
import type {BoxCounts} from './ContractFields';
import {ScreenshotIntake} from './ScreenshotIntake';

type Props = {draft:Draft; locale:Locale; change:(d:Draft)=>void; locked:boolean; onReview:()=>void; receipts:ReturnType<typeof useLogReceipts>};
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
export function MissionConsole({draft:d,locale,change,receipts,locked,onReview}:Props) {
  const t = (ko:string,en:string)=>locale==='en'?en:ko;
  const n = locale==='ko'?0:1;
  const [form,setForm] = useState<Job|null>(null);
  const manualEntry=useRef<HTMLDetailsElement>(null);
  const [input,setInput]=useState(''),[pendingForms,setPendingForms]=useState<Job[]>([]);
  const [intakeError,setIntakeError]=useState('');
  async function reviewText(){
    try{const {textContracts}=await import('./contract-intake.mjs');const [first,...rest]=textContracts(input).filter(j=>!d.jobs.some(old=>old.id===j.id));
      if(!first){setIntakeError(t('새 계약이 없습니다.','No new contracts.'));return;}
      if(manualEntry.current)manualEntry.current.open=true;
      setForm(first);setPendingForms(rest);setIntakeError('');}
    catch(error){setIntakeError(String(error));}
  }
  const [reviewCargo,setReviewCargo]=useState(false);
  const edit = (patch:Partial<Draft>)=>change({...d,...patch,reviewed:false});
  const [sampleMode,setSampleMode]=useState(receipts.phase==='idle');
  const showLog = !sampleMode || receipts.phase!=='idle' && !d.received;
  const inbox=showLog?receipts.cards:(d.received?samples:[]);
  const {dismissed,update:updateDismissed,failed:dismissFailed}=useDismissedReceipts(!showLog);
  const [showEnded,setShowEnded]=useState(false);
  const retained=inbox.filter(j=>!dismissed.has(j.id));
  const endedCount=retained.filter(j=>j.state==='ended').length;
  const cards=retained.filter(j=>showEnded || j.state!=='ended');
  const restorable=inbox.filter(j=>dismissed.has(j.id));
  const simple = d.partner==='operator';
  const eligible = (job:Job)=>routeReady(job) && (simple ||
    job.state!=='incomplete' && job.shipments.every(row=>row.scu>0 || !!job.reservations?.[row.to]));
  const [checked,setChecked] = useState<string[]>([]);
  const selectionKey=(j:Job)=>JSON.stringify([j.id,j.signature,j.reviewedReceipt]);
  const selectedCards=cards.filter(j=>checked.includes(selectionKey(j)));
  const canAdd=(j:Job)=>eligible(j) && !d.jobs.some(job=>job.id===j.id);
  const chosen=selectedCards.filter(canAdd);
  const where = (p:Place)=>placeName(p,n);
  const total = d.jobs.reduce((a,j)=>a+jobVolume(j),0);
  const pay = d.jobs.reduce((a,j)=>a+(j.rewardUnknown?0:j.pay),0);
  const unknownQuantity=d.jobs.some(j=>j.shipments.some(r=>!r.scu&&!j.reservations?.[r.to]));
  const peak = Math.max(0,...d.jobs.map(jobVolume));
  const hold = ships[d.ship] ?? d.customShip?.grids.reduce((sum,g)=>sum+g.w*g.h*g.l,0) ?? 0;
  const oversize = !simple && peak > hold;
  const newRow = ():Shipment=>({id:crypto.randomUUID(),cargo:['',''],from:d.start,to:d.start==='microtech'?'arccorp':'microtech',scu:simple?0:1});
  const editingReceipt=form?.state==='incomplete' || form?.state==='ready';
  const manifestJob=form && d.jobs.find(job=>job.id===form.id);
  const cargoOnly=!!manifestJob && form?.state==='ready';
  function dismiss(ids:string[]){
    if(form && !manifestJob && ids.includes(form.id))setForm(null);
    updateDismissed(ids);
    setChecked([]);
  }
  const [groupBoxes,setGroupBoxes]=useState<Record<string,BoxCounts>>({});
  const [formError,setFormError]=useState('');
  function openReceipt(job:Job){
    const shipments=job.shipments.length?job.shipments:[{id:crypto.randomUUID(),cargo:['',''] as [string,string],from:'',to:'',scu:0}];
    setGroupBoxes(reservationBoxes(job));
    setForm({...job,shipments});setFormError('');setPendingForms([]);
  }
  const quantityOptional=(row:Shipment)=>!!form?.reservations?.[row.to] || (simple && (!editingReceipt || !!manifestJob));
  const invalidRows=!!form && invalidCargo(form,n,quantityOptional);
  const [managing,setManaging]=useState(false);
  const manifestHeading=useRef<HTMLHeadingElement>(null);
  function addSelected(){
    if(!chosen.length)return;
    edit({jobs:[...d.jobs,...chosen]});
    setChecked([]);
    manifestHeading.current?.focus();
    manifestHeading.current?.scrollIntoView({block:'nearest'});
  }
  const editor=form && <form className="manifest-editor" onSubmit={e=>{e.preventDefault(); if(invalidRows || locked)return;
        let saved={...form,title:form.title[n].trim()?form.title:form.shipments[0]!.cargo};
        if(editingReceipt){
          try{
            const live=form.signature?receipts.cards.find(c=>c.id===form.id):undefined;
            if(live && (live.signature!==form.signature || live.state==='ended' || live.state==='conflict'))
              throw Error(t('수신 기록이 바뀌었습니다. 수신함에서 다시 확인하세요.','The receipt changed. Review it in the inbox.'));
            saved=reviewReceipt(manifestJob || live,saved,simple && !!manifestJob,groupBoxes);
          }
          catch(error){setFormError((error as Error).message);return;}
        }
        setFormError('');
        if(editingReceipt){
          if(saved.signature && !manifestJob)receipts.saveCorrection(saved);
          if(!d.jobs.some(j=>j.id===saved.id)){setForm(null);return;}
        }
        edit({jobs:d.jobs.some(j=>j.id===form.id)?d.jobs.map(j=>j.id===form.id?saved:j):[...d.jobs,saved]});setForm(pendingForms[0]||null);setPendingForms(pendingForms.slice(1))}}>
        <ContractFields form={form} setForm={setForm} locale={locale} cargoOnly={cargoOnly} quantityOptional={quantityOptional}/>
        {editingReceipt && (!cargoOnly || Object.keys(manifestJob?.reservations||{}).length>0) && [...new Set(form.shipments.map(r=>r.to).filter(Boolean))].map(id=><label key={id}>{where(id)} · {t('배송 총량 (선택)','Delivery total (optional)')} SCU
          <input type="number" min="1" value={form.reservations?.[id]??''} onChange={e=>{
            const totals={...form.reservations};if(e.target.value)totals[id]=Number(e.target.value);else delete totals[id];
            setForm({...form,reservations:totals});
          }}/></label>)}
        {editingReceipt&&Object.entries(form.reservations||{}).filter(([place])=>form.shipments.filter(r=>r.to===place && !r.scu).length>1).map(([place,total])=>
          <fieldset key={place}><legend>{where(place)} · {t('배송 총량의 상자 규격','Containers for delivery total')} ({total} SCU)</legend>
            <BoxInputs boxes={groupBoxes[place]} onChange={boxes=>setGroupBoxes({...groupBoxes,[place]:boxes})}/>
          </fieldset>)}
        {editingReceipt&&formError&&<p role="alert">{formError}</p>}
        <div>{!cargoOnly&&<button type="button" onClick={()=>setForm({...form,shipments:[...form.shipments,newRow()]})}>{t('+ 운송 항목','+ Shipment')}</button>} <button type="submit" disabled={invalidRows}>{cargoOnly?t('화물 수정 저장','Save cargo changes'):editingReceipt?t('보완한 카드 저장','Save card details'):t('계약 저장','Save contract')}</button> <button type="button" onClick={()=>{setForm(null);setPendingForms([]);}}>{t('취소','Cancel')}</button></div>
      </form>;
  return <fieldset disabled={locked} className="manifest flight-manifest">
    <div className="manifest-cols">
    <section className="manifest-work manifest-inbox" aria-labelledby="mission-inbox-title">
      <header className="inbox-header"><div className="manifest-head"><InterfaceGlyph kind="mission"/><div><small>INBOX</small><h2 id="mission-inbox-title">{t('계약 수신함','Contract inbox')}</h2></div></div>
      {cards.length>0 && <div className="receipt-actions">
        <span aria-live="polite">{t('선택','Selected')} {selectedCards.length}</span>
        <button className="receipt-add" disabled={!!form || !chosen.length} onClick={addSelected}>{t('이번 운송에 담기','Add to this flight')}{chosen.length>0 && ' ('+chosen.length+')'}</button>
      </div>}
      </header>
      {cards.length>0&&<div className="receipt-grid">{cards.map(j=>{
        const added=d.jobs.some(job=>job.id===j.id);
        const status=added?t('운송에 담김','In manifest'):j.state==='ended'?t('종료된 계약','Ended'):j.state==='conflict'?t('기록 충돌','Conflicting records'):j.state==='incomplete'?(simple&&routeReady(j)?t('경로 계산 가능 · 정보 미확인','Route available · incomplete details'):t('정보 확인 필요','Incomplete')):t('수신 계약','Received');
        const key=selectionKey(j);
        const selected=checked.includes(key);
        return <article className="receipt-card" data-state={selected?'checked':added?'added':'new'} key={j.id}>
          <label><span className="receipt-top"><span>{status}</span><input type="checkbox" disabled={!managing && !canAdd(j)} checked={selected} aria-label={j.title[n]+' · '+t('계약 선택','Select contract')} onChange={e=>setChecked(e.target.checked?[...checked,key]:checked.filter(id=>id!==key))}/></span>
          <strong>{j.title[n]}</strong></label><JobDetails job={j} locale={locale}/>
          {j.state==='incomplete'&&!added&&<button type="button" className="receipt-correct" disabled={!!form} onClick={()=>openReceipt(j)}>{t('계약 정보 보완','Complete contract details')}</button>}
          {managing && <button type="button" className="receipt-correct" onClick={()=>dismiss([j.id])}>{t('카드 삭제','Delete card')}</button>}
          <span className="receipt-bottom"><b>{j.state==='incomplete'?t('상세 확인','See details'):jobVolume(j)+' SCU'}</b><b>{j.rewardUnknown?t('보상 미확인','Reward unknown'):j.pay.toLocaleString()+' aUEC'}</b></span>
        </article>;
      })}</div>}
      {dismissFailed&&<p role="alert">{t('수신함 정리 상태를 저장하거나 읽지 못했습니다. 브라우저 저장 공간을 확인하세요.','Inbox changes could not be saved or read. Check browser storage.')}</p>}
      {!!inbox.length&&!cards.length&&<p role="status">{t('표시할 수신 카드가 없습니다.','No visible receipts.')}</p>}

      {editingReceipt && !manifestJob && editor}
      {inbox.length>0 && <details className="manifest-intake receipt-manage" open={managing} onToggle={e=>{
        setManaging(e.currentTarget.open);
        if(!e.currentTarget.open)setChecked(current=>current.filter(key=>cards.some(j=>selectionKey(j)===key && canAdd(j))));
      }}>
        <summary>{t('수신함 정리','Manage inbox')}</summary><div className="receipt-tools">
        <button type="button" disabled={!cards.length} onClick={()=>setChecked(cards.map(selectionKey))}>{t('전체 선택','Select all')}</button>
        <button type="button" disabled={!selectedCards.length} onClick={()=>setChecked([])}>{t('선택 해제','Clear selection')}</button>
        <button type="button" disabled={!selectedCards.length} onClick={()=>dismiss(selectedCards.map(j=>j.id))}>{t('선택 삭제','Delete selected')}</button>
        <button type="button" disabled={!retained.length} onClick={()=>dismiss(retained.map(j=>j.id))}>{t('수신함 비우기','Clear inbox')}</button>
        {!!restorable.length&&<button type="button" onClick={()=>updateDismissed(restorable.map(j=>j.id),true)}>{t('삭제한 카드 복원','Restore deleted cards')} ({restorable.length})</button>}
        {!!endedCount&&<button type="button" aria-pressed={showEnded} onClick={()=>setShowEnded(!showEnded)}>{showEnded?t('종료된 계약 숨기기','Hide ended contracts'):t('종료된 계약 보기','Show ended contracts')} ({endedCount})</button>}
      </div></details>}

      <details className="manifest-intake receipt-import" key={inbox.length?'with-receipts':'empty'} open={!inbox.length}>
        <summary>{t('계약 가져오기','Import contracts')}</summary>
      <div className="receipt-sources"><label>{t('게임 로그에서 계약 읽기','Read contracts from game log')}<input type="file" accept=".log" onChange={e=>{
        const file=e.target.files?.[0];e.target.value='';if(!file)return;setChecked([]);setSampleMode(false);receipts.read(file);
      }}/></label>
      {receipts.canWatch&&<button onClick={()=>{if(receipts.watching)receipts.stopWatching();else{setSampleMode(false);setChecked([]);void receipts.follow();}}}>{receipts.watching?t('로그 자동 수신 중지','Stop watching log'):t('Game.log 자동 수신','Watch Game.log')}</button>}
      {(!d.received || showLog)&&<button onClick={()=>{setSampleMode(true);setChecked([]);if(!d.received)change({...d,received:true});}}>{t(`예시 계약 ${samples.length}건 보기`,`View ${samples.length} sample contracts`)}</button>}
      {!showLog&&receipts.phase!=='idle'&&<button onClick={()=>{setChecked([]);setSampleMode(false)}}>{t('읽은 로그 보기','View log receipts')}</button>}</div>
      </details>
      {showLog&&<p role="status">{({idle:'',reading:t('게임 로그를 읽고 있습니다.','Reading game log…'),loaded:t(`로그에서 읽은 계약 ${receipts.cards.length}건`,`${receipts.cards.length} contracts from log`),mixed:t('여러 플레이어의 기록이 섞였습니다. 현재 Game.log를 선택하세요.','Mixed player records. Select your current Game.log.'),error:t('이 로그를 읽을 수 없습니다. 파일을 다시 선택하세요.','Could not read this log. Select the file again.')})[receipts.phase]}</p>}
      <ScreenshotIntake locale={locale} locked={locked || !!form} simple={simple} jobs={d.jobs}
        onAdd={job=>edit({jobs:[...d.jobs,job]})}/>

      <details ref={manualEntry} className="manifest-intake manual-entry"><summary>{form && !editingReceipt && !manifestJob?t('작성 중인 계약','Contract in progress'):t('직접 입력 · 텍스트 가져오기','Manual entry or import text')}</summary>
        <button disabled={!!form} onClick={()=>setForm({id:crypto.randomUUID(),title:['',''],shipments:[newRow()],pay:0})}>{t('+ 직접 입력','+ Manual entry')}</button>
        <label>{t('계약 원문','Contract text')}<textarea rows={5} value={input} onChange={e=>setInput(e.target.value)}/></label>
        <button disabled={!input.trim()||!!form} onClick={()=>void reviewText()}>{t('읽은 계약 검토','Review parsed contracts')}</button>
        {intakeError&&<p role="alert">{intakeError}</p>}
        {!editingReceipt && !manifestJob && editor}
      </details>
    </section>
    <aside className="manifest-summary" aria-labelledby="mission-flight-title">
      <div className="manifest-head"><InterfaceGlyph kind="map"/><div><small>FLIGHT MANIFEST</small><h2 id="mission-flight-title" ref={manifestHeading} tabIndex={-1}>{t('이번 운송 계약','Flight manifest')} </h2></div>
        <ConsoleDial value={d.jobs.length} label={t('계약','Contracts')}/>
      </div>
      {!d.jobs.length && <p className="manifest-empty">{t('수신 카드를 선택하고 ‘이번 운송에 담기’를 누르세요.','Select received contracts and add them to this flight.')}</p>}
      {d.jobs.map(j=><div key={j.id} className="manifest-row"><div><b>{j.title[n]} · {jobVolume(j)} SCU{j.shipments.some(r=>!r.scu&&!j.reservations?.[r.to])&&t(' 확인분',' confirmed')}</b><JobDetails job={j} locale={locale}/></div>{j.state==='incomplete'&&<button disabled={!!form} onClick={()=>openReceipt(j)}>{t('정보 보완','Complete details')}</button>}{j.state==='ready'&&<button disabled={!!form} onClick={()=>openReceipt(j)}>{t('화물 수정','Edit cargo')}</button>}{!j.state&&<button disabled={!!form} onClick={()=>openReceipt(j)}>{t('수정','Edit')}</button>}<button disabled={!!form} onClick={()=>edit({jobs:d.jobs.filter(k=>k.id!==j.id)})}>{t('빼기','Remove')}</button></div>)}

      {manifestJob && editor}
      <button className="manifest-primary dispatch-launch" disabled={!d.jobs.length||!!form||d.jobs.some(j=>!eligible(j))} onClick={onReview}><InterfaceGlyph kind="map"/><span>{form?t('편집 중인 계약을 확인하세요','Finish editing the contract'):!simple&&d.jobs.some(j=>!eligible(j))?t('계약 정보 보완 필요','Complete contract details first'):t('항로 계산','Calculate route')}</span><b aria-hidden="true">↗</b></button>

      <details className="manifest-intake flight-settings">
        <summary>{t('출항 설정','Departure settings')} · {simple?t('간편 경로','Route only'):t('상세 적재','Cargo planning')}</summary>
    <div className="manifest-config">
      <label>{t('파트너','Partner')}<select value={d.partner} onChange={e=>edit({partner:e.target.value as Draft['partner']})}><option value="operator">{t('브리지 오퍼레이터 · 간편 경로','Bridge operator · Route only')}</option><option value="navigator">{t('수석 항해사 · 상세 적재','Senior navigator · Cargo planning')}</option></select></label>
      <label>{t('함선','Ship')}<select value={d.ship} onChange={e=>edit({ship:e.target.value as Draft['ship']})}>{d.customShip?.id===d.ship && !ships[d.ship] && <option disabled value={d.customShip.id}>{d.customShip.name}</option>}{Object.keys(ships).map(s=><option key={s} value={s}>{shipName(s)}</option>)}</select></label>
      <PortSearch locale={locale} label={t('출발지','Departure')} value={d.start} onSelect={start=>edit({start})}/>
    </div>
      </details>
      <span>{t('예상 계약 보상','Contract rewards')}</span><strong>{pay.toLocaleString()} <i>aUEC</i></strong>
      {d.jobs.some(j=>j.rewardUnknown)&&<p>{t('보상 미확인 계약은 합계에서 제외했습니다.','Contracts with unknown rewards are excluded.')}</p>}
      <dl><dt>{t('총 운송량','Total freight')}</dt><dd>{total} SCU{unknownQuantity && t(' 확인분',' confirmed')}</dd>{!simple&&<><dt>{t('함선 적재 용량','Ship capacity')}</dt><dd>{hold} SCU</dd></>}</dl>
      {!simple && <div className="cargo-instrument"><div><span>{t('가장 큰 계약','Largest contract')}</span><b>{peak} / {hold} SCU</b></div><div className="cargo-cells" aria-hidden="true">{Array.from({length:24},(_,i)=><i key={i} data-on={i<Math.ceil(24*peak/Math.max(1,hold))} data-limit={oversize}/>)}</div></div>}
      <p>{oversize?t('한 계약의 화물이 함선 용량을 초과합니다. 함선이나 계약을 변경하세요.','A contract exceeds ship capacity. Change the ship or manifest.'):!d.jobs.length?t('계약을 한 건 이상 담으면 항로를 확인할 수 있습니다.','Add a contract to preview the route.'):simple?t('같은 행성권에서 픽업하고 배송을 마치는 순서를 우선합니다. 적재 공간은 계산하지 않습니다.','Prioritizes regional pickups followed by deliveries. Hold capacity is not checked.'):t('픽업을 묶고 상자가 함선에 실리는 순서까지 계산합니다.','Groups pickups and checks the ship’s hold at every stop.')}</p>
      {!simple && <button className="cargo-review-toggle" aria-expanded={reviewCargo} onClick={()=>setReviewCargo(!reviewCargo)}>{t('출항 전 적재 3D 검토','Review cargo in 3D')}</button>}
    </aside></div>{!simple&&reviewCargo&&<div className="departure-cargo-review"><CargoPanel draft={d} locale={locale}/></div>}</fieldset>;
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
    <div><a href={'#/mission?lang='+locale}>{en?'Edit manifest':'계약 수정'}</a>{!operations&&<a className="manifest-primary" href={'#/operations?lang='+locale}>{en?'Open control console':'관제 콘솔로'} →</a>}</div>
  </section>;
}

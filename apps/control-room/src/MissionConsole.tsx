import { useEffect, useRef, useState } from 'react';
import type { Locale } from './navigation';
import { itinerary, placeName, samples, ships, shipName, routeReady } from './mission-trial';
import type { useLogReceipts } from './use-log-receipts';
import type { Draft, Job, Place, Shipment } from './mission-trial';
import { InterfaceGlyph } from './InterfaceGlyph';
import './mission-console.css';
import './mission-intake-flow.css';
import {missionFor} from './flight-engine.mjs';
import {quantityPlan} from './mission-quantities.mjs';
import {PortSearch} from './PortSearch';
import {reviewReceipt,reservationBoxes} from './receipt-edit.mjs';
import {useDismissedReceipts} from './use-dismissed-receipts';
import {CargoPanel} from './CargoPanel';
import {planningPartner} from './partner-policy';
import {draftCargoShip,shipIdFor} from './ship-profile.mjs';
import {capacity} from './cargo-plan.mjs';
import {useCargoPreferences} from './use-cargo-preferences';
import type {Session} from './flight-session';
import {MissionReference} from './MissionReference';

import {BoxInputs,ContractFields,DeliveryTotalFields,invalidCargo} from './ContractFields';
import type {BoxCounts} from './ContractFields';
import {ScreenshotIntake} from './ScreenshotIntake';

type Props = {session?:Session; draft:Draft; locale:Locale; change:(d:Draft)=>void; locked:boolean; onReview:(draft?:Draft)=>void; receipts:ReturnType<typeof useLogReceipts>};
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
export function MissionConsole({draft:d,locale,change,receipts,locked,onReview,session}:Props) {
  const t = (ko:string,en:string)=>locale==='en'?en:ko;
  const n = locale==='ko'?0:1;
  const [form,setForm] = useState<Job|null>(null);
  const manualEntry=useRef<HTMLDetailsElement>(null);
  const logInput=useRef<HTMLInputElement>(null);
  const editorHeading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{
    if(!form)return;
    editorHeading.current?.scrollIntoView({block:'nearest',behavior:'instant'});
    editorHeading.current?.focus({preventScroll:true});
  },[form?.id]);
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
  const incoming=retained.filter(j=>showEnded || j.state!=='ended');
  const cards=[...incoming.map(j=>d.jobs.find(old=>old.id===j.id && old.signature===j.signature)||j),...d.jobs.filter(j=>!incoming.some(c=>c.id===j.id))];
  const restorable=inbox.filter(j=>dismissed.has(j.id));
  const simple = d.partner==='operator';
  const allowUpperBounds=false;
  const info=(job:Job)=>quantityPlan(missionFor(job),allowUpperBounds);
  const eligible=(job:Job)=>routeReady(job);
  const [checked,setChecked]=useState<string[]>([]);
  const selectionKey=(j:Job)=>JSON.stringify([j.id,j.signature,j.reviewedReceipt]);
  const selectedCards=cards.filter(j=>checked.includes(selectionKey(j)));
  const canAdd=(j:Job)=>eligible(j) && !d.jobs.some(job=>job.id===j.id);
  const where = (p:Place)=>placeName(p,n);
  const total=d.jobs.reduce((a,j)=>a+info(j).scu,0);
  const pay=d.jobs.reduce((a,j)=>a+(j.rewardUnknown?0:j.pay),0);
  const unknownQuantity=d.jobs.some(j=>!info(j).ready);
  const estimated=d.jobs.some(j=>info(j).certainty==='upper-bound');
  const cargoPreferences=useCargoPreferences();
  const activeShip=session?.run?.started&&!session.run.finished&&session.plan?.mode!=='simple'?session.plan?.ship:undefined;
  const hold=capacity(activeShip||draftCargoShip(d,cargoPreferences?.disabled[shipIdFor(d.ship)]));
  const [totals,setTotals]=useState<Record<string,string>>({});
  const [quickError,setQuickError]=useState('');
  const totalKey=(job:Job,place:string)=>JSON.stringify([job.id,job.signature,place]);
  function withPendingTotals(job:Job){
    if(simple)return job;
    let next=job;
    for(const place of new Set(job.shipments.map(r=>r.to).filter(Boolean))){
      const value=totals[totalKey(job,place)];
      if(value===undefined)continue;
      const amount=Number(value);
      if(!value.trim()||!Number.isSafeInteger(amount)||amount<=0)throw Error(t('배송 총량은 1 이상의 정수로 입력하세요.','Enter a positive whole-number delivery total.'));
      const live=job.signature?receipts.cards.find(c=>c.id===job.id):undefined;
      if(live && (live.signature!==job.signature||live.state==='ended'||live.state==='conflict'))throw Error(t('수신 기록이 바뀌었습니다. 해당 계약을 다시 확인하세요.','The receipt changed. Review this contract again.'));
      const source={...next,state:next.state||'incomplete'} as Job;
      // Changed totals invalidate that delivery's old box allocation, not other deliveries.
      const boxes={...reservationBoxes(next)};delete boxes[place];
      next=reviewReceipt(source,{...source,reservations:{...source.reservations,[place]:amount}},true,boxes);
    }
    return next;
  }
  function clearPending(job:Job){setTotals(old=>Object.fromEntries(Object.entries(old).filter(([key])=>!job.shipments.some(r=>key===totalKey(job,r.to)))));}
  function applyTotals(job:Job){
    try{const next=withPendingTotals(job);receipts.saveCorrection(next);if(d.jobs.some(j=>j.id===job.id))edit({jobs:d.jobs.map(j=>j.id===next.id?next:j)});clearPending(job);setQuickError('');}
    catch(error){setQuickError((error as Error).message);}
  }
  function toggleJob(job:Job){
    if(locked||form)return;
    if(d.jobs.some(j=>j.id===job.id)){edit({jobs:d.jobs.filter(j=>j.id!==job.id)});return;}
    try{const next=withPendingTotals(job);if(!eligible(next))return;receipts.saveCorrection(next);clearPending(job);edit({jobs:[...d.jobs,next]});setQuickError('');}
    catch(error){setQuickError((error as Error).message);}
  }
  function calculate(){
    try{const jobs=d.jobs.map(withPendingTotals);if(!jobs.length||jobs.some(j=>!eligible(j)))throw Error(t('선택한 계약의 픽업지와 배송지를 확인하세요.','Check the selected contracts’ pickup and delivery locations.'));
      jobs.forEach(job=>receipts.saveCorrection(job));setTotals({});setQuickError('');onReview({...d,jobs,partner:planningPartner(jobs,d.partner),partnerSelected:true,allowUpperBounds:false,reviewed:false});
    }catch(error){setQuickError((error as Error).message);}
  }
  function routeOnly(job:Job){
    if(locked)return;
    const source=job.signature?receipts.cards.find(card=>card.id===job.id)||job:job;
    const jobs=[...d.jobs.filter(old=>old.id!==source.id),source];
    if(jobs.some(item=>!routeReady(item))){setQuickError(t('경로 안내에는 픽업지와 배송지가 필요합니다.','Route guidance needs pickup and delivery locations.'));return;}
    setForm(null);setPendingForms([]);setTotals({});setQuickError('');
    onReview({...d,jobs,partner:'operator',partnerSelected:true,allowUpperBounds:false,reviewed:false});
  }
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
  const quantityOptional=(row:Shipment)=>!!form?.reservations?.[row.to] || simple;
  const invalidRows=!!form && invalidCargo(form,n,quantityOptional);
  const [managing,setManaging]=useState(false);
  const manifestHeading=useRef<HTMLHeadingElement>(null);
  const editor=form && <form className="manifest-editor" onSubmit={e=>{e.preventDefault(); if(invalidRows || locked)return;
        let saved={...form,title:form.title[n].trim()?form.title:form.shipments[0]!.cargo};
        if(editingReceipt){
          try{
            const live=form.signature?receipts.cards.find(c=>c.id===form.id):undefined;
            if(live && (live.signature!==form.signature || live.state==='ended' || live.state==='conflict'))
              throw Error(t('수신 기록이 바뀌었습니다. 수신함에서 다시 확인하세요.','The receipt changed. Review it in the inbox.'));
            saved=reviewReceipt(manifestJob || live,saved,simple,groupBoxes);
          }
          catch(error){setFormError((error as Error).message);return;}
        }
        setFormError('');
        if(editingReceipt){
          if(saved.signature)receipts.saveCorrection(saved);
          if(!d.jobs.some(j=>j.id===saved.id)){setForm(null);return;}
        }
        edit({jobs:d.jobs.some(j=>j.id===form.id)?d.jobs.map(j=>j.id===form.id?saved:j):[...d.jobs,saved]});setForm(pendingForms[0]||null);setPendingForms(pendingForms.slice(1))}}>
        <ContractFields form={form} setForm={setForm} locale={locale} cargoOnly={cargoOnly} quantityOptional={quantityOptional}/>
        {!editingReceipt&&<DeliveryTotalFields form={form} setForm={setForm} locale={locale}/>}
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
        <div>{!cargoOnly&&<button type="button" onClick={()=>setForm({...form,shipments:[...form.shipments,newRow()]})}>{t('+ 운송 항목','+ Shipment')}</button>} <button type="submit" disabled={invalidRows}>{cargoOnly?t('화물 수정 저장','Save cargo changes'):editingReceipt?t('보완한 카드 저장','Save card details'):t('계약 저장','Save contract')}</button>{!simple&&routeReady(form)&&!info(form).ready&&<button type="button" onClick={()=>routeOnly(form)}>{t('총 SCU 입력 없이 경로만 계속','Continue route without total SCU')}</button>} <button type="button" onClick={()=>{setForm(null);setPendingForms([]);}}>{t('취소','Cancel')}</button></div>
      </form>;
  return <fieldset disabled={locked} className="manifest flight-manifest mission-screen">
    <div className="mission-preflight">
      <label>{t('함선','Ship')}<select aria-label={t('함선','Ship')} value={d.ship} onChange={e=>edit({ship:e.target.value})}>{d.customShip?.id===d.ship&&!ships[d.ship]&&<option value={d.customShip.id}>{d.customShip.name}</option>}{Object.keys(ships).map(id=><option key={id} value={id}>{shipName(id)}</option>)}</select></label>
      <PortSearch locale={locale} label={t('출발지','Departure')} value={d.start} onSelect={start=>edit({start})}/>
      <label>{t('운항 파트너','Flight partner')}<select aria-label={t('운항 파트너','Flight partner')} value={d.partner} onChange={e=>edit({partner:e.target.value as Draft['partner']})}><option value="operator">{t('브리지 오퍼레이터 · 경로 안내','Bridge operator · Route guidance')}</option><option value="navigator">{t('수석 항해사 · 경로와 적재','Senior navigator · Route & cargo')}</option></select></label>
      <p className="mission-partner-note">{simple?t('적재는 직접 · 같은 행성권에서 픽업한 뒤 배송합니다.','Load cargo yourself · Pick up within one region, then deliver.'):t('픽업을 묶고, 각 구간의 적재 가능 여부까지 계산합니다.','Batch pickups and check cargo fit at every stop.')}</p>
    </div>
    <section className="mission-intake" aria-labelledby="mission-intake-title">
      <header className="mission-stage-heading"><div><small>01 / CONTRACT INTAKE</small><h2 id="mission-intake-title">{t('계약을 불러오세요','Bring in your contracts')}</h2></div><p>{t('로그 · 스크린샷 · 직접 입력 중 편한 방법을 선택하세요.','Choose a log, screenshots or manual entry.')}</p></header>
      <div className="mission-source-grid">
        <div hidden={!!session?.run?.started&&!session.run.finished} className="mission-source receipt-import"><h3>Game.log</h3><p>{t('수주한 계약을 로그에서 가져옵니다.','Read your accepted contracts from the game log.')}</p>
          <input hidden ref={logInput} type="file" accept=".log" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file){setChecked([]);setSampleMode(false);receipts.read(file);}}}/>
          <div className="source-actions"><button type="button" disabled={!!form} onClick={()=>logInput.current?.click()}>{t('Game.log 선택','Choose Game.log')}</button>
          {receipts.canWatch&&<button type="button" disabled={!!form} aria-pressed={receipts.watching} onClick={()=>{if(receipts.watching)receipts.stopWatching();else{setSampleMode(false);void receipts.follow();}}}>{receipts.watching?t('자동 수신 중지','Stop watching'):t('Game.log 자동 수신','Watch Game.log')}</button>}</div>
        </div>
        <div className="mission-source mission-source-shot"><h3>{t('스크린샷 자동 인식','Screenshot recognition')}</h3><p>{t('OCR로 읽은 내용을 확인·수정한 뒤 추가합니다.','Review and correct the OCR result before adding it.')}</p>
          <ScreenshotIntake locale={locale} locked={locked||!!form} simple={simple} jobs={d.jobs} onAdd={job=>edit({jobs:[...d.jobs,job]})} onRouteOnly={routeOnly}/>
        </div>
        <div className="mission-source"><h3>{t('직접 입력','Manual entry')}</h3><p>{t('새 계약을 작성하거나 계약 원문을 가져옵니다.','Create a contract or import its original text.')}</p>
          <div className="source-actions"><button type="button" disabled={!!form} onClick={()=>setForm({id:crypto.randomUUID(),title:['',''],shipments:[newRow()],pay:0})}>{t('+ 직접 입력','+ Manual entry')}</button>
          <button type="button" disabled={!!form} aria-controls="mission-text-import" onClick={()=>{if(manualEntry.current){manualEntry.current.open=!manualEntry.current.open;if(manualEntry.current.open)manualEntry.current.querySelector('textarea')?.focus();}}}>{t('텍스트 가져오기','Import text')}</button></div>
        </div>
      </div>
      <div className="mission-source-footer"><p role="status">{showLog?(receipts.phase==='reading'?t('로그를 읽고 있습니다.','Reading log…'):receipts.phase==='mixed'?t('여러 플레이어의 기록이 섞였습니다. 현재 Game.log를 선택하세요.','Mixed players. Select the current Game.log.'):receipts.phase==='error'?t('로그를 읽지 못했습니다. 이전 수신 기록은 유지됩니다.','Could not read log. Previous receipts are retained.'):receipts.phase==='loaded'?(receipts.cached?t(`저장된 수신 계약 ${receipts.cards.length}건 · 로그 미연결`,`${receipts.cards.length} saved receipts · Log not connected`):t(`수신 계약 ${receipts.cards.length}건`,`${receipts.cards.length} received contracts`)):''):t('예시 계약을 보고 사용법을 확인할 수 있습니다.','Try sample contracts to explore the flow.')}</p>
        <div className="source-actions"><button type="button" disabled={!!form} onClick={()=>{setSampleMode(true);edit({received:true});}}>{t('예시 계약 보기','Show sample contracts')}</button>
        {showLog&&receipts.phase!=='idle'&&<small>{t('수신함과 저장한 보완 내용은 이 탭에서만 보관됩니다. 새로고침 후 자동 수신은 다시 연결하세요.','Receipts and saved corrections stay in this tab only. Reconnect log watching after reloading.')}</small>}
        {receipts.storageError&&<p role="alert">{receipts.storageError==='restore'?t('저장된 수신함을 읽지 못했습니다. 로그를 다시 선택하세요. 선택한 운항 계약은 유지됩니다.','Could not restore this tab’s inbox. Select the log again. Selected flight contracts are retained.'):t('수신함을 이 탭에 저장하지 못했습니다. 현재 내용은 화면에 유지되지만 새로고침하면 마지막 저장 상태로 돌아갑니다.','Could not save this tab’s inbox. Current receipts remain on screen; reloading restores the last saved state.')}</p>}
        {!showLog&&receipts.phase!=='idle'&&<button type="button" disabled={!!form} onClick={()=>setSampleMode(false)}>{t('읽은 로그 보기','View log receipts')}</button>}</div>
      </div>
      <details ref={manualEntry} id="mission-text-import" className="manifest-intake manual-entry"><summary>{t('계약 원문 가져오기','Import contract text')}</summary>
        <label>{t('계약 원문','Contract text')}<textarea rows={4} value={input} onChange={e=>setInput(e.target.value)}/></label>
        <button type="button" disabled={!input.trim()||!!form} onClick={()=>void reviewText()}>{t('읽은 계약 검토','Review parsed contracts')}</button>
        {intakeError&&<p role="alert">{intakeError}</p>}
      </details>
    </section>
    {form&&<section className="mission-contract-editor" aria-labelledby="mission-editor-title"><h2 id="mission-editor-title" ref={editorHeading} tabIndex={-1}>{editingReceipt||manifestJob?t('계약 내용 수정','Edit contract details'):t('읽은 계약 확인 · 직접 입력','Review or enter contract')}</h2>{editor}</section>}
    <div className="manifest-cols">
    <section className="manifest-work manifest-inbox" aria-labelledby="mission-inbox-title">
      <header className="inbox-header"><div className="manifest-head"><InterfaceGlyph kind="mission"/><div><small>02 / REVIEW &amp; SELECT</small><h2 id="mission-inbox-title">{t('운송할 계약을 선택하세요','Select your contracts')}</h2></div></div><span className="mission-count">{cards.length} {t('건','contracts')}</span></header>
      <div className="mission-toolbar">
        <button type="button" disabled={!!form||!cards.some(canAdd)} onClick={()=>edit({jobs:[...d.jobs,...cards.filter(canAdd)]})}>{t('선택 가능한 계약 모두 선택','Select available')}</button>
        <button type="button" disabled={!!form||!d.jobs.length} onClick={()=>edit({jobs:[]})}>{t('선택 해제','Clear selection')}</button>
      </div>
      <p className="quantity-guide">{simple?t('수량을 몰라도 픽업지와 배송지가 확인되면 경로를 짤 수 있습니다. 적재 공간은 계산하지 않습니다.','Known pickup and delivery locations are enough for route guidance. Cargo fit is not checked.'):t('배송지별 총 SCU를 알면 적재까지 계산합니다. 입력 없이 계속하면 오퍼레이터가 경로만 안내합니다.','Known delivery totals enable cargo planning. Continue without totals for operator route guidance.')}</p>
      {cards.length>0&&<div className="receipt-grid">{cards.map(j=>{
        const added=d.jobs.some(job=>job.id===j.id),q=info(j),key=selectionKey(j);
        const stateLabel={boxes:t('상자 구성 확인','Known containers'),quantity:t('총량 확인 · 배치 예상','Known total · Estimated boxes'),'upper-bound':t('최대치 기준 · 실제 수량 미확인','Upper bound · Actual unknown'),unavailable:t('수량 미확인','Quantity unknown')}[q.certainty];
        const blocked=j.state==='ended'||j.state==='conflict'||!routeReady(j);
        return <article className="receipt-card" data-state={added?'checked':'new'} key={j.id} onClick={event=>{if(!(event.target as Element).closest('button,input,label,select,summary,details,a'))toggleJob(j);}}>
          <label className="receipt-select"><span className="receipt-top"><span>{j.state==='ended'?t('종료된 계약','Ended'):j.state==='conflict'?t('기록 충돌','Conflicting records'):added?t('선택됨','Selected'):t('수신 계약','Received')}</span><input type="checkbox" disabled={!!form||(!managing&&!added&&!eligible(j))} checked={managing?checked.includes(key):added} aria-label={j.title[n]+' · '+t('계약 선택','Select contract')} onChange={e=>managing?setChecked(e.target.checked?[...checked,key]:checked.filter(id=>id!==key)):toggleJob(j)}/></span><strong>{j.title[n]}</strong></label>
          <span className="certainty" data-certainty={q.certainty}>{stateLabel}</span><JobDetails job={j} locale={locale}/><MissionReference job={j} locale={locale}/>
          {!simple&&!blocked&&q.deliveries.some(group=>group.unknown)&&<div className="quick-totals">{[...new Set(j.shipments.filter(r=>!r.scu||j.reservations?.[r.to]).map(r=>r.to))].map(place=>{
            const group=q.deliveries.find(g=>g.id===missionFor({...j,shipments:j.shipments.filter(r=>r.to===place),mission:undefined}).cargo[0]?.dropoffId);
            return <label key={place}>{where(place)}<span>{t('배송 총량','Delivery total')} · SCU{group&&!group.confirmed&&group.total>0?' / '+t('최대 ','max ')+group.total:''}</span><input type="number" min="1" step="1" aria-label={j.title[n]+' · '+where(place)+' · SCU'} placeholder={t('실제 총량 입력','Actual total')} value={totals[totalKey(j,place)]??j.reservations?.[place]??''} onChange={e=>{setQuickError('');setTotals(old=>({...old,[totalKey(j,place)]:e.target.value}));}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();applyTotals(j);}}}/></label>;
          })}<button type="button" disabled={!!form||!j.shipments.some(r=>totals[totalKey(j,r.to)]!==undefined)} onClick={()=>applyTotals(j)}>{t('수량 반영','Apply totals')}</button><small>{t('픽업별 분배를 몰라도 배송 총량을 한 번만 예약합니다.','One reservation per delivery, even when pickup shares are unknown.')}</small></div>}
          <footer className="receipt-bottom"><b>{q.scu>0?`${q.scu} SCU${q.certainty==='upper-bound'?t(' 예상',' est.'):''}`:t('총량 미확인','Total unknown')}</b><button type="button" className="receipt-correct" disabled={!!form||j.state==='ended'||j.state==='conflict'} onClick={()=>openReceipt(j)}>{t('상세 · 수정','Details · Edit')}</button>{managing&&<button type="button" onClick={()=>dismiss([j.id])}>{t('삭제','Delete')}</button>}</footer>
        </article>;
      })}</div>}
      {!cards.length&&<div className="mission-empty"><InterfaceGlyph kind="mission"/><h3>{t('받은 계약을 이곳에 모읍니다','Your contracts arrive here')}</h3><p>{t('위에서 로그나 스크린샷을 불러오거나 직접 입력하세요.','Import a log or screenshots above, or enter a contract manually.')}</p></div>}
      {quickError&&<p className="mission-error" role="alert">{quickError}</p>}
      {dismissFailed&&<p role="alert">{t('수신함 정리를 저장하지 못했습니다.','Could not save inbox changes.')}</p>}
      {!!inbox.length&&<details className="manifest-intake receipt-manage" onToggle={e=>{setManaging(e.currentTarget.open);setChecked([]);}}><summary>{t('수신함 정리','Manage inbox')}</summary><div className="receipt-tools"><button type="button" disabled={!selectedCards.length} onClick={()=>dismiss(selectedCards.map(j=>j.id))}>{t('선택 삭제','Delete selected')}</button><button type="button" disabled={!retained.length} onClick={()=>dismiss(retained.map(j=>j.id))}>{t('수신함 비우기','Clear inbox')}</button>{!!restorable.length&&<button type="button" onClick={()=>updateDismissed(restorable.map(j=>j.id),true)}>{t('삭제 카드 복원','Restore cards')} ({restorable.length})</button>}{!!endedCount&&<button type="button" aria-pressed={showEnded} onClick={()=>setShowEnded(!showEnded)}>{t('종료된 계약 보기','Show ended contracts')} ({endedCount})</button>}</div></details>}
    </section>
    <aside className="manifest-summary" aria-labelledby="mission-flight-title"><small>03 / ROUTE PLANNING</small><h2 id="mission-flight-title" ref={manifestHeading} tabIndex={-1}>{t('이번 운송','This flight')}</h2><div className="selection-count">{d.jobs.length}<span>{t('개 계약 선택','contracts selected')}</span></div>
      <div className="selected-contracts">{d.jobs.map(j=><div className="manifest-row" key={j.id}><div><b>{j.title[n]}</b><span>{info(j).scu||'—'} SCU{info(j).certainty==='upper-bound'?t(' 예상',' est.'):''}</span></div><button type="button" aria-label={j.title[n]+' '+t('선택 해제','Deselect')} disabled={!!form} onClick={()=>toggleJob(j)}>−</button></div>)}</div>
      <dl><dt>{t('총 운송량','Total freight')}</dt><dd>{total} SCU{estimated?t(' 예상',' est.'):unknownQuantity?t(' 확인분',' known'):''}</dd>{!simple&&<><dt>{t('사용 가능한 적재 용량','Available cargo capacity')}</dt><dd>{hold} SCU</dd></>}<dt>{t('입력된 보상 합계','Entered rewards')}</dt><dd>{pay.toLocaleString()} aUEC</dd></dl>
      {d.jobs.some(j=>j.rewardUnknown)&&<p>{t('보상 미확인 계약은 합계에서 제외됩니다.','Unknown rewards are excluded.')}</p>}
      <p className="mission-summary-note">{simple?t('적재는 직접 관리합니다. 거점 방문 순서만 계산합니다.','Manage cargo yourself. Only the visit order is calculated.'):unknownQuantity?t('총 SCU를 입력하지 않고 계산하면 오퍼레이터의 경로 안내로 전환합니다.','Continue without total SCU to use operator route guidance.'):t('총 운송량은 동시에 싣는 양과 다릅니다. 각 구간의 공간과 상자 배치를 함께 확인합니다.','Total freight differs from peak load. Every leg is checked for capacity and box fit.')}</p>
      <button type="button" className="manifest-primary dispatch-launch" disabled={!d.jobs.length||!!form||d.jobs.some(j=>!eligible(j))} onClick={calculate}><InterfaceGlyph kind="map"/><span>{form?t('편집을 마쳐 주세요','Finish editing'):simple?t('선택한 계약으로 경로 계산','Plan selected route'):t('선택한 계약으로 경로·적재 계산','Plan route & cargo')}</span><b aria-hidden="true">↗</b></button>
      {!simple&&<button type="button" className="cargo-review-toggle" aria-expanded={reviewCargo} onClick={()=>setReviewCargo(!reviewCargo)}>{t('적재 상세 열기','Open cargo details')}</button>}
    </aside></div>{!simple&&reviewCargo&&<div className="departure-cargo-review"><CargoPanel draft={d} locale={locale} session={session}/></div>}
  </fieldset>;
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
    {!operations&&d.partner==='navigator'&&<><button className="cargo-review-toggle" aria-expanded={cargoOpen} onClick={()=>setCargoOpen(!cargoOpen)}>{en?'Review cargo in 3D':'적재 3D 검토'}</button>{cargoOpen&&<CargoPanel draft={d} locale={locale}/>}</>}
    <div><a href={'#/mission?lang='+locale}>{en?'Edit manifest':'계약 수정'}</a>{!operations&&<a className="manifest-primary" href={'#/operations?lang='+locale}>{en?'Open control console':'관제 콘솔로'} →</a>}</div>
  </section>;
}

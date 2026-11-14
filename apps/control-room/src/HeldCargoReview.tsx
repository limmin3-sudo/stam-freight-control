import {useEffect,useRef,useState} from 'react';
import {heldCargo} from './held-cargo';
import type {useFlight} from './use-flight';
import type {Locale} from './navigation';
import {placeName} from './mission-trial';
import './flight-receipt-review.css';
export function HeldCargoReview({flight,locale}:{flight:ReturnType<typeof useFlight>;locale:Locale}){
 const en=locale==='en',t=(ko:string,english:string)=>en?english:ko;
 const boxes=heldCargo(flight.session),dialog=useRef<HTMLDialogElement>(null);
 const [review,setReview]=useState<{expected:string;boxes:typeof boxes}|null>(null),[ids,setIds]=useState<string[]>([]),[confirmed,setConfirmed]=useState(false),[submitted,setSubmitted]=useState(false);
 useEffect(()=>{if(review)dialog.current?.showModal();else dialog.current?.close();},[review]);
 useEffect(()=>{if(submitted&&!flight.busy&&review&&JSON.stringify(flight.session)!==review.expected){setReview(null);setSubmitted(false);}},[flight.busy,flight.session,submitted,review]);
 const open=()=>{setReview({expected:JSON.stringify(flight.session),boxes});setIds([]);setConfirmed(false);setSubmitted(false);};
 return <>
  {boxes.length>0&&<button type="button" disabled={flight.busy||flight.blocked||!!flight.receiptChanges.length} onClick={open}>{t('보류 화물 하역 확인','Confirm held cargo unloaded')}</button>}
  {!!flight.session.heldDischarges?.length&&<details className="ops-record"><summary>{t('보류 화물 정리 기록','Held cargo discharge record')}</summary>{flight.session.heldDischarges.map((entry,i)=><p key={i}>{placeName(entry.locationId,en?1:0)} · {entry.boxes.reduce((n,b)=>n+b.size,0)} SCU · {entry.boxes.length}{t('상자 · 하역 확인',' crates · Unloaded')} · {new Date(entry.at).toLocaleString(en?'en-US':'ko-KR')}</p>)}</details>}
  <dialog ref={dialog} className="receipt-update-dialog held-cargo-dialog" aria-labelledby="held-title" onCancel={e=>{e.preventDefault();if(!flight.busy)setReview(null);}} onKeyDown={e=>{if(e.key==='Escape')e.stopPropagation();}}>
   <h2 id="held-title">{t('게임에서 내린 보류 화물을 확인하세요','Confirm the held crates unloaded in game')}</h2>
   <p>{t('실제로 함선에서 내린 상자만 선택하세요. 남은 화물의 위치는 유지하고, 취소 계약의 배송 완료나 보상으로 기록하지 않습니다.','Select only crates physically removed from the ship. Other cargo stays in place. Cancelled contracts are not marked delivered or paid.')}</p>
   {review?.boxes.map(box=><label className="held-cargo-row" key={box.boxId}><input type="checkbox" disabled={flight.busy} checked={ids.includes(box.boxId)} onChange={e=>setIds(old=>e.target.checked?[...old,box.boxId]:old.filter(id=>id!==box.boxId))}/><span>{flight.session.draft.jobs.find(j=>j.id===box.missionId)?.title[en?1:0]} · {box.commodity} · {box.size} SCU<br/><small>{flight.session.plan?.ship.grids[box.bin]?.name} · {box.cell.join(', ')} · {box.boxId}</small></span></label>)}
   <label className="held-cargo-row"><input type="checkbox" checked={confirmed} disabled={flight.busy} onChange={e=>setConfirmed(e.target.checked)}/>{t('선택한 상자를 게임에서 실제로 내렸습니다.','I physically unloaded the selected crates in game.')}</label>
   <p>{t('확인하면 남은 경로를 다시 계산합니다. 이전 운항은 백업으로 보관됩니다.','Confirmation replans the remaining route and keeps the previous flight as a backup.')}</p>
   {flight.error&&<p role="alert" className="receipt-update-error">{flight.error}</p>}
   <footer><button disabled={flight.busy} onClick={()=>setReview(null)}>{t('취소','Cancel')}</button><button disabled={flight.busy||flight.blocked||!confirmed||!ids.length} onClick={()=>{if(review){setSubmitted(true);flight.dischargeHeld(ids,review.expected);}}}>{flight.busy?t('정리 중…','Updating…'):t('선택한 상자 하역 확인','Confirm selected crates unloaded')}</button></footer>
  </dialog>
 </>;
}

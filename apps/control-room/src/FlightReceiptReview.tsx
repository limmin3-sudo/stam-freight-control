import {useEffect,useRef,useState} from 'react';
import {receiptChangeToken} from './flight-receipts';
import type {ReceiptAction,ReceiptChange} from './flight-receipts';
import type {useFlight} from './use-flight';
import type {Locale} from './navigation';
import {placeName} from './mission-trial';
import type {Job} from './mission-trial';
import './flight-receipt-review.css';

export function FlightReceiptReview({flight,locale}:{flight:ReturnType<typeof useFlight>;locale:Locale}){
 const [review,setReview]=useState<{changes:ReceiptChange[];token:string;expected:string}|null>(null);
 const [actions,setActions]=useState<Record<string,ReceiptAction>>({});
 const dialog=useRef<HTMLDialogElement>(null),button=useRef<HTMLButtonElement>(null);
 const t=(ko:string,en:string)=>locale==='en'?en:ko,n=locale==='ko'?0:1;
 useEffect(()=>{if(!flight.receiptChanges.length)setReview(null);},[flight.receiptChanges.length]);
 useEffect(()=>{if(review&&!dialog.current?.open)dialog.current?.showModal();else if(!review)dialog.current?.close();},[review]);
 function close(){if(flight.busy)return;setReview(null);button.current?.focus();}
 function open(){
  const changes=flight.receiptChanges;
  setActions(Object.fromEntries(changes.map(c=>[c.id,c.kind==='ended'?'exclude':c.canApply?'apply':'keep'])));
  setReview({changes,token:receiptChangeToken(changes),expected:JSON.stringify(flight.session)});
 }
 const details=(j:Job)=><><b>{j.title[n]}</b><ul>{j.shipments.map((s,i)=><li key={i}>{s.cargo[n]||t('품목 미확인','Unknown cargo')} · {s.scu?s.scu+' SCU':t('픽업 수량 미확인','Pickup share unknown')}<span>{placeName(s.from,n)} → {placeName(s.to,n)}</span></li>)}</ul>{Object.entries(j.reservations||{}).map(([id,total])=><p key={id}>{placeName(id,n)} · {t('배송 총량','Delivery total')} {total} SCU</p>)}<p>{t('보상','Reward')} · {j.rewardUnknown?t('미확인','Unknown'):j.pay.toLocaleString()+' aUEC'}</p></>;
 if(!flight.receiptChanges.length)return null;
 return <>
  <aside className="receipt-update-notice" aria-label={t('운항 계약 변경','Flight contract changes')}>
   <span role="status">{t(`운항 계약 ${flight.receiptChanges.length}건 변경 감지`,`${flight.receiptChanges.length} flight contracts changed`)}</span>
   <button ref={button} onClick={open} disabled={flight.busy}>{t('변경 확인','Review changes')}</button>
  </aside>
  <dialog ref={dialog} className="receipt-update-dialog" aria-labelledby="receipt-update-title" onCancel={e=>{e.preventDefault();e.stopPropagation();close();}} onKeyDown={e=>e.stopPropagation()}>
   <header><small>FLIGHT / CONTRACT UPDATE</small><h2 id="receipt-update-title">{t('운항 계약 변경 확인','Review flight contract changes')}</h2><p>{t('확인 전에는 경로가 바뀌지 않습니다. 현재 위치에서 남은 작업만 재계산하며 선적 위치와 완료 기록을 보존합니다.','Your route stays unchanged until confirmation. Replan remaining work from your current location while preserving cargo positions and completed records.')}</p></header>
   <div className="receipt-update-body">{review?.changes.map(c=><section key={c.id}>
    <h3>{c.kind==='ended'?t('종료·취소 신호','Ended / cancelled signal'):c.kind==='conflict'?t('수신 기록 충돌','Conflicting evidence'):t('계약 내용 변경','Contract details changed')}</h3>
    <div className="receipt-update-comparison"><div><small>{t('현재 운항','Current flight')}</small>{details(c.before)}</div><div><small>{t('최근 수신','Latest receipt')}</small>{details(c.latest)}</div></div>
    {c.kind==='ended'?<p className="receipt-update-held">{t('이 계약의 남은 픽업·배송을 경로에서 제외합니다. 실린 화물은 선내 보류로 남고 공간도 계속 차지합니다. 배송 완료나 보상 수령으로 기록하지 않습니다.','Remove this contract’s remaining pickups and deliveries from the route. Its aboard cargo stays on hold and continues to occupy space. This does not record delivery success or payment.')}</p>:<>
     {c.reason&&<p>{locale==='en'?'Latest cargo evidence cannot safely replace work already recorded or remains incomplete. Keep current details and check the game or a new log.':c.reason}</p>}
     <label>{t('처리 방법','Action')}<select value={actions[c.id]} disabled={flight.busy} onChange={e=>setActions({...actions,[c.id]:e.target.value as ReceiptAction})}>
      <option value="apply" disabled={!c.canApply}>{t('최근 수신 내용 적용','Apply latest receipt')}</option><option value="keep">{t('현재 운항 내용 유지','Keep current flight details')}</option>
     </select></label>
    </>}
   </section>)}</div>
   {flight.error&&<p className="receipt-update-error" role="alert">{flight.error}</p>}
   <footer><button onClick={close} disabled={flight.busy}>{t('나중에 확인','Review later')}</button><button className="receipt-update-confirm" disabled={flight.busy||!review} onClick={()=>review&&flight.confirmReceiptChanges(actions,review.token,review.expected)}>{flight.busy?t('남은 경로 계산 중…','Replanning…'):t('확인하고 남은 경로 재계산','Confirm and replan remaining route')}</button></footer>
  </dialog>
 </>;
}

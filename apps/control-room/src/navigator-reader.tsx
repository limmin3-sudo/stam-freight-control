import {createRoot} from 'react-dom/client';
import {useLogReceipts} from './use-log-receipts';
import {useContractScreens} from './use-contract-screens';
import {ContractScreenReader,ScreenOriginals} from './ContractScreenReader';
import {withScreens} from './contract-screen';
import {placeName} from './mission-trial';
import './navigator-reader.css';

function Reader(){
 const receipts=useLogReceipts(),archive=useContractScreens(receipts.cards);
 const en=new URLSearchParams(location.search).get('lang')==='en';const n=en?1:0;
 return <><header><small>STAM NAVIGATOR</small><h1>{en?'Accepted contracts':'수락한 운송 계약'}</h1></header>
  <ContractScreenReader en={en} locked={receipts.phase==='mixed'} jobs={receipts.cards} attach={archive.attach}/>
  {archive.syncPending&&<p role="status">{en?'Original saved · retrying sync':'원본 저장됨 · 동기화 재시도 중'}</p>}
  {archive.error&&<p role="alert">{en?'Originals unavailable':'원본 저장소를 열 수 없습니다.'}</p>}
  {!receipts.cards.length&&<p>{en?'Waiting for accepted contracts in Game.log.':'Game.log에서 수락한 계약을 기다립니다.'}</p>}
  {receipts.cards.filter(j=>j.state!=='ended').map(raw=>{
    const frames=archive.frames[raw.id]||[],job=withScreens(raw,frames);
    return <article key={job.id}><small>{job.id.slice(-8)}</small><h2>{job.title[n]}</h2>
     {!job.rewardUnknown&&<b>{job.pay.toLocaleString()} aUEC</b>}
     {job.shipments.map(r=><p key={r.id}>{r.cargo[n]} · {r.scu||'?'} SCU · {r.pickupFacility?.[n]||placeName(r.from,n)} → {r.deliveryFacility?.[n]||placeName(r.to,n)}</p>)}
     <ScreenOriginals frames={frames} en={en}/></article>;
  })}</>;
}
createRoot(document.querySelector('#root')!).render(<Reader/>);

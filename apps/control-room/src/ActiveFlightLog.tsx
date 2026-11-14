import {useRef} from 'react';
import type {useLogReceipts} from './use-log-receipts';
import type {Locale} from './navigation';
// Mission edits stay locked during a run; reading/reconnecting a log stays available.
export function ActiveFlightLog({receipts,locale}:{receipts:ReturnType<typeof useLogReceipts>;locale:Locale}){
 const file=useRef<HTMLInputElement>(null),t=(ko:string,en:string)=>locale==='en'?en:ko;
 return <section className="active-flight-log" aria-label={t('운항 중 로그 연결','In-flight log connection')}>
  <div><b>{t('운항 중 로그 확인','Check log during flight')}</b><p>{t('수신한 변경은 확인 후 반영합니다. 현재 선적과 운항은 그대로 유지합니다.','Received changes require confirmation. Current cargo and flight progress stay intact.')}</p></div>
  <input ref={file} hidden type="file" accept=".log" onChange={e=>{const selected=e.target.files?.[0];e.target.value='';if(selected)receipts.read(selected);}}/>
  <button onClick={()=>file.current?.click()}>{t('Game.log 선택','Choose Game.log')}</button>
  {receipts.canWatch&&<button aria-pressed={receipts.watching} onClick={()=>receipts.watching?receipts.stopWatching():void receipts.follow()}>{receipts.watching?t('자동 수신 중지','Stop watching'):t('Game.log 자동 수신','Watch Game.log')}</button>}
 </section>;
}

import {useEffect,useRef,useState} from 'react';
import type {Locale} from './navigation';
import type {useFlight} from './use-flight';
import {backupLimit} from './flight-backup';
import {placeName} from './mission-trial';
import './flight-backup.css';

type Flight=ReturnType<typeof useFlight>;
export function FlightBackup({flight,locale}:{flight:Flight;locale:Locale}){
 const en=locale==='en',t=(ko:string,english:string)=>en?english:ko;
 const [message,setMessage]=useState(''),[reading,setReading]=useState(false);
 const [pending,setPending]=useState<{name:string;preview:ReturnType<Flight['prepareRestore']>}|null>(null);
 const dialog=useRef<HTMLDialogElement>(null),generation=useRef(0);
 const live=useRef(flight);live.current=flight;
 useEffect(()=>()=>{generation.current++;},[]);
 useEffect(()=>{if(pending)dialog.current?.showModal();else dialog.current?.close();},[pending]);
 function preview(text:string,name:string){setMessage('');setPending({name,preview:live.current.prepareRestore(text)});}
 async function select(file:File){
  const token=++generation.current;setReading(true);setMessage('');
  try{if(file.size>backupLimit)throw Error(t('20 MB 이하의 운항 백업을 선택하세요.','Choose a flight backup under 20 MB.'));
   const text=await file.text();if(token===generation.current)preview(text,file.name);
  }catch(e){if(token===generation.current)setMessage((e as Error).message);}
  finally{if(token===generation.current)setReading(false);}
 }
 const restored=pending?.preview.session,run=restored?.run;
 return <details className="flight-backup"><summary>{t('운항 백업 · 복원','Flight backup · restore')}</summary>
  <p>{t('계약·경로·진행 단계·선적 위치를 함께 저장합니다. 로그 자동 수신 연결과 계정 기록은 포함하지 않습니다.','Save contracts, route, progress and cargo positions together. Log watching and account history are not included.')}</p>
  <div className="flight-backup-actions">
   <button type="button" onClick={()=>{try{flight.backup();setMessage(t('운항 백업을 내려받았습니다.','Flight backup downloaded.'));}catch(e){setMessage((e as Error).message);}}}>{t('운항 백업 저장','Download flight backup')}</button>
   <label>{t('운항 백업 파일 선택','Choose flight backup')}<input aria-label={t('운항 백업 파일 선택','Choose flight backup')} type="file" accept=".json,application/json" disabled={reading||flight.busy} onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void select(f);}}/></label>
   <button type="button" disabled={reading||flight.busy} onClick={()=>{try{preview(flight.previousBackup(),t('복원 전 운항','Flight before last restore'));}catch(e){setMessage((e as Error).message);}}}>{t('복원 전 운항 확인','Review previous flight')}</button>
  </div>
  {reading&&<p role="status">{t('백업 확인 중…','Checking backup…')}</p>}{message&&<p role="status">{message}</p>}
  <dialog ref={dialog} className="flight-restore-dialog" aria-labelledby="flight-restore-title" onCancel={e=>{e.preventDefault();setPending(null);}} onKeyDown={e=>{if(e.key==='Escape')e.stopPropagation();}}>
   <h2 id="flight-restore-title">{t('운항 백업 확인','Review flight backup')}</h2>
   {restored&&<><p className="flight-backup-filename">{pending?.name}</p><dl>
    <dt>{t('계약','Contracts')}</dt><dd>{restored.draft.jobs.length}</dd>
    <dt>{t('파트너','Partner')}</dt><dd>{restored.draft.partner==='navigator'?t('수석 항해사','Chief navigator'):t('브리지 오퍼레이터','Bridge operator')}</dd>
    <dt>{t('함선','Ship')}</dt><dd>{restored.plan?.ship.name??restored.draft.ship}</dd>
    <dt>{t('진행','Progress')}</dt><dd>{run?`${run.index} / ${restored.plan?.visits.length}`:t('운항 준비','Preparing')}</dd>
    <dt>{t('현재 위치','Current position')}</dt><dd>{placeName(run?.positionId??restored.draft.start,en?1:0)}</dd>
    {restored.draft.partner==='navigator'&&<><dt>{t('선적된 상자','Aboard boxes')}</dt><dd>{run?.aboard.length??0}</dd></>}
   </dl><p>{t('현재 운항을 이 백업으로 바꿉니다. 현재 운항은 별도로 보관하여 되돌릴 수 있습니다. 진행 중인 운항은 일시정지 상태로 복원됩니다.','This replaces the current flight and keeps a previous-flight copy for recovery. An ongoing flight restores paused.')}</p></>}
   <div className="flight-backup-actions"><button type="button" autoFocus onClick={()=>setPending(null)}>{t('취소','Cancel')}</button><button type="button" className="flight-restore-confirm" disabled={flight.busy||!pending} onClick={()=>{
    try{pending?.preview.apply();setPending(null);setMessage(t('운항을 복원했습니다. 관제 콘솔에서 확인 후 계속하세요.','Flight restored. Review it in Operations before continuing.'));}
    catch(e){setPending(null);setMessage((e as Error).message);}
   }}>{t('이 백업으로 복원','Restore this backup')}</button></div>
  </dialog>
 </details>;
}

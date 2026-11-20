import {WebThemePicker} from './WebThemePicker';
import {FlightCloudPanel} from './FlightCloudPanel';
import type {useFlightCloud} from './use-flight-cloud';
import type {useFlight} from './use-flight';
import {lazy,Suspense,useEffect,useRef,useState} from 'react';
const UserManual=lazy(()=>import('./UserManual').then(m=>({default:m.UserManual})));
import type {Locale} from './navigation';
import {serviceViews,type ServiceView} from './space-navigation';
import {serviceControls} from './service-account.mjs';
import {shrinkFeedbackImage,submitFeedback} from '../../../feedback.mjs';
import releaseUrl from '../../../data/releases.json?url';
import './service-account.css';
import './service-center.css';
const names={account:['계정','Account'],history:['운송기록','Flight records'],feedback:['피드백 · 오류 신고','Feedback & bugs'],updates:['업데이트','Updates'],manual:['이용안내','User guide']};
function AccountPanel({history=false}:{history?:boolean}){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!host.current)return;const controls=serviceControls();return history?controls.mountHistory(host.current):controls.mountAccount(host.current);},[history]);
 return <div ref={host} className="service-inline-host"/>;
}
function FeedbackPanel({locale}:{locale:Locale}){
 const en=locale==='en',t=(ko:string,english:string)=>en?english:ko;
 const [kind,setKind]=useState('feedback'),[text,setText]=useState(''),[contact,setContact]=useState(''),[details,setDetails]=useState(true),[image,setImage]=useState<string|null>(null),[busy,setBusy]=useState(false),[reading,setReading]=useState(false),[message,setMessage]=useState('');
 const generation=useRef(0),active=useRef(true);
 useEffect(()=>{active.current=true;return()=>{active.current=false;generation.current++;};},[]);
 async function attach(file:File){const token=++generation.current;setReading(true);setMessage('');try{const shot=await shrinkFeedbackImage(file);if(token===generation.current&&active.current)setImage(shot.url);}catch{if(token===generation.current&&active.current)setMessage(t('이미지를 읽지 못했습니다. 다른 이미지로 시도하세요.','Could not read this image. Try another.'));}finally{if(token===generation.current&&active.current)setReading(false);}}
 return <form className="service-feedback" onPaste={e=>{if(busy)return;const item=[...e.clipboardData.items].find(i=>i.type.startsWith('image/')),file=item?.getAsFile();if(file){e.preventDefault();void attach(file);}}} onSubmit={async e=>{e.preventDefault();if(busy||reading)return;setBusy(true);setMessage('');try{await submitFeedback({kind,text,contact,locale,details,image});if(active.current){setText('');setContact('');setImage(null);setMessage(t('의견을 보냈습니다. 감사합니다.','Feedback sent. Thank you.'));}}catch{if(active.current)setMessage(t('전송하지 못했습니다. 입력 내용은 유지했습니다. 연결을 확인하고 다시 시도하세요.','Could not send. Your input is preserved; check the connection and retry.'));}finally{if(active.current)setBusy(false);}}}>
  <h2>{t('피드백 · 오류 신고','Feedback & bug reports')}</h2><p>{t('어느 화면에서 무엇을 했는지 알려주세요. 미션 내용과 로그 원문은 자동으로 첨부하지 않습니다.','Tell us which screen and action caused the problem. Mission contents and raw logs are not attached automatically.')}</p>
  <label>{t('종류','Type')}<select value={kind} disabled={busy} onChange={e=>setKind(e.target.value)}><option value="feedback">{t('의견 · 제안','Feedback')}</option><option value="bug">{t('오류 신고','Bug report')}</option></select></label>
  <label>{t('내용','Message')}<textarea required minLength={2} maxLength={2000} rows={7} value={text} disabled={busy} onChange={e=>setText(e.target.value)}/><small>{text.length} / 2000</small></label>
  <label>{t('스크린샷 첨부 · 선택','Screenshot · optional')}<input type="file" accept="image/*" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void attach(file);}}/></label>
  {reading&&<p role="status">{t('이미지 확인 중…','Reading image…')}</p>}
  {image&&<div className="service-feedback-image"><img src={image} alt={t('첨부 이미지 미리보기','Attachment preview')}/><button type="button" disabled={busy} onClick={()=>{generation.current++;setImage(null);setReading(false);}}>{t('첨부 빼기','Remove attachment')}</button></div>}
  <label>{t('연락처 · 선택','Contact · optional')}<input maxLength={100} value={contact} disabled={busy} onChange={e=>setContact(e.target.value)}/></label>
  <label className="service-check"><input type="checkbox" checked={details} disabled={busy} onChange={e=>setDetails(e.target.checked)}/>{t('버전·화면 크기·최근 오류 함께 보내기','Include version, screen size and recent errors')}</label>
  <p>{t('내용은 운영자만 볼 수 있습니다. 비밀번호나 민감한 정보를 적지 마세요.','Only the operator can read reports. Do not include passwords or sensitive information.')}</p>
  {message&&<p role="status">{message}</p>}<button type="submit" disabled={busy||reading||text.trim().length<2}>{busy?t('보내는 중…','Sending…'):t('보내기','Send')}</button>
 </form>;
}
type Release={id?:string;channel?:string;version:string;date:string;title:string;changes:string[];en?:{title:string;changes:string[]}};
function UpdatesPanel({locale}:{locale:Locale}){
 const en=locale==='en',t=(ko:string,english:string)=>en?english:ko;
 const [records,setRecords]=useState<Release[]>([]),[error,setError]=useState(false),[attempt,setAttempt]=useState(0),[query,setQuery]=useState(''),[selected,setSelected]=useState('');
 useEffect(()=>{const controller=new AbortController();setError(false);fetch(releaseUrl,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(rows=>{if(!Array.isArray(rows)||!rows.length||rows.some(r=>typeof r.version!=='string'||typeof r.date!=='string'||typeof r.title!=='string'||!Array.isArray(r.changes)||r.changes.some((c:unknown)=>typeof c!=='string')))throw Error();setRecords(rows);setSelected(rows[0].id||rows[0].channel+':'+rows[0].version);}).catch(e=>{if(e.name!=='AbortError')setError(true);});return()=>controller.abort();},[attempt]);
 const copy=(r:Release)=>en&&r.en?r.en:r,key=(r:Release)=>r.id||r.channel+':'+r.version;
 const filtered=records.filter(r=>[r.version,r.channel,copy(r).title,...copy(r).changes].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
 const current=filtered.find(r=>key(r)===selected)||filtered[0];
 return <section className="service-updates"><h2>{t('업데이트 기록','Release history')}</h2><label>{t('버전 · 변경 내용 검색','Find version or change')}<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>
  {error?<p role="alert">{t('업데이트 기록을 불러오지 못했습니다.','Could not load release history.')} <button onClick={()=>setAttempt(n=>n+1)}>{t('다시 시도','Retry')}</button></p>:!records.length?<p role="status">{t('불러오는 중…','Loading…')}</p>:<div className="service-release-layout"><nav aria-label={t('버전 선택','Choose release')}>{filtered.map(r=><button key={key(r)} aria-current={current===r?'true':undefined} onClick={()=>setSelected(key(r))}>{r.channel||'alpha'} {r.version}<small>{r.date.slice(0,10)}</small></button>)}</nav><article>{current?<><small>{current.channel||'alpha'} {current.version} · {current.date}</small><h3>{copy(current).title}</h3><ul>{copy(current).changes.map((line,i)=><li key={i}>{line}</li>)}</ul></>:<p>{t('일치하는 업데이트가 없습니다.','No matching updates.')}</p>}</article></div>}
 </section>;
}
const descriptions:Record<ServiceView,readonly [string,string]>={
 manual:['미션 준비부터 운항과 저장까지, 실제 화면으로 확인합니다.','Follow actual screens from mission setup to flight and saving.'],
 account:['로그인과 계정 저장 상태, 변경 기록을 확인합니다.','Manage sign-in, account saving and change history.'],
 history:['완료한 운송과 누적 실적을 확인합니다.','Review completed flights and your freight totals.'],
 feedback:['의견을 보내거나 발생한 문제를 알려주세요.','Share feedback or report a problem.'],
 updates:['새로 추가되거나 달라진 내용을 확인합니다.','See what is new and what has changed.'],
};
const codes:Record<ServiceView,string>={account:'PILOT ACCOUNT',history:'FLIGHT RECORDS',feedback:'FEEDBACK & SUPPORT',updates:'RELEASE NOTES',manual:'FLIGHT MANUAL'};
function ServiceGlyph({kind}:{kind:ServiceView}){
 return <svg className="interface-glyph" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  {kind==='manual'&&<><path d="M20 9c-5-4-11-4-16-2v25c5-2 11-2 16 2 5-4 11-4 16-2V7c-5-2-11-2-16 2Z"/><path d="M20 9v25M9 14h6M9 20h6M25 14h6M25 20h6"/></>}
  {kind==='account'&&<><path d="m20 3 14 6v12c0 8-14 16-14 16S6 29 6 21V9Z" opacity=".45"/><circle cx="20" cy="15" r="5"/><path d="M11 29c0-9 18-9 18 0"/></>}
  {kind==='history'&&<><path d="M8 9a15 15 0 1 1-3 17M8 3v7H2"/><path d="M20 11v10l7 4"/><circle cx="20" cy="21" r="1"/></>}
  {kind==='feedback'&&<><path d="M5 8h30v20H19l-9 7v-7H5Z" opacity=".65"/><path d="M11 15h18M11 21h12"/></>}
  {kind==='updates'&&<><path d="M9 5h17l6 6v24H9Z" opacity=".55"/><path d="M26 5v7h6M14 22l4 4 9-10M14 31h12"/></>}
 </svg>;
}
export function ServiceCenter({locale,view,flight,cloud}:{locale:Locale;view?:ServiceView;flight:ReturnType<typeof useFlight>;cloud:ReturnType<typeof useFlightCloud>}){
 const [message,setMessage]=useState(''),[feedbackVisited,setFeedbackVisited]=useState(view==='feedback');
 const container=useRef<HTMLDivElement>(null),title=useRef<HTMLHeadingElement>(null),lastView=useRef(view),en=locale==='en',index=en?1:0;
 useEffect(()=>{if(view==='feedback')setFeedbackVisited(true);if(lastView.current!==view){lastView.current=view;const room=container.current?.closest('.space-room');room?.scrollTo({top:0});(title.current||room?.querySelector<HTMLElement>('#space-title'))?.focus({preventScroll:true});}},[view]);
 useEffect(()=>{const announce=(e:Event)=>setMessage((e as CustomEvent<string>).detail);window.addEventListener('stam-account-message',announce);return()=>window.removeEventListener('stam-account-message',announce);},[]);
 return <div ref={container} className="service-center">
  {!view&&<WebThemePicker english={en}/>}
  {!view&&<div className="space-information room-reference-library service-catalogue">
   <p>{en?'Choose the service you need. Your account and flight records stay connected.':'필요한 서비스를 선택하세요. 계정과 운송기록을 확인하거나 의견을 보낼 수 있습니다.'}</p>
   {serviceViews.map(section=><a key={section} href={`#/service?lang=${locale}&section=${section}`}>
    <div className="room-card-symbol"><ServiceGlyph kind={section}/><small>{codes[section]}</small></div>
    <h2>{names[section][index]}</h2><p>{descriptions[section][index]}</p><span>{en?'Open service':'열기'} →</span>
   </a>)}
  </div>}
  {view&&<nav className="service-breadcrumb" aria-label={en?'Service location':'서비스센터 내 위치'}><a href={`#/service?lang=${locale}`}>{en?'Service centre':'서비스센터'}</a><span aria-hidden="true">/</span><h2 ref={title} tabIndex={-1}>{names[view][index]}</h2></nav>}
  {message&&<p role="status">{message}</p>}
  <div className={`service-content${view==='manual'?' service-manual':''}`} hidden={!view}>
   {view==='manual'&&<Suspense fallback={<p role="status">{en?'Loading guide…':'이용안내를 불러오고 있습니다.'}</p>}><UserManual locale={locale}/></Suspense>}
   {view==='account'?<><FlightCloudPanel flight={flight} cloud={cloud} locale={locale}/><AccountPanel key="account"/></>:view==='history'?<AccountPanel key="history" history/>:view==='updates'?<UpdatesPanel locale={locale}/>:null}
   {feedbackVisited&&<div hidden={view!=='feedback'}><FeedbackPanel locale={locale}/></div>}
  </div>
 </div>;
}

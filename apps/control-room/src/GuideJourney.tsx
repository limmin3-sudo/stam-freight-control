import {lazy,Suspense,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import type {Locale} from './navigation';
import type {SpaceScreen,ServiceView,ArchiveView,TradeScope} from './space-navigation';
import {guidePages,type GuideTopic} from './guide-journey-content';
import {practiceDraft,practiceJobs} from './guide-practice';
import {blankRun,startRun,completeStep,undoStep,type Run} from './flight-session';
import {jobVolume,placeName,type Draft} from './mission-trial';
import type {FlightPlan} from './flight-types';
import type {CargoShip,Packing} from './cargo-plan.mjs';
import {ApprovedGlass} from './ApprovedGlass';
import {GuideScene} from './GuideScene';
import portrait from './assets/director-standing.png';
import './guide-journey.css';
import {TradeGuideStage} from './TradeGuideStage';
import {blankTradePractice,advanceTradePractice,tradePracticeSummary} from './trade-guide-practice';
import './tour-readability.css';
import {useTourCaptionSpace} from './use-tour-caption-space';
const NavigationChart=lazy(()=>import('./NavigationChart').then(m=>({default:m.NavigationChart})));
const CargoViewport=lazy(()=>import('./CargoWorkspace').then(m=>({default:m.CargoViewport})));
type Props={topic:GuideTopic;locale:Locale;motion:boolean;onClose():void;onTopic(topic:GuideTopic):void;onTour():void;onNavigate(screen:SpaceScreen,section?:ServiceView,view?:ArchiveView):void};
function Action({children,onClick,disabled=false,gold=false}:{children:ReactNode;onClick():void;disabled?:boolean;gold?:boolean}){return <button type="button" disabled={disabled} onClick={onClick}><ApprovedGlass kind={gold?'gold':'normal'}/><span>{children}</span></button>;}
export function GuideJourney({topic,locale,motion,onClose,onTopic,onTour,onNavigate}:Props){
 const en=locale==='en',t=(ko:string,eng:string)=>en?eng:ko,word=(copy:readonly[string,string])=>copy[en?1:0],where=(id:string)=>placeName(id,en?1:0);
 const [step,setStep]=useState(0),[draft,setDraft]=useState<Draft>(practiceDraft),[loaded,setLoaded]=useState(false),[plan,setPlan]=useState<FlightPlan|null>(null),[run,setRun]=useState<Run|null>(null);
 const [tradeScope,setTradeScope]=useState<TradeScope>('intrasystem'),[quoteChecked,setQuoteChecked]=useState(false),[planChecked,setPlanChecked]=useState(false),[tradePractice,setTradePractice]=useState(blankTradePractice);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[visitIndex,setVisitIndex]=useState(0),[box,setBox]=useState<string|null>(null);
 const worker=useRef<Worker|null>(null),dialog=useRef<HTMLDialogElement>(null),heading=useRef<HTMLHeadingElement>(null);
 const caption=useRef<HTMLDivElement>(null);
 useTourCaptionSpace(dialog,caption);
 const examples=useMemo(practiceJobs,[]),pages=guidePages[topic],page=pages[step]!,last=step===pages.length-1,practice=topic==='practice',trade=topic==='trade';
 useEffect(()=>{dialog.current?.showModal();return()=>{worker.current?.terminate();dialog.current?.close();};},[]);
 useEffect(()=>{heading.current?.focus({preventScroll:true});dialog.current?.querySelector('.guide-journey-work')?.scrollTo({top:0});},[step]);
 const stopWorker=()=>{worker.current?.terminate();worker.current=null;setBusy(false);};
 const change=(next:Draft)=>{stopWorker();setDraft(next);setPlan(null);setRun(null);setBox(null);setVisitIndex(0);setError('');};
 const calculate=()=>{
  if(worker.current||draft.jobs.length!==examples.length)return;
  setBusy(true);setError('');
  try{
   const next=new Worker(new URL('./flight.worker.mjs',import.meta.url),{type:'module'});worker.current=next;
   const finish=()=>{if(worker.current!==next)return false;next.terminate();worker.current=null;setBusy(false);return true;};
   next.onmessage=({data}:{data:{plan?:FlightPlan;error?:string}})=>{if(!finish())return;if(data.error||!data.plan){setError(data.error||t('항로를 계산하지 못했습니다. 다시 시도해 주세요.','Could not calculate. Please retry.'));return;}setPlan(data.plan);setRun(blankRun(data.plan));setVisitIndex(0);};
   next.onerror=()=>{if(finish())setError(t('항로 계산기를 불러오지 못했습니다. 다시 시도해 주세요.','Could not load the route planner. Please retry.'));};
   // Dedicated worker receives only practice data. No saved-flight, receipts or history APIs.
   next.postMessage({draft});
  }catch{stopWorker();setError(t('항로 계산기를 시작하지 못했습니다.','Could not start the route planner.'));}
 };
 const index=step===4?Math.min(run?.index??0,Math.max(0,(plan?.visits.length??1)-1)):visitIndex,visit=plan?.visits[index];
 const packing=useMemo(()=>visit&&plan?{...visit.packing,capacity:plan.capacity??0,used:visit.load} as Packing:null,[visit,plan]);
 const nextAllowed=trade?(step===0||step===1&&quoteChecked||step===2&&planChecked||step===3&&tradePracticeSummary(tradePractice).finished):!practice||step===0||step===1||step===2&&draft.jobs.length===examples.length||step===3&&!!plan&&!busy||step===4&&!!run?.finished;
 const task=(type:string)=>type==='pickup'?t('픽업','Pickup'):type==='delivery'?t('배송','Delivery'):t('출발','Departure');
 const shot=useMemo(()=>page.shot??(page.image?{scene:page.image}:null),[page]);
 const back=()=>{stopWorker();setStep(Math.max(0,step-1));};
 return <dialog ref={dialog} className="guide-journey" data-topic={topic} data-step={step} data-scene={!!shot} data-presenter={shot?.target==='operations'?'left':'right'} aria-labelledby="guide-journey-title" onCancel={e=>{e.preventDefault();onClose();}} onKeyDown={e=>{if(e.key==='Escape')e.stopPropagation();}}>
  <header className="guide-journey-header"><div><small>STAM / {trade?'PRACTICE TRADE':practice?'PRACTICE FLIGHT':'FLIGHT GUIDE'}</small><h2 id="guide-journey-title" ref={heading} tabIndex={-1}>{word(page.title)}</h2></div><Action onClick={onClose}>{t('안내 종료','End guide')}</Action></header>
  {(practice||trade)&&<p className="guide-practice-notice">{t('연습 모드 · 실제 계약/계정에 저장되지 않아요','Practice mode · Nothing is saved to your real contracts or account')}</p>}
  <div className="guide-journey-work">
   {trade&&<TradeGuideStage step={step} locale={locale} scope={tradeScope} onScope={setTradeScope} quoteChecked={quoteChecked} onQuote={()=>setQuoteChecked(true)} planChecked={planChecked} onPlan={()=>setPlanChecked(true)} practice={tradePractice} onRecord={()=>setTradePractice(current=>{const next=tradePracticeSummary(current).next;return next?advanceTradePractice(current,next):current;})} onReset={()=>setTradePractice(blankTradePractice())}/>}
   {shot&&<GuideScene shot={shot} label={word(page.title)} motion={motion}/>}
   {!practice&&!trade&&!shot&&<div className="guide-journey-explainer"><ApprovedGlass kind="panel"/><small>0{step+1} / 0{pages.length}</small><h3>{word(page.title)}</h3><p>{topic==='reference'?t('필요한 자료를 실제 아카이브에서 확인하세요.','Explore the actual archive for detailed references.'):t('설명을 읽은 뒤 다음 단계로 넘어가세요.','Read the guidance, then continue at your own pace.')}</p></div>}
   {practice&&step===1&&<div className="guide-practice-setup"><h3>Hull B <span>512 SCU</span></h3><p>{t('출발','Departure')} · {where(draft.start)} → Pyro</p><label>{t('운항 파트너','Flight partner')}<select value={draft.partner} onChange={e=>change({...draft,partner:e.target.value as Draft['partner']})}><option value="navigator">{t('수석 항해사 · 경로와 적재','Senior navigator · Route & cargo')}</option><option value="operator">{t('브리지 오퍼레이터 · 경로만','Bridge operator · Route only')}</option></select></label><p>{draft.partner==='navigator'?t('항로와 Hull B 적재 배치를 함께 연습합니다.','Practice routes and Hull B cargo loading together.'):t('적재는 직접 관리하고 경로와 작업 순서를 연습합니다.','Manage loading yourself and practice route and task order.')}</p></div>}
   {practice&&step===2&&<>
    <div className="guide-practice-toolbar"><Action gold onClick={()=>setLoaded(true)} disabled={loaded}>{loaded?t('예시 계약 불러옴','Practice contracts loaded'):t('예시 계약 불러오기','Load practice contracts')}</Action>{loaded&&<Action onClick={()=>change({...draft,jobs:examples,received:true})}>{t('6계약 모두 선택','Select all six')}</Action>}<strong>{draft.jobs.length} / 6 · {draft.jobs.reduce((sum,j)=>sum+jobVolume(j),0)} / 363 SCU</strong></div>
    {loaded&&<div className="guide-practice-contracts">{examples.map(job=><label key={job.id} className="guide-practice-contract"><span><input type="checkbox" checked={draft.jobs.some(j=>j.id===job.id)} onChange={e=>change({...draft,received:true,jobs:e.target.checked?[...draft.jobs,job]:draft.jobs.filter(j=>j.id!==job.id)})}/><strong>{word(job.title)}</strong><b>{jobVolume(job)} SCU</b></span><ul>{job.shipments.map(s=><li key={s.id}>{where(s.from)} → {where(s.to)} <b>{s.scu} SCU</b></li>)}</ul></label>)}</div>}
    <p className="guide-practice-source">{t('확인된 운항의 장소·수량을 재구성한 연습 자료입니다. 품목·보상·상자 구성은 원본 실측값으로 표시하지 않으며, 미확정 일곱 번째 계약은 포함하지 않습니다.','Reconstructed from the confirmed itinerary and quantities. Commodity, reward and container layouts are not presented as measured original values. The unresolved seventh contract is excluded.')}</p>
   </>}
   {practice&&(step===3||step===4)&&<>
    <div className="guide-practice-toolbar">{step===3&&<Action gold disabled={busy} onClick={calculate}>{busy?t('계산 중…','Calculating…'):plan?t('다시 계산','Recalculate'):t('경로 계산','Calculate route')}</Action>}{plan&&<strong>{plan.visits.length} {t('방문','stops')} · {plan.visits.reduce((n,v)=>n+v.jumps.length,0)} {t('행성계 점프','system jumps')}{plan.mode!=='simple'&&` · ${plan.peak} / ${plan.capacity} SCU`}</strong>}</div>
    {error&&<p role="alert">{error}</p>}
    {plan&&visit&&<div className="guide-practice-plan"><div className="guide-practice-views"><div className="guide-practice-chart"><Suspense fallback={<p>{t('지도 준비 중…','Loading map…')}</p>}><NavigationChart locale={locale} plan={plan} index={index} look="hologram"/></Suspense></div>{plan.mode!=='simple'&&<div className="guide-practice-cargo"><p>{t('현재 거점 작업 후 예상 적재','Expected cargo after this stop')}</p><Suspense fallback={<p>{t('적재 화면 준비 중…','Loading cargo…')}</p>}><CargoViewport ship={plan.ship as CargoShip} packing={packing} locale={locale} selected={box} onSelect={setBox}/></Suspense></div>}</div>
     <div className="guide-practice-stops">{step===3?<ol>{plan.visits.map((v,i)=><li key={i}><button type="button" aria-current={i===index?'step':undefined} onClick={()=>{setVisitIndex(i);setBox(null);}}>{i+1}. {where(v.locationId)}</button></li>)}</ol>:<><h3>{run?.finished?t('모든 연습 작업 완료','All practice tasks complete'):where(visit.locationId)}</h3><p>{run?.finished?`${plan.visits.length} / ${plan.visits.length}`:`${(run?.index??0)+1} / ${plan.visits.length}`}</p></>}
      {!run?.finished&&<><h4>{where(visit.locationId)}</h4>{visit.jumps.map((jump,i)=><p key={i}>{jump.entryName} → {jump.exitName}</p>)}<ul>{visit.events.map((event,i)=><li key={i}>{task(event.type)} · {event.scu} SCU</li>)}</ul></>}
      {step===4&&run&&<div className="guide-practice-progress">{!run.started?<Action gold onClick={()=>setRun(startRun(run))}>{t('연습 운항 시작','Start practice run')}</Action>:!run.finished?<Action gold onClick={()=>{setRun(completeStep(plan,run));setBox(null);}}>{visit.jumps[run.jump]?t('점프 완료 연습','Confirm practice jump'):t('현재 작업 완료 연습','Confirm practice task')}</Action>:null}<Action disabled={!run.history.length} onClick={()=>{setRun(undoStep(run));setBox(null);}}>{t('직전 작업 되돌리기','Undo last task')}</Action></div>}
     </div></div>}
   </>}
   {practice&&step===5&&<div className="guide-journey-explainer"><ApprovedGlass kind="panel"/><h3>{t('연습 완료','Practice complete')}</h3><p>Hull B · 6 {t('계약','contracts')} · 363 SCU</p><p>Stanton → Pyro</p><Action gold onClick={()=>onNavigate('mission')}>{t('실제 운송 준비','Prepare a real haul')}</Action><Action onClick={()=>onTopic('overview')}>{t('전체 둘러보기','Division overview')}</Action></div>}
  </div>
  <footer className="guide-journey-dialogue"><div className="guide-journey-portrait" aria-hidden="true"><img src={portrait} alt=""/></div><div ref={caption} className="guide-journey-speech"><div><small>{t('플라이트 가이드','FLIGHT GUIDE')} · {step+1} / {pages.length}</small><p aria-live="polite">{word(page.body)}</p></div><nav aria-label={t('안내 진행','Guide controls')}><Action disabled={step===0||busy||practice&&step===4&&!!run?.started} onClick={back}>{t('이전','Previous')}</Action>{!last&&<Action gold disabled={!nextAllowed||busy} onClick={()=>setStep(step+1)}>{t('다음','Next')} →</Action>}{!practice&&!trade&&last&&<Action onClick={()=>onTopic('practice')}>{t('예시 운송 연습','Practice a haul')}</Action>}{topic==='overview'&&page.destination&&page.destination!=='lounge'&&<Action onClick={()=>onNavigate(page.destination!)}>{t('이 시설 열기','Open this facility')}</Action>}{topic==='reference'&&<Action gold onClick={()=>onNavigate('information',undefined,step===0?'ships':'cargo')}>{step===0?t('함선 자료 열기','Open ship archive'):t('화물 자료 열기','Open cargo archive')}</Action>}{topic==='procedure'&&last&&<Action onClick={()=>onNavigate('service','manual')}>{t('전체 이용안내','Full user guide')}</Action>}{topic==='overview'&&last&&<Action gold onClick={onTour}>{t('라운지 투어 이어가기','Continue lounge tour')}</Action>}</nav></div></footer>
 </dialog>;
}

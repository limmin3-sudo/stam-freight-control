import {lazy,Suspense,useEffect,useRef} from 'react';
import type {Locale} from './navigation';
import {ApprovedGlass} from './ApprovedGlass';
import './market-information.css';
import './academy.css';
const Education=lazy(()=>import('./AcademyEducation')),Study=lazy(()=>import('./AcademyStudy'));
export default function AcademyRoom({room,locale,initialShip,onExit,closing}:{room:'education'|'operations-study';locale:Locale;initialShip?:string;onExit:()=>void;closing:boolean}){
 const en=locale==='en',t=(k:string,e:string)=>en?e:k,title=room==='education'?t('교육실','Education'):t('작전 연구실','Operations study'),heading=useRef<HTMLHeadingElement>(null);useEffect(()=>{heading.current?.focus({preventScroll:true});},[room]);
 return <aside className="lobby-detail market-room academy-room" data-closing={closing} inert={closing} aria-label={title}><header className="market-header"><div><p className="market-eyebrow">STAM / ACADEMY</p><h2 ref={heading} tabIndex={-1}>{title}</h2><p>{room==='education'?t('미션 선택부터 경로 구성까지, 수주 전에 알아둘 운송 지식.','Freight knowledge for choosing contracts and planning routes.'):t('확인된 운송 사례로 계약 조합과 이동 전략을 비교합니다.','Compare contract combinations and route strategies using a confirmed freight case.')}</p></div><button type="button" className="lobby-reset" onClick={onExit}><ApprovedGlass/><span>{t('로비 전체 보기','Lobby overview')}</span></button></header><Suspense fallback={<p role="status">{t('자료 준비 중…','Loading references…')}</p>}>{room==='education'?<Education locale={locale} initialShip={initialShip}/>:<Study locale={locale}/>}</Suspense></aside>;
}

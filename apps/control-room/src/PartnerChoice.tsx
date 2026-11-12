import operator from '../../../assets/partners/aide-portrait.webp';
import navigator from '../../../assets/partners/navigator.jpg';
import type {Draft} from './mission-trial';
import type {Locale} from './navigation';

export function PartnerChoice({locale,onChoose}:{locale:Locale;onChoose:(partner:Draft['partner'])=>void}){
 const en=locale==='en';
 return <section className="space-room partner-choice" aria-labelledby="space-title">
  <header className="space-room-heading"><p>STAM / FLIGHT PARTNER</p><h1 id="space-title">{en?'Choose your flight partner first':'먼저 운항 파트너를 선택하세요'}</h1></header>
  <p className="partner-choice-intro">{en?'Choose how you want to prepare this haul. Your partner stays with you through mission planning, navigation and flight control.':'이번 운송을 어떻게 준비할지 골라주세요. 선택한 파트너가 미션 준비부터 항로와 운항까지 함께합니다.'}</p>
  <div className="partner-options">
   {(['operator','navigator'] as const).map(partner=><button type="button" key={partner} data-partner={partner} onClick={()=>onChoose(partner)}>
    <img src={partner==='operator'?operator:navigator} alt=""/>
    <div><small>{partner==='operator'?'ROUTE GUIDANCE':'ROUTE & CARGO'}</small>
    <h2>{partner==='operator'?(en?'Bridge operator':'브리지 오퍼레이터'):(en?'Senior navigator':'수석 항해사')}</h2>
    <p>{partner==='operator'?(en?'I will handle loading. Guide my pickup and delivery route.':'적재는 내가 알아서. 픽업과 배송 경로만 안내받습니다.'):(en?'Plan my route and cargo space from known delivery SCU totals.':'배송 총 SCU를 바탕으로 경로와 적재 공간을 함께 계산합니다.')}</p>
    <span>{en?'Start together':'함께 시작'} →</span></div>
   </button>)}
  </div>
  <p className="partner-choice-note">{en?'If total SCU is unknown and you continue without entering it, the operator will guide the route.':'총 SCU를 모르고 입력 없이 진행하면 오퍼레이터가 경로를 안내합니다.'}</p>
 </section>;
}

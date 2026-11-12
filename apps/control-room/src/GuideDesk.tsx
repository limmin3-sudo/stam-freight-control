import {forwardRef,useImperativeHandle,useLayoutEffect,useRef} from 'react';
import type {Locale} from './navigation';
import type {SpaceScreen} from './space-navigation';
import {mountGuideDesk} from './guide-desk-controller.mjs';
import type {GuideDeskApi} from './guide-desk-controller.mjs';
import template from './guide-desk-template.html?raw';
import approach from './assets/guide/approach.mp4';
import idle from './assets/guide/idle-ab.mp4';
import returning from './assets/guide/return.mp4';
import desk from './assets/guide/desk-end.png';
import lounge from './assets/guide/lounge-start.png';
import returnEnd from './assets/guide/lounge-return.png';
import './guide-desk.css';
export type GuideDeskHandle={navigate(screen:SpaceScreen):void};
const english:Record<string,string>={
 '플라이트 가이드':'Flight Guide','STAM · 안내 데스크':'STAM · Welcome desk','무엇을 도와드릴까요?':'How can I help?',
 '첫 운송 시작':'Start first haul','운송 절차 안내':'Hauling guide','함선·화물 정보':'Ships & cargo','라운지로 돌아가기':'Return to lounge',
 '처음이에요. 안내해 주세요.':'Please show me how.','운송 준비부터 시작할게요.':'Let’s prepare a haul.',
 '소리 켜기':'Sound on','소리 끄기':'Sound off','이동 건너뛰기':'Skip travel','홀로그램 펼치기':'Open hologram','홀로그램 접기':'Close hologram',
 '미션 콘솔에서 함선과 출발지를 고른 뒤 계약을 담아 주세요. 항로와 적재를 확인하면 출항할 수 있어요.':'Choose your ship and departure in the mission console, then add contracts. Review your route and cargo before departure.',
 '먼저 미션 콘솔에서 이번 운송에 담을 계약을 선택해 주세요. 확인한 계약으로 항로를 계산할 수 있어요.':'Select contracts in the mission console. You can calculate a route from the reviewed contracts.',
 '데스크로 이동 중':'Approaching the desk','데스크 도착':'At the desk','안내 데스크':'Welcome desk','홀로그램 수납':'Hologram closed','홀로그램 수납 중':'Closing hologram','라운지로 이동 중':'Returning to lounge','라운지':'Lounge',
};
type Props={locale:Locale;startWithApproach:boolean;motion:boolean;sound:boolean;onNavigate(screen:SpaceScreen):void;onLounge():void};
// The approved SVG/HTML scene is an isolated DOM island. The controller is shared
// with the verified cinematic preview; cleanup owns every timer and media element.
export const GuideDesk=forwardRef<GuideDeskHandle,Props>(function GuideDesk(props,ref){
 const host=useRef<HTMLDivElement>(null),api=useRef<GuideDeskApi|null>(null),callbacks=useRef(props);
 callbacks.current=props;
 useImperativeHandle(ref,()=>({navigate(screen){void api.current?.navigate(screen);}}),[]);
 useLayoutEffect(()=>{
  const root=host.current;if(!root)return;
  // Approved approach flows into the new idle loop under live panels.
  // High-resolution PNGs remain fallback and the lounge destination background.
  let html=template;
  for(const [token,url] of Object.entries({'__APPROACH__':approach,'__IDLE__':idle,'__RETURN__':returning,'__LOUNGE__':lounge,'__DESK__':desk,'__RETURN_END__':returnEnd}))html=html.replaceAll(token,url);
  root.innerHTML=html;
  const translate=(text:string)=>props.locale==='en'?english[text]??text:text;
  if(props.locale==='en'){
   root.querySelectorAll<HTMLElement>('span,h2,h3,small,button').forEach(node=>{if(!node.children.length)node.textContent=translate(node.textContent?.trim()??'');});
   const greeting=root.querySelector('#greeting');if(greeting)greeting.innerHTML='Welcome to STAM.<br>Shall we prepare your first haul?';
  }
  api.current=mountGuideDesk(root,{...props,translate,onNavigate:screen=>callbacks.current.onNavigate(screen),onLounge:()=>callbacks.current.onLounge()});
  return()=>{api.current?.destroy();api.current=null;root.replaceChildren();};
 },[props.locale,props.startWithApproach,props.motion]);
 return <div className="guide-desk" ref={host} data-motion={props.motion} aria-label={props.locale==='en'?'Flight Guide reception':'플라이트 가이드 안내데스크'}/>;
});

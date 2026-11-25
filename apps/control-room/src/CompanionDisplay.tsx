import {createContext,useContext,useEffect,useRef} from 'react';
import type {Locale} from './navigation';
import type {MarketSnapshot} from './trade-data';
export type NavigatorStop={
 destination:string;ship:string;shipArt:string;route:string[];finished:boolean;visitNumber?:number;visitCount?:number;
 cargo:{item:string;action:'pickup'|'delivery';scu:number|null}[];extra:number;
};
export type TradeAction={id:string;prev:boolean;next:boolean;action:string;buy:{label:string;qty:number;box:number}[];sell:{label:string;qty:number;box:number}[];buyers:string[]};
export type CompanionSummary={inbox?:{id:string;label:string;action:string;options:string[]};switchable?:boolean;tradeAction?:TradeAction;mode:'personal'|'fleet'|'flight';title:string;lines:string[];navigation?:NavigatorStop;partner?:'operator'|'navigator';stepId?:string;step?:string;guidance?:Partial<Record<'task'|'destination'|'afterLoad'|'load'|'cash'|'profit',string>>};
export type DisplayView={market?:MarketSnapshot|null;summary:CompanionSummary;locale:Locale;onCommand:(command:string)=>void};
export function createCompanionDock(){
 const slots=new Set<()=>DisplayView>();
 return {register(read:()=>DisplayView){slots.add(read);return ()=>{slots.delete(read);};},read:()=>Array.from(slots).at(-1)?.(),open:()=>{}};
}
export const CompanionDock=createContext<ReturnType<typeof createCompanionDock>|null>(null);
export default function CompanionDisplay(props:DisplayView){
 const dock=useContext(CompanionDock),current=useRef(props);current.current=props;
 useEffect(()=>dock?.register(()=>current.current),[dock]);
 return <button type="button" className="market-action" onClick={()=>dock?.open()}>{props.locale==='en'?'Open flight copilot':'운항 부조종사 열기'}</button>;
}

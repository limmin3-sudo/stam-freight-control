import {createContext,useContext,useEffect,useRef} from 'react';
import type {Locale} from './navigation';
import type {MarketSnapshot} from './trade-data';
export type CompanionSummary={mode:'personal'|'fleet'|'flight';title:string;lines:string[];partner?:'operator'|'navigator';stepId?:string;step?:string;guidance?:Partial<Record<'task'|'destination'|'afterLoad'|'load'|'cash'|'profit',string>>};
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

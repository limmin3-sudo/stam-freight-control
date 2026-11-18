import {useCallback,useEffect,useRef,useState} from 'react';
import {readyTradeOwner} from './trade-storage';
export const tradeViewKey=(owner:string,name:string)=>'stam.trade-view.v1:'+encodeURIComponent(owner)+':'+name;
const choices:Record<string,string[]>={mode:['personal','fleet'],'personal-view':['work','inventory','history'],'fleet-tab':['operations','directory','create','notifications']};
function compatible(value:unknown,seed:unknown,key=''):boolean{
 if(seed===null)return value===null;
 if(Array.isArray(seed)){
  if(!Array.isArray(value)||value.length>1000)return false;
  if(key==='cargo')return value.length<=100&&value.every(v=>v&&typeof v==='object'&&Number.isSafeInteger(v.commodityId)&&Number.isFinite(v.quantity)&&[1,2,4,8,16,24,32].includes(v.boxSize)&&['owned','stolen','unknown'].includes(v.ownership)&&(v.cost===null||Number.isFinite(v.cost))&&(v.lotId===undefined||typeof v.lotId==='string'));
  return value.every(v=>['commodityIds','excludeCommodityIds','excludeTerminalIds','waypoints'].includes(key)?Number.isSafeInteger(v)&&v>0:typeof v==='string'&&v.length<=200);
 }
 if(typeof seed==='object')return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.entries(seed as object).every(([key,s])=>compatible((value as Record<string,unknown>)[key],s,key));
 return typeof value===typeof seed&&(typeof value!=='number'||Number.isFinite(value));
}
// View/draft storage is scoped to the account and current tab, never a ledger.
export function useTradeView<T>(name:string,initial:T){
 const seed=useRef(initial),[view,setView]=useState<{owner:string;value:T}>({owner:'',value:initial});
 useEffect(()=>{const restore=()=>{try{const owner=readyTradeOwner();let value=seed.current;try{const raw=sessionStorage.getItem(tradeViewKey(owner,name));if(raw){const parsed=JSON.parse(raw);if(compatible(parsed,seed.current)&&(!choices[name]||choices[name].includes(parsed)))value=parsed;}}catch{}setView({owner,value});}catch{setView({owner:'',value:seed.current});}};restore();window.addEventListener('stam-account-boundary',restore);return()=>window.removeEventListener('stam-account-boundary',restore);},[name]);
 const update=useCallback((next:T|((old:T)=>T))=>setView(old=>{try{if(!old.owner||readyTradeOwner()!==old.owner)return old;}catch{return old;}const value=typeof next==='function'?(next as (old:T)=>T)(old.value):next;try{sessionStorage.setItem(tradeViewKey(old.owner,name),JSON.stringify(value));}catch{}return {...old,value};}),[name]);
 return [view.value,update] as const;
}

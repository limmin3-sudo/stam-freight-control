import {useEffect,useState} from 'react';
export type ChartLook='physical'|'hologram';
let temporary:ChartLook|undefined;
const key='stam.chart-look.v1',event='stam-chart-look-changed';
const valid=(s:unknown):s is ChartLook=>s==='physical'||s==='hologram';
function read():ChartLook{const query=new URLSearchParams(location.hash.split('?')[1]).get('chartLook');if(valid(query))return query;if(temporary)return temporary;try{const stored=localStorage.getItem(key);if(valid(stored))return stored;}catch{}return 'physical';}
export function useChartLook(){
 const [look,setLook]=useState<ChartLook>(read),[saved,setSaved]=useState(true);
 useEffect(()=>{const refresh=(e:Event)=>{if(e.type==='storage')temporary=undefined;setLook(read());};window.addEventListener(event,refresh);window.addEventListener('storage',refresh);window.addEventListener('hashchange',refresh);return()=>{window.removeEventListener(event,refresh);window.removeEventListener('storage',refresh);window.removeEventListener('hashchange',refresh);};},[]);
 function choose(next:ChartLook){temporary=next;setLook(next);try{localStorage.setItem(key,next);setSaved(true);}catch{setSaved(false);}
  const [route,query]=location.hash.split('?'),params=new URLSearchParams(query);params.delete('chartLook');history.replaceState(history.state,'',route+(params.size?'?'+params:''));window.dispatchEvent(new Event(event));
 }
 return {look,choose,saved};
}

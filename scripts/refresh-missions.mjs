// Builds data/hauling-missions.json from the Star Citizen Wiki API mission data (datamined game files):
// every released hauling mission and variant with its cargo orders (commodity, max SCU, max container size).
// The app uses it to recognise the mission type of a pasted contract and its per-commodity box size limit.
// Safe for the daily Pages run: on any fetch error, a suspicious drop in size or an unchanged game version it
// keeps the committed file and exits 0. Usage: node scripts/refresh-missions.mjs [--force]
import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url),out=new URL('data/hauling-missions.json',root),API='https://api.star-citizen.wiki/api/missions';
const force=process.argv.includes('--force');
let previous=null;try{previous=JSON.parse(await fs.readFile(out,'utf8'));}catch{}
const keep=reason=>{console.log(`미션 데이터 유지: ${reason}`);process.exit(0);};

async function get(url,tries=4){
 for(let t=1;;t++){try{const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':'STAM-Freight-Control'},signal:AbortSignal.timeout(45000)});if(r.ok)return await r.json();if(r.status<500&&r.status!==429)throw Error('HTTP '+r.status);}catch(e){if(t>=tries)throw e;}
  await new Promise(res=>setTimeout(res,1500*t));}
}
async function pool(items,size,fn){const results=new Array(items.length);let next=0;
 await Promise.all(Array.from({length:size},async()=>{while(next<items.length){const i=next++;results[i]=await fn(items[i]);}}));return results;}

try{
 const list=[];let page=1,last=1;
 do{const json=await get(`${API}?page%5Bsize%5D=100&page%5Bnumber%5D=${page}`);list.push(...json.data);last=json.meta?.last_page||1;page++;}while(page<=last&&page<60);
 const hauling=list.filter(m=>m.has_hauling&&m.released&&!m.not_for_release);
 const version=[...new Set(hauling.map(m=>m.version||m.game_version).filter(Boolean))].sort().at(-1)||'';
 if(!hauling.length)keep('운송 미션 목록이 비어 있음');
 if(!force&&previous?.meta?.version===version&&previous.meta.entityUnits==='CryoPod')keep(`게임 데이터 버전 그대로 (${version})`);
 const ids=[...new Set(hauling.flatMap(m=>[m.uuid,...(m.variants||[]).map(v=>v.uuid)]))];
 const details=await pool(ids,6,async id=>{try{return (await get(`${API}/${id}`)).data;}catch{return null;}});
 const failed=details.filter(d=>!d).length;if(failed>ids.length*0.05)keep(`상세 ${failed}/${ids.length}개 실패`);
 // Cryopods are Entity orders: retain their item count and fetch the item's SCU volume.
 // max_container_size=-1 does not mean that the item has no known volume.
 const entityIds=[...new Set(details.flatMap(d=>(d?.hauling_orders||[]).filter(o=>o.kind==='Entity'&&o.name==='CryoPod').map(o=>o.uuid)))];
 const entities=new Map(await pool(entityIds,4,async id=>{const item=(await get(`https://api.star-citizen.wiki/api/items/${id}`)).data;return [id,item.dimension?.volume_converted_unit==='SCU'?item.dimension.volume_converted:null];}));
 const seen=new Set(),missions=[];
 for(const d of details){if(!d?.hauling_orders?.length)continue;
  const orders=d.hauling_orders.filter(o=>o?.name).map(o=>[o.name,Number.isFinite(o.max_scu)?o.max_scu:null,Number.isFinite(o.max_container_size)?o.max_container_size:null]);
  if(!orders.length)continue;
  const entry={id:d.uuid,title:d.title||'',giver:d.mission_giver||d.faction?.name||'',rank:Number.isInteger(d.rank_index)?d.rank_index:null,orders};
  const entityOrders=d.hauling_orders.filter(o=>o.kind==='Entity'&&o.name==='CryoPod').map(o=>({name:o.name,uuid:o.uuid,maxAmount:o.max_amount??null,minAmount:o.min_amount??null,reportedVolumeScu:entities.get(o.uuid)??null,source:`https://api.star-citizen.wiki/api/items/${o.uuid}`}));if(entityOrders.length)entry.entityOrders=entityOrders;
  const key=JSON.stringify([entry.title,entry.giver,entry.rank,[...orders].map(o=>JSON.stringify(o)).sort(),entityOrders]);if(seen.has(key))continue;seen.add(key);missions.push(entry);}
 missions.sort((a,b)=>a.giver.localeCompare(b.giver)||a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
 if(previous?.missions?.length&&missions.length<previous.missions.length*0.6)keep(`새 데이터가 너무 적음 (${missions.length} < ${previous.missions.length})`);
 const meta={version,downloaded:new Date().toISOString().slice(0,10),source:'https://api.star-citizen.wiki/api/missions',entityUnits:'CryoPod',note:'Released hauling missions and variants; orders = [commodity, max SCU, max container size SCU (-1 = special item)]. entityOrders retain cryopod item counts and item volume in SCU.',definitions:hauling.length,variants:ids.length};
 await fs.writeFile(out,JSON.stringify({meta,missions})+'\n');
 console.log(JSON.stringify({version,definitions:hauling.length,fetched:ids.length,failed,unique:missions.length}));
}catch(e){keep('가져오기 실패 · '+e.message);}

import {validateSnapshot,normalizeMarket,tradeApi,type MarketSnapshot,type Quote,type Raw} from './trade-data';
let snapshot:Promise<MarketSnapshot>|undefined;
export function loadMarket(){return snapshot??=(fetch(new URL('../../../data/trade-market.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Market snapshot unavailable');return r.json();}).then(validateSnapshot).catch(e=>{snapshot=undefined;throw e;}));}
const recent=new Map<number,{checkedAt:string;quotes:Quote[]}>(),pending=new Map<number,Promise<{checkedAt:string;quotes:Quote[]}>>();
export function refreshCommodity(data:MarketSnapshot,commodityId:number,force=false){
 const cached=recent.get(commodityId);if(!force&&cached&&Date.now()-Date.parse(cached.checkedAt)<1800000)return Promise.resolve(cached);
 const previous=pending.get(commodityId);if(previous)return previous;
 const request=(async()=>{
  const get=async(endpoint:string)=>{const r=await fetch(tradeApi+endpoint,{signal:AbortSignal.timeout(15000),credentials:'omit'});if(!r.ok)throw Error('Market service unavailable');const json=await r.json();if(json.status!=='ok')throw Error('Invalid market response');return json.data;};
  const version=(await get('game_versions')).live;if(version!==data.liveVersion)throw Error('Market version changed');
  const raw=await get('commodities_prices?id_commodity='+commodityId);if(!Array.isArray(raw)||!raw.length||raw.some((r:Raw)=>r.id_commodity!==commodityId))throw Error('Incomplete commodity response');
  // Use the same normalizer and ID joins as the offline collector.
  const normalized=normalizeMarket({liveVersion:version,retrievedAt:new Date().toISOString(),queriedTerminals:data.terminals.length,
   commodities:data.commodities.map(c=>({id:c.id,name:c.name,is_available_live:1,is_visible:1})),
   terminals:data.terminals.map(t=>({id:t.id,name:t.name,type:'commodity',is_available_live:1,is_visible:1})),quotes:raw});
  const result={checkedAt:new Date().toISOString(),quotes:normalized.quotes};if(!result.quotes.length)throw Error('No matching terminals');recent.set(commodityId,result);return result;
 })().finally(()=>pending.delete(commodityId));pending.set(commodityId,request);return request;
}

export function marketWithRecentQuotes(data:MarketSnapshot):MarketSnapshot{
 const updates=[...recent.entries()].filter(([,value])=>Date.now()-Date.parse(value.checkedAt)<1800000);
 if(!updates.length)return data;const ids=new Set(updates.map(([id])=>id));
 return {...data,quotes:[...data.quotes.filter(q=>!ids.has(q.commodityId)),...updates.flatMap(([,v])=>v.quotes)]};
}

import {patch,tradeApi} from './trade-data.ts';
export type PriceReport={id:number;at:number;buy:number|null;sell:number|null;stock:number|null;demand:number|null};
export type PriceHistory={reports:PriceReport[];excluded:number;received:number;checkedAt:number;url:string};
const numeric=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e12;
export function normalizePriceHistory(body:unknown,terminalId:number,commodityId:number,version:string,now=Date.now()):Omit<PriceHistory,'checkedAt'|'url'>{
 const b=body as {status?:string;data?:Record<string,unknown>[]};
 if(!b||b.status!=='ok'||!Array.isArray(b.data)||b.data.length>500)throw Error('Invalid price history');
 const seen=new Set<number>();let excluded=0;
 const reports:PriceReport[]=[];
 for(const r of b.data){
  if(!r||typeof r!=='object'||r.id_terminal!==terminalId||r.id_commodity!==commodityId)throw Error('Mismatched history identity');
  if(!Number.isSafeInteger(r.id)||Number(r.id)<=0||seen.has(Number(r.id)))throw Error('Duplicate history identity');seen.add(Number(r.id));
  if(patch(r.game_version)!==version||typeof r.date_added!=='number'||!Number.isFinite(r.date_added)||r.date_added<=0||r.date_added*1000>now+300000){excluded++;continue;}
  const price=(n:unknown)=>numeric(n)&&n>0?n:null,amount=(n:unknown)=>numeric(n)?n:null;
  const buy=price(r.price_buy),sell=price(r.price_sell);if(buy===null&&sell===null){excluded++;continue;}
  reports.push({id:Number(r.id),at:r.date_added*1000,buy,sell,stock:amount(r.scu_buy),demand:amount(r.scu_sell)});
 }
 reports.sort((a,b)=>a.at-b.at||a.id-b.id);return {reports,excluded,received:b.data.length};
}
export function createPriceHistoryLoader(fetcher:typeof fetch=fetch,clock=Date.now){
 const cache=new Map<string,PriceHistory>(),pending=new Map<string,Promise<PriceHistory>>();
 return (terminalId:number,commodityId:number,version:string)=>{
  if(![terminalId,commodityId].every(n=>Number.isSafeInteger(n)&&n>0)||!/^\d+\.\d+\.\d+$/.test(version))return Promise.reject(Error('Invalid history query'));
  const key=`${version}:${terminalId}:${commodityId}`,hit=cache.get(key);
  if(hit&&clock()-hit.checkedAt<12*60*60*1000)return Promise.resolve(hit);
  if(pending.has(key))return pending.get(key)!;
  const url=tradeApi+`commodities_prices_history?id_terminal=${terminalId}&id_commodity=${commodityId}&game_version=${encodeURIComponent(version)}`;
  const request=(async()=>{const r=await fetcher(url,{credentials:'omit',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Price history unavailable');
   const checkedAt=clock(),result={...normalizePriceHistory(await r.json(),terminalId,commodityId,version,checkedAt),checkedAt,url};
   cache.delete(key);cache.set(key,result);if(cache.size>40)cache.delete(cache.keys().next().value!);return result;
  })().finally(()=>pending.delete(key));pending.set(key,request);return request;
 };
}
export const loadPriceHistory=createPriceHistoryLoader();

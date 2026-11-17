// Run with Node 22+: node --experimental-strip-types scripts/refresh-trade.ts
import {readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {normalizeMarket,validateSnapshot,tradeApi,flag,type Raw,type MarketSnapshot} from '../apps/control-room/src/trade-data.ts';
export async function refreshTrade({output=new URL('../data/trade-market.json',import.meta.url),fetchImpl=fetch,delayMs=1100,onProgress=console.log}:{output?:URL;fetchImpl?:typeof fetch;delayMs?:number;onProgress?:(s:string)=>void}={}){
 const evidence:MarketSnapshot['evidence']=[];
 const get=async(endpoint:string)=>{
  const url=tradeApi+endpoint,r=await fetchImpl(url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error(`UEX HTTP ${r.status}: ${endpoint}`);
  const raw=await r.text(),body=JSON.parse(raw);if(body.status!=='ok')throw Error('UEX source error: '+endpoint);
  evidence.push({url,sha256:createHash('sha256').update(raw).digest('hex'),checkedAt:new Date().toISOString(),rows:Array.isArray(body.data)?body.data.length:1});return body.data;
 };
 const version=(await get('game_versions')).live;
 const commodities=await get('commodities'),terminals=await get('terminals?type=commodity');
 if(!Array.isArray(terminals))throw Error('Invalid terminals');
 const sites={stations:await get('space_stations'),outposts:await get('outposts'),cities:await get('cities')};
 const live=terminals.filter((r:Raw)=>flag(r.is_available_live)===true&&flag(r.is_visible)===true&&r.type==='commodity');
 const quotes:Raw[]=[];
 for(const [i,t] of live.entries()){
  if(delayMs)await new Promise(resolve=>setTimeout(resolve,delayMs));
  const rows=await get('commodities_prices?id_terminal='+t.id);if(!Array.isArray(rows)||rows.some((r:Raw)=>r.id_terminal!==t.id))throw Error('Incorrect terminal prices');quotes.push(...rows);
  if(i%20===0)onProgress(`UEX prices ${i+1}/${live.length}`);
 }
 if((await get('game_versions')).live!==version)throw Error('LIVE version changed during refresh');
 const next=normalizeMarket({commodities,terminals,quotes,sites,liveVersion:version,retrievedAt:new Date().toISOString(),queriedTerminals:live.length,evidence});validateSnapshot(next);
 let previous:MarketSnapshot|undefined;try{previous=validateSnapshot(JSON.parse(await readFile(output,'utf8')));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 if(previous&&(['commodities','terminals','quotes'] as const).some(key=>next[key].length<previous![key].length*.7))throw Error('Market coverage unexpectedly shrank');
 if(!next.quotes.length)throw Error('Empty market prices');
 const staged=new URL(output.href+'.staged');try{await writeFile(staged,JSON.stringify(next)+'\n');await rename(staged,output);}finally{await unlink(staged).catch(()=>{});}return next.coverage;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{console.log('Market snapshot refreshed:',await refreshTrade());}catch(e){console.error('Market refresh failed; previous snapshot retained:',(e as Error).message);process.exitCode=1;}
}

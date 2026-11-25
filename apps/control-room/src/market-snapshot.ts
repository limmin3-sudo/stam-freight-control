import type {MarketSnapshot} from './trade-data';

export const marketRefreshInterval=60*60*1000;

export function marketSnapshotLoader(fetchLatest:()=>Promise<MarketSnapshot>,fetchBundled:()=>Promise<MarketSnapshot>,now=Date.now){
 let current:MarketSnapshot|undefined,pending:Promise<MarketSnapshot>|undefined;
 let nextCheck=0;
 async function update(){
  let candidate:MarketSnapshot|undefined;
  try{candidate=await fetchLatest();}catch{/* Retry the feed while the saved prices remain available. */}
  const fresh=candidate&&now()-Date.parse(candidate.retrievedAt)<marketRefreshInterval;
  if(!current&&!fresh){
   try{current=await fetchBundled();}catch(error){if(!candidate)throw error;}
  }
  if(candidate&&(!current||Date.parse(candidate.retrievedAt)>Date.parse(current.retrievedAt)))current=candidate;
  if(!current)throw Error('Market snapshot unavailable');
  nextCheck=now()+(candidate?marketRefreshInterval:5*60*1000);
  return current;
 }
 return function load(){
  if(current&&now()<nextCheck)return Promise.resolve(current);
  return pending??=update().finally(()=>{pending=undefined;});
 };
}

// Recognises the game mission type of a contract from the Star Citizen Wiki hauling mission data
// (data/hauling-missions.json): same contractor, same set of commodities, each SCU within the mission's limit.
// The match gives the per-commodity maximum container size, which separates mission types that share the same
// commodities and SCU, and lets the planner assume worst-case (largest) boxes before the freight elevator.
const SIZES=[1,2,4,8,16,24,32];
export const norm=s=>String(s||'').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'');

export function prepareMissionDb(db,ko={}){
 const commodities=new Map(Object.entries(ko.commodities||{}).map(([k,v])=>[norm(k),norm(v)]));
 const companies=new Map(Object.entries(ko.companies||{}).map(([k,v])=>[norm(k),norm(v)]));
 const missions=(db?.missions||[]).map(m=>({...m,giverKey:norm(m.giver),orders:m.orders.map(([name,maxScu,maxBox])=>({key:norm(name),name,maxScu,maxBox}))}));
 return {version:db?.meta?.version||'',missions,commodities,companies};
}
const english=(map,name)=>{const k=norm(name);return map.get(k)||k;};
const sameGiver=(a,b)=>a===b||a.startsWith(b)||b.startsWith(a);
// Reputation rank named in the contract title (English words or the Korean client's 신입) breaks ties between
// variants with identical cargo, e.g. a rank-0 and a rank-1 Ling haul.
const RANKS=[[/trainee/i,0],[/rookie|신입/i,1],[/junior/i,2],[/member/i,3],[/experienced/i,4],[/senior/i,5],[/master/i,6]];
const rankHint=title=>RANKS.find(([re])=>re.test(String(title||'')))?.[1]??null;
// Haul size words (English client or Korean 소형/중형/대형) also separate e.g. a Small and a Medium Dead Saints haul.
const SIZE_WORDS=[[/small|소형|소량/i,'s'],[/medium|중형/i,'m'],[/large|bulk|대형/i,'l']];
const sizeHint=title=>SIZE_WORDS.find(([re])=>re.test(String(title||'')))?.[1]??null;

// Returns null when nothing fits, otherwise the best mission and, per commodity key, the largest container size
// any equally good candidate allows (so ties never under-estimate box size).
export function matchMission(m,prepared){
 if(!prepared?.missions?.length||!m?.cargo?.length)return null;
 const lines=m.cargo.map(c=>({key:english(prepared.commodities,c.commodity),scu:c.scu}));
 if(lines.some(l=>!l.key||!/[a-z0-9]/.test(l.key)))return null;// a Korean name without a known English match
 const giver=english(prepared.companies,m.company),giverKnown=/[a-z]/.test(giver);
 const wanted=new Set(lines.map(l=>l.key)),rank=rankHint(m.title),size=sizeHint(m.title),title=norm(m.title).replace(/\d+평판$/,'');let best=[],bestScore=-Infinity;
 for(const e of prepared.missions){
  if(giverKnown&&!sameGiver(e.giverKey,giver))continue;
  const have=new Set(e.orders.map(o=>o.key));if([...wanted].some(k=>!have.has(k)))continue;
  let fits=true,exact=0;
  for(const l of lines){const limits=e.orders.filter(o=>o.key===l.key).map(o=>o.maxScu).filter(Number.isFinite);const max=limits.length?Math.max(...limits):null;
   if(Number.isInteger(l.scu)&&max!==null&&l.scu>max){fits=false;break;}if(l.scu===max)exact++;}
  if(!fits)continue;
  const score=(giverKnown?100:0)+(have.size===wanted.size?40:0)-Math.abs(e.orders.length-lines.length)*3+exact*2+(rank!==null&&e.rank===rank?5:0)+(size&&sizeHint(e.title)===size?4:0)+(title&&norm(e.title)===title?30:0);
  if(score>bestScore){bestScore=score;best=[e];}else if(score===bestScore)best.push(e);
 }
 if(!best.length)return null;
 const maxBox={},signatures=new Set();
 for(const e of best){const sig={};for(const o of e.orders){if(!wanted.has(o.key))continue;sig[o.key]=Math.max(sig[o.key]??-Infinity,o.maxBox??-Infinity);}
  signatures.add(JSON.stringify(Object.entries(sig).sort()));for(const [k,v] of Object.entries(sig))maxBox[k]=Math.max(maxBox[k]??-Infinity,v);}
 const top=best[0];
 return {id:top.id,title:top.title,giver:top.giver,rank:top.rank,version:prepared.version,candidates:best.length,ambiguous:signatures.size>1,maxBox,commodityKey:c=>english(prepared.commodities,c)};
}

// Adds the matched mission and each commodity's container limit to a mission (values from an earlier match are
// replaced; a limit read from the contract itself is kept). Cryo pods (limit -1) are flagged, not given a box size.
export function enrichMission(m,prepared){
 const next=structuredClone(m);delete next._wiki;
 for(const c of next.cargo||[]){if(c._maxBoxSource==='wiki'){c.maxBoxSize=null;delete c._maxBoxSource;}if(c._special==='cryopod')delete c._special;}
 const match=matchMission(next,prepared);if(!match)return next;
 next._wiki={id:match.id,title:match.title,giver:match.giver,rank:match.rank,version:match.version,candidates:match.candidates,ambiguous:match.ambiguous};
 for(const c of next.cargo){const limit=match.maxBox[match.commodityKey(c.commodity)];
  if(limit===-1){c._special='cryopod';continue;}
  if(!c.maxBoxSize&&Number.isFinite(limit)){const size=[...SIZES].reverse().find(s=>s<=limit);if(size){c.maxBoxSize=size;c._maxBoxSource='wiki';}}}
 return next;
}

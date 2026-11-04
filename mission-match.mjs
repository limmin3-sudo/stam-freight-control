// Recognises the game mission type of a contract from the Star Citizen Wiki hauling mission data
// (data/hauling-missions.json): same contractor, same set of commodities, each SCU within the mission's limit.
// The match gives the per-commodity maximum container size, which separates mission types that share the same
// commodities and SCU, and lets the planner assume worst-case (largest) boxes before the freight elevator.
const SIZES=[1,2,4,8,16,24,32];
export const norm=s=>String(s||'').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'');

export function prepareMissionDb(db,ko={}){
 const commodities=new Map(Object.entries(ko.commodities||{}).map(([k,v])=>[norm(k),norm(v)]));
 // Korean name for an English commodity (first listed wins, so a real name beats a known misread listed later).
 const korean=new Map();for(const [k,v] of Object.entries(ko.commodities||{}))if(!korean.has(norm(v)))korean.set(norm(v),k);
 const companies=new Map(Object.entries(ko.companies||{}).map(([k,v])=>[norm(k),norm(v)]));
 const missions=(db?.missions||[]).map(m=>({...m,giverKey:norm(m.giver),orders:m.orders.map(([name,maxScu,maxBox])=>({key:norm(name),name,maxScu,maxBox}))}));
 return {version:db?.meta?.version||'',missions,commodities,companies,korean};
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
// any equally good candidate allows (so ties never under-estimate box size). A commodity name that matches nothing
// (a misread) is left open; when the contractor and the other goods settle the mission and exactly one of its
// commodities is left over, that commodity is returned in `fixes` as the corrected name.
export function matchMission(m,prepared){
 if(!prepared?.missions?.length||!m?.cargo?.length)return null;
 const all=new Set(prepared.missions.flatMap(e=>e.orders.map(o=>o.key)));
 const lines=m.cargo.map(c=>{const key=english(prepared.commodities,c.commodity);return {raw:c.commodity,key:all.has(key)?key:null,scu:c.scu,aggregate:c._allocation==='unresolved',weight:c._allocation==='unresolved'?Math.max(1,c.pickupIds?.length||1):1};});
 const open=lines.filter(l=>!l.key);if(open.length===lines.length||new Set(open.map(l=>norm(l.raw))).size>1)return null;// at most one unknown name
 const giver=english(prepared.companies,m.company),giverKnown=/[a-z]/.test(giver);
 const wanted=new Set(lines.filter(l=>l.key).map(l=>l.key)),rank=rankHint(m.title),size=sizeHint(m.title),title=norm(m.title).replace(/\d+평판$/,'');let best=[],bestScore=-Infinity;
 for(const e of prepared.missions){
  if(giverKnown&&!sameGiver(e.giverKey,giver))continue;
  const have=new Set(e.orders.map(o=>o.key));if([...wanted].some(k=>!have.has(k)))continue;
  const spare=e.orders.filter(o=>!wanted.has(o.key));if(open.length&&!open.every(l=>spare.some(o=>!Number.isFinite(o.maxScu)||!Number.isInteger(l.scu)||l.scu<=o.maxScu)))continue;
  let fits=true,exact=0;
  for(const l of lines.filter(l=>l.key)){const limits=e.orders.filter(o=>o.key===l.key).map(o=>o.maxScu).filter(Number.isFinite);const max=limits.length?(l.aggregate?limits.reduce((n,v)=>n+v,0):Math.max(...limits)):null;
   if(Number.isInteger(l.scu)&&max!==null&&l.scu>max){fits=false;break;}if(l.scu===max)exact++;}
  if(!fits)continue;
  const score=(giverKnown?100:0)+(have.size===wanted.size+(open.length?1:0)?40:0)-Math.abs(e.orders.length-lines.reduce((n,l)=>n+l.weight,0))*3+exact*2+(rank!==null&&e.rank===rank?5:0)+(size&&sizeHint(e.title)===size?4:0)+(title&&norm(e.title)===title?30:0);
  if(score>bestScore){bestScore=score;best=[e];}else if(score===bestScore)best.push(e);
 }
 if(!best.length)return null;
 // The leftover commodity of the matched mission names a misread line, if all equal candidates agree on it.
 const fixes={};if(open.length){const left=new Set(best.flatMap(e=>e.orders.filter(o=>!wanted.has(o.key)).map(o=>o.key)));
  if(left.size===1){const key=[...left][0],name=best[0].orders.find(o=>o.key===key).name;fixes[norm(open[0].raw)]={key,name,korean:prepared.korean?.get(key)||null};wanted.add(key);}else return null;}
 const maxBox={},signatures=new Set();
 for(const e of best){const sig={};for(const o of e.orders){if(!wanted.has(o.key))continue;sig[o.key]=Math.max(sig[o.key]??-Infinity,o.maxBox??-Infinity);}
  signatures.add(JSON.stringify(Object.entries(sig).sort()));for(const [k,v] of Object.entries(sig))maxBox[k]=Math.max(maxBox[k]??-Infinity,v);}
 const top=best[0];
 const entityOrders=(top.entityOrders||[]).filter(o=>best.every(e=>(e.entityOrders||[]).some(x=>norm(x.name)===norm(o.name)&&x.maxAmount===o.maxAmount&&x.minAmount===o.minAmount&&x.reportedVolumeScu===o.reportedVolumeScu)));
 return {id:top.id,title:top.title,giver:top.giver,rank:top.rank,version:prepared.version,candidates:best.length,ambiguous:signatures.size>1,maxBox,entityOrders,fixes,commodityKey:c=>fixes[norm(c)]?.key||english(prepared.commodities,c)};
}

// Adds the matched mission and each commodity's container limit to a mission (values from an earlier match are
// replaced; a limit read from the contract itself is kept). Cryopods use the confirmed half-height profile;
// other special items (limit -1) remain explicitly unknown.
// `namesOnly` (Korean mode, where mission types are not shown yet) applies only the misread-name corrections.
// `korean` writes corrected names in Korean when the Korean name is known, otherwise in English.
export function enrichMission(m,prepared,{namesOnly=false,korean=false}={}){
 if(m._logImport||!prepared?.missions?.length)return structuredClone(m);
 const next=structuredClone(m);delete next._wiki;delete next._nameFixes;
 for(const c of next.cargo||[]){if(['wiki','pod-profile'].includes(c._maxBoxSource)){c.maxBoxSize=null;delete c._maxBoxSource;}if(['cryopod','unknown'].includes(c._special))delete c._special;if(c._boxesOrigin==='pod-profile'){c.boxes=[];c._boxesOrigin='unknown';delete c._cargoShape;delete c._entityCount;delete c._entity;}}
 const match=matchMission(next,prepared);if(!match)return next;
 const fixed=[];for(const c of next.cargo){const f=match.fixes[norm(c.commodity)];if(f&&(!korean||f.korean)){const name=korean?f.korean:f.name;fixed.push([c.commodity,name]);c._fixedFrom=c.commodity;c.commodity=name;}}
 if(fixed.length)next._nameFixes=[...new Map(fixed.map(p=>[p.join('>'),p])).values()];
 if(namesOnly)return next;
 next._wiki={id:match.id,title:match.title,giver:match.giver,rank:match.rank,version:match.version,candidates:match.candidates,ambiguous:match.ambiguous};
 for(const c of next.cargo){const limit=match.maxBox[match.commodityKey(c.commodity)];
  const entity=match.entityOrders.find(o=>norm(o.name)===match.commodityKey(c.commodity));
  if(match.commodityKey(c.commodity)==='cryopod'){
   // Confirmed cargo rule: one pod is 1 SCU, with a 2-cell footprint and half
   // height. Two stacked pods occupy a standard 2 SCU container envelope.
   // The API item volume is envelope metadata, not the mission's SCU per pod.
   c._cargoShape='cryopod';c._entityCount=c.scu;c._entity={...entity,unitScu:1};
   c.boxes=[{size:1,count:c.scu}];c._boxesOrigin='pod-profile';c.maxBoxSize=1;c._maxBoxSource='pod-profile';delete c._special;continue;
  }
  if(limit===-1){c._special='unknown';continue;}
  if(!c.maxBoxSize&&Number.isFinite(limit)){const size=[...SIZES].reverse().find(s=>s<=limit);if(size){c.maxBoxSize=size;c._maxBoxSource='wiki';}}}
 return next;
}

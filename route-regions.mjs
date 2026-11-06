// A planning region follows the outer planet's hierarchy. Star-parented stops
// use the nearest planet centre; that is proximity, not an asserted game orbit.
export function routeRegions(data){
 const byId=new Map(data.locations.map(l=>[l.id,l])),roots=new Map(),result=new Map();
 const parentRegion=location=>{let at=location,root=null;const seen=new Set();while(at&&!seen.has(at.id)){seen.add(at.id);if(at.type==='Planet')root=at;else if(at.type==='Moon'&&!root)root=at;at=byId.get(at.parentId);}return root;};
 for(const l of data.locations){const root=parentRegion(l);if(root)roots.set(root.id,root);}
 for(const l of data.locations){if(l.routeRegionId){result.set(l.id,{id:l.routeRegionId,label:l.routeRegionName||l.routeRegionId,basis:'explicit'});continue;}let root=parentRegion(l),basis='parent';
  if(!root){const nearby=[...roots.values()].filter(p=>p.system===l.system&&p.position?.length===3&&l.position?.length===3).map(p=>({p,d:Math.hypot(...p.position.map((v,i)=>v-l.position[i]))})).sort((a,b)=>a.d-b.d);root=nearby[0]?.p;basis='nearby';}
  result.set(l.id,root?{id:root.id,label:root.name,basis}:{id:l.system,label:l.system,basis:'system'});
 }return result;
}
export const regionKey=(nav,id)=>nav.regionOf?.(id)||nav.byId?.get(id)?.routeRegionId||nav.byId?.get(id)?.system||'unknown';
export function regionStep(nav,state,to){const from=regionKey(nav,state.at),next=regionKey(nav,to),visited=state.visitedRegions||new Set([from]);return {visitedRegions:new Set([...visited,next]),regionRevisits:(state.regionRevisits||0)+Number(next!==from&&visited.has(next))};}

export function transferKind(byId,regions,from,to){
 if(from===to)return 'same-location';const a=byId.get(from),b=byId.get(to);if(a?.system!==b?.system)return 'other-system';
 const body=id=>{let at=byId.get(id);const seen=new Set();while(at&&!seen.has(at.id)){seen.add(at.id);if(at.type==='Moon'||at.type==='Planet')return at.id;at=byId.get(at.parentId);}return regions.get(id)?.id;};
 return body(from)===body(to)?'same-body':regions.get(from)?.id===regions.get(to)?.id?'same-region':'other-region';
}

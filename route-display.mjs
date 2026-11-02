export function mapLocationName(location){
 const name=location?.name||'';
 return name.match(/^(?:MIC|ARC|HUR|CRU)-L\d+\b/i)?.[0].toUpperCase()||name;
}

// One grouped transit per actual system crossing; cargo stop indices stay intact.
export function jumpSegments(leg,byId){
 const nodes=(leg?.nodes||[]).map(id=>byId.get(id)).filter(Boolean),result=[];
 const gateway=l=>/Gateway/i.test(l.name)&&/Manmade/.test(l.type);
 for(let i=1;i<nodes.length;i++){
  const from=nodes[i-1],to=nodes[i];if(from.system===to.system)continue;
  const entry=nodes.slice(0,i).reverse().find(l=>l.system===from.system&&gateway(l))||from;
  const exit=nodes.slice(i).find(l=>l.system===to.system&&gateway(l))||to;
  result.push({fromSystem:from.system,toSystem:to.system,entryId:entry.id,exitId:exit.id,entryName:entry.name,exitName:exit.name});
 }
 return result;
}

export function activeSystemLinks(route,byId){
 const links=new Set();
 for(const visit of route?.visits||[])for(const jump of jumpSegments(visit.leg,byId))links.add([jump.fromSystem,jump.toSystem].sort().join('|'));
 return links;
}

// Shared step numbering for the run panel, itinerary and map: every system jump is its own numbered step placed
// before the stop it leads to (stops 1-9, jump 10, Bueno Ravine 11 …). Visit indices themselves never change.
export function stepNumbers(visits,byId){
 let n=0;const stop=[],jumps=[];
 for(const visit of visits||[]){jumps.push(jumpSegments(visit.leg,byId).map(()=>++n));stop.push(++n);}
 return {stop,jumps,total:n};
}

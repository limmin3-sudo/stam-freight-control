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

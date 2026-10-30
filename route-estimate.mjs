// A lower-bound lookahead for the bounded, capacity-aware fallback. Every remaining
// stop must be reached; a minimum spanning tree plus the nearest entry is optimistic.
export function remainingTravelEstimate(shipments,nav){
 const ids=[...new Set(shipments.flatMap(s=>[s.pickupId,s.dropoffId]))],index=new Map(ids.map((id,i)=>[id,i])),trees=new Map();
 const edge=(a,b)=>Math.min(nav.path(a,b).seconds,nav.path(b,a).seconds);
 return (status,at)=>{
  let mask=0n;const needed=new Set();shipments.forEach((s,i)=>{if(status[i]===0)needed.add(s.pickupId);if(status[i]<2)needed.add(s.dropoffId);});
  if(!needed.size)return 0;for(const id of needed)mask|=1n<<BigInt(index.get(id));
  let tree=trees.get(mask);if(tree===undefined){
   const left=[...needed],dist=left.map(()=>Infinity);dist[0]=0;tree=0;
   while(left.length){let best=0;for(let i=1;i<left.length;i++)if(dist[i]<dist[best])best=i;tree+=dist[best];const [from]=left.splice(best,1);dist.splice(best,1);for(let i=0;i<left.length;i++)dist[i]=Math.min(dist[i],edge(from,left[i]));}
   if(trees.size>=20000)trees.clear();trees.set(mask,tree);
  }
  return tree+Math.min(...[...needed].map(id=>nav.path(at,id).seconds));
 };
}

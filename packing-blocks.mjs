// Hull B's touching grid pairs form physical blocks. Reserve whole blocks per
// destination so small containers do not spill into another destination's block.
const bounds=ship=>ship.grids.map(g=>{const w=g._world||g;return [[w.x,w.x+w.w],[w.y,w.y+w.h],[g.z,g.z+g.l]];});
const gap=(a,b)=>Math.hypot(...a.map(([a0,a1],k)=>Math.max(0,b[k][0]-a1,a0-b[k][1])));
export function cargoBlocks(ship){
 const boxes=bounds(ship),left=new Set([...boxes.keys()].filter(i=>!ship.grids[i].disabled)),blocks=[];
 while(left.size){const first=left.values().next().value,block=[first];left.delete(first);for(let i=0;i<block.length;i++)for(const j of left)if(gap(boxes[block[i]],boxes[j])<1e-8){left.delete(j);block.push(j);}blocks.push(block);}
 return blocks;
}
export function destinationBlockZones(ship,groups,fixed=[]){
 const blocks=cargoBlocks(ship),boxes=bounds(ship),centers=blocks.map(ids=>[0,1,2].map(k=>(Math.min(...ids.map(i=>boxes[i][k][0]))+Math.max(...ids.map(i=>boxes[i][k][1])))/2));
 const mid=(Math.min(...boxes.map(b=>b[0][0]))+Math.max(...boxes.map(b=>b[0][1])))/2;
 const side=centers.map(c=>Math.sign(c[0]-mid)),capacity=blocks.map(ids=>ids.reduce((n,i)=>n+ship.grids[i].w*ship.grids[i].h*ship.grids[i].l,0));
 const owner=new Map(),used=new Map(),byDest=new Map();
 for(const b of fixed){const block=blocks.findIndex(ids=>ids.includes(b.bin));if(block<0)return null;if(owner.has(block)&&owner.get(block)!==b.dropoffId)return null;owner.set(block,b.dropoffId);used.set(block,(used.get(block)||0)+b.size);}
 for(const {items} of groups)for(const b of items)byDest.set(b.dropoffId,(byDest.get(b.dropoffId)||0)+b.size);
 const cost=ids=>{let diameter=0;for(const a of ids)for(const b of ids)diameter=Math.max(diameter,Math.hypot(...centers[a].map((v,k)=>v-centers[b][k])));const middleZ=(Math.min(...centers.map(c=>c[2]))+Math.max(...centers.map(c=>c[2])))/2,middleY=(Math.min(...centers.map(c=>c[1]))+Math.max(...centers.map(c=>c[1])))/2;return (new Set(ids.map(i=>side[i])).size-1)*10000+(new Set(ids.map(i=>side[i]+':'+Math.sign(centers[i][2]-middleZ))).size-1)*1000+(new Set(ids.map(i=>side[i]+':'+Math.sign(centers[i][2]-middleZ)+':'+Math.sign(centers[i][1]-middleY))).size-1)*100+diameter;};
 for(const [dest,scu] of [...byDest].sort((a,b)=>b[1]-a[1])){
  const own=[...owner].filter(([,d])=>d===dest).map(([i])=>i),free=blocks.map((_,i)=>i).filter(i=>!owner.has(i));let best=null;
  for(const anchor of own.length?[null]:free){const ids=[...own];if(anchor!==null)ids.push(anchor);
   let room=ids.reduce((n,i)=>n+capacity[i]-(used.get(i)||0),0);
   while(room<scu){const next=free.filter(i=>!ids.includes(i)).sort((a,b)=>cost([...ids,a])-cost([...ids,b])||a-b)[0];if(next===undefined)break;ids.push(next);room+=capacity[next];}
   if(room<scu)continue;const score=cost(ids);if(!best||score<best.score)best={ids,score};
  }
  if(!best)return null;for(const i of best.ids)owner.set(i,dest);
 }
 const zones=new Map();for(const [i,dest] of owner)for(const bin of blocks[i])(zones.get(dest)||zones.set(dest,new Set()).get(dest)).add(bin);return zones;
}

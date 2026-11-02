// Shared presentation of actual and assumed containers. Never treats a size limit as a confirmed layout.
const SIZES=[32,24,16,8,4,2,1];
export function containerCounts(boxes=[]){const counts=new Map();for(const b of boxes){const size=typeof b==='number'?b:b.size,count=typeof b==='number'?1:(b.count??1);if(SIZES.includes(size)&&Number.isInteger(count)&&count>0)counts.set(size,(counts.get(size)||0)+count);}return [...counts].sort((a,b)=>b[0]-a[0]).map(([size,count])=>({size,count}));}
export function containerText(boxes=[]){return containerCounts(boxes).map(b=>`${b.size} SCU × ${b.count}`).join(' + ');}
const total=boxes=>boxes.reduce((n,b)=>n+b.size*b.count,0);
export function groupConfiguration(m,g,unknownBox=8){
 const saved=m.destinationBoxes?.find(d=>d.pickupId===g.pickupId&&d.dropoffId===g.dropoffId);
 if(saved?.boxes?.length)return {boxes:saved.boxes,estimated:false,origin:saved.origin||'manual',valid:total(saved.boxes)===g.scu};
 if(g.cargo.some(c=>!Number.isInteger(c.scu)||c.scu<1||c.scu>10000))return {boxes:[],estimated:true,origin:'unavailable',valid:false};
 let estimated=false;const all=[];
 for(const c of g.cargo){if(c.boxes?.length){all.push(...c.boxes);continue;}estimated=true;let remaining=c.scu;const limit=SIZES.includes(c.maxBoxSize)?(c._maxBoxSource==='wiki'?c.maxBoxSize:Math.min(c.maxBoxSize,unknownBox)):unknownBox;
  for(const size of SIZES.filter(s=>s<=limit)){const count=Math.floor(remaining/size);if(count)all.push({size,count});remaining-=size*count;}}
 const boxes=containerCounts(all);return {boxes,estimated,origin:estimated?'estimate':'cargo',special:g.cargo.some(c=>c._special),valid:total(boxes)===g.scu};
}

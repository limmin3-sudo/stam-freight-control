// Spread labels in screen space without moving the underlying cargo or grids.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function placeCargoLabels(labels,width,height,gap=4){
 const occupied=[],out=[];for(const label of [...labels].sort((a,b)=>(a.priority||0)-(b.priority||0)||a.y-b.y||String(a.id).localeCompare(String(b.id)))){
  const w=Math.min(label.width,Math.max(1,width-16)),h=label.height,minX=8+w/2,maxX=width-8-w/2,minY=28+h/2,maxY=height-36-h/2;
  const candidates=[];for(let row=0;row<=Math.ceil(height/(h+gap));row++){for(const sign of row?[-1,1]:[0])for(const dx of [0,-w-gap,w+gap]){const x=clamp(label.x+dx,minX,maxX),y=clamp(label.y+sign*row*(h+gap),minY,maxY),rect={left:x-w/2,right:x+w/2,top:y-h/2,bottom:y+h/2};let overlap=0;for(const r of occupied){const ix=Math.max(0,Math.min(rect.right,r.right+gap)-Math.max(rect.left,r.left-gap)),iy=Math.max(0,Math.min(rect.bottom,r.bottom+gap)-Math.max(rect.top,r.top-gap));overlap+=ix*iy;}candidates.push({x,y,rect,overlap,distance:(x-label.x)**2+(y-label.y)**2});}}
  const best=candidates.sort((a,b)=>a.overlap-b.overlap||a.distance-b.distance)[0];if(!best)continue;occupied.push(best.rect);out.push({...label,x:best.x,y:best.y});
 }return out;
}

// Only accepted receipts with missing operational information need a screen.
export function missingFields(job){
 if(!['incomplete','ready'].includes(job.state))return [];
 const rows=job.shipments;
 return [
  ['pickup',r=>!r.from],['destination',r=>!r.to],
  ['cargo',r=>!r.cargo.some(Boolean)],['quantity',r=>!r.scu&&!job.reservations?.[r.to]]
 ].filter(([,missing])=>!rows.length||rows.some(missing)).map(([field])=>field);
}

// Each tap wakes exactly one already-armed reader. A late/reconnected tab
// must never process a tap made on an earlier game screen.
export function contractReadAssist(notify=()=>{}){
 const waiting=new Set(),announced=new Set();
 let busyUntil=0,sequence=0;
 function wait(onTap){
  waiting.add(onTap);
  return ()=>waiting.delete(onTap);
 }
 function tap(){
  if(Date.now()<busyUntil){notify({code:'busy'});return;}
  const listener=waiting.values().next().value;
  if(!listener){notify({code:'setup'});return;}
  waiting.delete(listener);busyUntil=Date.now()+90000;
  listener(++sequence);
 }
 function feedback(packet){
  if(!Number.isSafeInteger(packet.read)||packet.read!==sequence||!busyUntil)return;
  if(!['complete','partial','choose','unreadable','error','cancel'].includes(packet.code))throw Error('invalid');
  busyUntil=0;
  if(packet.code!=='cancel')notify({code:packet.code,...(typeof packet.details==='string'?{details:packet.details.slice(0,160)}:{}),destination:typeof packet.destination==='string'?packet.destination.slice(0,80):''});
 }
 function review(jobs){
  const pending=jobs.filter(job=>missingFields(job).length);
  const active=new Set(pending.map(j=>j.id));
  for(const id of announced)if(!active.has(id))announced.delete(id);
  const fresh=pending.filter(j=>!announced.has(j.id));
  if(!fresh.length)return;
  for(const j of fresh)announced.add(j.id);
  notify({code:'missing',count:fresh.length,fields:[...new Set(fresh.flatMap(missingFields))],armed:waiting.size>0||Date.now()<busyUntil});
 }
 return {wait,tap,feedback,review};
}

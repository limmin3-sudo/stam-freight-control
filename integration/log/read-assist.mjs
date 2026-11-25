// Only accepted receipts with missing operational information need a screen.
export function missingFields(job){
 if(!['incomplete','ready'].includes(job.state))return [];
 const rows=job.shipments;
 return [
  ['pickup',r=>!r.from],['destination',r=>!r.to],
  ['cargo',r=>!r.cargo.some(Boolean)],['quantity',r=>!r.scu&&!job.reservations?.[r.to]]
 ].filter(([,missing])=>!rows.length||rows.some(missing)).map(([field])=>field);
}

export function receiptCategory(job){
 const title=(job.title||[]).join(' ');
 if(job.directEvidence?.cargo||job.singleDeliveryScu||job.hints?.length||
    job.shipments.some(row=>row.cargo.some(Boolean)||row.scu>0)||
    /\bhaul(?:ing|er)?\b|freight|deliver(?:y|ies)|cargo (?:transport|run)|shipment|운송|배송|배달/.test(title.toLowerCase()))return 'freight';
 if(/combat (?:training|assistance)|bounty (?:hunt|assessment)|eliminate (?:the |hostile)|destroy (?:the |enemy)|전투 (?:실전)?훈련|현상금 사냥/i.test(title))return 'other';
 return job.referenceInfo?.freightDefinitionId?'freight':'unknown';
}
function hasRoute(job){
 const stops=job.observedStops;
 return job.shipments.length>0&&job.shipments.every(row=>row.from&&row.to)||
  !!(stops?.pickup?.length&&stops.dropoff?.length&&[...stops.pickup,...stops.dropoff].every(Boolean)&&new Set([...stops.pickup,...stops.dropoff]).size>1);
}
export function cardDescription(job,english){
 const index=english?1:0;
 const row=job.shipments.find(row=>row.cargo.some(Boolean));
 const item=row&&(row.cargo[index]||row.cargo.find(Boolean));
 const title=job.title?.[index]||job.title?.find(Boolean)||'';
 return [title,item&&[item,row.scu>0?row.scu+' SCU':''].filter(Boolean).join(' ')].filter(Boolean).join(' · ').slice(0,160);
}

// Each tap wakes exactly one already-armed reader. A late/reconnected tab
// must never process a tap made on an earlier game screen.
export function contractReadAssist(notify=()=>{}){
 const waiting=new Set(),announced=new Set();
 let busyUntil=0,sequence=0,lastBatch='';
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
  const pending=jobs.filter(job=>receiptCategory(job)==='freight'&&!hasRoute(job)&&missingFields(job).length);
  const active=new Set(pending.map(j=>j.id));
  for(const id of announced)if(!active.has(id))announced.delete(id);
  const batch=JSON.stringify(pending.map(j=>[j.id,missingFields(j)]));
  if(batch===lastBatch)return;
  lastBatch=batch;
  const job=pending.find(j=>!announced.has(j.id));
  if(!job)return;
  announced.add(job.id);
  notify({code:'missing',count:pending.length,id:job.id,fields:missingFields(job),labelKo:cardDescription(job,false),labelEn:cardDescription(job,true),armed:armed()});
 }
 function armed(){return waiting.size>0||Date.now()<busyUntil;}
 return {wait,tap,feedback,review,armed};
}

// Screen observations are hints only. They never enter LogEvidence or cargo plans.
const titleKey=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim().replace(/[:：]\s*$/,'');
export function screenSignal(text,mode='notification',confidence=0){
 if(typeof text!=='string'||text.length>6000||confidence<65)return null;
 if(mode==='list'){
  const m=text.match(/(?:Accepted|Active|In\s*Progress|진행\s*중|수락한\s*계약)\s*\(?\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\)?/i);
  if(!m||+m[1]>+m[2]||+m[2]>99)return null;
  return {kind:'count',count:+m[1]};
 }
 const m=text.match(/(?:Contract\s+Accepted|계약\s*수락|미션\s*수락)\s*[:：]\s*([^\r\n]{3,240})/i);
 return m?{kind:'accepted',title:m[1].trim()}:null;
}
export function createScreenEvidence(){
 let notices=[],visible='',baseline=null,sequence=0,logs=[];
 const accepted=s=>[...(s?.contracts||[]),...(s?.pendingContracts||[])].filter(c=>c.acceptanceObservations?.length&&c.title&&Number.isFinite(Date.parse(c.acceptedAt)));
 function update(snapshot){logs=snapshot?.identity?.mixedPlayers?[]:accepted(snapshot);}
 function observe(signal,now){
  const key=signal?.kind==='accepted'?'title:'+titleKey(signal.title):signal?.kind==='count'?'count:'+signal.count:'';
  if(!key){visible='';return;}
  if(key===visible)return;visible=key;
  if(signal.kind==='count'){
   if(!baseline){baseline={count:signal.count,at:now};return;}
   if(signal.count<=baseline.count){baseline={count:signal.count,at:now};return;}
   notices.push({id:++sequence,kind:'count',count:signal.count-baseline.count,from:baseline.at,at:now});
   baseline={count:signal.count,at:now};
  }else notices.push({id:++sequence,kind:'accepted',title:signal.title,at:now});
  notices=notices.slice(-30);
 }
 function rows(now){
  const candidates=n=>logs.filter(c=>titleKey(c.title)===titleKey(n.title)&&Math.abs(Date.parse(c.acceptedAt)-n.at)<=30000);
  return notices.map(n=>{
   if(n.kind==='count')return {...n,status:'count-only',logCount:new Set(logs.filter(c=>Date.parse(c.acceptedAt)>=n.from&&Date.parse(c.acceptedAt)<=n.at+30000).map(c=>c.missionId)).size};
   const matches=candidates(n),unique=matches.length===1&&notices.filter(o=>o.kind==='accepted'&&candidates(o).some(c=>c.missionId===matches[0].missionId)).length===1;
   // A title OCR error must not turn an observed acceptance into "missed".
   // Time proximity alone is insufficient for identity: keep it unlinked.
   const nearby=logs.some(c=>Math.abs(Date.parse(c.acceptedAt)-n.at)<=30000);
   return {...n,status:unique?'corroborated':matches.length?'ambiguous':nearby?'log-observed':now-n.at<15000?'waiting':'unmatched'};
  });
 }
 return {observe,update,rows,dismiss:id=>{notices=notices.filter(n=>n.id!==id);},reset:()=>{notices=[];visible='';baseline=null;logs=[];}};
}

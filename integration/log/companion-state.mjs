// The overlay gets a short-lived display copy, never the ledger or account token.
const commands=new Set(['open-trade','open-flight','show-prices','show-my-work','toggle-overlay']);
const fail=code=>{throw Error(code);};
const text=(v,max)=>typeof v==='string'&&v.length<=max&&!/[\u0000-\u0008\u000b-\u001f]/.test(v)?v:fail('invalid-display');
export function createCompanionState({clock=Date.now,onCommand}={}){
 let session='',sequence=-1,receivedAt=0,display=null,queue=[],commandSequence=0;
 const current=()=>{if(clock()-receivedAt>10000){session='';display=null;queue=[];}return display;};
 function publish(value){
  current();if(!value||!/^[-\w]{16,100}$/.test(value.session||'')||!Number.isSafeInteger(value.sequence)||value.sequence<0)fail('invalid-display');
  if(session&&value.session!==session)fail('display-in-use');
  if(session===value.session&&value.sequence<=sequence)fail('stale-display');
  if(value.clear){session='';sequence=-1;display=null;queue=[];return {accepted:true};}
  const d=value.display;if(!d||!['personal','fleet','flight'].includes(d.mode)||!Array.isArray(d.lines)||d.lines.length>6)fail('invalid-display');
  const next={mode:d.mode,title:text(d.title,100),lines:d.lines.map(v=>text(v,180)),at:clock()};
  if(d.mode==='flight'&&d.inbox){
   const v=d.inbox;
   if(!/^[a-f0-9-]{36}$/.test(v.id)||!['','add','plan','start'].includes(v.action)||!Array.isArray(v.options)||v.options.length>100)fail('invalid-inbox');
   next.inbox={id:v.id,label:text(v.label,180),action:v.action,options:v.options.map(s=>text(s,160))};
  }
  if(d.switchable===true)next.switchable=true;
  if(d.mode==='personal'&&d.tradeAction){
   const a=d.tradeAction;
   if(!/^[a-f0-9-]{36}$/.test(a.id)||!['','buy','sell','depart','arrive','buyer','start'].includes(a.action)||!Array.isArray(a.buyers)||a.buyers.length>8)fail('invalid-trade-action');
   const list=rows=>{
    if(!Array.isArray(rows)||rows.length>128)fail('invalid-trade-action');
    return rows.map(r=>{
     if(!Number.isSafeInteger(r?.qty)||r.qty<=0||![1,2,4,8,16,24,32].includes(r.box))fail('invalid-trade-row');
     return {label:text(r.label,100),qty:r.qty,box:r.box,...(Number.isSafeInteger(r.suggested)&&r.suggested>0&&r.suggested<=r.qty&&r.suggested%r.box===0?{suggested:r.suggested}:{})};
    });
   };
   next.tradeAction={...(a.remaining>0&&Number.isSafeInteger(a.remaining)&&a.remaining===a.sell?.[0]?.qty?{remaining:a.remaining}:{}),id:a.id,prev:a.prev===true,next:a.next===true,action:a.action,buy:list(a.buy),sell:list(a.sell),buyers:a.buyers.map(s=>text(s,160))};
  }
  if(d.mode==='flight'&&d.navigation){
   const n=d.navigation;
   if(!Array.isArray(n.cargo)||n.cargo.length>128||!Array.isArray(n.route)||n.route.length>3||
      !Number.isSafeInteger(n.extra)||n.extra<0||typeof n.finished!=='boolean')fail('invalid-navigation');
   const cargo=n.cargo.map(row=>{
    if(!row||!['pickup','delivery'].includes(row.action)||row.scu!==null&&(!Number.isFinite(row.scu)||row.scu<0))fail('invalid-navigation');
    return {item:text(row.item,100),action:row.action,scu:row.scu};
   });
   next.navigation={destination:text(n.destination,100),ship:text(n.ship,100),shipArt:/^[a-z0-9-]+\.jpg$/.test(n.shipArt)?n.shipArt:'',
    cargo,route:n.route.map(v=>text(v,100)),extra:n.extra,finished:n.finished};
   if(Number.isSafeInteger(n.visitCount)&&Number.isSafeInteger(n.visitNumber)&&n.visitNumber>0&&n.visitNumber<=n.visitCount){
    next.navigation.visitCount=n.visitCount;next.navigation.visitNumber=n.visitNumber;
   }
  }
  if(d.partner==='operator'||d.partner==='navigator')next.partner=d.partner;
  if(d.mode==='flight'&&typeof d.stepId==='string'&&/^[0-9a-f-]{36}$/.test(d.stepId)&&['departure','pickup','delivery','jump','stop'].includes(d.step)){
   next.stepId=d.stepId;next.step=d.step;
  }
  if(d.copilot===true){
   next.copilot=true;
   if(d.rideChat===true)next.rideChat=true;
   if(typeof d.receiptView==='string'&&/^[a-f0-9-]{36}$/.test(d.receiptView)){
    next.receiptView=d.receiptView;
    if(Array.isArray(d.receiptHints))next.receiptHints=d.receiptHints.slice(0,48).filter(v=>typeof v==='string'&&/^[1-9][0-9]{0,2}\|[가-힣 ]{2,28}\|[가-힣 ]{2,28}$/u.test(v));
    next.receiptFollowup=d.receiptFollowup===true;
    const place=d.placePrompt;
    if(next.receiptFollowup&&place&&typeof place.id==='string'&&/^[a-f0-9-]{36}$/.test(place.id)&&
       Array.isArray(place.names)&&place.names.length>=2&&place.names.length<=12&&new Set(place.names).size===place.names.length&&
       place.names.every(n=>typeof n==='string'&&/^[가-힣 ]{2,32}$/.test(n)))next.placePrompt={id:place.id,names:[...place.names]};
    if(d.receiptReview===true)next.receiptReview=true;
    if(next.receiptReview&&next.receiptFollowup&&typeof d.quantityPrompt==='string'&&/^[a-f0-9-]{36}$/.test(d.quantityPrompt))next.quantityPrompt=d.quantityPrompt;
   }
   if(d.awaitingDetails===true)next.awaitingDetails=true;
   if(typeof d.proposal==='string'&&/^[a-f0-9-]{36}$/.test(d.proposal))next.proposal=d.proposal;
   if(next.proposal&&d.receiptReadback===true)next.receiptReadback=true;
   if(next.proposal&&d.proposalText!==undefined)next.proposalText=text(d.proposalText,210);
  }
  if(d.guidance){
   next.guidance={};
   for(const key of ['task','destination','afterLoad','load','cash','profit']){
    if(typeof d.guidance[key]==='string')next.guidance[key]=text(d.guidance[key],220);
   }
  }
  if(d.answer&&Number.isSafeInteger(d.answer.id)&&d.answer.id>0)next.answer={id:d.answer.id,text:text(d.answer.text,240)};
  session=value.session;sequence=value.sequence;receivedAt=clock();display=next;return {accepted:true};
 }
 return {publish,snapshot:()=>current(),
  enqueue(command){
   const d=current(),flight=typeof command==='string'&&command.startsWith('complete-flight:');
   const quote=typeof command==='string'&&/^quote-(buy|sell):[1-9][0-9]{0,8}(:[1-9][0-9]{0,5})?$/.test(command);
   const speech=typeof command==='string'&&/^copilot-say:[^\x00-\x1f\x7f]{1,160}$/u.test(command);
   const receipt=typeof command==='string'&&/^receipt-say:([a-f0-9-]{36}):[^\x00-\x1f\x7f]{1,160}$/u.exec(command);
   if(receipt&&!d?.copilot)return false;
   const place=typeof command==='string'&&/^receipt-place:([a-f0-9-]{36}):(?:(?:heard|review):([1-9]\d?)|reply:([^\x00-\x1f\x7f]{1,48}))$/u.exec(command);
   if(place&&(!d?.placePrompt||place[1]!==d.placePrompt.id||Number(place[2])>d.placePrompt.names.length||queue.some(x=>x.command.startsWith('receipt-place:'+place[1]+':'))))return false;
   const estimate=typeof command==='string'&&/^receipt-review:([a-f0-9-]{36}):([^\x00-\x1f\x7f]{1,160})$/u.exec(command);
   if(estimate){
    const stamp=/^[1-9]\d?$/.test(estimate[2])?d?.quantityPrompt:d?.receiptView;
    if(!d?.receiptReview||estimate[1]!==stamp||queue.some(x=>x.command===command))return false;
   }
   const amendment=typeof command==='string'&&/^receipt-amend:([a-f0-9-]{36}):[^\x00-\x1f\x7f]{1,158}$/u.exec(command);
   if(amendment&&(!d?.receiptReadback||amendment[1]!==d.proposal))return false;
   const decision=typeof command==='string'&&/^copilot-(apply|cancel):[a-f0-9-]{36}$/.test(command);
   if(speech&&/^(?:적용해줘|적용해|적용|확정해|확정|confirm|apply)[.!? ]*$/i.test(command.slice(12).trim()))return false;
   if(speech&&d?.receiptReadback&&/^(?:(?:맞아|맞아요|맞습니다|정확해|correct|yes)[.!? ]*$|아니|정정|no\b|correction\b)/i.test(command.slice(12).trim()))return false;
   if((speech||decision)&&!d?.copilot)return false;
   if(decision&&(command.split(':')[1]!==d.proposal||queue.some(x=>x.command===command)))return false;
   if(quote&&(!d||d.mode==='flight'&&!d.copilot))return false;
   const modeSwitch=command==='mode-flight'||command==='mode-trade';
   if(modeSwitch&&!d?.switchable)return false;
   const trade=typeof command==='string'&&/^trade-action:([a-f0-9-]{36}):(?:(start|depart|arrive|dismiss|next|prev)|(buyer|compare):(\d{1,3})|(buy|sell):(\d{1,3}):([1-9]\d{0,5}):([0-9]{1,12}(?:\.\d{1,2})?):(1|2|4|8|16|24|32))$/.exec(command);
   if(trade){
    const a=d?.tradeAction;
    if(!a||a.id!==trade[1]||d.proposal||queue.some(x=>x.command===command))return false;
    if(trade[2]&&!(trade[2]==='next'||trade[2]==='prev'?a[trade[2]]:trade[2]==='dismiss'?a.action==='buyer':a.action===trade[2]))return false;
    if(trade[3]&&!(trade[3]==='buyer'?a.buyers:a.sell)[Number(trade[4])])return false;
    if((trade[3]==='compare'||trade[5])&&(a.action==='arrive'||a.action==='buyer'))return false;
    if(trade[5]){
     const verb=trade[5],row=a[verb][Number(trade[6])],qty=Number(trade[7]),unit=Number(trade[8]),box=Number(trade[9]);
     if(!row||qty>row.qty||unit<=0||qty%box!==0||verb==='sell'&&box!==row.box)return false;
    }
   }
   const inbox=typeof command==='string'&&/^inbox:([a-f0-9-]{36}):(add|plan|start)(?::(\d{1,2}))?$/.exec(command);
   if(inbox&&(!d?.inbox||d.proposal||d.inbox.id!==inbox[1]||d.inbox.action!==inbox[2]||
    (inbox[2]==='add'?!d.inbox.options[Number(inbox[3])]:inbox[3]!==undefined)||queue.some(x=>x.command.startsWith('inbox:'+inbox[1]+':'))))return false;
   if(!inbox&&!modeSwitch&&!trade&&!flight&&!quote&&!speech&&!receipt&&!place&&!estimate&&!amendment&&!decision&&!commands.has(command))fail('unsupported-command');
   if(!d)return false;
   if(flight&&(!d.stepId||command!=='complete-flight:'+d.stepId||queue.some(x=>x.command===command)))return false;
   queue.push({id:++commandSequence,command,at:clock()});queue=queue.slice(-20);onCommand?.();return true;
  },
  poll(value){current();if(!session||value.session!==session)fail('display-session');const after=Number(value.after);if(!Number.isSafeInteger(after)||after<0)fail('invalid-cursor');return {commands:queue.filter(x=>x.id>after)};}
 };
}

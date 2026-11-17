// Only the retained marketplace board and private crew chat use this adapter.
// Fleet governance, delegated approvals, background notifications and external
// submissions were explicitly cancelled on 2026-11-17.
export function createFreightCloud(f,uid,assertCurrent=()=>{}){
 const fail=code=>{throw Object.assign(Error(code),{code});};
 const guard=()=>{assertCurrent();if(f.auth.currentUser?.uid!==uid)fail('stam/stale');};
 const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(v)?v:fail('invalid-id');
 const text=(v,max,empty=false)=>typeof v==='string'&&v.trim().length<=max&&(empty||v.trim())?v.trim():fail('invalid-text');
 const integer=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max?v:fail('invalid-number');
 const rows=s=>s.docs.map(d=>({id:d.id,...d.data()}));
 const allowedPath=path=>path==='tradePosts'||/^crewTrades\/[a-zA-Z0-9_-]{1,128}\/chat$/.test(path);
 async function list(path,filters=[],max=100){guard();if(!allowedPath(path))fail('feature-not-enabled');const r=await f.getDocs(f.query(f.collection(f.db,path),...filters.map(x=>f.where(...x)),f.limit(max)));guard();return rows(r);}
 async function page(path,filters=[],after='',order=''){
  guard();if(!allowedPath(path))fail('feature-not-enabled');const constraints=[...filters.map(x=>f.where(...x)),f.orderBy(order||'__name__',order?'desc':'asc')];
  if(after){if(order){const cursor=await f.getDoc(f.doc(f.db,path,id(after)));guard();if(!cursor.exists())fail('cursor-expired');constraints.push(f.startAfter(cursor));}else constraints.push(f.startAfter(after));}
  const result=await f.getDocs(f.query(f.collection(f.db,path),...constraints,f.limit(100)));guard();return {rows:rows(result),next:result.docs.length===100?result.docs.at(-1).id:''};
 }
 async function command(c){
  guard();if(c.action==='capabilities')return {engine:'crew-v1',billing:'free-only',uexReports:false,backgroundPriceAlerts:false,pushVapidKey:''};
  if(!['savePost','closePost','message'].includes(c.action))fail('feature-not-enabled');
  const key=id(c.id||crypto.randomUUID());
  if(c.action==='message'){
   const operationId=id(c.operationId),head=await f.getDoc(f.doc(f.db,'crewTrades',operationId));guard();if(!head.exists())fail('not-found');const op=JSON.parse(head.data().payload),member=op.members.find(m=>m.uid===uid&&m.active);if(!member||op.phase==='settled')fail('permission-denied');
   await f.setDoc(f.doc(f.db,'crewTrades',operationId,'chat',key),{uid,name:member.name,text:text(c.text,1500),announcement:c.announcement===true&&op.ownerUid===uid,at:Date.now()});guard();return {id:operationId};
  }
  if(c.action==='savePost'){
   if(!['buy','sell'].includes(c.side))fail('invalid-side');
   const commodityId=integer(c.commodityId,1e8),terminalId=integer(c.terminalId,1e8),quantity=integer(c.quantity,10000);if(!commodityId||!terminalId||!quantity)fail('invalid-number');
   if(!c.id&&(await list('tradePosts',[['ownerUid','==',uid],['status','==','open']],20)).length>=20)fail('post-limit');
   const now=Date.now(),value={ownerUid:uid,name:text(c.name,60),side:c.side,commodityId,terminalId,quantity,price:integer(c.price,1e12),note:text(c.note||'',500,true),status:'open',at:now,expiresAt:now+86400000};
   await f.setDoc(f.doc(f.db,'tradePosts',key),value);guard();return {id:key};
  }
  await f.updateDoc(f.doc(f.db,'tradePosts',key),{status:'closed',closedAt:Date.now()});guard();return {id:key};
 }
 function watch(path,onRows,onError,{order='at',max=50}={}){guard();if(!allowedPath(path))fail('feature-not-enabled');return f.onSnapshot(f.query(f.collection(f.db,path),f.orderBy(order,'desc'),f.limit(max)),s=>{try{guard();onRows(rows(s));}catch(e){onError(e);}},onError);}
 const disabled=async()=>fail('feature-not-enabled');
 return {uid,command,list,page,watch,postPage:async(after='')=>{const result=await page('tradePosts',[['status','==','open']],after);return {...result,rows:result.rows.filter(r=>r.expiresAt>Date.now())};},posts:async()=>(await list('tradePosts',[['status','==','open']])).filter(r=>r.expiresAt>Date.now()),
  fleetPage:disabled,listingPage:disabled,submitReport:disabled,fleets:disabled,memberships:disabled,listings:disabled,fleet:disabled,readListing:disabled,readNotifications:disabled,markRead:disabled};
}

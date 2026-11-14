import {historyTotalsMarkup,readHistory,HISTORY_KEY} from './history.mjs';
// Optional account login (ID + password or Google) and per-account sync through Firebase.
// Guests keep using browser storage. Nothing here runs until FIREBASE_CONFIG is filled in.
import {FIREBASE_CONFIG} from './firebase-config.mjs';
import {GUEST_BACKUP,ACCOUNT_META,snapshot,decideOnLogin,changedKeys,snapshotPatch,usernameProblem,normalizeUsername,usernameEmail,describeChanges} from './sync.mjs';

import {readAccount,writeAccount,sameStamp,syncConflict} from './account-sync-transport.mjs';
import {initializeOwner,readOwner,ownerFor,ownershipPatch,FLIGHT_KEYS,setAccountBoundary} from './flight-ownership.mjs';
import {applyStoragePatch,STORAGE_JOURNAL} from './storage-transaction.mjs';

const SDK='https://www.gstatic.com/firebasejs/10.14.1/';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readJSON=k=>JSON.parse(localStorage.getItem(k)||'null');
const writeJSON=(k,v)=>v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v));
const ERRORS={'auth/invalid-credential':'아이디 또는 비밀번호가 맞지 않습니다.','auth/wrong-password':'아이디 또는 비밀번호가 맞지 않습니다.','auth/user-not-found':'아이디 또는 비밀번호가 맞지 않습니다.','auth/email-already-in-use':'이미 사용 중인 아이디입니다.','auth/weak-password':'비밀번호는 6자 이상으로 만들어 주십시오.','auth/too-many-requests':'시도가 너무 많습니다. 잠시 후 다시 하십시오.','auth/popup-closed-by-user':'로그인 창이 닫혔습니다.','auth/popup-blocked':'브라우저가 로그인 창을 막았습니다. 팝업을 허용하십시오.','auth/unauthorized-domain':'이 주소가 Firebase 승인된 도메인에 없습니다.','auth/network-request-failed':'네트워크에 연결할 수 없습니다.','permission-denied':'계정 저장이 거부되었습니다. 새로고침해 최신 버전을 연 뒤 다시 확인하세요. 계속되면 서비스센터에 문의하세요. 기존 자료는 유지됩니다.'};
const message=e=>ERRORS[e?.code]||e?.message||String(e);

const device=()=>{const ua=navigator.userAgent||'';const os=/Windows/.test(ua)?'Windows':/Mac OS/.test(ua)?'Mac':/Android/.test(ua)?'Android':/iPhone|iPad/.test(ua)?'iOS':/Linux/.test(ua)?'Linux':'기기';const br=/Edg\//.test(ua)?'Edge':/Whale\//.test(ua)?'Whale':/Chrome\//.test(ua)?'Chrome':/Firefox\//.test(ua)?'Firefox':/Safari\//.test(ua)?'Safari':'브라우저';return `${os} · ${br}`;};
// Login is optional. Shown wherever the account is offered.
const LOGIN_NOTE=`<div class="account-note" data-i18n="login-note"><b>로그인은 선택입니다.</b> 로그인하지 않아도 모든 기능을 그대로 쓸 수 있고, 데이터는 이 브라우저에 저장됩니다.<ul><li>로그인하면 <b>계정별 수정 기록</b>이 남아 언제·어느 기기에서 무엇을 바꿨는지 볼 수 있습니다.</li><li>미션·함선·설정과 <b>운항 기록(누적 수익)</b>을 다른 PC에서도 이어서 봅니다.</li></ul></div>`;
const HISTORY_LINK='<div class="account-actions"><button type="button" data-act="history">운항 기록 보기</button><button type="button" data-act="reset-history" class="quiet danger">운항기록 초기화</button></div>';
export function createAccount(button,{notify=()=>{},shipName=id=>id,openHistory,resetHistory,historyContext=false}={}){
 const loginNote=historyContext?'<p>로그인 없이도 이 브라우저의 완료 운송기록을 볼 수 있습니다. 로그인하면 다른 기기와 기록을 동기화할 수 있습니다.</p>':LOGIN_NOTE;
 let fb=null,user=null,timer=null,paused=true,status='',generation=0,inflight=false,pending=null;
 const legacyArchive=o=>'stam.account-local.v1:'+encodeURIComponent(o);
 const rawSnapshot=()=>Object.fromEntries(Object.keys(snapshotPatch({})).map(k=>[k,localStorage.getItem(k)]).filter(([,v])=>v!==null));
 const stop=()=>{clearInterval(timer);timer=null;paused=true;};
 const token=()=>({epoch:generation,uid:user?.uid,owner:readOwner(localStorage),meta:localStorage.getItem(ACCOUNT_META)});
 const assertCurrent=t=>{if(t.epoch!==generation||t.uid!==user?.uid||t.owner!==readOwner(localStorage)||t.meta!==localStorage.getItem(ACCOUNT_META)||localStorage.getItem(STORAGE_JOURNAL))throw Object.assign(Error('계정이 변경되었습니다. 다시 확인하세요.'),{code:'stam/stale'});};
 const fail=e=>{if(e?.code==='stam/stale')return;stop();status=message(e);setButton();notify(status,true);};
 try{initializeOwner(localStorage);}catch(e){setAccountBoundary('error');status=message(e);}
 const dialog=document.createElement('dialog');dialog.className='account-dialog';document.body.append(dialog);
 const show=()=>{if(!dialog.open)(dialog.dataset.inline?dialog.show():dialog.showModal());};
 dialog.addEventListener('close',()=>{if(dialog.dataset.inline&&!dialog.open)open(user?'account':'login');});
 const setButton=()=>{button.innerHTML=user?`<span class="account-dot ${paused?'warn':''}"></span><span><small>${paused?'확인 필요':'동기화 연결됨'}</small><b>${esc(user.label)}</b></span>`:`<span><small>계정</small><b>${FIREBASE_CONFIG?'로그인':'로그인 준비 중'}</b></span>`;button.title=status;};
 async function load(){if(fb)return fb;
  const [app,auth,store]=await Promise.all(['firebase-app.js','firebase-auth.js','firebase-firestore.js'].map(f=>import(SDK+f)));
  const a=app.getApps()[0]||app.initializeApp(FIREBASE_CONFIG);fb={...auth,...store,auth:auth.getAuth(a),db:store.getFirestore(a)};return fb;}
 const label=u=>u.email?.endsWith('@id.stam-freight-control.app')?u.email.split('@')[0]:(u.displayName||u.email||'계정');

 const reload=()=>location.reload();
 const stampOf=meta=>({revision:meta?.revision||0,updatedAt:meta?.lastSyncedAt||0});
 const metaFor=(uid,stamp,snap)=>({uid,revision:stamp.revision,lastSyncedAt:stamp.updatedAt,lastSnap:snap});
 function ready(){paused=false;status='';setAccountBoundary('ready',user?.uid);setButton();clearInterval(timer);timer=setInterval(tick,5000);}
 function transition(snap,stamp,{adopt=false,lastSnap=snap}={}){
  const uid=user?.uid,target=ownerFor(uid),meta=readJSON(ACCOUNT_META),from=readOwner(localStorage);
  const source=meta?.uid?ownerFor(meta.uid):from==='unassigned'?'guest':from;
  const patch={...ownershipPatch(localStorage,target,{adopt}),...snapshotPatch(snap),
   [legacyArchive(source)]:JSON.stringify({snap:rawSnapshot(),meta}),
   [ACCOUNT_META]:uid?JSON.stringify(metaFor(uid,stamp,lastSnap)):null};
  if(source==='guest')patch[GUEST_BACKUP]=JSON.stringify(rawSnapshot());
  // Draft fallback is tab-local but must not migrate into another owner's empty flight.
  if(from!==target)sessionStorage.removeItem('stam.mission-console.trial.v1');
  applyStoragePatch(localStorage,patch);
  reload();
 }
 async function tick(){
  if(!user||paused||inflight)return;
  let t={epoch:generation,uid:user?.uid};inflight=true;
  try{
   t=token();
   if(readOwner(localStorage)!==ownerFor(t.uid)||localStorage.getItem(STORAGE_JOURNAL))throw Error('다른 탭에서 계정 자료가 바뀌었습니다. 새로고침해 주세요.');
   const meta=readJSON(ACCOUNT_META);if(meta?.uid!==t.uid)throw Error('계정을 다시 확인하세요.');
   const now=snapshot(localStorage),keys=changedKeys(meta.lastSnap,now);if(!keys.length)return;
   const stamp=await writeAccount(fb,t.uid,stampOf(meta),keys,now,{assertCurrent:()=>assertCurrent(t),items:describeChanges(meta.lastSnap,now,{shipName}),device:device()});
   assertCurrent(t);writeJSON(ACCOUNT_META,metaFor(t.uid,stamp,now));status='';setButton();
  }catch(e){if(t.epoch===generation)fail(e);}finally{inflight=false;}
 }
 async function onSignedIn(u){
  stop();generation++;pending=null;user={uid:u.uid,label:label(u)};setAccountBoundary('checking',u.uid);status='계정과 운항을 확인 중입니다.';setButton();let t={epoch:generation,uid:u.uid};
  try{
   initializeOwner(localStorage);t=token();
   const from=readOwner(localStorage),meta=readJSON(ACCOUNT_META),cloud=await readAccount(fb,t.uid);assertCurrent(t);
   const same=meta?.uid===t.uid,cached=readJSON(legacyArchive(ownerFor(t.uid)));
   const baseline=same?meta:cached?.meta?.uid===t.uid?cached.meta:null;
   const local=same?snapshot(localStorage):baseline?cached.snap:(meta?.uid||from.startsWith('account:'))?{}:snapshot(localStorage);
   pending={t,cloud,local,baseline,adopt:false};
   if(from!==ownerFor(t.uid)&&['guest','unassigned'].includes(from)&&FLIGHT_KEYS.some(k=>localStorage.getItem(k)!==null)){open('flight-owner');return;}
   finishLogin();
  }catch(e){if(t.epoch===generation){setAccountBoundary('error',t.uid);fail(e);}}
 }
 function finishLogin(){
  const {t,cloud,local}=pending;assertCurrent(t);
  const meta=pending.baseline,same=meta?.uid===t.uid;
  if(same){
   const remoteChanged=!sameStamp(cloud.stamp,stampOf(meta)),localChanged=changedKeys(meta.lastSnap,local).length>0;
   if(remoteChanged&&localChanged){open('conflict');return;}
   if(!remoteChanged&&readOwner(localStorage)===ownerFor(t.uid)){pending=null;ready();void tick();return;}
   transition(remoteChanged?cloud.snap:local,cloud.stamp,{adopt:pending.adopt,lastSnap:cloud.snap});return;
  }
  const decision=decideOnLogin(local,cloud.snap);
  if(decision==='offer-upload'){open('first-upload');return;}
  if(decision==='ask'){open('first-conflict');return;}
  transition(cloud.snap,cloud.stamp,{adopt:pending.adopt});
 }
 async function useCloud(){
  if(!pending)throw Error('계정 자료를 다시 비교하세요.');
  const {t,cloud,adopt}=pending;assertCurrent(t);
  const latest=await readAccount(fb,t.uid);assertCurrent(t);if(!sameStamp(latest.stamp,cloud.stamp))throw syncConflict();
  transition(cloud.snap,cloud.stamp,{adopt});
 }
 async function useLocal(){
  if(!pending)throw Error('계정 자료를 다시 비교하세요.');
  const {t,cloud,local,adopt}=pending;assertCurrent(t);
  const stamp=await writeAccount(fb,t.uid,cloud.stamp,[...new Set([...Object.keys(local),...Object.keys(cloud.snap)])],local,{assertCurrent:()=>assertCurrent(t),items:['확인한 브라우저 데이터로 계정 저장'],device:device()});
  assertCurrent(t);transition(local,stamp,{adopt});
 }
 function restoreGuest(){
  const meta=readJSON(ACCOUNT_META),from=readOwner(localStorage);
  if(!meta?.uid&&!from.startsWith('account:')){setAccountBoundary('ready');setButton();return;}
  const guest=readJSON(legacyArchive('guest'))?.snap||readJSON(GUEST_BACKUP)||{};
  transition(guest,{revision:0,updatedAt:0});
 }
 async function signOutKeepGuest(){
  stop();generation++;pending=null;setAccountBoundary('checking');
  await fb.signOut(fb.auth); // The observer archives the outgoing flight and restores the guest.
 }
 function open(view='login'){
  if(pending&&['flight-owner','first-upload','first-conflict','conflict'].includes(view))pending.view=view;
  if(!FIREBASE_CONFIG){dialog.innerHTML=`<div class="dialog-title"><h2>계정 로그인</h2><button type="button" data-close aria-label="닫기">×</button></div>${loginNote}<section class="account-run-totals">${historyTotalsMarkup()}</section>${HISTORY_LINK}<p>로그인 기능을 준비하고 있습니다. 지금은 이 브라우저에 자동 저장됩니다.</p>`;bind();show();return;}
  const choices={
   'flight-owner':['이 운항을 계정에 연결할까요?','로그인 전에 준비한 운항과 이전 백업이 있습니다. 별도로 보관하면 이 계정의 기존 운항을 불러옵니다. 새 콘솔 운항은 아직 이 브라우저에만 저장됩니다.',[['adopt-flight','이 운항을 계정에 연결','primary'],['separate-flight','따로 보관하고 계속',''],['sign-out','취소하고 로그아웃','quiet']]],
   'first-upload':['이 브라우저 데이터를 계정에 저장할까요?','계정에 아직 저장된 데이터가 없습니다. 지금 이 브라우저의 미션·함선·설정·기록을 계정에 올리면 다른 PC에서도 이어서 쓸 수 있습니다.',[['use-local','이 브라우저 데이터 저장','primary'],['start-empty','빈 계정으로 시작','']]],
   'first-conflict':['어느 데이터를 쓸까요?','계정에 저장된 데이터와 이 브라우저의 데이터가 다릅니다. 자동으로 덮어쓰지 않았습니다.',[['use-cloud','계정 데이터 불러오기','primary'],['use-local','이 브라우저 데이터로 계정 덮어쓰기',''],['sign-out','취소하고 로그아웃','quiet']]],
   'conflict':['다른 기기에서 더 최근에 저장했습니다','다른 PC에서 저장한 뒤 이 브라우저에서도 바뀐 내용이 있습니다. 어느 쪽을 쓸지 골라 주십시오.',[['use-cloud','다른 기기 데이터 불러오기','primary'],['use-local','이 브라우저 데이터로 덮어쓰기',''],['close','나중에','quiet']]]};
  if(choices[view]){const [t,p,bs]=choices[view];dialog.innerHTML=`<div class="dialog-title"><h2>${t}</h2></div><p>${p}</p><div class="account-actions">${bs.map(([a,l,c])=>`<button type="button" class="${c}" data-act="${a}">${l}</button>`).join('')}</div><p class="account-msg" role="status"></p>`;bind();show();return;}
  if(user){dialog.innerHTML=`<div class="dialog-title"><h2>${esc(user.label)} 님</h2><button type="button" data-close aria-label="닫기">×</button></div><p>${paused?'⚠ '+esc(status||'자동 저장이 멈춰 있습니다.'):historyContext?'완료한 운송기록이 계정에 자동 저장됩니다.':'미션·함선·설정·운항 기록이 계정에 자동 저장됩니다.'}</p><p class="small subtle">진행 중인 새 콘솔 운항은 이 브라우저에서 계정별로 보관됩니다. 다른 기기로 옮길 때는 운항 백업 파일을 사용하세요.</p><div class="account-actions">${paused?'<button type="button" class="primary" data-act="open-conflict">어느 쪽을 쓸지 고르기</button>':''}<button type="button" data-act="history">운항 기록 보기</button><button type="button" data-act="reset-history" class="quiet danger">운항기록 초기화</button><button type="button" data-act="sign-out">로그아웃</button></div><section class="account-run-totals">${historyTotalsMarkup()}</section>
   <h3 class="account-sub">수정 기록</h3><ol class="change-log"><li class="subtle">불러오는 중…</li></ol><p class="small subtle">이 계정에서 저장된 변경만 표시됩니다. 로그아웃하면 이 브라우저는 로그인 전의 게스트 데이터로 돌아갑니다.</p>`;bind();show();
   const historyToken=token();load().then(f=>{assertCurrent(historyToken);return f.getDocs(f.query(f.collection(f.db,'users',historyToken.uid,'changes'),f.orderBy('at','desc'),f.limit(50)));}).then(r=>{assertCurrent(historyToken);const ol=dialog.querySelector('.change-log');if(!ol)return;const rows=[];r.forEach(d=>rows.push(d.data()));ol.innerHTML=rows.length?rows.map(x=>`<li><span>${new Date(x.at).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} · ${esc(x.device||'')}</span>${(x.items||[]).map(t=>`<div>${esc(t)}</div>`).join('')}</li>`).join(''):'<li class="subtle">아직 수정 기록이 없습니다.</li>';}).catch(e=>{if(historyToken.epoch!==generation)return;const ol=dialog.querySelector('.change-log');if(ol)ol.innerHTML=`<li class="subtle">${esc(message(e))}</li>`;});return;}
  const signup=view==='signup';
  dialog.innerHTML=`<div class="dialog-title"><h2>${signup?'아이디 만들기':'로그인'}</h2><button type="button" data-close aria-label="닫기">×</button></div>
   ${loginNote}
   <section class="account-run-totals">${historyTotalsMarkup()}</section>${HISTORY_LINK}
   <form class="account-form" novalidate><label>아이디<span class="account-row"><input name="id" autocomplete="username" maxlength="20" placeholder="영문 소문자·숫자·_ 3~20자" required>${signup?'<button type="button" data-act="check">중복 확인</button>':''}</span></label>
   <label>비밀번호<input name="pw" type="password" autocomplete="${signup?'new-password':'current-password'}" minlength="6" required></label>${signup?'<label>비밀번호 확인<input name="pw2" type="password" autocomplete="new-password" minlength="6" required></label>':''}
   <button class="primary full" type="submit">${signup?'아이디 만들기':'로그인'}</button></form>
   <p class="account-msg" role="status"></p>
   <div class="account-alt"><button type="button" data-act="${signup?'to-login':'to-signup'}" class="text-button">${signup?'이미 아이디가 있어요 · 로그인':'처음이에요 · 아이디 만들기'}</button><span>또는</span><button type="button" data-act="google" class="google-btn">Google로 로그인</button></div>
   <p class="small subtle">비밀번호는 Firebase가 암호화해 보관하며 사이트 운영자도 볼 수 없습니다. Google 로그인은 이름·이메일 확인 외의 권한을 요청하지 않습니다. 아이디 방식은 이메일이 없어 비밀번호를 잊으면 찾을 수 없습니다.</p>`;
  bind(signup);show();setTimeout(()=>dialog.querySelector('input')?.focus(),50);
 }
 function refreshTotals(){const target=dialog.querySelector('.account-run-totals');if(target)target.innerHTML=historyTotalsMarkup();const reset=dialog.querySelector('[data-act="reset-history"]');if(reset)reset.disabled=!readHistory().length;}
 window.addEventListener('sfc-history-changed',refreshTotals);
 window.addEventListener('storage',e=>{if(!e.key||e.key===HISTORY_KEY)refreshTotals();if(!e.key||[ACCOUNT_META,'stam.flight-owner.v1',STORAGE_JOURNAL].includes(e.key)){stop();generation++;pending=null;setAccountBoundary('error',user?.uid);status='다른 탭에서 계정 자료가 변경됐습니다. 새로고침해 주세요.';setButton();}});
 function bind(signup=false){
  refreshTotals();
  const msg=t=>{const m=dialog.querySelector('.account-msg');if(m)m.textContent=t;};
  dialog.querySelector('[data-close]')?.addEventListener('click',()=>dialog.close());
  const act={close:()=>dialog.close(),'to-login':()=>open('login'),'to-signup':()=>open('signup'),'open-conflict':()=>{if(pending)open(pending.view);else onSignedIn({uid:user.uid,displayName:user.label});},
   'adopt-flight':()=>{pending.adopt=true;try{finishLogin();}catch(e){fail(e);msg(message(e));}},'separate-flight':()=>{pending.adopt=false;try{finishLogin();}catch(e){fail(e);msg(message(e));}},
   'use-cloud':()=>useCloud().catch(e=>{msg(message(e));if(e?.code==='stam/conflict'){pending=null;status=message(e);setButton();}}),'use-local':()=>useLocal().catch(e=>{msg(message(e));if(e?.code==='stam/conflict'){pending=null;status=message(e);setButton();}}),'sign-out':()=>signOutKeepGuest().catch(e=>msg(message(e))),
   history:()=>{dialog.close();openHistory?.();},'reset-history':()=>{if(resetHistory?.())refreshTotals();},'start-empty':()=>useCloud().catch(e=>msg(message(e))),
   google:async()=>{try{const f=await observeAuth();await f.signInWithPopup(f.auth,new f.GoogleAuthProvider());dialog.close();}catch(e){msg(message(e));}},
   check:async()=>{const id=dialog.querySelector('[name=id]').value,p=usernameProblem(id);if(p)return msg(p);try{const f=await load();const d=await f.getDoc(f.doc(f.db,'usernames',normalizeUsername(id)));msg(d.exists()?'이미 사용 중인 아이디입니다.':'사용할 수 있는 아이디입니다.');}catch(e){msg(message(e));}}};
  dialog.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>act[b.dataset.act]?.());
  dialog.querySelector('form')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),id=String(f.get('id')||''),pw=String(f.get('pw')||''),p=usernameProblem(id);if(p)return msg(p);if(pw.length<6)return msg('비밀번호는 6자 이상으로 만들어 주십시오.');
   try{const F=await observeAuth(),name=normalizeUsername(id);
    if(signup){if(pw!==f.get('pw2'))return msg('비밀번호 확인이 맞지 않습니다.');if((await F.getDoc(F.doc(F.db,'usernames',name))).exists())return msg('이미 사용 중인 아이디입니다.');
     const cred=await F.createUserWithEmailAndPassword(F.auth,usernameEmail(name),pw);
     try{await F.runTransaction(F.db,async t=>{const ref=F.doc(F.db,'usernames',name);if((await t.get(ref)).exists())throw Object.assign(new Error('이미 사용 중인 아이디입니다.'),{code:'taken'});t.set(ref,{uid:cred.user.uid});});}
     catch(err){await F.deleteUser(cred.user).catch(()=>{});return msg(err.code==='taken'?'이미 사용 중인 아이디입니다.':message(err));}}
    else await F.signInWithEmailAndPassword(F.auth,usernameEmail(name),pw);
    dialog.close();}catch(err){msg(message(err));}});
 }

 let observing;
 function observeAuth(){
  if(!observing)observing=load().then(f=>{
   f.onAuthStateChanged(f.auth,u=>{
    if(u){void onSignedIn(u);return;}
    stop();generation++;pending=null;user=null;setAccountBoundary('checking');
    try{initializeOwner(localStorage);restoreGuest();}catch(e){setAccountBoundary('error');fail(e);}
   });
   return f;
  }).catch(error=>{observing=null;throw error;});
  return observing;
 }
 function resume(){if(FIREBASE_CONFIG)observeAuth().catch(e=>{
  setAccountBoundary('error');stop();
  const text='로그인 연결 실패: '+message(e);
  const target=dialog.querySelector('.account-msg');
  if(dialog.open&&target)target.textContent=text;
  notify(text,true);
 });}
 button.onclick=()=>{open(user?'account':'login');resume();};
 setButton();
 try{if(readJSON(ACCOUNT_META)?.uid||readOwner(localStorage).startsWith('account:'))resume();}catch(e){fail(e);}
 return {open,user:()=>user,mount(host){dialog.close();dialog.dataset.inline='true';host.append(dialog);open(pending?.view||(user?'account':'login'));return()=>{delete dialog.dataset.inline;dialog.close();document.body.append(dialog);};}};
}

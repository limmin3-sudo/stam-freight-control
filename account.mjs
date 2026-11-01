// Optional account login (ID + password or Google) and per-account sync through Firebase.
// Guests keep using browser storage. Nothing here runs until FIREBASE_CONFIG is filled in.
import {FIREBASE_CONFIG} from './firebase-config.mjs';
import {GUEST_BACKUP,ACCOUNT_META,snapshot,decideOnLogin,changedKeys,remoteIsNewer,applySnapshot,usernameProblem,normalizeUsername,usernameEmail,describeChanges} from './sync.mjs';

const SDK='https://www.gstatic.com/firebasejs/10.14.1/';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readJSON=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}};
const writeJSON=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v));}catch{}};
const ERRORS={'auth/invalid-credential':'아이디 또는 비밀번호가 맞지 않습니다.','auth/wrong-password':'아이디 또는 비밀번호가 맞지 않습니다.','auth/user-not-found':'아이디 또는 비밀번호가 맞지 않습니다.','auth/email-already-in-use':'이미 사용 중인 아이디입니다.','auth/weak-password':'비밀번호는 6자 이상으로 만들어 주세요.','auth/too-many-requests':'시도가 너무 많습니다. 잠시 후 다시 해 주세요.','auth/popup-closed-by-user':'로그인 창이 닫혔습니다.','auth/popup-blocked':'브라우저가 로그인 창을 막았습니다. 팝업을 허용해 주세요.','auth/unauthorized-domain':'이 주소가 Firebase 승인된 도메인에 없습니다.','auth/network-request-failed':'네트워크에 연결할 수 없습니다.','permission-denied':'권한이 없습니다. Firestore 보안 규칙을 확인해 주세요.'};
const message=e=>ERRORS[e?.code]||e?.message||String(e);

const device=()=>{const ua=navigator.userAgent||'';const os=/Windows/.test(ua)?'Windows':/Mac OS/.test(ua)?'Mac':/Android/.test(ua)?'Android':/iPhone|iPad/.test(ua)?'iOS':/Linux/.test(ua)?'Linux':'기기';const br=/Edg\//.test(ua)?'Edge':/Whale\//.test(ua)?'Whale':/Chrome\//.test(ua)?'Chrome':/Firefox\//.test(ua)?'Firefox':/Safari\//.test(ua)?'Safari':'브라우저';return `${os} · ${br}`;};
// Login is optional. Shown wherever the account is offered.
const LOGIN_NOTE=`<div class="account-note"><b>로그인은 선택입니다.</b> 로그인하지 않아도 모든 기능을 그대로 쓸 수 있고, 데이터는 이 브라우저에 저장됩니다.<ul><li>로그인하면 <b>계정별 수정 기록</b>이 남아 언제·어느 기기에서 무엇을 바꿨는지 볼 수 있습니다.</li><li>미션·함선·설정과 <b>운항 기록(누적 수익)</b>을 다른 PC에서도 이어서 봅니다.</li></ul></div>`;
const HISTORY_LINK='<div class="account-actions"><button type="button" data-act="history">운항 기록 보기</button></div>';
export function createAccount(button,{notify=()=>{},shipName=id=>id,openHistory}={}){
 let fb=null,user=null,timer=null,paused=false,status='';
 const dialog=document.createElement('dialog');dialog.className='account-dialog';document.body.append(dialog);
 const setButton=()=>{button.innerHTML=user?`<span class="account-dot ${paused?'warn':''}"></span><span><small>${paused?'동기화 멈춤':'동기화됨'}</small><b>${esc(user.label)}</b></span>`:`<span><small>계정</small><b>${FIREBASE_CONFIG?'로그인':'로그인 준비 중'}</b></span>`;button.title=status;};
 async function load(){if(fb)return fb;
  const [app,auth,store]=await Promise.all(['firebase-app.js','firebase-auth.js','firebase-firestore.js'].map(f=>import(SDK+f)));
  const a=app.initializeApp(FIREBASE_CONFIG);fb={...auth,...store,auth:auth.getAuth(a),db:store.getFirestore(a)};return fb;}
 const label=u=>u.email?.endsWith('@id.stam-freight-control.app')?u.email.split('@')[0]:(u.displayName||u.email||'계정');

 async function readCloud(uid){const snap={};let updatedAt=0;const docs=await fb.getDocs(fb.collection(fb.db,'users',uid,'state'));docs.forEach(d=>{const x=d.data();if(typeof x.value==='string')snap[d.id]=x.value;updatedAt=Math.max(updatedAt,Number(x.updatedAt)||0);});return {snap,updatedAt};}
 async function cloudStamp(uid){const d=await fb.getDoc(fb.doc(fb.db,'users',uid));return Number(d.data()?.updatedAt)||0;}
 async function push(uid,keys,snap,note){const now=Date.now(),batch=fb.writeBatch(fb.db),prev=readJSON(ACCOUNT_META)?.lastSnap||{},items=note?[note]:describeChanges(prev,snap,{shipName});if(items.length)batch.set(fb.doc(fb.collection(fb.db,'users',uid,'changes')),{at:now,device:device(),items});for(const k of keys){const ref=fb.doc(fb.db,'users',uid,'state',k);if(snap[k]==null)batch.delete(ref);else batch.set(ref,{value:snap[k],updatedAt:now});}batch.set(fb.doc(fb.db,'users',uid),{updatedAt:now},{merge:true});await batch.commit();writeJSON(ACCOUNT_META,{uid,lastSyncedAt:now,lastSnap:snap});}
 const reload=()=>location.reload();

 // Periodic upload of this browser's changes; stops instead of overwriting when another PC saved later.
 async function tick(){if(!user||paused)return;const meta=readJSON(ACCOUNT_META)||{},now=snapshot(localStorage),keys=changedKeys(meta.lastSnap,now);if(!keys.length)return;
  try{if(remoteIsNewer(await cloudStamp(user.uid),meta.lastSyncedAt)){paused=true;status='다른 기기에서 더 최근에 저장했습니다.';setButton();notify('다른 기기에서 더 최근에 저장한 데이터가 있어 자동 저장을 멈췄습니다. 계정 버튼에서 어느 쪽을 쓸지 골라 주세요.',true);return;}
   await push(user.uid,keys,now);status='';setButton();}catch(e){status=message(e);notify('계정 저장 실패: '+status,true);}}

 async function onSignedIn(u){user={uid:u.uid,label:label(u)};setButton();
  const meta=readJSON(ACCOUNT_META),local=snapshot(localStorage);let cloud;try{cloud=await readCloud(u.uid);}catch(e){notify('계정 데이터를 읽지 못했습니다: '+message(e),true);return;}
  if(meta?.uid===u.uid){// Same account on this browser again.
   const localChanged=changedKeys(meta.lastSnap,local).length>0,remoteChanged=remoteIsNewer(cloud.updatedAt,meta.lastSyncedAt);
   if(remoteChanged&&localChanged){paused=true;setButton();open('conflict');return;}
   if(remoteChanged){applySnapshot(localStorage,cloud.snap);writeJSON(ACCOUNT_META,{uid:u.uid,lastSyncedAt:cloud.updatedAt,lastSnap:cloud.snap});reload();return;}
  }else{
   if(localStorage.getItem(GUEST_BACKUP)==null)localStorage.setItem(GUEST_BACKUP,JSON.stringify(local));
   const decision=decideOnLogin(local,cloud.snap);
   if(decision==='pull'){applySnapshot(localStorage,cloud.snap);writeJSON(ACCOUNT_META,{uid:u.uid,lastSyncedAt:cloud.updatedAt,lastSnap:cloud.snap});reload();return;}
   if(decision==='offer-upload'){open('first-upload');return;}
   if(decision==='ask'){open('first-conflict');return;}
   writeJSON(ACCOUNT_META,{uid:u.uid,lastSyncedAt:cloud.updatedAt||Date.now(),lastSnap:local});
  }
  clearInterval(timer);timer=setInterval(tick,5000);tick();}

 async function useCloud(){const c=await readCloud(user.uid);applySnapshot(localStorage,c.snap);writeJSON(ACCOUNT_META,{uid:user.uid,lastSyncedAt:c.updatedAt,lastSnap:c.snap});reload();}
 async function useLocal(){const s=snapshot(localStorage),c=await readCloud(user.uid);await push(user.uid,[...new Set([...Object.keys(s),...Object.keys(c.snap)])],s,'이 브라우저의 데이터로 계정 저장');paused=false;status='';dialog.close();setButton();clearInterval(timer);timer=setInterval(tick,5000);notify('이 브라우저의 데이터를 계정에 저장했습니다.');}
 async function signOutKeepGuest(){try{await tick();}catch{}await fb.signOut(fb.auth);const guest=readJSON(GUEST_BACKUP);applySnapshot(localStorage,guest||{});localStorage.removeItem(GUEST_BACKUP);writeJSON(ACCOUNT_META,null);reload();}

 function open(view='login'){
  if(!FIREBASE_CONFIG){dialog.innerHTML=`<div class="dialog-title"><h2>계정 로그인</h2><button type="button" data-close aria-label="닫기">×</button></div>${LOGIN_NOTE}${HISTORY_LINK}<p>로그인 기능을 준비하고 있습니다. 지금은 이 브라우저에 자동 저장됩니다.</p>`;bind();dialog.showModal();return;}
  const choices={
   'first-upload':['이 브라우저 데이터를 계정에 저장할까요?','계정에 아직 저장된 데이터가 없습니다. 지금 이 브라우저의 미션·함선·설정·기록을 계정에 올리면 다른 PC에서도 이어서 쓸 수 있습니다.',[['use-local','이 브라우저 데이터 저장','primary'],['start-empty','빈 계정으로 시작','']]],
   'first-conflict':['어느 데이터를 쓸까요?','계정에 저장된 데이터와 이 브라우저의 데이터가 다릅니다. 자동으로 덮어쓰지 않았습니다.',[['use-cloud','계정 데이터 불러오기','primary'],['use-local','이 브라우저 데이터로 계정 덮어쓰기',''],['sign-out','취소하고 로그아웃','quiet']]],
   'conflict':['다른 기기에서 더 최근에 저장했습니다','다른 PC에서 저장한 뒤 이 브라우저에서도 바뀐 내용이 있습니다. 어느 쪽을 쓸지 골라 주세요.',[['use-cloud','다른 기기 데이터 불러오기','primary'],['use-local','이 브라우저 데이터로 덮어쓰기',''],['close','나중에','quiet']]]};
  if(choices[view]){const [t,p,bs]=choices[view];dialog.innerHTML=`<div class="dialog-title"><h2>${t}</h2></div><p>${p}</p><div class="account-actions">${bs.map(([a,l,c])=>`<button type="button" class="${c}" data-act="${a}">${l}</button>`).join('')}</div><p class="account-msg" role="status"></p>`;bind();if(!dialog.open)dialog.showModal();return;}
  if(user){dialog.innerHTML=`<div class="dialog-title"><h2>${esc(user.label)} 님</h2><button type="button" data-close aria-label="닫기">×</button></div><p>${paused?'⚠ '+esc(status||'자동 저장이 멈춰 있습니다.'):'미션·함선·설정·운항 기록이 계정에 자동 저장됩니다.'}</p><div class="account-actions">${paused?'<button type="button" class="primary" data-act="open-conflict">어느 쪽을 쓸지 고르기</button>':''}<button type="button" data-act="history">운항 기록 보기</button><button type="button" data-act="sign-out">로그아웃</button></div>
   <h3 class="account-sub">수정 기록</h3><ol class="change-log"><li class="subtle">불러오는 중…</li></ol><p class="small subtle">이 계정에서 저장된 변경만 표시됩니다. 로그아웃하면 이 브라우저는 로그인 전의 게스트 데이터로 돌아갑니다.</p>`;bind();dialog.showModal();
   load().then(f=>f.getDocs(f.query(f.collection(f.db,'users',user.uid,'changes'),f.orderBy('at','desc'),f.limit(50)))).then(r=>{const ol=dialog.querySelector('.change-log');if(!ol)return;const rows=[];r.forEach(d=>rows.push(d.data()));ol.innerHTML=rows.length?rows.map(x=>`<li><span>${new Date(x.at).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} · ${esc(x.device||'')}</span>${(x.items||[]).map(t=>`<div>${esc(t)}</div>`).join('')}</li>`).join(''):'<li class="subtle">아직 수정 기록이 없습니다.</li>';}).catch(e=>{const ol=dialog.querySelector('.change-log');if(ol)ol.innerHTML=`<li class="subtle">${esc(message(e))}</li>`;});return;}
  const signup=view==='signup';
  dialog.innerHTML=`<div class="dialog-title"><h2>${signup?'아이디 만들기':'로그인'}</h2><button type="button" data-close aria-label="닫기">×</button></div>
   ${LOGIN_NOTE}
   ${HISTORY_LINK}
   <form class="account-form" novalidate><label>아이디<span class="account-row"><input name="id" autocomplete="username" maxlength="20" placeholder="영문 소문자·숫자·_ 3~20자" required>${signup?'<button type="button" data-act="check">중복 확인</button>':''}</span></label>
   <label>비밀번호<input name="pw" type="password" autocomplete="${signup?'new-password':'current-password'}" minlength="6" required></label>${signup?'<label>비밀번호 확인<input name="pw2" type="password" autocomplete="new-password" minlength="6" required></label>':''}
   <button class="primary full" type="submit">${signup?'아이디 만들기':'로그인'}</button></form>
   <p class="account-msg" role="status"></p>
   <div class="account-alt"><button type="button" data-act="${signup?'to-login':'to-signup'}" class="text-button">${signup?'이미 아이디가 있어요 · 로그인':'처음이에요 · 아이디 만들기'}</button><span>또는</span><button type="button" data-act="google" class="google-btn">Google로 로그인</button></div>
   <p class="small subtle">비밀번호는 Firebase가 암호화해 보관하며 사이트 운영자도 볼 수 없습니다. Google 로그인은 이름·이메일 확인 외의 권한을 요청하지 않습니다. 아이디 방식은 이메일이 없어 비밀번호를 잊으면 찾을 수 없습니다.</p>`;
  bind(signup);if(!dialog.open)dialog.showModal();setTimeout(()=>dialog.querySelector('input')?.focus(),50);
 }
 function bind(signup=false){
  const msg=t=>{const m=dialog.querySelector('.account-msg');if(m)m.textContent=t;};
  dialog.querySelector('[data-close]')?.addEventListener('click',()=>dialog.close());
  const act={close:()=>dialog.close(),'to-login':()=>open('login'),'to-signup':()=>open('signup'),'open-conflict':()=>open('conflict'),
   'use-cloud':()=>useCloud().catch(e=>msg(message(e))),'use-local':()=>useLocal().catch(e=>msg(message(e))),'sign-out':()=>signOutKeepGuest().catch(e=>msg(message(e))),
   history:()=>{dialog.close();openHistory?.();},'start-empty':async()=>{applySnapshot(localStorage,{});writeJSON(ACCOUNT_META,{uid:user.uid,lastSyncedAt:Date.now(),lastSnap:{}});reload();},
   google:async()=>{try{const f=await load();await f.signInWithPopup(f.auth,new f.GoogleAuthProvider());dialog.close();}catch(e){msg(message(e));}},
   check:async()=>{const id=dialog.querySelector('[name=id]').value,p=usernameProblem(id);if(p)return msg(p);try{const f=await load();const d=await f.getDoc(f.doc(f.db,'usernames',normalizeUsername(id)));msg(d.exists()?'이미 사용 중인 아이디입니다.':'사용할 수 있는 아이디입니다.');}catch(e){msg(message(e));}}};
  dialog.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>act[b.dataset.act]?.());
  dialog.querySelector('form')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),id=String(f.get('id')||''),pw=String(f.get('pw')||''),p=usernameProblem(id);if(p)return msg(p);if(pw.length<6)return msg('비밀번호는 6자 이상으로 만들어 주세요.');
   try{const F=await load(),name=normalizeUsername(id);
    if(signup){if(pw!==f.get('pw2'))return msg('비밀번호 확인이 맞지 않습니다.');if((await F.getDoc(F.doc(F.db,'usernames',name))).exists())return msg('이미 사용 중인 아이디입니다.');
     const cred=await F.createUserWithEmailAndPassword(F.auth,usernameEmail(name),pw);
     try{await F.runTransaction(F.db,async t=>{const ref=F.doc(F.db,'usernames',name);if((await t.get(ref)).exists())throw Object.assign(new Error('이미 사용 중인 아이디입니다.'),{code:'taken'});t.set(ref,{uid:cred.user.uid});});}
     catch(err){await F.deleteUser(cred.user).catch(()=>{});return msg(err.code==='taken'?'이미 사용 중인 아이디입니다.':message(err));}}
    else await F.signInWithEmailAndPassword(F.auth,usernameEmail(name),pw);
    dialog.close();}catch(err){msg(message(err));}});
 }

 button.onclick=()=>open(user?'account':'login');
 setButton();
 // Resume a previous session on load; first-time guests do not download Firebase at all.
 if(FIREBASE_CONFIG&&readJSON(ACCOUNT_META)?.uid)load().then(f=>f.onAuthStateChanged(f.auth,u=>u?onSignedIn(u):(user=null,setButton()))).catch(()=>{});
 else if(FIREBASE_CONFIG){const first=button.onclick;button.onclick=async()=>{button.onclick=first;try{const f=await load();f.onAuthStateChanged(f.auth,u=>u?onSignedIn(u):(user=null,setButton()));}catch(e){notify('로그인 모듈을 불러오지 못했습니다: '+message(e),true);}first();};}
 return {open,user:()=>user};
}

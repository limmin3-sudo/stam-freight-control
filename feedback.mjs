// Feedback and bug reports from the left sidebar. Reports go to the Firestore "feedback" collection, which anyone
// may add to (size-checked by firestore.rules) but no visitor can read; the site owner reads them in the Firebase
// console (Firestore Database → Data → feedback). Recent page errors can be attached to bug reports.
import {FIREBASE_CONFIG} from './firebase-config.mjs';
import {lang} from './i18n.mjs';
const SDK='https://www.gstatic.com/firebasejs/10.14.1/';
const MAX=2000,errors=[];
window.addEventListener('error',e=>{errors.push(String(e.message||e.error||'').slice(0,300));if(errors.length>5)errors.shift();});
window.addEventListener('unhandledrejection',e=>{errors.push(String(e.reason?.message||e.reason||'').slice(0,300));if(errors.length>5)errors.shift();});

export async function firebaseApp(){const [app,auth,store]=await Promise.all(['firebase-app.js','firebase-auth.js','firebase-firestore.js'].map(f=>import(SDK+f)));
 const a=app.getApps()[0]||app.initializeApp(FIREBASE_CONFIG);return {auth:auth.getAuth(a),store,db:store.getFirestore(a)};}

export function createFeedback(button,{notify=()=>{},context=()=>({})}={}){
 const dialog=document.createElement('dialog');dialog.className='feedback-dialog desk-dialog';document.body.append(dialog);
 dialog.innerHTML=`<form method="dialog"><div class="dialog-title"><h2>피드백 · 오류 신고</h2><button type="button" data-close aria-label="닫기">×</button></div>
  <div class="feedback-kind" role="radiogroup" aria-label="종류"><label><input type="radio" name="kind" value="feedback" checked> 피드백 · 제안</label><label><input type="radio" name="kind" value="bug"> 오류 신고</label></div>
  <label class="feedback-text">내용<textarea name="text" maxlength="${MAX}" rows="7" required placeholder="불편한 점, 바라는 기능, 오류가 난 상황(어느 화면에서 무엇을 눌렀는지)을 적어 주세요."></textarea></label>
  <div class="feedback-count small subtle" aria-live="polite">0 / ${MAX}</div>
  <label>연락처 (선택)<input name="contact" maxlength="100" placeholder="디스코드·게임 닉네임 등 · 답장이 필요할 때만"></label>
  <label class="check"><input type="checkbox" name="attach" checked> 앱 정보 함께 보내기 (버전·언어·함선·계약 수·최근 오류. 미션 내용은 보내지 않습니다)</label>
  <p class="small subtle">보낸 내용은 사이트 운영자만 볼 수 있습니다. 개인 정보나 비밀번호는 적지 마세요.</p>
  <div class="dialog-actions"><button type="button" class="quiet" data-close>취소</button><button type="submit" class="primary" data-send>보내기</button></div></form>`;
 const form=dialog.querySelector('form'),text=form.elements.text,count=dialog.querySelector('.feedback-count'),send=dialog.querySelector('[data-send]');
 text.oninput=()=>{count.textContent=`${text.value.length} / ${MAX}`;};
 dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dialog.close());
 form.onsubmit=async e=>{e.preventDefault();const body=text.value.trim();if(body.length<2){notify('내용을 적어 주세요.',true);text.focus();return;}
  if(!FIREBASE_CONFIG){notify('지금은 보낼 수 없습니다. 잠시 후 다시 시도해 주세요.',true);return;}
  send.disabled=true;send.textContent='보내는 중…';
  try{const {auth,store,db}=await firebaseApp();const attach=form.elements.attach.checked;
   const report={kind:form.elements.kind.value,text:body.slice(0,MAX),contact:form.elements.contact.value.trim().slice(0,100),lang,at:store.serverTimestamp(),uid:auth.currentUser?.uid||null,
    page:attach?{version:String(document.querySelector('meta[name="app-version"]')?.content||'dev').slice(0,40),...Object.fromEntries(Object.entries(context()||{}).map(([k,v])=>[k,String(v).slice(0,120)])),ua:navigator.userAgent.slice(0,300),errors:errors.slice(-5)}:null};
   await store.addDoc(store.collection(db,'feedback'),report);
   form.reset();count.textContent=`0 / ${MAX}`;dialog.close();notify('보냈습니다. 소중한 의견 감사합니다!');
  }catch(err){notify((/permission/i.test(err?.code||err?.message||'')?'아직 신고를 받을 준비가 안 됐습니다(보안 규칙 게시 필요). ':'보내지 못했습니다. ')+'잠시 후 다시 시도해 주세요.',true);}
  finally{send.disabled=false;send.textContent='보내기';}};
 if(button)button.onclick=()=>{dialog.showModal();text.focus();};
 return {open:()=>button?.click()};
}

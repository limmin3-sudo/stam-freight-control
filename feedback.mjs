// Feedback and bug reports from the left sidebar. Reports go to the Firestore "feedback" collection, which anyone
// may add to (size-checked by firestore.rules) but no visitor can read; the site owner reads them in the Firebase
// console (Firestore Database → Data → feedback). Recent page errors can be attached to bug reports.
import {FIREBASE_CONFIG} from './firebase-config.mjs';
import {lang} from './i18n.mjs';
const SDK='https://www.gstatic.com/firebasejs/10.14.1/';
const MAX=2000,IMAGE_MAX=880000,errors=[];
window.addEventListener('error',e=>{errors.push(String(e.message||e.error||'').slice(0,300));if(errors.length>5)errors.shift();});
window.addEventListener('unhandledrejection',e=>{errors.push(String(e.reason?.message||e.reason||'').slice(0,300));if(errors.length>5)errors.shift();});

export async function firebaseApp(){const [app,auth,store]=await Promise.all(['firebase-app.js','firebase-auth.js','firebase-firestore.js'].map(f=>import(SDK+f)));
 const a=app.getApps()[0]||app.initializeApp(FIREBASE_CONFIG);return {auth:auth.getAuth(a),store,db:store.getFirestore(a)};}

export function createFeedback(button,{notify=()=>{},context=()=>({})}={}){
 const dialog=document.createElement('dialog');dialog.className='feedback-dialog desk-dialog';document.body.append(dialog);
 dialog.innerHTML=`<form method="dialog"><div class="dialog-title"><h2>피드백 · 오류 신고</h2><button type="button" data-close aria-label="닫기">×</button></div>
  <p class="feedback-intro">사소한 것이라도 좋으니 무엇이든 적어 주시면 감사하겠습니다. 예를 들어 「내 모니터 해상도에서는 화면이 이상하게 보인다」 같은 경우 스크린샷을 첨부해 주시면 그 화면에 맞춰 고쳐 드립니다.</p>
  <div class="feedback-kind" role="radiogroup" aria-label="종류"><label><input type="radio" name="kind" value="feedback" checked> 피드백 · 제안</label><label><input type="radio" name="kind" value="bug"> 오류 신고</label></div>
  <label class="feedback-text">내용<textarea name="text" maxlength="${MAX}" rows="7" required placeholder="불편한 점, 바라는 기능, 오류가 난 상황(어느 화면에서 무엇을 눌렀는지)을 적어 주십시오."></textarea></label>
  <div class="feedback-count small subtle" aria-live="polite">0 / ${MAX}</div>
  <div class="feedback-shot"><label class="feedback-file">스크린샷 첨부 (선택)<input type="file" name="shot" accept="image/*"></label><span class="small subtle">이 창에서 Ctrl+V로 붙여 넣어도 됩니다.</span><div class="feedback-preview" hidden><img alt="첨부한 스크린샷 미리보기"><button type="button" class="quiet" data-clear-shot>첨부 빼기</button></div></div>
  <label>연락처 (선택)<input name="contact" maxlength="100" placeholder="디스코드·게임 닉네임 등 · 답장이 필요할 때만"></label>
  <label class="check"><input type="checkbox" name="attach" checked> 앱 정보 함께 보내기 (버전·언어·함선·계약 수·최근 오류. 미션 내용은 보내지 않습니다)</label>
  <p class="small subtle">보낸 내용은 사이트 운영자만 볼 수 있습니다. 개인 정보나 비밀번호는 적지 마세요.</p>
  <div class="dialog-actions"><button type="button" class="quiet" data-close>취소</button><button type="submit" class="primary" data-send>보내기</button></div></form>`;
 const form=dialog.querySelector('form'),text=form.elements.text,count=dialog.querySelector('.feedback-count'),send=dialog.querySelector('[data-send]'),preview=dialog.querySelector('.feedback-preview');
 // A screenshot is shrunk to a JPEG data URL small enough for one Firestore document (no separate file storage).
 let shot=null;
 async function shrink(file){const bitmap=await createImageBitmap(file);let w=Math.min(1920,bitmap.width),q=.8,url='';
  for(let i=0;i<8;i++){const c=document.createElement('canvas');c.width=w;c.height=Math.round(bitmap.height*w/bitmap.width);c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);url=c.toDataURL('image/jpeg',q);if(url.length<=IMAGE_MAX)break;if(q>.55)q-=.1;else w=Math.round(w*.8);}
  bitmap.close?.();if(url.length>IMAGE_MAX)throw Error('too large');return {url,size:`${bitmap.width}x${bitmap.height}`};}
 async function attach(file){if(!file||!/^image\//.test(file.type))return;try{shot=await shrink(file);preview.hidden=false;preview.querySelector('img').src=shot.url;}catch{shot=null;notify('스크린샷을 첨부하지 못했습니다. 다른 이미지로 시도하십시오.',true);}}
 form.elements.shot.onchange=()=>attach(form.elements.shot.files[0]);
 dialog.addEventListener('paste',e=>{const item=[...(e.clipboardData?.items||[])].find(i=>i.type.startsWith('image/'));if(item){e.preventDefault();attach(item.getAsFile());}});
 dialog.querySelector('[data-clear-shot]').onclick=()=>{shot=null;form.elements.shot.value='';preview.hidden=true;};
 text.oninput=()=>{count.textContent=`${text.value.length} / ${MAX}`;};
 dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dialog.close());
 form.onsubmit=async e=>{e.preventDefault();const body=text.value.trim();if(body.length<2){notify('내용을 적어 주십시오.',true);text.focus();return;}
  if(!FIREBASE_CONFIG){notify('지금은 보낼 수 없습니다. 잠시 후 다시 시도하십시오.',true);return;}
  send.disabled=true;send.textContent='보내는 중…';
  try{const {auth,store,db}=await firebaseApp();const attach=form.elements.attach.checked;
   const report={kind:form.elements.kind.value,text:body.slice(0,MAX),contact:form.elements.contact.value.trim().slice(0,100),lang,at:store.serverTimestamp(),uid:auth.currentUser?.uid||null,
    page:attach?{version:String(document.querySelector('meta[name="app-version"]')?.content||'dev').slice(0,40),...Object.fromEntries(Object.entries(context()||{}).map(([k,v])=>[k,String(v).slice(0,120)])),ua:navigator.userAgent.slice(0,300),screen:`${innerWidth}x${innerHeight} @${devicePixelRatio}`,errors:errors.slice(-5)}:null,image:shot?.url||null};
   await store.addDoc(store.collection(db,'feedback'),report);
   form.reset();shot=null;preview.hidden=true;count.textContent=`0 / ${MAX}`;dialog.close();notify('보냈습니다. 소중한 의견 감사합니다!');
  }catch(err){notify((/permission/i.test(err?.code||err?.message||'')?'아직 신고를 받을 준비가 안 됐습니다(보안 규칙 게시 필요). ':'보내지 못했습니다. ')+'잠시 후 다시 시도하십시오.',true);}
  finally{send.disabled=false;send.textContent='보내기';}};
 if(button)button.onclick=()=>{dialog.showModal();text.focus();};
 return {open:()=>button?.click()};
}

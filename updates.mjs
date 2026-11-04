import {isEn} from './i18n.mjs';
const validVersion=v=>typeof v==='string'&&/^[a-zA-Z0-9._-]{1,100}$/.test(v);
export function readManifest(value){
 if(!value||!validVersion(value.version))throw Error('업데이트 정보를 확인하지 못했습니다.');
 return {version:value.version,releases:Array.isArray(value.releases)?value.releases:[]};
}
export function updateURL(href,version){
 if(!validVersion(version))throw Error('올바르지 않은 버전입니다.');
 const url=new URL(href);url.searchParams.set('v',version);return url.href;
}
export function createUpdates({beforeReload=()=>true,intervalMs=60000,checkUpdates=true}={}){
 let running=document.querySelector('meta[name="app-version"]')?.content||null,latest=null,checking=false;
 const historyButton=document.createElement('button');historyButton.type='button';historyButton.className='quiet';historyButton.id='updates-open';historyButton.textContent='업데이트 기록';
 document.querySelector('.topnav').append(historyButton);
 const banner=document.createElement('aside');banner.className='update-banner';banner.hidden=true;banner.setAttribute('aria-live','polite');banner.innerHTML='<div><strong>새 업데이트가 있습니다.</strong><span>미션·설정·운항 진행을 유지하고 새 버전을 불러옵니다.</span></div><button type="button" class="primary" data-update>업데이트</button><button type="button" class="quiet" data-notes>변경 내용</button>';
 document.body.append(banner);
 function notes(){const from=location.pathname.split('/').pop()||'index.html';window.open('./patch-notes.html?from='+encodeURIComponent(from),'_blank','noopener');}
 async function check(){if(!checkUpdates||checking||document.hidden)return;checking=true;
  try{const url=new URL('./version.json',location.href);url.searchParams.set('_',String(Date.now()));const response=await fetch(url,{cache:'no-store'});if(!response.ok)return;const manifest=readManifest(await response.json());latest=manifest;
   // Source checkouts have no embedded deployment version. Establish a baseline
   // without claiming the development copy is an old production release.
   if(!running)running=manifest.version;
   banner.hidden=manifest.version===running;
  }catch{/* Offline use must remain available. */}finally{checking=false;}
 }
 banner.querySelector('[data-update]').onclick=async()=>{if(!latest||latest.version===running)return;if(await beforeReload()===false)return;location.assign(updateURL(location.href,latest.version));};
 historyButton.onclick=notes;banner.querySelector('[data-notes]').onclick=notes;
 const onVisible=()=>{if(!document.hidden)check();};window.addEventListener('focus',check);document.addEventListener('visibilitychange',onVisible);const timer=setInterval(check,intervalMs);check();
 return {check,open:notes,destroy(){clearInterval(timer);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',onVisible);banner.remove();historyButton.remove();}};
}

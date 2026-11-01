const validVersion=v=>typeof v==='string'&&/^[a-zA-Z0-9._-]{1,100}$/.test(v);
export function readManifest(value){
 if(!value||!validVersion(value.version))throw Error('업데이트 정보를 확인하지 못했습니다.');
 return {version:value.version,releases:Array.isArray(value.releases)?value.releases:[]};
}
export function updateURL(href,version){
 if(!validVersion(version))throw Error('올바르지 않은 버전입니다.');
 const url=new URL(href);url.searchParams.set('v',version);return url.href;
}
export function createUpdates({beforeReload=()=>true,intervalMs=60000}={}){
 let running=document.querySelector('meta[name="app-version"]')?.content||null,latest=null,checking=false;
 const historyButton=document.createElement('button');historyButton.type='button';historyButton.className='quiet';historyButton.id='updates-open';historyButton.textContent='업데이트 기록';
 document.querySelector('.topbar').append(historyButton);
 const banner=document.createElement('aside');banner.className='update-banner';banner.hidden=true;banner.setAttribute('aria-live','polite');banner.innerHTML='<div><strong>새 업데이트가 있습니다.</strong><span>미션·설정·운항 진행을 유지하고 새 버전을 불러옵니다.</span></div><button type="button" class="primary" data-update>업데이트</button><button type="button" class="quiet" data-notes>변경 내용</button>';
 document.body.append(banner);
 const dialog=document.createElement('dialog');dialog.className='updates-dialog';dialog.id='updates-dialog';dialog.innerHTML='<div class="dialog-title"><h2>업데이트 기록</h2><button type="button" aria-label="닫기">×</button></div><div data-release-list></div>';
 document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();
 function render(releases){const list=dialog.querySelector('[data-release-list]');list.replaceChildren();
  if(!releases.length){list.textContent='아직 등록된 업데이트 기록이 없습니다.';return;}
  for(const release of releases.slice(0,50)){if(!release||typeof release.title!=='string')continue;const section=document.createElement('section'),title=document.createElement('h3'),date=document.createElement('small'),ul=document.createElement('ul');title.textContent=release.title;date.textContent=typeof release.date==='string'?release.date:'';
   for(const change of (Array.isArray(release.changes)?release.changes:[]).slice(0,30)){if(typeof change!=='string')continue;const li=document.createElement('li');li.textContent=change;ul.append(li);}section.append(date,title,ul);list.append(section);}
 }
 async function notes(){if(!dialog.open)dialog.showModal();const list=dialog.querySelector('[data-release-list]');list.textContent='업데이트 기록을 불러오고 있습니다.';
  if(latest?.releases.length){render(latest.releases);return;}
  try{const response=await fetch('./data/releases.json',{cache:'no-store'});if(!response.ok)throw Error();render(await response.json());}catch{list.textContent='업데이트 기록을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.';}
 }
 async function check(){if(checking||document.hidden)return;checking=true;
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
 return {check,open:notes,destroy(){clearInterval(timer);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',onVisible);banner.remove();dialog.remove();historyButton.remove();}};
}

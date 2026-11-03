export const UPDATE_MANIFEST='https://raw.githubusercontent.com/limmin3-sudo/stam-freight-control/refs/heads/rebuild/log-evidence-foundation/data/rebuild-version.json';
export const DOWNLOAD_URL='https://codeload.github.com/limmin3-sudo/stam-freight-control/zip/refs/heads/rebuild/log-evidence-foundation';
export function readRebuildVersion(raw){
 if(typeof raw?.version!=='string'||!/^rebuild\.\d{8}\.[1-9]\d{0,4}$/.test(raw.version))throw Error('시험판 버전 형식을 확인하지 못했습니다.');
 return raw.version;
}
export function newerRebuild(current,next){
 const a=readRebuildVersion({version:current}).split('.'),b=readRebuildVersion({version:next}).split('.');
 return Number(b[1])>Number(a[1])||(b[1]===a[1]&&Number(b[2])>Number(a[2]));
}
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
export function createWorkspaceUpdates(button,{fetcher=fetch}={}){
 const dialog=el('dialog');dialog.className='workspace-dialog updates-dialog';
 const title=el('div');title.className='dialog-title';const close=el('button','×');close.type='button';close.setAttribute('aria-label','업데이트 기록 닫기');close.onclick=()=>dialog.close();title.append(el('h2','업데이트 기록'),close);
 const status=el('p','설치된 시험판 버전을 확인하고 있습니다.');status.setAttribute('role','status');
 const check=el('button','새 시험판 확인');check.type='button';
 const download=el('a','새 시험판 ZIP 다운로드');download.href=DOWNLOAD_URL;download.target='_blank';download.rel='noopener noreferrer';download.hidden=true;
 const list=el('div');dialog.append(title,status,check,download,el('p','현재 화면을 자동으로 새로고침하지 않습니다. 새 버전은 별도 폴더에 풀어 실행해 주세요.'),list);document.body.append(dialog);
 let version=null,loaded=false,loading=false,disposed=false;
 async function json(url){const r=await fetcher(url,{cache:'no-store',signal:AbortSignal.timeout(8000),credentials:'omit',referrerPolicy:'no-referrer'});if(!r.ok)throw Error('업데이트 정보를 불러오지 못했습니다.');return r.json();}
 function section(label,records){list.append(el('h3',label));if(!Array.isArray(records))throw Error('기록 형식이 올바르지 않습니다.');for(const r of records.slice(0,300)){if(typeof r?.title!=='string')continue;const box=el('section');box.append(el('small',[r.date,r.version].filter(v=>typeof v==='string').join(' · ')),el('h4',r.title));const ul=el('ul');for(const c of (Array.isArray(r.changes)?r.changes:[]).slice(0,30))if(typeof c==='string')ul.append(el('li',c));box.append(ul);list.append(box);}}
 async function open(){if(disposed)return;if(!dialog.open)dialog.showModal();if(loaded||loading)return;loading=true;check.disabled=true;
  try{const [v,dev,old]=await Promise.all([json(new URL('../../data/rebuild-version.json',import.meta.url)),json(new URL('../../data/rebuild-releases.json',import.meta.url)),json(new URL('../../data/releases.json',import.meta.url))]);if(disposed)return;
   version=readRebuildVersion(v);status.textContent=`현재 시험판 ${version}`;list.replaceChildren();section('재구축 시험판',dev);section('기존 운영판 기록',old);loaded=true;
  }catch{status.textContent='기록을 불러오지 못했습니다. 창을 다시 열어 재시도해 주세요.';}finally{loading=false;check.disabled=!version;}}
 check.onclick=async()=>{if(!version||check.disabled)return;check.disabled=true;status.textContent='공개 저장소에서 새 시험판을 확인하고 있습니다.';
  try{const next=readRebuildVersion(await json(UPDATE_MANIFEST));if(disposed)return;const newer=newerRebuild(version,next);download.hidden=!newer;status.textContent=newer?`새 시험판 ${next}이 있습니다. 현재: ${version}`:`현재 시험판 ${version}보다 새로운 버전이 없습니다.`;}
  catch{status.textContent='새 시험판을 확인하지 못했습니다. 현재 앱은 계속 사용할 수 있습니다.';}finally{check.disabled=false;}};
 button.onclick=open;return {open,destroy(){disposed=true;dialog.remove();button.onclick=null;}};
}

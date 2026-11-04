// One browser tab. Keep the live deck mounted behind a full-window document viewer.
// Only these same-origin public pages can be embedded; pairing tokens never enter their URL.
const pages=new Set(['guide.html','patch-notes.html','download.html']);
let viewer=null;
export function openWorkspacePage(name){return viewer?viewer.open(name):location.assign(name);}
export function mountPageNavigation(){
 if(viewer)return viewer;
 const dialog=document.createElement('dialog'),frame=document.createElement('iframe');dialog.className='workspace-page';dialog.setAttribute('aria-label','STAM');frame.title='STAM';dialog.append(frame);document.body.append(dialog);
 let hasEntry=false,previousFocus=null;
 const root=new URL('../../',import.meta.url);
 // Older companions disallow frames. Fall back to same-tab navigation; their log service keeps running.
 const embedding=fetch(new URL('guide.html',root)).then(r=>r.headers.get('x-frame-options')?.toUpperCase()!=='DENY').catch(()=>true);
 const close=()=>{if(hasEntry){history.back();return;}const u=new URL(location.href);u.searchParams.delete('panel');history.replaceState(history.state,'',u);dialog.close();};
 const display=(name,lang,hash='')=>{if(!pages.has(name))return;const u=new URL(name,root);u.searchParams.set('lang',lang==='en'?'en':'ko');u.hash=hash;frame.contentWindow.location.replace(u.href);if(!dialog.open){previousFocus=document.activeElement;dialog.showModal();}};
 async function open(name){const requested=new URL(name,root),file=requested.pathname.split('/').pop();if(requested.origin!==location.origin||!pages.has(file))return;if(!await embedding){location.assign(requested.href);return;}
  const lang=requested.searchParams.get('lang')||document.documentElement.lang,next=new URL(location.href);next.searchParams.set('panel',file);next.searchParams.set('lang',lang);
  const state={...history.state,stamPanel:file};if(!dialog.open){history.pushState(state,'',next);hasEntry=true;}else history.replaceState(state,'',next);
  display(file,lang,requested.hash);
 }
 frame.addEventListener('load',()=>{
  const doc=frame.contentDocument;if(!doc)return;frame.title=doc.title;
  doc.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;const url=new URL(a.href),file=url.pathname.split('/').pop();if(url.origin!==location.origin)return;
   if(pages.has(file)||['index.html','flight-deck.html'].includes(file)){e.preventDefault();e.stopImmediatePropagation();if(pages.has(file))open(url.href);else close();}
  },true);
 });
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('close',()=>{frame.contentWindow.location.replace('about:blank');previousFocus?.focus();});
 window.addEventListener('popstate',()=>{const u=new URL(location.href),name=u.searchParams.get('panel');if(pages.has(name)){display(name,u.searchParams.get('lang'));}else{hasEntry=false;u.searchParams.set('lang',document.documentElement.lang);history.replaceState(history.state,'',u);dialog.close();}});
 document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;const url=new URL(a.href);if(url.origin===location.origin&&pages.has(url.pathname.split('/').pop())){e.preventDefault();open(url.href);}});
 viewer={open};const requested=new URL(location.href);if(pages.has(requested.searchParams.get('panel')))display(requested.searchParams.get('panel'),requested.searchParams.get('lang'));
 return viewer;
}

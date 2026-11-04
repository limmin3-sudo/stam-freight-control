const requested=new URLSearchParams(location.search).get('lang');
let saved;try{saved=localStorage.getItem('sfc-lang');}catch{}
export const language=['ko','en'].includes(requested)?requested:saved==='en'?'en':'ko';
export const en=language==='en';
export const t=(ko,english)=>en?english:ko;
document.documentElement.lang=language;
try{localStorage.setItem('sfc-lang',language);}catch{}
export function languageLinks(){for(const a of document.querySelectorAll('a[href]')){const u=new URL(a.href);if(u.origin===location.origin&&/\/(index|flight-deck|guide|patch-notes|download)\.html$/.test(u.pathname)){u.searchParams.set('lang',language);a.href=u.href;}}}
export function mountPageLanguage(host){
 const group=document.createElement('span');group.className='page-language';group.setAttribute('role','group');group.setAttribute('aria-label','Language');
 for(const [code,label]of[['ko','한국어'],['en','English']]){const a=document.createElement('a'),url=new URL(location.href);url.searchParams.set('lang',code);a.href=url.href;a.textContent=label;a.dataset.lang=code;a.setAttribute('aria-current',String(code===language));group.append(a);}host.append(group);languageLinks();
}

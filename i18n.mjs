// Korean/English interface with independently authored game-name labels.
import {PHRASES,PATTERNS,HTML} from './i18n-en.mjs';
const KEY='sfc-lang';
const MODES=['ko','en'];
function initial(){if(typeof document==='undefined')return 'ko';// tests and scripts run in Korean
 try{const v=localStorage.getItem(KEY);if(MODES.includes(v))return v;if(localStorage.getItem('vh-missions')||localStorage.getItem('sfc-voice'))return 'ko';}catch{}
 return /^ko\b/i.test(navigator.language||'ko')?'ko':'en';}
export const lang=initial();
export const isEn=lang==='en';
// English mode retains canonical English game names.
export const gameEn=lang==='en';
export function setLang(next){if(!MODES.includes(next)||next===lang)return;try{localStorage.setItem(KEY,next);}catch{}location.reload();}
export const L=(ko,en)=>isEn?en:ko;

const HANGUL=/[가-힣]/;
const literal=Object.entries(PHRASES).sort((a,b)=>b[0].length-a[0].length);
const compile=list=>list.map(([re,to])=>[new RegExp(re.source,re.flags.includes('g')?re.flags:re.flags+'g'),to]);
const pre=compile(PATTERNS.filter(p=>p[2]!=='post')),post=compile(PATTERNS.filter(p=>p[2]==='post'));
const missing=new Set();
export function tr(text){
 if(!isEn||typeof text!=='string'||!HANGUL.test(text))return text;
 let out=text;
 for(const [re,to] of pre){if(!HANGUL.test(out))break;out=out.replace(re,to);}
 for(const [ko,en] of literal){if(!HANGUL.test(out))break;if(out.includes(ko))out=out.split(ko).join(en);}
 for(const [re,to] of post){if(!HANGUL.test(out))break;out=out.replace(re,to);}
 if(HANGUL.test(out)&&missing.size<500)missing.add(text.trim());
 return out;
}
const ATTRS=['placeholder','title','aria-label','alt','data-tip'];
const SKIP='script,style,textarea,[data-i18n-skip],[contenteditable="true"]',ATTR_SKIP='[data-i18n-skip],[contenteditable="true"]';
function translateNode(node){
 if(node.nodeType===3){const p=node.parentElement;if(!p||p.closest(SKIP))return;const v=node.nodeValue;if(HANGUL.test(v)){const t=tr(v);if(t!==v)node.nodeValue=t;}return;}
 if(node.nodeType!==1||node.closest(ATTR_SKIP))return;
 for(const el of [node,...node.querySelectorAll('[data-i18n]')]){const key=el.getAttribute?.('data-i18n');if(key&&HTML[key]&&el.dataset.i18nDone!==key){el.innerHTML=HTML[key];el.dataset.i18nDone=key;}}
 for(const a of ATTRS){const v=node.getAttribute(a);if(v&&HANGUL.test(v)){const t=tr(v);if(t!==v)node.setAttribute(a,t);}}
 if(node.tagName==='INPUT'&&(node.type==='button'||node.type==='submit')&&HANGUL.test(node.value))node.value=tr(node.value);
 const walker=document.createTreeWalker(node,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
 for(let n=walker.nextNode();n;n=walker.nextNode()){if(n.nodeType===3)translateNode(n);else for(const a of ATTRS){const v=n.getAttribute(a);if(v&&HANGUL.test(v)&&!n.closest(ATTR_SKIP)){const t=tr(v);if(t!==v)n.setAttribute(a,t);}}}
}
// Starts translating the live page (English mode only). Call once, as early as possible.
export function startTranslation(){
 document.documentElement.lang=isEn?'en':'ko';
 if(!isEn)return;
 document.title=tr(document.title);
 translateNode(document.body);
 new MutationObserver(list=>{for(const m of list){if(m.type==='characterData')translateNode(m.target);else if(m.type==='attributes')translateNode(m.target);else m.addedNodes.forEach(translateNode);}})
  .observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});
 const wrap=fn=>msg=>fn.call(window,tr(String(msg??'')));window.alert=wrap(window.alert);window.confirm=wrap(window.confirm);
 window.__i18nMissing=missing;
}
export function languageButton(){const box=document.createElement('div');box.className='lang-switch';box.dataset.i18nSkip='';box.setAttribute('role','group');box.setAttribute('aria-label','Language / 언어');
 for(const [v,label,title] of [['ko','한국어','한국어 화면'],['en','English','English interface']]){
  const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-pressed',String(v===lang));b.onclick=()=>setLang(v);box.append(b);}
 return box;}

import {en,t,language,mountPageLanguage} from './language.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
// Only known same-origin entry points are allowed; no arbitrary return URL/token.
const allowed=new Set(['index.html','flight-deck.html','legacy-planner.html']);
const requested=new URLSearchParams(location.search).get('from');
const target=allowed.has(requested)?requested:'index.html';
const back=document.getElementById('return-control');back.href=target+'?lang='+language;

const host=document.getElementById('releases'),nav=document.getElementById('release-nav');
async function load(){
 try{const r=await fetch(new URL('../data/releases.json',import.meta.url),{cache:'no-store'});if(!r.ok)throw Error();const records=await r.json();if(!Array.isArray(records))throw Error();
  host.replaceChildren();nav.replaceChildren();for(const [i,record] of records.slice(0,300).entries()){
   if(typeof record?.title!=='string')continue;
   const card=el('article','');card.id=`release-${i}`;
   const copy=en?record.en:record;
   const preview=record.id==='2026-11-04-log-workspace';
   card.append(el('small',`${record.date||''} / v${record.version||''}${preview?t(' · 공개 시험판',' · Public preview'):''}`),el('h3',copy.title));
   const list=el('ul','');for(const line of (Array.isArray(copy.changes)?copy.changes:[]).slice(0,30))if(typeof line==='string')list.append(el('li',line));card.append(list);host.append(card);
   if(i<10){const link=el('a',`v${record.version}${preview?t(' 시험판',' preview'):''}`);link.href='#'+card.id;nav.append(link);}
  }
 }catch{host.replaceChildren(el('p',t('패치노트를 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.','Could not load release notes. Check your connection and try again.')));const retry=el('button',t('다시 불러오기','Retry'));retry.type='button';retry.onclick=load;host.append(retry);}
}
if(en){document.querySelector('.masthead-section').textContent='Release notes';document.title='Release notes · STAM FREIGHT CONTROL';back.textContent='Return to control ↗';document.querySelector('h1').textContent='Release notes';document.querySelector('.lead').textContent='New equipment for your flight deck. Updates, improvements and fixes.';document.querySelector('.history-heading').textContent='Release history';nav.setAttribute('aria-label','Jump to version');host.textContent='Loading release notes…';document.querySelector('.brand img').alt='STAM logo';}
mountPageLanguage(document.querySelector('header'));
load();

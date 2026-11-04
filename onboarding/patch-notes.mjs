const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
// Only known same-origin entry points are allowed; no arbitrary return URL/token.
const allowed=new Set(['index.html','flight-deck.html','legacy-planner.html']);
const requested=new URLSearchParams(location.search).get('from');
const target=allowed.has(requested)?requested:'index.html';
const back=document.getElementById('return-control');back.href=target;
back.onclick=e=>{try{if(window.opener&&!window.opener.closed&&window.opener.location.origin===location.origin){e.preventDefault();window.opener.focus();window.close();}}catch{/* A regular link remains usable without an opener. */}};
const host=document.getElementById('releases'),nav=document.getElementById('release-nav');
async function load(){
 try{const r=await fetch(new URL('../data/releases.json',import.meta.url),{cache:'no-store'});if(!r.ok)throw Error();const records=await r.json();if(!Array.isArray(records))throw Error();
  host.replaceChildren();for(const [i,record] of records.slice(0,300).entries()){
   if(typeof record?.title!=='string')continue;
   const card=el('article','');card.id=`release-${i}`;
   const preview=record.id==='2026-11-04-log-workspace';
   card.append(el('small',`${record.date||''} / v${record.version||''}${preview?' · 공개 시험판':''}`),el('h3',record.title));
   const list=el('ul','');for(const line of (Array.isArray(record.changes)?record.changes:[]).slice(0,30))if(typeof line==='string')list.append(el('li',line));card.append(list);host.append(card);
   if(i<10){const link=el('a',`v${record.version}${preview?' 시험판':''}`);link.href='#'+card.id;nav.append(link);}
  }
 }catch{host.replaceChildren(el('p','패치노트를 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.'));const retry=el('button','다시 불러오기');retry.type='button';retry.onclick=load;host.append(retry);}
}
load();

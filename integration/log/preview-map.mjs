import {jumpLinks} from './preview-routes.mjs';

const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const partners={
  navigator:{name:'수석 항해사',image:'navigator.jpg',line:'함께 운송할 화물과 방문 순서를 정리하겠습니다.'},
  operator:{name:'브리지 오퍼레이터',image:'aide.jpg',line:'가까운 계약부터 마무리하겠습니다. 가는 길의 픽업도 챙기겠습니다.'},
};
export function partnerBadge(onChange) {
  const root=el('button');root.type='button';root.className='preview-partner';
  const portrait=el('img');portrait.alt='';portrait.width=40;portrait.height=40;
  const text=el('span'),name=el('strong'),caption=el('small','운항 파트너 · 변경');text.append(caption,name);
  root.append(portrait,text);root.onclick=onChange;
  return {root,set(id){const p=partners[id]||partners.navigator;
    portrait.src=new URL(`../../assets/partners/${p.image}`,import.meta.url).href;
    name.textContent=p.name;root.setAttribute('aria-label',`${p.name} · 파트너 변경`);root.title=p.line;
  }};
}

// Loaded only after the pinned Three.js dependency is ready. No legacy aliases,
// localization files, external maps or game position tracking are used here.
export async function createPreviewMap(host,{locations,partner,onPartner,onStart,onVisit,quality='normal',onQuality}={}) {
  const {createStarMap}=await import('../../starmap-core.mjs');
  const section=el('section');section.className='preview-map-section';
  const title=el('h3','운송 지도'),tools=el('div');tools.className='preview-map-tools';
  const search=el('input');search.type='search';search.placeholder='지도에서 지명 찾기';search.setAttribute('aria-label','지도 지명 검색');
  const results=el('div');results.className='preview-map-results';results.hidden=true;
  const searchWrap=el('div');searchWrap.className='preview-map-search';searchWrap.append(search,results);
  const qualitySelect=el('select');qualitySelect.setAttribute('aria-label','지도 화질');
  for(const [value,name] of [['normal','기본 화질'],['high','상세 화질']]){const o=el('option',name);o.value=value;qualitySelect.append(o);}
  qualitySelect.value=quality==='high'?'high':'normal';
  tools.append(searchWrap,qualitySelect);
  const wrap=el('div');wrap.className='preview-map-viewport';
  const canvas=el('div');canvas.className='preview-map-canvas';
  const badge=partnerBadge(onPartner);badge.set(partner);wrap.append(canvas,badge.root);
  const nav=el('div');nav.className='preview-map-navigation';
  const selection=el('p','계획 경로입니다. 현재 함선 위치를 나타내지 않습니다.');selection.className='preview-map-selection';
  const useStart=el('button','선택 지점에서 출발');useStart.type='button';useStart.hidden=true;
  const footer=el('div');footer.className='preview-map-footer';footer.append(selection,useStart);
  section.append(title,tools,nav,wrap,footer);host.append(section);
  const gates=new Set(jumpLinks.flatMap(j=>[j.from,j.to]));
  const data={locations:locations.map(l=>({...l,isGateway:gates.has(l.id)})),jumps:jumpLinks};
  let map,route=null,selected=null;
  const choose=l=>{
    selected=l;selection.textContent=`${l.name} · ${l.system.toUpperCase()}`;useStart.hidden=false;
    const visits=(route?.visits||[]).map((v,index)=>({v,index})).filter(({v})=>v.locationId===l.id);
    if(visits.length===1)onVisit?.(visits[0].index);
    else if(visits.length>1)selection.textContent+=' · 재방문 지점입니다. 방문 목록에서 단계를 선택해 주세요.';
  };
  try {
    map=createStarMap(canvas,null,data,choose,{quality:qualitySelect.value,qualityStorageKey:null,idleFps:0});
  } catch(error) { section.remove();throw error; }
  for(const [name,action] of [['전체 항성계',()=>map.galaxy()],['Stanton',()=>map.setSystem('stanton')],
    ['Pyro',()=>map.setSystem('pyro')],['Nyx',()=>map.setSystem('nyx')],['시점 초기화',()=>map.home()]]) {
    const button=el('button',name);button.type='button';button.onclick=action;nav.append(button);
  }
  search.oninput=()=>{
    results.replaceChildren();const q=search.value.trim().toLowerCase();results.hidden=!q;
    if(!q)return;
    const found=locations.filter(l=>l.name.toLowerCase().includes(q)).slice(0,8);
    if(!found.length)results.append(el('p','일치하는 영문 지명이 없습니다.'));
    for(const l of found) {
      const b=el('button',`${l.name} · ${l.system.toUpperCase()}`);b.type='button';
      b.onclick=()=>{choose(l);map.focus(l.id);results.hidden=true;search.value=l.name;};results.append(b);
    }
  };
  search.onkeydown=e=>{if(e.key==='Escape')results.hidden=true;};
  qualitySelect.onchange=()=>{map.setQuality(qualitySelect.value);onQuality?.(qualitySelect.value);};
  useStart.onclick=()=>{if(selected)onStart?.(selected.id);};
  return {
    setPartner(id){badge.set(id);},
    setResult(result){route=result?.route||null;map.setRoute(route,-1);},
    focusStage(index) {
      map.setRoute(route,index);
      if(!route)return;
      if(index<0) {
        const byId=new Map(locations.map(l=>[l.id,l]));
        const systems=new Set(route.visits.map(v=>byId.get(v.locationId)?.system).filter(Boolean));
        if(systems.size>1)map.galaxy();else {map.setSystem([...systems][0]||'stanton');map.home();}
      } else if(index===0)map.focus(route.visits[0].locationId);
      else map.focusLeg(index);
    },
    focus(id){map.focus(id);},
    dispose(){map.dispose();section.remove();},
    debug:()=>map._debug(),
  };
}

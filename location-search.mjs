import {suggestLocations,placeLabel} from './aliases.mjs';
import {isEn} from './i18n.mjs';

// Explicit selection keeps typo suggestions from silently choosing a destination.
export function mountLocationSearch(input,locations,onSelect){
 const host=document.createElement('div');host.className='map-search-host';input.before(host);host.append(input);
 const list=document.createElement('div');list.id='map-search-results';list.className='map-search-results';list.hidden=true;list.setAttribute('role','listbox');host.append(list);
 input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',list.id);input.setAttribute('aria-expanded','false');
 let results=[],active=-1;
 const close=()=>{list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1;};
 const choose=loc=>{if(!loc)return;close();input.value='';input.blur();onSelect(loc);};
 const highlight=()=>{list.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-selected',String(i===active)));if(active>=0){input.setAttribute('aria-activedescendant',`${list.id}-${active}`);list.children[active]?.scrollIntoView({block:'nearest'});}else input.removeAttribute('aria-activedescendant');};
 const render=()=>{results=suggestLocations(input.value,locations,{limit:10});active=-1;list.replaceChildren();if(!input.value.trim()){close();return;}
  for(const [i,loc] of results.entries()){const button=document.createElement('button');button.type='button';button.id=`${list.id}-${i}`;button.setAttribute('role','option');button.setAttribute('aria-selected','false');button.tabIndex=-1;const name=document.createElement('b'),system=document.createElement('small');name.textContent=placeLabel(loc);system.textContent=loc.system.toUpperCase();button.append(name,system);button.onpointerdown=e=>e.preventDefault();button.onclick=()=>choose(loc);list.append(button);}
  if(!results.length){const empty=document.createElement('p');empty.textContent=isEn?'No matching locations.':'일치하는 장소가 없습니다.';list.append(empty);}list.hidden=false;input.setAttribute('aria-expanded','true');input.removeAttribute('aria-activedescendant');};
 input.addEventListener('input',render);input.addEventListener('focus',render);
 input.addEventListener('keydown',e=>{if(e.isComposing)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}else if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();if(list.hidden)render();if(results.length){active=(active+(e.key==='ArrowDown'?1:results.length-1)+results.length)%results.length;highlight();}}else if(e.key==='Enter'&&!list.hidden){e.preventDefault();choose(results[active<0?0:active]);}});
 input.addEventListener('blur',()=>{if(!host.contains(document.activeElement))close();});
 host.addEventListener('focusout',e=>{if(!host.contains(e.relatedTarget))close();});
 return {close};
}

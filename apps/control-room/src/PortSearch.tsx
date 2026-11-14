import {useId,useMemo,useState} from 'react';
import {currentLocationData} from './personal-locations.mjs';
import {findPorts} from './port-search.mjs';
import {placeName} from './mission-trial';
import type {Locale} from './navigation';
import './port-search.css';

type Props={locale:Locale;label:string;value?:string;onSelect:(id:string)=>void};
export function PortSearch({locale,label,value,onSelect}:Props){
  const data=currentLocationData();
  const listId=useId();
  const [query,setQuery]=useState<string|null>(null);
  const [active,setActive]=useState(-1);
  const results=useMemo(()=>query!==null&&(query.trim()||value!==undefined)?findPorts(query):[],[query,value,data]);
  const language=locale==='ko'?0:1;
  const open=query!==null && (!!query.trim() || value!==undefined);
  function close(){setQuery(null);setActive(-1);}
  function select(id:string){onSelect(id);close();}
  return <div className="port-search" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))close();}}>
    <label>{label}<input type="text" role="combobox" autoComplete="off" aria-autocomplete="list" aria-expanded={open}
      aria-controls={listId} aria-activedescendant={open&&active>=0?listId+'-'+active:undefined}
      placeholder={locale==='en'?'Search ports and locations':'거점 이름 검색'} value={query??(value?placeName(value,language):'')}
      onFocus={e=>e.target.select()} onClick={()=>{if(query===null)setQuery('');}} onChange={e=>{setQuery(e.target.value);setActive(-1);}}
      onKeyDown={e=>{
        if(e.nativeEvent.isComposing)return;
        if(!open&&e.key==='ArrowDown'&&value!==undefined){e.preventDefault();setQuery('');setActive(0);return;}
        if(!open)return;
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
        if(results.length && (e.key==='ArrowDown'||e.key==='ArrowUp')){
          e.preventDefault();setActive(i=>e.key==='ArrowDown'?(i+1)%results.length:(i<=0?results.length-1:i-1));
        }
        if(e.key==='Enter'){e.preventDefault();const hit=results[Math.max(0,active)];if(hit)select(hit.id);}
      }}/></label>
    <div id={listId} role="listbox" aria-label={label} hidden={!open}>
      {results.map((port,i)=><button type="button" role="option" id={listId+'-'+i} key={port.id}
        ref={button=>{if(button&&i===active){const list=button.parentElement!;if(button.offsetTop<list.scrollTop)list.scrollTop=button.offsetTop;else if(button.offsetTop+button.offsetHeight>list.scrollTop+list.clientHeight)list.scrollTop=button.offsetTop+button.offsetHeight-list.clientHeight;}}} aria-selected={i===active} tabIndex={-1} onMouseDown={e=>e.preventDefault()} onClick={()=>select(port.id)}>
        {placeName(port.id,language)} <small>{port.system.toUpperCase()}</small></button>)}
      {open&&!results.length&&<span role="status">{locale==='en'?'No matching locations':'일치하는 거점이 없습니다.'}</span>}
    </div>
  </div>;
}

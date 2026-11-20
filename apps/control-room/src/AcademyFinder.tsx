import {useRef, useState} from 'react';
import {academyLessons, type AcademyText} from './academy-lessons';
import type {Locale} from './navigation';
import {tradeShips} from './trade-cargo.mjs';
import {shipLabel, shipMatches} from './ship-catalogue';

export type AcademyDestination =
  | {room:'education'; section:'lessons' | 'combinations'; lesson?:string}
  | {room:'freight-information'; section:'ships' | 'cargo' | 'issues' | 'missions' | 'audit'; ship?:string}
  | {room:'operations-study'};

type Entry = {title:AcademyText; terms:string; destination:AcademyDestination};
const featured:Entry[] = [
  {title:['초반 평판용 계약을 어떻게 묶을까?', 'Which early contracts can I combine?'], terms:'초보 미션 조합 묶기 묶는 법 신입 평판 beginner reputation missions bundles', destination:{room:'education', section:'combinations'}},
  {title:['내 함선에는 얼마나 실을 수 있을까?', 'How much cargo can my ship carry?'], terms:'함선 적재량 용량 상자 화물 그리드 ship capacity scu grids', destination:{room:'freight-information', section:'ships'}},
  {title:['Hull B로 6계약을 함께 운송한 경로', 'How a Hull B hauled six contracts together'], terms:'헐비 헐 B 363 SCU 오리슨 스탠턴 파이로 실제 사례 orison stanton pyro interstellar study', destination:{room:'operations-study'}},
];
const lessons:Entry[] = academyLessons.map(lesson=>({
    title:lesson.title, terms:[...lesson.topic,...lesson.summary,...lesson.steps.flat(),...(lesson.fieldNote?.title??[])].join(' '),
    destination:{room:'education' as const, section:'lessons' as const, lesson:lesson.id},
  }));
const starters=lessons.filter(e=>e.destination.room==='education'&&['accept-first-haul','read-first-quote'].includes(e.destination.lesson??''));
const index:Entry[] = [...featured,...lessons,
  {title:['품목별 화물과 상자 규격', 'Cargo types and container sizes'], terms:'적재 크기 상자 자료 commodities freight box', destination:{room:'freight-information', section:'cargo'}},
  {title:['발주처·평판별 미션 찾기', 'Find missions by contractor or rank'], terms:'계약 조건 임무 contract reputation missions', destination:{room:'freight-information', section:'missions'}},
  {title:['운송 전 확인할 패치 유의사항', 'Known issues to check before hauling'], terms:'RSI 공지 버그 patch advisories bugs', destination:{room:'freight-information', section:'issues'}},
  {title:['운송 자료의 출처 대조', 'Compare freight reference sources'], terms:'위키 차이 적재량 검증 audit wiki capacity differences', destination:{room:'freight-information', section:'audit'}},
];

const normalize=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[\s·-]+/g,'');
function search(query:string):Entry[] {
  const tokens=query.trim().split(/\s+/).map(normalize).filter(Boolean);
  if (!tokens.length) return [...starters,...featured];
  const matches=index.map(entry=>{
    const title=normalize(entry.title.join(' ')), terms=normalize(entry.terms);
    const score=tokens.reduce((sum, token)=>sum+(title.includes(token)?3:terms.includes(token)?1:0),0);
    return {entry, score, matches:tokens.every(token=>title.includes(token)||terms.includes(token))};
  }).filter(row=>row.matches).sort((a,b)=>b.score-a.score).map(row=>row.entry);
  const ships:Entry[]=tradeShips.filter(ship=>shipMatches(query,ship.id,ship.name)).map(ship=>({
    title:[shipLabel(ship.id,ship.name,'ko'),shipLabel(ship.id,ship.name,'en')], terms:'',
    destination:{room:'freight-information', section:'ships', ship:ship.id},
  }));
  return [...ships,...matches];
}

export function AcademyFinder({locale,onSelect}:{locale:Locale;onSelect:(destination:AcademyDestination)=>void}) {
  const dialog=useRef<HTMLDialogElement>(null), [query,setQuery]=useState('');
  const en=locale==='en', language=en?1:0;
  const searchbox=useRef<HTMLInputElement>(null);
  const results=search(query), label=en?'Find academy material':'아카데미 자료 찾기';
  return <>
    <button className="academy-finder-launch" type="button" aria-haspopup="dialog" onClick={()=>{
      setQuery('');dialog.current?.showModal();searchbox.current?.focus();
    }}>{label}</button>
    <dialog className="academy-finder" ref={dialog} aria-label={label} onKeyDown={e=>{
      if(e.key==='Escape'){e.stopPropagation();e.preventDefault();dialog.current?.close();}
    }}>
      <header><h2>{label}</h2><button type="button" onClick={()=>dialog.current?.close()}>{en?'Close':'닫기'}</button></header>
      <input type="search" ref={searchbox} aria-label={en?'Search academy':'아카데미 검색'} value={query}
        placeholder={en?'Reputation, Galaxy, partial sales…':'초반 평판, 갤럭시, 부분 판매…'} onChange={e=>setQuery(e.target.value)}/>
      <p role="status">{query.trim()?(en?results.length+' results':'검색 결과 '+results.length+'건'):(en?'Start with a question':'어떤 내용이 궁금한가요?')}</p>
      <ul>{results.map(({title,destination})=><li key={title[1]}><button type="button" onClick={()=>{
        dialog.current?.close();onSelect(destination);
      }}><strong>{title[language]}</strong><small>{destination.room==='education'?(en?'Education':'교육실'):destination.room==='operations-study'?(en?'Operations study':'작전 연구실'):(en?'Freight information':'운송 정보실')} ↗</small></button></li>)}</ul>
      {!results.length&&<p>{en?'Try a ship name or a shorter term such as “cargo”.':'함선 이름이나 ‘적재량’처럼 짧은 단어로 찾아보세요.'}</p>}
    </dialog>
  </>;
}

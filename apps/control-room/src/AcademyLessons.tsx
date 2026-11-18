import {useEffect,useRef,useState} from 'react';
import type {AcademyDestination} from './AcademyFinder';
import type {Locale} from './navigation';
import {academyLessons} from './academy-lessons';
import {firstHaul,firstTrade} from './academy-field-lessons';
import {ApprovedGlass} from './ApprovedGlass';

const readKey='stam.academy-read.v1';
const topics=[...new Map(academyLessons.map(l=>[l.topic[0],l.topic])).values()];
const paths=[firstHaul,firstTrade,['all','All lessons'] as const];
type Target=Extract<AcademyDestination,{room:'education'}>;

export default function AcademyLessons({locale,target}:{locale:Locale;target?:Target}){
  const language=locale==='en'?1:0, t=(ko:string,en:string)=>language?en:ko;
  const [search,setSearch]=useState('');
  const [topic,setTopic]=useState<string>(target?.lesson?'all':firstHaul[0]);
  const [error,setError]=useState('');
  const [read,setRead]=useState<string[]>(()=>{
    try {
      const value=JSON.parse(sessionStorage.getItem(readKey)||'[]');
      return Array.isArray(value)?value.filter(id=>academyLessons.some(l=>l.id===id)):[];
    } catch {return [];}
  });
  const selectedLesson=useRef<HTMLDetailsElement>(null);
  useEffect(()=>{
    if(target?.lesson){
      setSearch('');
      setTopic('all');
      if(selectedLesson.current)selectedLesson.current.open=true;
    }
  },[target]);
  const tokens=search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const rows=academyLessons.filter(l=>{
    if(topic!=='all'&&l.topic[0]!==topic)return false;
    const text=[...l.topic,...l.title,...l.summary,...l.steps.flat(),...l.check].join(' ').toLocaleLowerCase();
    return tokens.every(token=>text.includes(token));
  });
  if(target?.lesson)rows.sort((a,b)=>Number(b.id===target.lesson)-Number(a.id===target.lesson));
  function selectTopic(value:string){setTopic(value);setSearch('');}
  function mark(id:string){
    const next=read.includes(id)?read.filter(x=>x!==id):[...read,id];
    setRead(next);
    try {sessionStorage.setItem(readKey,JSON.stringify(next));setError('');}
    catch {setError(t('이 탭의 읽음 표시를 저장하지 못했습니다.','Could not save read markers in this tab.'));}
  }
  return <div className="academy-lessons">
    <nav className="market-tabs academy-paths" aria-label={t('학습 과정','Learning paths')}>
      {paths.map(([id,en])=><button type="button" key={id} aria-pressed={topic===id} onClick={()=>selectTopic(id)}>
        <ApprovedGlass kind={topic===id?'gold':'normal'}/><span>{t(id==='all'?'전체 자료':id,en)}</span>
      </button>)}
    </nav>
    <div className="academy-learning-layout">
      <section className="academy-learning-filters" aria-label={t('학습 검색과 읽음 상태','Lesson search and reading status')}>
        <h3>{t('학습 자료 찾기','Find a lesson')}</h3>
        <div className="academy-fields">
          <label>{t('전체 자료 검색','Search all lessons')}<input type="search" value={search}
            placeholder={t('예: 상자, 티타늄, 부분 판매','e.g. boxes, titanium, partial sale')}
            onChange={e=>{setSearch(e.target.value);setTopic('all');}}/></label>
          <label>{t('학습 주제','Lesson topic')}<select value={topic} onChange={e=>selectTopic(e.target.value)}>
            <option value="all">{t('전체','All')}</option>{topics.map(([ko,en])=><option key={ko} value={ko}>{t(ko,en)}</option>)}
          </select></label>
        </div>
        <p role="status">{t(`자료 ${rows.length}건 · 읽음 ${read.length}/${academyLessons.length} (현재 탭)`,`${rows.length} lessons · read ${read.length}/${academyLessons.length} in this tab`)}</p>
      </section>
      <section className="academy-learning-content" aria-label={t('학습 내용','Lesson content')}>
        {!rows.length&&<p>{t('검색 결과가 없습니다. 품목이나 장소 이름을 짧게 입력해 보세요.','No matching lessons. Try a shorter commodity or place name.')}</p>}
        {rows.map(l=><details className="academy-lesson" key={l.id} ref={l.id===target?.lesson?selectedLesson:undefined} open={l.id===target?.lesson||undefined}>
          <summary><span>{l.topic[language]}</span><strong>{l.title[language]}</strong>{read.includes(l.id)&&<small>✓ {t('읽음','Read')}</small>}</summary>
          <p className="academy-lead">{l.summary[language]}</p>
          {l.example&&<table className="academy-example">
            <caption>{l.example.caption[language]}</caption>
            <thead><tr>{l.example.columns.map(col=><th scope="col" key={col[1]}>{col[language]}</th>)}</tr></thead>
            <tbody>{l.example.rows.map(([label,...cells])=><tr key={label[1]}>
              <th scope="row">{label[language]}</th>{cells.map((cell,i)=><td key={i}>{cell[language]}</td>)}
            </tr>)}</tbody>
          </table>}
          <ol>{l.steps.map((step,i)=><li key={i}>{step[language]}</li>)}</ol>
          <p className="academy-check">{l.check[language]}</p>
          {l.basis&&<p className="academy-note">{l.basis[language]}</p>}
          {l.tool&&<a className="market-action" href={l.tool==='guide'||l.tool==='mission'?'#/'+l.tool+'?lang='+locale:'#/division?lang='+locale+'&facility=trade&room='+l.tool}>
            <ApprovedGlass/><span>{l.tool==='guide'?t('안내데스크에서 운송 연습','Practice hauling at the welcome desk'):l.tool==='market'?t('무역 시세 열기','Open trade prices'):l.tool==='trade-operations'?t('거래기록 열기','Open trade records'):t('관련 도구 열기','Open related tool')}</span>
          </a>}
          {l.sources.map(source=><a key={source.url} className="academy-source" href={source.url} target="_blank" rel="noreferrer">{source.name} ↗</a>)}
          <button className="market-action" type="button" onClick={()=>mark(l.id)} aria-pressed={read.includes(l.id)}>
            <ApprovedGlass/><span>{read.includes(l.id)?t('읽음 표시 해제','Mark unread'):t('읽음으로 표시','Mark read')}</span>
          </button>
        </details>)}
        {error&&<p role="alert">{error}</p>}
      </section>
    </div>
  </div>;
}

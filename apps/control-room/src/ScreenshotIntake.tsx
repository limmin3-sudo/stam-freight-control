import {useCallback, useEffect, useRef, useState} from 'react';
import type {Job,Shipment} from './mission-trial';
import type {Locale} from './navigation';
import type {OCRReader} from './contract-intake.mjs';
import {ContractFields,invalidCargo} from './ContractFields';
import './screenshot-intake.css';

type Photo={id:string;file:File;state:'queued'|'review'|'failed';text:string;error:string;jobs:Job[]};
type Props={locale:Locale;locked:boolean;simple:boolean;jobs:Job[];onAdd:(job:Job)=>void};
const blankRow=():Shipment=>({id:crypto.randomUUID(),cargo:['',''],from:'',to:'',scu:0});
const blankContract=():Job=>({id:crypto.randomUUID(),title:['',''],pay:0,rewardUnknown:true,shipments:[blankRow()]});

function Original({file,en}:{file:File;en:boolean}){
  const [url,setUrl]=useState('');
  const [zoom,setZoom]=useState(false);
  useEffect(()=>{
    const next=URL.createObjectURL(file);
    setUrl(next);
    return ()=>URL.revokeObjectURL(next);
  },[file]);
  return <figure className="shot-original">
    <figcaption>{file.name}<button type="button" aria-pressed={zoom} onClick={()=>setZoom(!zoom)}>
      {zoom?(en?'Fit image':'전체 보기'):(en?'Original size':'원본 크기')}</button></figcaption>
    <div className="shot-image" data-zoom={zoom} tabIndex={0}>{url&&<img src={url} alt={en?'Original contract screenshot':'계약 스크린샷 원본'}/>}</div>
  </figure>;
}

export function ScreenshotIntake({locale,locked,simple,jobs,onAdd}:Props){
  const en=locale==='en';
  const t=(ko:string,english:string)=>en?english:ko;
  const [photos,setPhotos]=useState<Photo[]>([]);
  const [selected,setSelected]=useState('');
  const [notice,setNotice]=useState('');
  const dialog=useRef<HTMLDialogElement>(null);
  const fileInput=useRef<HTMLInputElement>(null);
  const reader=useRef<OCRReader|null>(null);
  const readerLanguage=useRef('');
  const active=photos.find(photo=>photo.id===selected) || photos[0];
  const queued=photos.find(photo=>photo.state==='queued');
  const nextId=queued?.id;
  const nextFile=queued?.file;
  const language=en?'eng':'kor';
  const update=useCallback((id:string,patch:Partial<Photo>)=>{
    setPhotos(current=>current.map(photo=>photo.id===id?{...photo,...patch}:photo));
  },[]);

  useEffect(()=>{
    if(!nextId || !nextFile){
      void reader.current?.close();
      reader.current=null;
      return;
    }
    let cancelled=false,settled=false;
    async function recognize(id:string,file:File){
      try{
        const {createOCRReader,textContracts}=await import('./contract-intake.mjs');
        if(cancelled)return;
        if(readerLanguage.current!==language){void reader.current?.close();reader.current=null;}
        readerLanguage.current=language;
        reader.current??=createOCRReader(language);
        const {text}=await reader.current.read(file);
        if(cancelled)return;
        const drafts=textContracts(text);
        settled=true;
        update(id,{state:'review',text,jobs:drafts.length?drafts:[blankContract()]});
      }catch(error){
        if(cancelled)return;
        void reader.current?.close();reader.current=null;
        settled=true;
        update(id,{state:'failed',error:error instanceof Error?error.message:String(error)});
      }
    }
    void recognize(nextId,nextFile);
    return ()=>{
      cancelled=true;
      if(!settled){void reader.current?.close();reader.current=null;}
    };
  },[nextId,nextFile,language,update]);

  const enqueue=useCallback((files:File[])=>{
    if(locked)return;
    const images=files.filter(file=>file.type.startsWith('image/') || (!file.type && /\.(png|jpe?g|webp|bmp|gif|avif)$/i.test(file.name)));
    if(!images.length)return;
    const entries:Photo[]=images.map(file=>({id:crypto.randomUUID(),file,state:'queued',jobs:[],text:'',error:''}));
    setPhotos(current=>[...current,...entries]);
    setNotice('');
    if(!dialog.current?.open)dialog.current?.showModal();
  },[locked]);

  useEffect(()=>{
    function paste(event:ClipboardEvent){
      if(locked || event.defaultPrevented || !event.clipboardData)return;
      const data=event.clipboardData;
      const files=Array.from(data.files);
      if(!files.length)for(const item of Array.from(data.items)){
        const file=item.kind==='file'?item.getAsFile():null;
        if(file)files.push(file);
      }
      if(files.some(file=>file.type.startsWith('image/'))){event.preventDefault();enqueue(files);}
    }
    window.addEventListener('paste',paste);
    return ()=>window.removeEventListener('paste',paste);
  },[enqueue,locked]);
  useEffect(()=>{if(!photos.length || locked)dialog.current?.close();},[photos.length,locked]);

  function drop(event:React.DragEvent){
    if(!event.dataTransfer.types.includes('Files'))return;
    event.preventDefault();
    enqueue(Array.from(event.dataTransfer.files));
  }
  function dragOver(event:React.DragEvent){if(event.dataTransfer.types.includes('Files'))event.preventDefault();}
  function remove(id:string){setPhotos(current=>current.filter(photo=>photo.id!==id));}
  const form=active?.jobs[0];
  const duplicate=form && jobs.some(job=>job.id===form.id);
  const quantityOptional=()=>simple;
  function changeForm(job:Job){if(active)update(active.id,{jobs:[job,...active.jobs.slice(1)]});}
  function advance(){
    if(!active)return;
    if(active.jobs.length>1)update(active.id,{jobs:active.jobs.slice(1)});
    else remove(active.id);
  }
  const pick=()=>fileInput.current?.click();
  return <section className="shot-intake" onDrop={drop} onDragOver={dragOver}>
    <input hidden type="file" ref={fileInput} multiple accept="image/*" onChange={event=>{
      enqueue(Array.from(event.target.files||[]));event.target.value='';
    }}/>
    <div className="shot-upload">
      <button type="button" disabled={locked} onClick={pick}>{t('스크린샷 여러 장 선택','Choose screenshots')}</button>
      <span>{t('여기로 끌어놓거나 Ctrl+V로 붙여넣기','Drop images here or paste with Ctrl+V')}</span>
      {!!photos.length&&<button type="button" disabled={locked} onClick={()=>dialog.current?.showModal()}>{t('검토 이어가기','Resume review')} ({photos.length})</button>}
    </div>
    {notice&&<p role="status">{notice}</p>}
    <dialog ref={dialog} className="shot-review" aria-label={t('스크린샷 계약 검토','Review screenshot contracts')}>
      <header><h2>{t('스크린샷 계약 검토','Review screenshot contracts')}</h2>
        <button type="button" onClick={pick}>{t('사진 추가','Add images')}</button>
        <button type="button" onClick={()=>dialog.current?.close()}>{t('닫기','Close')}</button></header>
      {active&&<>
        <nav className="shot-list" aria-label={t('검토할 원본','Screenshots to review')}>{photos.map((photo,i)=>
          <button type="button" key={photo.id} aria-pressed={active.id===photo.id} onClick={()=>setSelected(photo.id)}>
            {i+1}. {photo.file.name} · {photo.state==='review'?t('검토','Review'):photo.state==='failed'?t('인식 실패','Failed'):
              photo.id===nextId?t('읽는 중','Reading'):t('대기','Queued')}</button>)}</nav>
        <div className="shot-columns">
          <Original key={active.id} file={active.file} en={en}/>
          <div className="shot-details">
            {form?<form className="manifest-editor" key={active.id+form.id} onSubmit={event=>{
              event.preventDefault();
              if(locked || duplicate || invalidCargo(form,locale==='ko'?0:1,quantityOptional))return;
              const title=form.title[0].trim() && form.title[0]!=='—'?form.title:form.shipments[0]!.cargo;
              onAdd({...form,title});
              setNotice(t('운송에 담음','Added to manifest')+' · '+title[locale==='ko'?0:1]);
              advance();
            }}>
              <ContractFields form={form} setForm={changeForm} locale={locale} quantityOptional={quantityOptional} autoFocus={false}/>
              <div><button type="button" onClick={()=>changeForm({...form,shipments:[...form.shipments,blankRow()]})}>{t('+ 운송 항목','+ Shipment')}</button></div>
              {duplicate&&<p role="status">{t('같은 계약 번호가 이미 운송 목록에 있어요.','This contract ID is already in the manifest.')}</p>}
              <div className="shot-actions">
                <button className="manifest-primary" disabled={locked || !!duplicate || invalidCargo(form,locale==='ko'?0:1,quantityOptional)}>{t('확인한 계약 담기','Add reviewed contract')}</button>
                <button type="button" onClick={advance}>{t('이 계약 건너뛰기','Skip contract')}</button>
              </div>
            </form>:<div className="shot-read-state">
              <p role="status">{active.state==='failed'?active.error:active.id===nextId?t('원본에서 계약을 읽고 있어요.','Reading the contract…'):t('앞선 사진을 읽은 뒤 시작해요.','Waiting for the previous image.')}</p>
              {active.state==='failed'&&<button type="button" onClick={()=>update(active.id,{state:'queued',error:''})}>{t('다시 읽기','Retry')}</button>}
              <button type="button" onClick={()=>update(active.id,{state:'review',jobs:[blankContract()]})}>{t('원본 보고 직접 입력','Enter from original')}</button>
              <button type="button" onClick={()=>remove(active.id)}>{t('이 사진 제외','Skip image')}</button>
            </div>}
            {active.text&&<details className="shot-transcript" key={active.id}><summary>{t('인식한 원문','Recognized text')}</summary><pre>{active.text}</pre></details>}
          </div>
        </div>
      </>}
    </dialog>
  </section>;
}

import {createScreenEvidence,screenSignal} from './screen-evidence.mjs';
import {createScreenReader} from './screen-reader.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
export function mountScreenWatch(host,{prepare,getSnapshot,isLive,readerFactory=createScreenReader,capture=()=>navigator.mediaDevices.getDisplayMedia({video:{frameRate:{ideal:2,max:5}},audio:false}),interval=4000}={}){
 const evidence=createScreenEvidence(),heading=el('summary','화면 보조 감시 · 선택'),details=el('details');details.append(heading);host.append(details);
 details.append(el('p','게임 창을 선택하고 수락 알림 또는 진행 중 계약 수가 보이는 영역을 지정하세요. 화면에서만 발견한 정보는 항로·적재에 바로 반영하지 않습니다.'));
 details.append(el('p','화면은 이 브라우저에서만 읽습니다. 첫 사용에는 인식 도구를 내려받습니다. 기본 감시 간격은 4초이며 짧게 뜨는 알림은 놓칠 수 있습니다.'));
 const credit=el('a','문자 인식: Tesseract.js · Apache-2.0');credit.href='https://github.com/naptha/tesseract.js';credit.target='_blank';credit.rel='noopener noreferrer';details.append(credit);
 const mode=el('select'),language=el('select');
 for(const [value,text] of [['notification','계약 수락 알림'],['list','진행 중 계약 수']]){const o=el('option',text);o.value=value;mode.append(o);}
 for(const [value,text] of [['eng','English'],['kor','한국어 + English']]){const o=el('option',text);o.value=value;language.append(o);}
 mode.setAttribute('aria-label','화면 확인 대상');language.setAttribute('aria-label','화면 언어');
 const start=el('button','게임 화면 연결'),stop=el('button','화면 감시 끄기'),apply=el('button','선택한 영역 감시'),status=el('p','화면 보조 감시는 꺼져 있습니다.'),list=el('div');
 status.setAttribute('role','status');list.className='screen-observations';for(const b of [start,stop,apply])b.type='button';stop.hidden=true;apply.hidden=true;
 details.append(mode,language,start,stop,status,list);
 let video,stream,reader,timer,token=0,preview,area,from,signature,disposed=false,lastDimensions;
 const work=document.createElement('canvas'),sample=document.createElement('canvas');sample.width=32;sample.height=16;
 function render(){
  evidence.update(getSnapshot());list.replaceChildren();
  const labels={waiting:'계약 감지 · 로그 확인 중',unmatched:'화면 후보만 남아 있습니다. 수락 로그와 대조되지 않아 화면 판독을 확인해야 합니다.',ambiguous:'같은 제목의 기록이 겹칩니다. 기존 계약은 유지하며 화면 후보를 자동으로 합치지 않습니다.',corroborated:'수락 로그와 대조했습니다. 등록된 계약을 그대로 사용합니다.','log-observed':'같은 시각에 수락 로그가 들어왔습니다. 화면 제목은 판독 보류이며 등록된 계약을 그대로 사용합니다.'};
  for(const row of evidence.rows(Date.now())){
   const card=el('div');card.className='screen-observation';card.dataset.state=row.status;
   card.append(el('p',row.kind==='count'?`화면 계약 수 +${row.count} · 같은 구간의 수락 로그 ${row.logCount}건. 같은 계약인지는 별도 확인이 필요합니다.`:row.title),el('p',labels[row.status]||'계약 수만 비교한 참고 정보입니다.'));
   const dismiss=el('button','알림 닫기');dismiss.type='button';dismiss.onclick=()=>{evidence.dismiss(row.id);render();};card.append(dismiss);list.append(card);
  }
 }
 async function end(message='화면 보조 감시를 껐습니다.'){
  token++;clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());stream=null;
  if(video){video.pause();video.srcObject=null;video=null;}preview?.remove();preview=null;
  const old=reader;reader=null;await old?.close().catch(()=>{});
  area=null;from=null;signature=null;lastDimensions=null;work.width=work.height=0;
  start.disabled=disposed;mode.disabled=language.disabled=false;stop.hidden=apply.hidden=true;status.textContent=message;
 }
 async function tick(run){
  if(run!==token||!reader||!stream)return;
  try{
   render();
   if(!isLive()){status.textContent='로그 연결을 기다리고 있습니다. 화면 읽기를 잠시 멈춥니다.';return;}
   const dimensions=`${video.videoWidth}x${video.videoHeight}`;
   if(dimensions!==lastDimensions){await end('게임 화면 크기가 바뀌었습니다. 화면을 다시 연결해 영역을 지정해 주세요.');return;}
   const sx=Math.round(area.x*video.videoWidth),sy=Math.round(area.y*video.videoHeight),sw=Math.round(area.w*video.videoWidth),sh=Math.round(area.h*video.videoHeight);
   const scale=Math.min(1,960/sw,480/sh);work.width=Math.max(1,Math.round(sw*scale));work.height=Math.max(1,Math.round(sh*scale));
   work.getContext('2d').drawImage(video,sx,sy,sw,sh,0,0,work.width,work.height);
   const ctx=sample.getContext('2d',{willReadFrequently:true});ctx.drawImage(work,0,0,32,16);const data=ctx.getImageData(0,0,32,16).data;
   const current=Array.from({length:512},(_,i)=>(data[i*4]+data[i*4+1]+data[i*4+2])/3);
   const change=!signature||current.reduce((n,v,i)=>n+Math.abs(v-signature[i]),0)/512>4;
   if(change){
    signature=current;status.textContent='선택한 영역의 변화를 확인하고 있습니다.';
    let deadline;const result=await Promise.race([reader.read(work),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Error('화면 읽기가 오래 걸려 감시를 중지했습니다. 영역을 줄여 다시 연결해 주세요.')),10000);})]).finally(()=>clearTimeout(deadline));
    if(run!==token)return;evidence.observe(screenSignal(result.text,mode.value,result.confidence),Date.now());render();
   }
   status.textContent='화면 보조 감시 중 · 변화가 있을 때만 읽습니다. 화면을 보지 못한 동안의 계약은 확인할 수 없습니다.';
  }catch(error){if(run===token)await end(error.message||'화면 감시를 다시 연결해 주세요.');}
  finally{if(run===token&&reader&&stream)timer=setTimeout(()=>tick(run),interval);}
 }
 start.onclick=async()=>{
  if(!isLive()){status.textContent='실시간 로그를 연결한 뒤 화면 감시를 켜 주세요.';return;}
  const run=++token;start.disabled=true;mode.disabled=language.disabled=true;stop.hidden=false;status.textContent='공유할 게임 창을 선택해 주세요.';evidence.reset();render();
  try{
   const selected=await capture();if(run!==token){selected.getTracks().forEach(t=>t.stop());return;}stream=selected;
   stream.getVideoTracks()[0]?.addEventListener('ended',()=>{if(run===token)void end('게임 화면 공유가 종료되었습니다.');},{once:true});
   video=el('video');video.muted=true;video.srcObject=stream;await video.play();if(run!==token)return;
   lastDimensions=`${video.videoWidth}x${video.videoHeight}`;preview=el('canvas');preview.className='screen-region';preview.width=640;preview.height=Math.max(1,Math.round(640*video.videoHeight/video.videoWidth));
   const context=preview.getContext('2d');context.drawImage(video,0,0,preview.width,preview.height);details.insertBefore(preview,list);details.insertBefore(apply,list);apply.hidden=false;apply.disabled=true;
   const point=e=>{const r=preview.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};};
   preview.onpointerdown=e=>{from=point(e);preview.setPointerCapture(e.pointerId);};
   preview.onpointerup=e=>{if(!from)return;const to=point(e);area={x:Math.min(from.x,to.x),y:Math.min(from.y,to.y),w:Math.abs(from.x-to.x),h:Math.abs(from.y-to.y)};from=null;
    context.drawImage(video,0,0,preview.width,preview.height);context.strokeStyle='#4adce3';context.lineWidth=3;context.strokeRect(area.x*preview.width,area.y*preview.height,area.w*preview.width,area.h*preview.height);
    apply.disabled=area.w*video.videoWidth<40||area.h*video.videoHeight<20;
   };
   status.textContent='아래 화면에서 읽을 영역을 드래그한 뒤 감시를 시작해 주세요.';
  }catch{if(run===token)await end('화면을 연결하지 못했습니다. 화면 공유를 허용한 뒤 다시 시도해 주세요.');}
 };
 apply.onclick=async()=>{
  if(!area||!stream)return;const run=token;apply.disabled=true;status.textContent='화면 읽기 도구를 준비하고 있습니다. 첫 사용에는 다운로드가 필요합니다.';
  try{await prepare(language.value);if(run!==token)return;const created=await readerFactory(language.value);if(run!==token){await created.close();return;}reader=created;preview?.remove();preview=null;apply.hidden=true;void tick(run);}
  catch{if(run===token)await end('화면 읽기 도구를 준비하지 못했습니다. 로그 감시는 계속됩니다.');}
 };
 stop.onclick=()=>void end();
 return {update:render,reset:()=>{evidence.reset();render();},stop:()=>end(),destroy:()=>{disposed=true;void end();host.replaceChildren();}};
}

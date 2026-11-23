// A window picker is shown only in response to a click. A single running OCR
// pass owns each frame; stopping the picker also stops the tracks and reader.
import {createOCRReader} from './contract-intake.mjs';
import {objectiveScore,readFrame,type Frame} from './contract-screen';

function canvas(width:number,height:number){
 const image=document.createElement('canvas');image.width=width;image.height=height;return image;
}
function crop(source:CanvasImageSource,x:number,y:number,w:number,h:number,scale:number){
 const out=canvas(Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)));
 out.getContext('2d')!.drawImage(source,x,y,w,h,0,0,out.width,out.height);return out;
}
// Local contrast extracts bright glyphs over the translucent mobiGlas
// background. Compare the decoded objectives from both images.
function contrasted(source:HTMLCanvasElement){
 const out=canvas(source.width,source.height),ctx=out.getContext('2d')!;
 ctx.filter='blur(5px)';ctx.drawImage(source,0,0);
 const background=ctx.getImageData(0,0,out.width,out.height).data;
 const pixels=source.getContext('2d')!.getImageData(0,0,out.width,out.height);
 const a=pixels.data;
 for(let i=0;i<a.length;i+=4){
  const delta=.299*(a[i]!-background[i]!)+.587*(a[i+1]!-background[i+1]!)+.114*(a[i+2]!-background[i+2]!);
  a[i]=a[i+1]=a[i+2]=delta>24?0:255;
 }
 ctx.putImageData(pixels,0,0);return out;
}
// The active mobiGlas tab has a teal fill. A new UI skin or uncertain
// highlight must ask for the receipt instead of silently attaching an offer.
function acceptedTab(source:CanvasImageSource,left:number,core:number,h:number){
 const tabs=crop(source,left+.315*core,.045*h,.18*core,.095*h,.35);
 const {width:w,height}=tabs;
 const a=tabs.getContext('2d')!.getImageData(0,0,w,height).data;
 const tint=(lo:number,hi:number)=>{
  let hits=0,total=0;
  for(let y=0;y<height;y++)for(let x=Math.floor(lo*w);x<hi*w;x++){
   const i=(y*w+x)*4,r=a[i]!,g=a[i+1]!,b=a[i+2]!;
   if(g-r>20&&g>b+3&&g>60)hits++;
   total++;
  }
  return hits/total;
 };
 const offers=tint(.14,.45),accepted=tint(.58,.89);
 return accepted>.10&&accepted>offers*2;
}
function jpeg(image:HTMLCanvasElement){
 return new Promise<Blob>((resolve,reject)=>image.toBlob(b=>b?resolve(b):reject(Error('capture')),'image/jpeg',.89));
}
export async function captureContracts(language:'eng'|'kor',signal:AbortSignal,
 onFrame:(frame:Frame)=>Promise<void>,onEnd:()=>void){
 const stream=await navigator.mediaDevices.getDisplayMedia({video:{displaySurface:'window'},audio:false});
 const video=document.createElement('video'),track=stream.getVideoTracks()[0]!;
 const reader=createOCRReader(language);
 let stopped=false,timer:ReturnType<typeof setTimeout>,previous='',lastText='';
 function stop(){
  if(stopped)return;stopped=true;clearTimeout(timer);signal.removeEventListener('abort',stop);
  stream.getTracks().forEach(t=>t.stop());video.pause();video.srcObject=null;void reader.close();onEnd();
 }
 if(signal.aborted){stop();return;}
 signal.addEventListener('abort',stop,{once:true});track.addEventListener('ended',stop,{once:true});
 try{
  if(track.getSettings().displaySurface!=='window')throw Error(language==='kor'?'공유 목록에서 Star Citizen 창을 선택하세요.':'Choose the Star Citizen application window.');
  video.muted=true;video.srcObject=stream;await video.play();
  while(!stopped){
   const w=video.videoWidth,h=video.videoHeight;
   if(w&&h){
    // mobiGlas stays centred on ultrawide monitors. Preserve the entire
    // contract pane in the original; read the objective column separately.
    const core=Math.min(w,h*16/9),left=(w-core)/2;
    // Freeze the window once. A click during OCR must never mix a new
    // contract's title/active tab with the previous contract's objective rows.
    const frozen=canvas(w,h),x=left;
    frozen.getContext('2d')!.drawImage(video,0,0);
    const pane=crop(frozen,x+.30*core,.13*h,.69*core,.66*h,1);
    const active=acceptedTab(frozen,left,core,h);
    const sample=active+crop(pane,0,0,pane.width,pane.height,Math.min(1,220/pane.width)).toDataURL();
    if(sample!==previous){
     previous=sample;
     const scale=Math.min(3,Math.max(1.4,2200/core));
     const header=crop(frozen,x+.32*core,.145*h,.67*core,.11*h,scale);
     const goals=crop(frozen,x+.615*core,.255*h,.375*core,.50*h,language==='eng'?1:scale);
     let body=(await reader.read(new File([await jpeg(goals)],'goals.jpg'))).text;
     if(language==='eng'&&/objective|deliver|collect|SCU/i.test(body)){
      const alt=(await reader.read(new File([await jpeg(contrasted(goals))],'contrast.jpg'))).text;
      if(objectiveScore(alt)>objectiveScore(body))body=alt;
     }
     if(!stopped&&/SCU|주요\s*목표|primary\s*objectives|에서\s*수집/i.test(body)){
      const top=(await reader.read(new File([await jpeg(header)],'contract.jpg'))).text;
      const fragment=top+'\n'+body;
      if(!stopped){
       const details=crop(frozen,x+.32*core,.255*h,.285*core,.49*h,scale);
       const description=(await reader.read(new File([await jpeg(details)],'details.jpg'))).text;
       const text=top+'\n'+description+'\n'+body;
       if(String(active)+text!==lastText&&!stopped){
        const frame=readFrame(fragment,await jpeg(pane),text);
        if(frame&&!stopped){frame.acceptedTab=active;await onFrame(frame);lastText=String(active)+text;}
       }
      }
     }
    }
   }
   if(!stopped)await new Promise<void>(resolve=>{
    const wake=()=>{signal.removeEventListener('abort',wake);track.removeEventListener('ended',wake);resolve();};
    signal.addEventListener('abort',wake,{once:true});track.addEventListener('ended',wake,{once:true});
    timer=setTimeout(wake,1200);
   });
  }
 }finally{stop();}
}

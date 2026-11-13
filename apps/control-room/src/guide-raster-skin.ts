import heading from './assets/hologram/flat/heading.png';
import question from './assets/hologram/flat/question.png';
import greeting from './assets/hologram/flat/greeting.png';
import label0 from './assets/hologram/flat/label-0.png';
import label1 from './assets/hologram/flat/label-1.png';
import label2 from './assets/hologram/flat/label-2.png';
import label3 from './assets/hologram/flat/label-3.png';
import label4 from './assets/hologram/flat/label-4.png';
import label5 from './assets/hologram/flat/label-5.png';

// A presentation layer only: existing buttons, text, IDs and events stay live.
// Keep the source Korean letterforms, with live text for translated/new dialogue.
export function mountGuideRasterSkin(root:HTMLElement,korean:boolean):()=>void{
 if(!korean)return()=>{};
 const ink=(node:HTMLElement|null,source:string,copy=false)=>{
  if(!node)return;
  node.classList.add('raster-ink');
  if(copy)node.classList.add('raster-copy');
  const image=document.createElement('img');
  image.src=source;image.alt='';image.setAttribute('aria-hidden','true');
  image.className='raster-image';node.append(image);
 };
 ink(root.querySelector('.unified-header'),heading);
 ink(root.querySelector('.unified-functions h3'),question,true);
 const labels=[label0,label1,label2,label3,label4,label5];
 root.querySelectorAll<HTMLElement>('.unified .holo-action').forEach((node,index)=>ink(node,labels[index]!));
 const line=root.querySelector<HTMLElement>('#greeting');
 if(!line)return()=>{};
 const initial=line.textContent;
 line.style.setProperty('--greeting-ink',`url("${greeting}")`);
 line.classList.add('raster-greeting');
 const observer=new MutationObserver(()=>line.classList.toggle('raster-greeting',line.textContent===initial));
 observer.observe(line,{childList:true,subtree:true,characterData:true});
 return()=>observer.disconnect();
}

import {useLayoutEffect,useRef} from 'react';

export function ShellMaterial(){
 const root=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const material=root.current,shell=material?.closest('.space-experience');
  const sidebar=shell?.querySelector<HTMLElement>('.space-sidebar');
  const console=shell?.querySelector<HTMLElement>('.pilot-desk');
  const destination=shell?.querySelector<HTMLElement>('.space-division-button');
  const caption=shell?.querySelector<HTMLElement>('.space-sidebar-caption');
  const header=shell?.querySelector<HTMLElement>('.space-topbar');
  if(!material||!sidebar||!console||!destination||!header)return;
  let frame=0;
  const align=()=>{
   frame=0;
   if(window.innerWidth<=760)return;
   const bottom=console.getBoundingClientRect().bottom;
   const next=(caption??destination).getBoundingClientRect().top;
   const height=Math.max(0,(bottom+next)/2-header.getBoundingClientRect().bottom);
   material.style.setProperty('--shell-connector-height',`${height}px`);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(align);};
  const observer=new ResizeObserver(schedule);
  observer.observe(console);observer.observe(sidebar);observer.observe(header);
  sidebar.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);align();
  return()=>{observer.disconnect();cancelAnimationFrame(frame);sidebar.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);};
 },[]);
 return (
  <div ref={root} className="shell-material" aria-hidden="true">
   <div className="shell-top" />
   <div className="shell-side" />
   <div className="shell-connector shell-gold" />
   <div className="shell-nameplate shell-gold">
    <span className="shell-cut" />
   </div>
  </div>
 );
}

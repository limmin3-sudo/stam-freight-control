import {useLayoutEffect,type RefObject} from 'react';

// Reserve the actual caption height: translations and larger text must not
// cover the practice controls or push the presenter behind the dialogue.
export function useTourCaptionSpace(root:RefObject<HTMLElement|null>,caption:RefObject<HTMLElement|null>){
 useLayoutEffect(()=>{
  const host=root.current,node=caption.current;if(!host||!node)return;
  const update=()=>host.style.setProperty('--tour-caption-height',`${Math.ceil(node.getBoundingClientRect().height)}px`);
  const observer=new ResizeObserver(update);observer.observe(node);update();
  return()=>{observer.disconnect();host.style.removeProperty('--tour-caption-height');};
 },[root,caption]);
}

import {useId} from 'react';
import atlas from './assets/navigation/approved-shell-atlas.png';

/** One continuous, unmodified option-2 bitmap. The mask removes only the
 * demonstration controls and room image; the L-shaped join is never sliced. */
export function ShellMaterial(){
 const id=useId().replaceAll(':','');
 return <svg className="shell-material" viewBox="75 518 934 499" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <defs>
   <filter id={`${id}-soft`} x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="2"/></filter>
   <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x="75" y="518" width="934" height="499" style={{maskType:'luminance'}}>
    <rect x="75" y="518" width="934" height="499" fill="white"/>
    <g fill="black" filter={`url(#${id}-soft)`}>
     <rect x="91" y="525" width="142" height="38" rx="5"/>
     <rect x="609" y="528" width="388" height="36" rx="5"/>
     <rect x="102" y="586" width="130" height="423" rx="5"/>
    </g>
    <rect x="246" y="611" width="759" height="402" rx="5" fill="black"/>
   </mask>
  </defs>
  <image href={atlas} x="0" y="0" width="1024" height="1536" mask={`url(#${id}-mask)`}/>
 </svg>;
}

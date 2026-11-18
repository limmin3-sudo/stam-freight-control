import material from './assets/navigation/clean-shell-material.png';
import accent from './assets/navigation/shell-gold-gunmetal.png';

/** A clean material asset, with no baked-in controls or room screenshot.
 * The corner and edge heights stay fixed; the plain strips fill the existing
 * navigation area without setting the dimensions of the live scene.
 * Zone 1 keeps the original glass; zone 2 is a raised gold housing and zone 3
 * is brushed gunmetal. The curved detail stays inside the sidebar cell. */
export function ShellMaterial(){
 const pieces=[
  ['join','0 0 216 102',material],
  ['top','216 0 1314 102',material],
  ['top-end','1530 0 6 102',material],
  ['connector','0 102 216 300',accent],
  ['side','0 402 216 616',accent],
  ['side-end','0 1018 216 6',accent],
 ];
 return <div className="shell-material" aria-hidden="true">
  {pieces.map(([part,viewBox,source])=><svg key={part} className={`shell-piece shell-${part}`} viewBox={viewBox} preserveAspectRatio="none" focusable="false">
   <image href={source} x="0" y="0" width="1536" height="1024"/>
  </svg>)}
 </div>;
}

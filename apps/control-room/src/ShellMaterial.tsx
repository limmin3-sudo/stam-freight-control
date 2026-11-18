import material from './assets/navigation/clean-shell-material.png';

/** A clean material asset, with no baked-in controls or room screenshot.
 * The corner and edge heights stay fixed; the plain strips fill the existing
 * navigation area without setting the dimensions of the live scene. */
export function ShellMaterial(){
 const pieces=[
  ['join','0 0 216 102'],
  ['top','216 0 1314 102'],
  ['top-end','1530 0 6 102'],
  ['side','0 102 216 916'],
  ['side-end','0 1018 216 6'],
 ];
 return <div className="shell-material" aria-hidden="true">
  {pieces.map(([part,viewBox])=><svg key={part} className={`shell-piece shell-${part}`} viewBox={viewBox} preserveAspectRatio="none" focusable="false">
   <image href={material} x="0" y="0" width="1536" height="1024"/>
  </svg>)}
 </div>;
}

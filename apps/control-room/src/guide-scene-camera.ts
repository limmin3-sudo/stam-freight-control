// Percent coordinates always refer to the approved 1672 × 941 scene artwork.
export type GuideSceneName='division'|'lounge'|'bridge';
export type GuideShot={scene:GuideSceneName;focus?:readonly[number,number];zoom?:number;target?:string;plate?:string};
export type CameraFrame={x:number;y:number;scale:number};
export const sceneSize={width:1672,height:941};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function frameGuideShot(shot:GuideShot,width:number,height:number):CameraFrame{
 const w=Math.max(1,width),h=Math.max(1,height),mobile=w<760;
 const scale=Math.max(w/sceneSize.width,h/sceneSize.height)*(mobile?Math.min(shot.zoom??1,1.16):shot.zoom??1);
 const [x,y]=shot.focus??[50,48];
 // Leave space for the separate foreground presenter and bottom dialogue.
 // Clamp to the plate edge so panning cannot reveal missing scenery.
 return {scale,x:clamp(w*(mobile?.42:.40)-x/100*sceneSize.width*scale,w-sceneSize.width*scale,0),y:clamp(h*(mobile?.38:.39)-y/100*sceneSize.height*scale,h-sceneSize.height*scale,0)};
}

import {Vector3} from 'three';
export type DisplayObstacle={center:Vector3;radius:number};
/** Display-space detour only. Never changes canonical route distances or mission data. */
export function displayRoute(from:Vector3,to:Vector3,bodies:DisplayObstacle[],depth=0):Vector3[]{
 const delta=to.clone().sub(from),length2=delta.lengthSq();
 if(length2<1e-12)return [from.clone(),to.clone()];
 let blocked:{center:Vector3;radius:number;nearest:Vector3}|undefined;
 for(const body of bodies){const t=Math.max(0,Math.min(1,body.center.clone().sub(from).dot(delta)/length2));const nearest=from.clone().addScaledVector(delta,t);
  if(nearest.distanceTo(body.center)<body.radius){blocked={...body,nearest};break;}}
 if(!blocked)return [from.clone(),to.clone()];
 // Refuse an unresolved visual segment rather than draw through a world.
 if(depth>=10)return [];
 let away=blocked.nearest.clone().sub(blocked.center);
 if(away.lengthSq()<1e-10){away=new Vector3(-delta.z,0,delta.x);if(away.lengthSq()<1e-10)away.set(1,0,0);}
 const via=blocked.center.clone().addScaledVector(away.normalize(),blocked.radius*1.6);
 const first=displayRoute(from,via,bodies,depth+1),last=displayRoute(via,to,bodies,depth+1);
 return first.length&&last.length?[...first,...last.slice(1)]:[];
}

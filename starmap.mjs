import * as THREE from 'three';
import {setup,clearGroup} from './scene.mjs';
import {STAR_COLORS,bodyLook,planetMaterial,cloudMaterial,atmosphereMaterial,starMaterial,routeRibbon,glowSprite,iconTexture,labelSprite,createBackdrop} from './mapfx.mjs';
import {createBloom} from './bloom.mjs';

// Star map with three levels (STARMAP › system › body). Directions and order are real; bodies are drawn
// larger and moons/stations spread out so the map stays readable at every zoom.
const UNIT=1e9,V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const GALAXY={stanton:V(0,0,0),pyro:V(78,6,-40),nyx:V(-70,-5,-52)};
const STAR_R={stanton:2.4,pyro:2.1,nyx:2};
const TYPE_KO={Planet:'행성',Moon:'위성',Star:'항성',Manmade:'정거장',Manmade_VisibleOnInteraction:'시설',LandingZone:'착륙 도시',Outpost:'지상 거점',PointOfInterest:'관심 지점',Asteroid:'소행성 기지',Asteroid_ValidQT:'소행성',NavPoint:'항법 지점',Anomaly:'점프 포인트'};
const ICON={station:['#7fe3ff',15],lagrange:['#9fd2ff',13],gate:['#a9b8ff',17],city:['#ffd27a',16],outpost:['#f0b46e',11],poi:['#c9a4ff',10],rock:['#9aa6b2',7]};
const QUALITY={normal:{ratio:1,detail:0,seg:[48,32],bloom:0},high:{ratio:1.5,detail:1,seg:[96,64],bloom:0},ultra:{ratio:2,detail:2,seg:[160,112],bloom:0}};
const fmtDist=m=>m>=1e9?(m/1e9).toFixed(m>=1e10?0:1)+' Gm':m>=1e6?(m/1e6).toFixed(0)+' Mm':Math.max(1,Math.round(m/1e3))+' km';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

// Critically damped spring (the usual game-camera "smooth damp").
function damp(cur,target,vel,key,time,dt){const o=2/Math.max(1e-4,time),x=o*dt,e=1/(1+x+.48*x*x+.235*x*x*x),c=cur-target,t=((vel[key]||0)+o*c)*dt;vel[key]=((vel[key]||0)-o*t)*e;let out=target+(c+t)*e;if((target-cur>0)===(out>target)){out=target;vel[key]=0;}return out;}

// Camera rig: orbit around a centre with smoothed angles, log-distance zoom and screen-space panning.
class Rig{
 constructor(camera,el){this.camera=camera;this.el=el;this.goal={x:0,y:0,z:0,theta:.7,phi:1.05,r:100};this.cur={...this.goal};this.vel={};this.minR=.02;this.maxR=900;this.bound=Infinity;this.ptrs=new Map();
  el.addEventListener('pointerdown',e=>this.down(e));el.addEventListener('pointermove',e=>this.move(e));el.addEventListener('pointerup',e=>this.up(e));el.addEventListener('pointercancel',e=>this.up(e));
  el.addEventListener('wheel',e=>{e.preventDefault();const k=Math.exp(clamp(e.deltaY,-300,300)*.0017);this.goal.r=clamp(this.goal.r*k,this.lo(),this.maxR);},{passive:false});
  el.addEventListener('contextmenu',e=>e.preventDefault());}
 set(g,instant=false){Object.assign(this.goal,g);this.goal.r=clamp(this.goal.r,this.lo(),this.maxR);this.goal.phi=clamp(this.goal.phi,.03,Math.PI-.03);this.keepIn();if(instant){Object.assign(this.cur,this.goal);this.vel={};}}
 aim(center,r,dir){const g={x:center.x,y:center.y,z:center.z,r};if(dir){const d=dir.clone().normalize();g.phi=Math.acos(clamp(d.y,-1,1));g.theta=Math.atan2(d.x,d.z);let dt=g.theta-this.goal.theta;while(dt>Math.PI){g.theta-=Math.PI*2;dt-=Math.PI*2;}while(dt<-Math.PI){g.theta+=Math.PI*2;dt+=Math.PI*2;}}return g;}
 down(e){this.el.setPointerCapture?.(e.pointerId);this.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY,mode:e.button===2||e.button===1||e.shiftKey||e.ctrlKey?'pan':'rotate'});this.pinch=null;}
 move(e){const p=this.ptrs.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;if(!dx&&!dy)return;
  if(this.ptrs.size===2){const [a,b]=[...this.ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(this.pinch)this.goal.r=clamp(this.goal.r*this.pinch/Math.max(d,1),this.lo(),this.maxR);this.pinch=d;this.pan(dx/2,dy/2);return;}
  if(p.mode==='pan')this.pan(dx,dy);else{this.goal.theta-=dx*.0055;this.goal.phi=clamp(this.goal.phi-dy*.0055,.03,Math.PI-.03);}}
 up(e){this.ptrs.delete(e.pointerId);this.pinch=null;}
 pan(dx,dy){const h=this.el.clientHeight||400,s=2*this.cur.r*Math.tan(this.camera.fov*Math.PI/360)/h;const right=V().setFromMatrixColumn(this.camera.matrixWorld,0),up=V().setFromMatrixColumn(this.camera.matrixWorld,1);const m=right.multiplyScalar(-dx*s).add(up.multiplyScalar(dy*s));this.goal.x+=m.x;this.goal.y+=m.y;this.goal.z+=m.z;this.keepIn();}
 lo(){return Math.max(this.minR,this.minFor?.(this.goal)||0);}
 keepIn(){const g=this.goal,d=Math.hypot(g.x,g.y,g.z);if(d>this.bound){const k=this.bound/d;g.x*=k;g.y*=k;g.z*=k;}}
 update(dt){const c=this.cur,g=this.goal,v=this.vel;if(this.minFor)g.r=Math.max(g.r,this.lo());for(const k of ['x','y','z'])c[k]=damp(c[k],g[k],v,k,.34,dt);c.theta=damp(c.theta,g.theta,v,'t',.22,dt);c.phi=damp(c.phi,g.phi,v,'p',.22,dt);c.r=Math.exp(damp(Math.log(c.r),Math.log(g.r),v,'r',.32,dt));
  const sp=Math.sin(c.phi);this.camera.position.set(c.x+c.r*sp*Math.sin(c.theta),c.y+c.r*Math.cos(c.phi),c.z+c.r*sp*Math.cos(c.theta));this.camera.lookAt(c.x,c.y,c.z);this.camera.near=Math.max(1e-5,c.r*.001);this.camera.far=30000;this.camera.updateProjectionMatrix();}
}

export function createStarMap(container,labelContainer,data,onSelect){
 const {renderer,scene,camera,controls}=setup(container,{logDepth:true,near:1e-4});controls.enabled=false;controls.dispose?.();
 scene.traverse(o=>{if(o.isAmbientLight)o.intensity=0;if(o.isDirectionalLight)o.intensity=0;});
 let quality=QUALITY.high,qualityName='high';try{const q=localStorage.getItem('vh-map-quality');if(QUALITY[q]){quality=QUALITY[q];qualityName=q;}}catch{}
 renderer.setPixelRatio(Math.min(devicePixelRatio,quality.ratio));const bloom=createBloom(renderer,{strength:quality.bloom});
 const rig=new Rig(camera,renderer.domElement),backdrop=createBackdrop(scene);
 const galaxyGroup=new THREE.Group(),systemGroup=new THREE.Group(),routeGroup=new THREE.Group(),labelGroup=new THREE.Group();scene.add(galaxyGroup,systemGroup,routeGroup,labelGroup);
 const wrap=container.parentElement,tip=document.createElement('div');tip.className='map-tooltip';tip.hidden=true;wrap.append(tip);
 const crumbs=document.createElement('nav');crumbs.className='map-crumbs';wrap.append(crumbs);if(labelContainer)labelContainer.hidden=true;
 const byId=new Map(data.locations.map(l=>[l.id,l])),kids=new Map();for(const l of data.locations)if(l.parentId){const a=kids.get(l.parentId)||[];a.push(l);kids.set(l.parentId,a);}
 const real=l=>V(l.position[0]/UNIT,l.position[2]/UNIT,-l.position[1]/UNIT);
 let level='galaxy',system='stanton',layout=new Map(),items=[],itemById=new Map(),labels=new Map(),route=null,activeIndex=-1,selected=null,focusId=null,focusR=0,hovered=null,extent=50,legLabel=null,ribbons=[],markers=[],revealStart=0,time=0;

 // ---- layout -----------------------------------------------------------------------------------
 const kmR=l=>bodyLook(l.name,l.type).diameter/2;
 const planetR=l=>clamp(.6*Math.log10(bodyLook(l.name,l.type).diameter)-.75,.55,1.9),moonR=l=>clamp(.42*Math.log10(bodyLook(l.name,l.type).diameter)-.55,.28,.75);
 function iconKind(l){if(l.isGateway||/Gateway/.test(l.name))return 'gate';if(/^[A-Z]{3}-L\d/.test(l.name))return 'lagrange';if(l.type==='LandingZone')return 'city';if(/Manmade/.test(l.type))return 'station';if(l.type==='Outpost')return 'outpost';if(/Asteroid/.test(l.type))return 'rock';return 'poi';}
 function buildLayout(sys){const out=new Map(),locs=data.locations.filter(l=>l.system===sys);
  const star=locs.find(l=>l.type==='Star');if(star)out.set(star.id,{loc:star,pos:V(),r:STAR_R[sys]||2,kind:'star'});
  const planets=locs.filter(l=>l.type==='Planet');for(const p of planets)out.set(p.id,{loc:p,pos:real(p),r:planetR(p),kind:'body'});
  const spread=new Map();for(const p of planets){const P=out.get(p.id),pr=kmR(p);let s=P.r*1.5;for(const m of (kids.get(p.id)||[]).filter(k=>k.type==='Moon')){const ratio=Math.max(1.2,real(m).distanceTo(real(p))*UNIT/1000/pr);s=Math.max(s,P.r*(1.7+Math.log10(ratio))+moonR(m)*1.5);}spread.set(p.id,s);}
  for(let it=0;it<40;it++)for(let i=0;i<planets.length;i++)for(let j=i+1;j<planets.length;j++){const a=out.get(planets[i].id),b=out.get(planets[j].id),need=spread.get(planets[i].id)+spread.get(planets[j].id)+1.2,d=a.pos.distanceTo(b.pos);if(d<need){const dir=b.pos.clone().sub(a.pos);if(dir.lengthSq()<1e-9)dir.set(1,0,.3);dir.normalize().multiplyScalar((need-d)/2);a.pos.sub(dir);b.pos.add(dir);}}
  const place=(parent,P)=>{const pr=kmR(parent),moons=[];
   for(const k of kids.get(parent.id)||[]){if(k.system!==sys||k.type==='Planet')continue;const off=real(k).sub(real(parent)),dKm=off.length()*UNIT/1000,dir=off.lengthSq()>0?off.normalize():V(1,0,0),ratio=dKm/pr;
    if(k.type==='Moon'){out.set(k.id,{loc:k,pos:P.pos.clone().add(dir.multiplyScalar(P.r*(1.7+Math.log10(Math.max(1.2,ratio))))),r:moonR(k),kind:'body',parent:parent.id});moons.push(k);}
    else if(ratio<=1.06)out.set(k.id,{loc:k,pos:P.pos.clone().add(dir.clone().multiplyScalar(P.r*1.004)),normal:dir,kind:'site',icon:iconKind(k),parent:parent.id,surface:true});
    else out.set(k.id,{loc:k,pos:P.pos.clone().add(dir.multiplyScalar(P.r*Math.min(1.9,1.16+.55*Math.log10(ratio)))),kind:'site',icon:iconKind(k),parent:parent.id});}
   for(let it=0;it<30;it++)for(let i=0;i<moons.length;i++)for(let j=i+1;j<moons.length;j++){const a=out.get(moons[i].id),b=out.get(moons[j].id),need=(a.r+b.r)*2.2,d=a.pos.distanceTo(b.pos);if(d<need){const t=b.pos.clone().sub(a.pos).normalize().multiplyScalar((need-d)/2);a.pos.sub(t);b.pos.add(t);for(const m of [a,b]){const o=m.pos.clone().sub(P.pos);m.pos.copy(P.pos).add(o.setLength(Math.max(o.length(),P.r*1.7)));}}}
   for(const m of moons)place(m,out.get(m.id));};
  for(const p of planets)place(p,out.get(p.id));
  for(const l of locs){if(out.has(l.id))continue;const rp=real(l);let near=null,nd=Infinity;for(const p of planets){const d=real(p).distanceTo(rp);if(d<nd){nd=d;near=p;}}
   if(near&&nd<6&&!l.isGateway&&!/Gateway/.test(l.name)){const P=out.get(near.id),dir=rp.clone().sub(real(near)).normalize();out.set(l.id,{loc:l,pos:P.pos.clone().add(dir.multiplyScalar(P.r*(2.4+1.6*Math.log10(1+nd*4)))),kind:'site',icon:iconKind(l),parent:null,near:near.id});}
   else out.set(l.id,{loc:l,pos:rp,kind:'site',icon:iconKind(l),parent:null});}
  return out;}
 const posOf=id=>layout.get(id)?.pos;

 // ---- scenes -----------------------------------------------------------------------------------
 let sphereGeo=new THREE.SphereGeometry(1,...quality.seg);
 function buildGalaxy(){clearGroup(galaxyGroup);for(const [sys,p] of Object.entries(GALAXY)){const m=new THREE.Mesh(sphereGeo,starMaterial(STAR_COLORS[sys]));m.scale.setScalar(STAR_R[sys]*1.6);m.position.copy(p);galaxyGroup.add(m);}
  const hot=new Set();route?.visits.forEach(v=>{const s=v.leg.nodes.map(id=>byId.get(id)?.system);for(let i=1;i<s.length;i++)if(s[i]!==s[i-1])hot.add([s[i-1],s[i]].sort().join('|'));});
  for(const j of data.jumps){const a=byId.get(j.from)?.system,b=byId.get(j.to)?.system;if(!a||!b)continue;const isHot=hot.has([a,b].sort().join('|')),pts=new THREE.QuadraticBezierCurve3(GALAXY[a],GALAXY[a].clone().lerp(GALAXY[b],.5).add(V(0,8,0)),GALAXY[b]).getPoints(64);const rb=routeRibbon(pts,{color:isHot?'#ffb35c':'#4f8fc0',width:isHot?4:2.2,flow:isHot?1:.3});rb.material.uniforms.uReveal.value=1;galaxyGroup.add(rb);}}
 function buildSystem(sys){clearGroup(systemGroup);clearLabels();items=[];itemById.clear();layout=buildLayout(sys);backdrop.paint(sys);
  extent=Math.max(25,...[...layout.values()].filter(v=>v.loc.type==='Planet'||v.loc.isGateway).map(v=>v.pos.length()));
  for(const v of layout.values()){if(v.loc.type==='Planet'&&byId.get(v.loc.parentId)?.type==='Star')addRing(V(),Math.hypot(v.pos.x,v.pos.z),v.pos.y,0x4f86a6,.3);if(v.loc.type==='Moon'&&v.parent){const P=layout.get(v.parent);addRing(P.pos,Math.hypot(v.pos.x-P.pos.x,v.pos.z-P.pos.z),v.pos.y,0x3d6a82,.24);}}
  for(const v of layout.values()){const l=v.loc;let it;
   if(v.kind==='star'){const m=new THREE.Mesh(sphereGeo,starMaterial(STAR_COLORS[sys]));m.scale.setScalar(v.r);m.position.copy(v.pos);systemGroup.add(m);it={...v,mesh:m,minPx:10};}
   else if(v.kind==='body'){const look=bodyLook(l.name,l.type),mat=planetMaterial(l.name,l.type);mat.uniforms.uDetail.value=quality.detail;const m=new THREE.Mesh(sphereGeo,mat);m.scale.setScalar(v.r);m.position.copy(v.pos);m.rotation.z=.18;systemGroup.add(m);
    if(look.clouds||look.kind==='city'&&false){const c=new THREE.Mesh(sphereGeo,cloudMaterial(l.name,look.clouds));c.scale.setScalar(1.012);m.add(c);v.clouds=c;}
    if(look.atmo){const a=new THREE.Mesh(sphereGeo,atmosphereMaterial(look.atmo,look.atmoStrength||1));a.scale.setScalar(1.045);m.add(a);v.atmo=a;}
    it={...v,mesh:m,minPx:l.type==='Planet'?6:3};}
   else{const [color,px]=ICON[v.icon];const s=new THREE.Sprite(new THREE.SpriteMaterial({map:iconTexture(v.icon,color),transparent:true,depthWrite:false,sizeAttenuation:false}));s.position.copy(v.pos);s.renderOrder=6;systemGroup.add(s);it={...v,sprite:s,px};}
   items.push(it);itemById.set(l.id,it);}
  buildRoute();}
 function addRing(c,r,y,color,op){const pts=[];for(let a=0;a<=256;a++)pts.push(V(c.x+Math.cos(a/256*Math.PI*2)*r,y,c.z+Math.sin(a/256*Math.PI*2)*r));systemGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color,transparent:true,opacity:op,depthWrite:false})));}
 const rootBody=id=>{let l=byId.get(id);while(l&&l.type!=='Planet'){const p=byId.get(l.parentId);if(!p||p.type==='Star'||p.type==='Manmade')return null;l=p;}return l?.id||null;};
 // Quantum travel is a straight line; it bends once beside a star/planet/moon only if the line would pass through it.
 function avoidBodies(from,to,depth=0){if(depth>3)return [from,to];const ab=to.clone().sub(from),L2=Math.max(ab.lengthSq(),1e-12);let worst=null,worstDepth=0;
  for(const it of items){if(!it.mesh)continue;const R=it.r*(it.kind==='star'?1.7:1.15);
   const t=clamp(it.pos.clone().sub(from).dot(ab)/L2,0,1),closest=from.clone().addScaledVector(ab,t),d=closest.distanceTo(it.pos);if(t<=1e-4||t>=1-1e-4||d>=R)continue;const pen=R-d;if(pen>worstDepth){worstDepth=pen;worst={it,closest,R};}}
  if(!worst)return [from,to];let out=worst.closest.clone().sub(worst.it.pos);if(out.lengthSq()<1e-10)out=V(-ab.z,0,ab.x);out.normalize();const via=worst.it.pos.clone().add(out.multiplyScalar(worst.R*1.25));
  return [...avoidBodies(from,via,depth+1),...avoidBodies(via,to,depth+1).slice(1)];}
 // Quantum route: glowing ribbons revealed leg by leg, numbered waypoint rings, active leg in amber.
 function buildRoute(){clearGroup(routeGroup);legLabel=null;ribbons=[];markers=[];if(!route||level!=='system')return;let order=0;
  route.visits.forEach((v,i)=>{const ids=v.leg.nodes,active=i===activeIndex;for(let j=1;j<ids.length;j++){const a=byId.get(ids[j-1]),b=byId.get(ids[j]);if(a?.system!==system||b?.system!==system)continue;const from=posOf(a.id),to=posOf(b.id);if(!from||!to||from.distanceTo(to)<1e-6)continue;
   const hop=rootBody(a.id)&&rootBody(a.id)===rootBody(b.id),len=from.distanceTo(to),path=avoidBodies(from,to),curve=new THREE.CurvePath();for(let k=1;k<path.length;k++)curve.add(new THREE.LineCurve3(path[k-1],path[k]));
   const pts=[];for(let k=1;k<path.length;k++){const n=Math.max(8,Math.ceil(path[k-1].distanceTo(path[k])/Math.max(len,1e-6)*120));for(let q=k===1?0:1;q<=n;q++)pts.push(path[k-1].clone().lerp(path[k],q/n));}
   const rb=routeRibbon(pts,{color:active?'#ffb35c':hop?'#ffd75e':'#5fe6ff',width:active?4.5:hop?2.4:3.2,flow:active?1.4:.7,dashed:hop});rb.userData={order:order++,active};routeGroup.add(rb);ribbons.push(rb);
   if(active&&(!legLabel||len>legLabel.len)){if(!legLabel){const lab=labelSprite(`${fmtDist(v.leg.meters)} · 약 ${Math.max(1,Math.round(v.seconds/60))}분${v.leg.jumps?' · '+(v.leg.gateways||[]).join(' → ')+' 경유':''}`,'',undefined,{pill:'#ffc67c',upper:false});lab.visible=false;labelGroup.add(lab);legLabel={sprite:lab};}legLabel.pos=curve.getPoint(.5);legLabel.len=len;}}
   const p=posOf(v.locationId);if(p&&byId.get(v.locationId)?.system===system){const ring=new THREE.Sprite(new THREE.SpriteMaterial({map:iconTexture('waypoint',i===activeIndex?'#ffb35c':'#64dfe2'),transparent:true,depthWrite:false,sizeAttenuation:false}));ring.position.copy(p);ring.renderOrder=7;routeGroup.add(ring);markers.push({sprite:ring,i,active:i===activeIndex});}});
  revealStart=time;}

 // ---- labels -----------------------------------------------------------------------------------
 function clearLabels(){for(const s of labels.values()){s.material.map.dispose();s.material.dispose();}clearGroup(labelGroup);labels.clear();}
 const visitNums=id=>route?.visits.map((v,i)=>v.locationId===id?i+1:null).filter(Boolean)||[];
 function labelFor(it){let s=labels.get(it.loc.id);if(s)return s;const l=it.loc,n=visitNums(l.id),parent=byId.get(l.parentId),onRoute=n.length>0;
  const sub=(TYPE_KO[l.type]||'')+(parent&&parent.type!=='Star'&&parent.type!=='Manmade'?' · '+parent.name:'');const color=onRoute?'#64dfe2':l.type==='Star'?'#ffe2a8':l.type==='Planet'?'#e6f1f8':l.type==='Moon'?'#bcd3e0':ICON[it.icon]?.[0]||'#cfe6f2';
  s=labelSprite((n.length?n.join(',')+' · ':'')+l.name,sub,color,{big:l.type==='Planet'||l.type==='Star',glow:true});s.visible=false;labelGroup.add(s);labels.set(l.id,s);return s;}
 function priority(it){const l=it.loc;if(l.id===selected||l===hovered)return 10;if(visitNums(l.id).length)return 9;if(l.type==='Star')return 8;if(l.type==='Planet')return 7;if(l.isGateway)return 6;if(l.type==='Moon')return 5;if(l.type==='LandingZone')return 4.5;if(it.icon==='station'||it.icon==='lagrange')return 4;if(it.icon==='outpost')return 2;return 1;}

 // ---- navigation -------------------------------------------------------------------------------
 function crumbsRender(){const parts=[['STARMAP',()=>goGalaxy()]];if(level==='system'){parts.push([system.toUpperCase(),()=>home()]);if(focusId){const chain=[];let l=byId.get(focusId);while(l&&l.type!=='Star'&&l.type!=='Manmade'){chain.unshift(l);l=byId.get(l.parentId);}for(const c of chain)parts.push([c.name.toUpperCase(),()=>focus(c.id)]);}}
  crumbs.replaceChildren(...parts.flatMap(([t,fn],i)=>{const b=document.createElement('button');b.type='button';b.textContent=t;b.className=i===parts.length-1?'current':'';b.onclick=fn;return i?[Object.assign(document.createElement('span'),{textContent:'›'}),b]:[b];}));}
 function goGalaxy(instant=false){level='galaxy';focusId=null;selected=null;galaxyGroup.visible=true;systemGroup.visible=false;routeGroup.visible=false;clearLabels();backdrop.paint('galaxy');buildGalaxy();
  for(const [sys,p] of Object.entries(GALAXY)){const s=labelSprite(sys.toUpperCase(),'항성계 · 더블클릭',STAR_COLORS[sys],{big:true,glow:true});s.userData.anchor=p;labelGroup.add(s);}
  rig.minR=90;rig.maxR=380;rig.bound=110;rig.minFor=null;rig.set({x:4,y:0,z:-30,theta:.2,phi:1.05,r:210},instant);crumbsRender();}
 function enterSystem(sys,instant=false){const changed=sys!==system||level!=='system';system=sys;level='system';galaxyGroup.visible=false;systemGroup.visible=true;routeGroup.visible=true;if(changed||!items.length)buildSystem(sys);rig.minR=.5;rig.maxR=extent*3.2;rig.bound=extent*1.35;rig.minFor=g=>{let m=0;for(const it of layout.values()){if(it.kind!=='body'&&it.kind!=='star')continue;const d=Math.hypot(g.x-it.pos.x,g.y-it.pos.y,g.z-it.pos.z),need=it.r*(it.kind==='star'?2.2:1.7)-d;if(need>m)m=need;}return m;};if(changed)home(instant);else crumbsRender();}
 function home(instant=false,top=false){focusId=null;rig.set(top?{x:0,y:0,z:0,phi:.04,r:extent*2.7}:{x:0,y:0,z:0,theta:.65,phi:.98,r:extent*2.35},instant);crumbsRender();}
 function focus(id,instant=false){const l=byId.get(id);if(!l)return;if(l.system!==system||level!=='system')enterSystem(l.system,true);const v=layout.get(id);if(!v)return;selected=id;
  if(l.type==='Star'){home(instant);return;}
  if(v.kind==='body'){focusId=id;let reach=v.r*3;for(const k of kids.get(id)||[]){const p=posOf(k.id);if(p)reach=Math.max(reach,p.distanceTo(v.pos)+(layout.get(k.id)?.r||0));}focusR=l.type==='Planet'?reach*2.4:Math.max(v.r*7,reach*2.2);rig.set(rig.aim(v.pos,focusR,V(Math.sin(rig.goal.theta),.75,Math.cos(rig.goal.theta))),instant);}
  else if(v.parent){focusId=v.parent;const P=layout.get(v.parent),dir=v.pos.clone().sub(P.pos).normalize();focusR=P.r*(v.surface?2.2:2.7);rig.set(rig.aim(v.pos,focusR,dir.add(V(0,.35,0))),instant);}
  else{focusId=null;focusR=3;rig.set(rig.aim(v.pos,3,V(Math.sin(rig.goal.theta),.7,Math.cos(rig.goal.theta))),instant);}
  crumbsRender();}
 function frameLeg(i){const v=route?.visits[i];if(!v)return;const sys=byId.get(v.locationId)?.system;if(sys!==system||level!=='system')enterSystem(sys,true);const pts=v.leg.nodes.filter(id=>byId.get(id)?.system===sys).map(posOf).filter(Boolean);if(pts.length<2){focus(v.locationId);return;}
  const box=new THREE.Box3().setFromPoints(pts),c=box.getCenter(V()),span=box.getSize(V()).length();focusId=null;rig.set(rig.aim(c,Math.max(span*1.35,2.4),V(Math.sin(rig.goal.theta),.85,Math.cos(rig.goal.theta))));crumbsRender();}

 // ---- picking & pointer UI ---------------------------------------------------------------------
 const W=()=>container.clientWidth,H=()=>container.clientHeight;
 function screen(p){const v=p.clone().project(camera);return {x:(v.x*.5+.5)*W(),y:(-v.y*.5+.5)*H(),front:v.z<1&&v.z>-1};}
 function pick(e){const r=renderer.domElement.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  if(level==='galaxy'){let best=null,bd=46;for(const [sys,p] of Object.entries(GALAXY)){const s=screen(p),d=Math.hypot(s.x-x,s.y-y);if(d<bd){bd=d;best=sys;}}return best?{galaxy:best}:null;}
  let best=null,bs=Infinity;for(const it of items){if(!it.shown)continue;const s=it.screen;if(!s?.front)continue;const rad=it.mesh?Math.max(9,it.px||0)+4:12,d=Math.hypot(s.x-x,s.y-y);if(d<rad){const score=d/rad-(it.mesh?0:.35);if(score<bs){bs=score;best=it;}}}return best;}
 function describe(l){const p=byId.get(l.parentId),n=visitNums(l.id);return `${n.length?n.map(x=>x+'번').join('·')+' 거점 · ':''}${l.name} · ${TYPE_KO[l.type]||l.type}${p&&p.type!=='Star'?' · '+p.name:''} · ${l.system.toUpperCase()}`;}
 function hover(h,e){hovered=h?.loc||null;renderer.domElement.style.cursor=h?'pointer':'grab';if(!h){tip.hidden=true;return;}tip.textContent=h.galaxy?`${h.galaxy.toUpperCase()} 항성계 · 더블클릭으로 들어가기`:describe(h.loc)+' · 더블클릭으로 이동';tip.hidden=false;const r=wrap.getBoundingClientRect();tip.style.left=(e.clientX-r.left+14)+'px';tip.style.top=(e.clientY-r.top+14)+'px';}
 let down=null,lastMove=0;const el=renderer.domElement;el.style.cursor='grab';
 el.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];el.style.cursor='grabbing';tip.hidden=true;});
 el.addEventListener('pointermove',e=>{if(down)return;const t=performance.now();if(t-lastMove<40)return;lastMove=t;hover(pick(e),e);});
 el.addEventListener('pointerleave',()=>hover(null));
 el.addEventListener('pointerup',e=>{const moved=down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])>5;down=null;el.style.cursor='grab';if(moved)return;const h=pick(e);if(!h||h.galaxy)return;selected=h.loc.id;onSelect(h.loc,describe(h.loc));});
 el.addEventListener('dblclick',e=>{const h=pick(e);if(!h)return;if(h.galaxy){enterSystem(h.galaxy);const st=data.locations.find(l=>l.system===h.galaxy&&l.type==='Star');if(st)onSelect(st,h.galaxy.toUpperCase()+' 항성계');return;}selected=h.loc.id;onSelect(h.loc,describe(h.loc));focus(h.loc.id);});
 wrap.tabIndex=-1;wrap.addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea'))return;if(e.key==='Escape'){if(level==='system'&&focusId){const p=byId.get(focusId);p&&p.type==='Moon'?focus(p.parentId):home();}else if(level==='system')goGalaxy();e.preventDefault();}else if((e.key==='f'||e.key==='F')&&selected){focus(selected);e.preventDefault();}});

 // ---- frame loop -------------------------------------------------------------------------------
 const clock=new THREE.Clock(),tmp=V(),res=new THREE.Vector2();
 function frame(){requestAnimationFrame(frame);if(document.hidden)return;const dt=Math.min(.05,clock.getDelta());time+=dt;rig.update(dt);const h=H(),w=W(),P11=camera.projectionMatrix.elements[5],pxPerUnit=d=>h*P11/(2*d),spriteScale=(s,pxW,pxH)=>s.scale.set(2*pxW/(P11*h),2*pxH/(P11*h),1);
  renderer.getDrawingBufferSize(res);const pr=renderer.getPixelRatio();
  scene.traverse(o=>{const u=o.material?.uniforms;if(!u)return;if(u.uTime)u.uTime.value=time;if(u.uRes)u.uRes.value.set(res.x/pr,res.y/pr);});
  if(level==='galaxy'){for(const s of labelGroup.children){const sc=s.userData.px;if(!sc)continue;s.position.copy(s.userData.anchor);spriteScale(s,sc[0]*.55,sc[1]*.55);s.center.set(.5,1+26/(sc[1]*.55));s.visible=true;}bloom.render(scene,camera);return;}
  if(focusId&&rig.cur.r>focusR*3.2&&!rig.ptrs.size){focusId=null;crumbsRender();}
  const camPos=camera.position;
  for(const it of items)if(it.mesh){const d=camPos.distanceTo(it.pos),px=it.r*pxPerUnit(d),k=px<it.minPx?it.minPx/px:1;it.mesh.scale.setScalar(it.r*k);it.px=px*k;if(it.loc.type!=='Star')it.mesh.rotation.y+=dt*.006;if(it.clouds)it.clouds.rotation.y+=dt*.004;}
  for(const it of items){const s=screen(it.pos);it.screen=s;let show=s.front;const par=it.parent?itemById.get(it.parent):null;
   if(show&&par){const ps=par.screen||screen(par.pos),sep=Math.hypot(s.x-ps.x,s.y-ps.y);if(it.surface){show=it.normal.dot(tmp.copy(camPos).sub(it.pos))>0&&par.px>26;}else if(it.mesh)show=sep>par.px*1.05+3;else show=par.px>9&&sep>par.px*.6;}
   if(it.sprite){it.sprite.visible=show;if(show){const k=it.loc.id===selected||it.loc===hovered?1.5:1;spriteScale(it.sprite,it.px*k,it.px*k);}}
   it.shown=show;}
  // Labels pinned under their object; overlaps hide the lower priority label instead of moving it.
  const cand=items.filter(it=>it.shown).map(it=>({it,p:priority(it)})).filter(({it,p})=>{const l=it.loc;if(p>=7)return true;const par=it.parent?itemById.get(it.parent):null;if(l.type==='Moon')return (par?.px||0)>14;if(it.icon==='station'||it.icon==='lagrange'||l.type==='LandingZone'||it.icon==='gate')return par?par.px>34:camPos.distanceTo(it.pos)<extent*.35;if(it.surface)return (par?.px||0)>110;return camPos.distanceTo(it.pos)<6;}).sort((a,b)=>b.p-a.p);
  const used=[],want=new Set();
  for(const {it} of cand){const s=labelFor(it),[pw,ph]=s.userData.px,sc=it.loc.type==='Planet'||it.loc.type==='Star'?.7:.58,lw=pw*sc,lh=ph*sc,gap=(it.mesh?it.px:(it.px||10)/2)+5,x=it.screen.x,y=it.screen.y+gap,rect={x:x-lw/2,y,w:lw,h:lh};
   if(rect.y<38||rect.y+lh>h-6||x<0||x>w)continue;if(it.loc.id!==selected&&used.some(r=>rect.x<r.x+r.w&&rect.x+rect.w>r.x&&rect.y<r.y+r.h&&rect.y+rect.h>r.y))continue;
   used.push(rect);want.add(it.loc.id);s.position.copy(it.pos);spriteScale(s,lw,lh);s.center.set(.5,1+gap/lh);}
  for(const [id,s] of labels)s.visible=want.has(id);
  // Route reveal: legs draw in one after another, then keep flowing.
  const t=time-revealStart;for(const rb of ribbons){const k=clamp((t-rb.userData.order*.35)/.9,0,1);rb.material.uniforms.uReveal.value=k<1?1-Math.pow(1-k,3):1;}
  for(const m of markers){m.sprite.visible=screen(m.sprite.position).front;const pulse=m.active?1+.25*Math.sin(time*4):1;spriteScale(m.sprite,(m.active?34:22)*pulse,(m.active?34:22)*pulse);}
  if(legLabel){const [pw,ph]=legLabel.sprite.userData.px;legLabel.sprite.position.copy(legLabel.pos);spriteScale(legLabel.sprite,pw*.5,ph*.5);legLabel.sprite.center.set(.5,-.5);legLabel.sprite.visible=t>.6&&screen(legLabel.pos).front;}
  bloom.render(scene,camera);}
 goGalaxy(true);enterSystem('stanton',true);frame();
 return {setSystem(s){enterSystem(s);},setRoute(p,index){const fresh=p!==route;route=p;activeIndex=index;if(level==='system'){clearLabels();buildRoute();if(!fresh)revealStart=time-99;}else buildGalaxy();},
  focus(id){focus(id);},focusLeg:frameLeg,home(top=false){if(level!=='system')enterSystem(system);else home(false,top);},selectedSystem:()=>system,flyTo(id){focus(id);},galaxy:()=>goGalaxy(),
  setQuality(q){if(!QUALITY[q])return;quality=QUALITY[q];qualityName=q;try{localStorage.setItem('vh-map-quality',q);}catch{}renderer.setPixelRatio(Math.min(devicePixelRatio,quality.ratio));bloom.strength(quality.bloom);sphereGeo=new THREE.SphereGeometry(1,...quality.seg);if(level==='system')buildSystem(system);},quality:()=>qualityName,
  _debug:()=>({level,system,route:!!route,ribbons:ribbons.length,reveal:ribbons.map(r=>+r.material.uniforms.uReveal.value.toFixed(2)),res:ribbons[0]?.material.uniforms.uRes.value.toArray(),routeKids:routeGroup.children.length,visible:routeGroup.visible}),
  search:q=>{const n=String(q).toLowerCase();return data.locations.filter(l=>l.name.toLowerCase().includes(n)).slice(0,12);}};
}

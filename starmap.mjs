import * as THREE from 'three';
import {setup,clearGroup,line,PALETTE} from './scene.mjs';
import {STAR_COLORS,surfaceTexture,atmosphereColor,glowSprite,createBackdrop} from './mapfx.mjs';

// Approximate body radii (km). Used only so bodies reach a believable size when the camera is close;
// far away every body keeps a minimum on-screen size so it stays clickable.
const RADIUS_KM={Hurston:1000,Crusader:7450,ArcCorp:800,microTech:1000,Arial:345,Aberdeen:274,Magda:341,Ita:325,Cellin:260,Daymar:295,Yela:313,Lyria:223,Wala:283,Calliope:240,Clio:337,Euterpe:213,'Pyro I':700,Monox:900,Bloom:1300,'Pyro IV':800,'Pyro V':4200,Terminus:1100,'Nyx I':600,'Nyx II':800,'Nyx III':3000};
const UNIT=1e9; // scene unit = 1,000,000 km
const DOT_COLORS={Manmade:'#7fe3ff',Manmade_VisibleOnInteraction:'#7fe3ff',LandingZone:'#ffd27a',Outpost:'#e9b46f',PointOfInterest:'#c9a4ff',Asteroid:'#8b97a3',Asteroid_ValidQT:'#9aa6b2',NavPoint:'#9aa6b2',Anomaly:'#8fa3ff'};
const TYPE_KO={Planet:'행성',Moon:'위성',Star:'항성',Manmade:'정거장',Manmade_VisibleOnInteraction:'시설',LandingZone:'착륙 도시',Outpost:'전초기지',PointOfInterest:'관심 지점',Asteroid:'소행성',Asteroid_ValidQT:'소행성',NavPoint:'항법 지점',Anomaly:'점프 포인트'};
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const fmtGm=m=>m>=1e9?(m/1e9).toFixed(m>=1e10?0:1)+' Gm':m>=1e6?(m/1e6).toFixed(0)+' Mm':Math.max(1,Math.round(m/1e3))+' km';

export function createStarMap(container,labelContainer,data,onSelect){
 const {renderer,scene,camera,controls}=setup(container,{logDepth:true,near:1e-7});
 // Controls: zoom toward the cursor, large wheel steps, screen-space panning (right drag / shift+drag).
 Object.assign(controls,{zoomToCursor:true,zoomSpeed:4,rotateSpeed:.55,panSpeed:1.1,screenSpacePanning:true,dampingFactor:.12,minDistance:.00003,minPolarAngle:.03,maxPolarAngle:Math.PI-.03});
 const group=new THREE.Group(),routes=new THREE.Group();scene.add(group,routes);
 const meshById=new Map();let system='stanton',bodies=[],labels=[],dots=null,dotLocs=[],route=null,activeIndex=-1,selected=null,hovered=null,extent=80,fly=null,legLabel=null;
 const byId=new Map(data.locations.map(l=>[l.id,l])),children=new Map();for(const l of data.locations)if(l.parentId){const a=children.get(l.parentId)||[];a.push(l);children.set(l.parentId,a);}
 const xyz=l=>new THREE.Vector3(l.position[0]/UNIT,l.position[2]/UNIT,-l.position[1]/UNIT);
 const backdrop=createBackdrop(scene);let painted='';renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;scene.traverse(o=>{if(o.isAmbientLight)o.intensity=.32;if(o.isDirectionalLight)o.intensity=0;});const starLight=new THREE.PointLight(0xffffff,3.2,0,0);scene.add(starLight);
 const tip=document.createElement('div');tip.className='map-tooltip';tip.hidden=true;container.parentElement.append(tip);

 function routeIds(){return new Set(route?.visits.flatMap(v=>[v.locationId,...v.leg.nodes])||[]);}
 function visitNumbers(id){return route?.visits.map((v,i)=>v.locationId===id?i+1:null).filter(Boolean)||[];}
 function draw(reset=true){
  clearGroup(group);clearGroup(routes);labelContainer.replaceChildren();bodies=[];meshById.clear();labels=[];legLabel=null;const onRoute=routeIds();
  const locations=data.locations.filter(l=>l.system===system);extent=Math.max(30,...locations.filter(l=>l.type==='Planet'||l.isGateway).map(l=>xyz(l).length()));controls.maxDistance=extent*6;
  if(painted!==system){painted=system;backdrop.paint(system);starLight.color.set(STAR_COLORS[system]||'#ffffff');}
  const grid=new THREE.PolarGridHelper(extent*1.08,12,5,100,0x203c50,0x152c40);grid.material.transparent=true;grid.material.opacity=.16;group.add(grid);
  for(const l of locations.filter(l=>l.type==='Planet')){const p=xyz(l),r=Math.hypot(p.x,p.z),pts=[];for(let a=0;a<=160;a++)pts.push(new THREE.Vector3(Math.cos(a/160*Math.PI*2)*r,p.y,Math.sin(a/160*Math.PI*2)*r));group.add(line(pts,0x3d6f88,.3));}
  // Moon orbits around their planet (visible once zoomed in).
  for(const l of locations.filter(l=>l.type==='Moon')){const parent=byId.get(l.parentId);if(!parent)continue;const c=xyz(parent),r=xyz(l).distanceTo(c),pts=[];for(let a=0;a<=96;a++)pts.push(new THREE.Vector3(c.x+Math.cos(a/96*Math.PI*2)*r,c.y,c.z+Math.sin(a/96*Math.PI*2)*r));group.add(line(pts,0x2f5568,.28));}
  // Spheres for star, planets, moons and gateways.
  for(const l of locations){const isStar=l.type==='Star',body=['Planet','Moon'].includes(l.type);if(!isStar&&!body&&!l.isGateway)continue;const important=onRoute.has(l.id)||l.isGateway,starColor=STAR_COLORS[system]||'#fff0cf';
   const material=isStar?new THREE.MeshBasicMaterial({color:starColor}):body?new THREE.MeshStandardMaterial({map:surfaceTexture(l.name,l.type),roughness:.92,metalness:0}):new THREE.MeshStandardMaterial({color:'#8fa3e5',roughness:.6,metalness:.3,emissive:'#3b4f9a',emissiveIntensity:.8});
   const mesh=new THREE.Mesh(l.isGateway?new THREE.OctahedronGeometry(1,0):new THREE.SphereGeometry(1,l.type==='Planet'?64:32,l.type==='Planet'?40:20),material);mesh.position.copy(xyz(l));mesh.rotation.z=l.type==='Planet'?.2:0;mesh.userData.location=l;meshById.set(l.id,mesh);mesh.userData.trueRadius=(RADIUS_KM[l.name]||(l.type==='Moon'?250:l.type==='Planet'?1000:0))*1000/UNIT;group.add(mesh);bodies.push(mesh);
   if(isStar){mesh.add(glowSprite(starColor,6,1));mesh.add(glowSprite(starColor,24,.3));}
   else if(l.type==='Planet'){const atmo=atmosphereColor(l.name);if(atmo)mesh.add(glowSprite(atmo,4.9,.95,true));}
   else if(l.isGateway)mesh.add(glowSprite('#8fa3ff',5,.6));
   if(onRoute.has(l.id))mesh.add(glowSprite('#64dfe2',body?5.9:7,.7,true));
  }
  // Every other location as a screen-sized dot (stations, cities, outposts, POIs).
  dotLocs=locations.filter(l=>!['Planet','Moon','Star'].includes(l.type)&&!l.isGateway);
  const pos=[],col=[];for(const l of dotLocs){const p=xyz(l);pos.push(p.x,p.y,p.z);const c=new THREE.Color(onRoute.has(l.id)?'#64dfe2':DOT_COLORS[l.type]||'#9aa6b2');col.push(c.r,c.g,c.b);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  dots=new THREE.Points(geo,new THREE.PointsMaterial({size:4,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.9,depthWrite:false}));group.add(dots);
  // Labels for everything; visibility is decided per frame by zoom level, priority and overlap.
  for(const l of locations){if(l.type==='Star'&&!/^(Stanton|Pyro|Nyx)$/.test(l.name))continue;const n=visitNumbers(l.id),important=onRoute.has(l.id);const b=document.createElement('button');b.type='button';b.className='celestial-label'+(important?' route-point':'')+(['Planet','Star'].includes(l.type)?' major':'');b.textContent=(n.length?n.join(',')+' · ':'')+(l.isGateway&&important?'⇄ ':'')+l.name;b.setAttribute('aria-label',l.name+' 위치로 이동');b.addEventListener('click',()=>{select(l);flyTo(l.id);});b.addEventListener('mouseenter',()=>hover(l));b.addEventListener('mouseleave',()=>hover(null));labelContainer.append(b);
   const priority=important?5:l.type==='Star'?4:l.type==='Planet'?3.5:l.isGateway?3:l.type==='LandingZone'?2.6:l.type==='Moon'?2.5:/Manmade/.test(l.type)?2:l.type==='Outpost'?1:.5;
   const parent=byId.get(l.parentId),surfaceOf=parent&&['Planet','Moon'].includes(parent.type)&&!['Planet','Moon','Star'].includes(l.type)?xyz(parent):null;
   labels.push({el:b,loc:l,pos:xyz(l),priority,surfaceOf,mesh:null,shown:false,always:important||['Star','Planet'].includes(l.type)||l.isGateway});}
  for(const l of labels)l.mesh=meshById.get(l.loc.id)||null;
  // Route legs.
  if(route){for(let i=0;i<route.visits.length;i++){const v=route.visits[i],ids=v.leg.nodes,active=i===activeIndex;for(let j=1;j<ids.length;j++){const a=byId.get(ids[j-1]),b=byId.get(ids[j]);if(a?.system!==system||b?.system!==system)continue;const from=xyz(a),to=xyz(b),color=active?0xffc67c:0x64dfe2;
    const mid=from.clone().lerp(to,.5),lift=from.distanceTo(to)*.08;mid.y+=lift;const curve=new THREE.QuadraticBezierCurve3(from,mid,to);routes.add(line(curve.getPoints(48),color,active?1:.6));
    const d=to.clone().sub(from),len=d.length();if(len>1e-4){const at=curve.getPoint(.62),dir=curve.getTangent(.62);routes.add(new THREE.ArrowHelper(dir,at,Math.min(len*.12,2),color,Math.min(len*.05,.7),Math.min(len*.025,.35)));}
    if(active){const el=document.createElement('span');el.className='leg-label';el.textContent=`${fmtGm(v.leg.meters)} · 약 ${Math.max(1,Math.round(v.seconds/60))}분${v.leg.jumps?' · 점프 '+v.leg.jumps+'회':''}`;labelContainer.append(el);legLabel={el,pos:curve.getPoint(.5)};}
   }}}
  if(reset)home(false,false);
 }
 // ---- camera motion -------------------------------------------------------------------
 function flyCamera(target,distance,dir,duration=900){hover(null);const from={t:controls.target.clone(),p:camera.position.clone()};const d=(dir||camera.position.clone().sub(controls.target)).normalize();if(!Number.isFinite(d.length())||d.lengthSq()<.5)d.set(.6,.55,.6).normalize();const to={t:target.clone(),p:target.clone().add(d.multiplyScalar(distance))};if(!duration){controls.target.copy(to.t);camera.position.copy(to.p);controls.update();return;}fly={from,to,start:performance.now(),duration};}
 controls.addEventListener('start',()=>{fly=null;});
 function viewRadius(l){const kids=(children.get(l.id)||[]).filter(k=>k.system===l.system);const c=xyz(l);let r=0;for(const k of kids){if(k.type==='Moon'||!kids.some(x=>x.type==='Moon'))r=Math.max(r,xyz(k).distanceTo(c));}
  if(l.type==='Star')return extent*1.25;if(l.type==='Planet')return Math.max(r*1.9,.01);if(l.type==='Moon')return Math.max(r*3,.0025);if(l.isGateway)return 1.2;return .0012;}
 function flyTo(id,duration=900){const l=byId.get(id);if(!l)return;if(l.system!==system){setSystem(l.system,false);}selected=id;const target=xyz(l);let d=viewRadius(l);
  // Surface sites: look from above the planet's surface toward the site, with the planet behind.
  let dir=null;if(!['Planet','Moon','Star'].includes(l.type)&&!l.isGateway){const parent=byId.get(l.parentId);if(parent&&['Planet','Moon'].includes(parent.type)){dir=target.clone().sub(xyz(parent)).normalize().add(new THREE.Vector3(0,.35,0));}}
  flyCamera(target,d,dir,duration);}
 function frameLeg(index){const v=route?.visits[index];if(!v)return;const pts=v.leg.nodes.map(id=>byId.get(id)).filter(l=>l?.system===(byId.get(v.locationId)?.system));if(byId.get(v.locationId)?.system!==system)setSystem(byId.get(v.locationId).system,false);if(pts.length<2){flyTo(v.locationId);return;}
  const box=new THREE.Box3();pts.forEach(l=>box.expandByPoint(xyz(l)));const c=box.getCenter(new THREE.Vector3()),span=box.getSize(new THREE.Vector3()).length();flyCamera(c,Math.max(span*1.25,.02),new THREE.Vector3(.35,.75,.55));}
 function home(top=false,animate=true){selected=null;const dist=extent*(top?2.3:2.05),dir=top?new THREE.Vector3(0,1,.0008):new THREE.Vector3(.5,.62,.8);flyCamera(new THREE.Vector3(),dist,dir,animate?800:0);}
 function setSystem(s,reset=true){if(s===system&&!reset)return;system=s;draw(reset);}
 // ---- picking: nearest object on screen, generous radius so tiny dots are easy to hit ----
 function screenOf(v){const p=v.clone().project(camera);return {x:(p.x*.5+.5)*container.clientWidth,y:(-p.y*.5+.5)*container.clientHeight,front:p.z<1&&p.z>-1};}
 function pick(e){const r=renderer.domElement.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;let best=null,bestD=14;
  let bodyScore=Infinity;for(const m of bodies){const s=screenOf(m.position);if(!s.front)continue;const rad=Math.max(8,m.userData.screenRadius||0)+4,d=Math.hypot(s.x-x,s.y-y);if(d<rad&&d/rad<bodyScore){bodyScore=d/rad;best=m.userData.location;}}
  // A dot right under the cursor wins over the planet it sits on.
  let dot=null,dotD=10;for(const l of dotLocs){const s=screenOf(xyz(l));if(!s.front)continue;const d=Math.hypot(s.x-x,s.y-y);if(d<dotD){dotD=d;dot=l;}}const bodyPx=best?bodies.find(m=>m.userData.location===best).userData.screenRadius||0:0;if(best&&bodyPx<28)return best;if(dot&&(dotD<6||!best))return dot;if(best)return best;for(const l of dotLocs){const s=screenOf(xyz(l));if(!s.front)continue;const d=Math.hypot(s.x-x,s.y-y);if(d<bestD){bestD=d;best=l;}}return best;}
 function describe(l){const parent=byId.get(l.parentId),n=visitNumbers(l.id);return `${n.length?n.map(x=>x+'번').join('·')+' 거점 · ':''}${l.name} · ${TYPE_KO[l.type]||l.type}${parent&&parent.type!=='Star'?' · '+parent.name:''} · ${l.system.toUpperCase()}`;}
 function select(l){selected=l.id;onSelect(l,describe(l));}
 function hover(l){hovered=l;renderer.domElement.style.cursor=l?'pointer':'grab';if(!l){tip.hidden=true;return;}tip.textContent=describe(l)+' · 더블클릭으로 이동';tip.hidden=false;}
 let down=null,lastMove=0;
 renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];renderer.domElement.style.cursor='grabbing';});
 renderer.domElement.addEventListener('pointermove',e=>{const now=performance.now();if(down||now-lastMove<40)return;lastMove=now;const l=pick(e);if(l!==hovered)hover(l);if(l){const r=container.getBoundingClientRect();tip.style.left=(e.clientX-r.left+14)+'px';tip.style.top=(e.clientY-r.top+14)+'px';}});
 renderer.domElement.addEventListener('pointerleave',()=>hover(null));
 renderer.domElement.addEventListener('pointerup',e=>{const moved=down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])>5;down=null;renderer.domElement.style.cursor=hovered?'pointer':'grab';if(moved)return;const l=pick(e);if(l)select(l);});
 renderer.domElement.addEventListener('dblclick',e=>{const l=pick(e);if(l){select(l);flyTo(l.id);}});
 container.parentElement.addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea'))return;if(e.key==='Escape'||e.key==='Home'){home();e.preventDefault();}else if((e.key==='f'||e.key==='F')&&selected){flyTo(selected);e.preventDefault();}});
 // ---- frame loop ---------------------------------------------------------------------
 const tmp=new THREE.Vector3();
 function animate(){requestAnimationFrame(animate);if(document.hidden)return;
  if(fly){const t=Math.min(1,(performance.now()-fly.start)/fly.duration),k=ease(t);controls.target.lerpVectors(fly.from.t,fly.to.t,k);
   // Travel along a log-distance path so long hops do not crawl at the end.
   const d0=fly.from.p.distanceTo(fly.from.t),d1=fly.to.p.distanceTo(fly.to.t),dist=Math.exp(Math.log(Math.max(d0,1e-7))*(1-k)+Math.log(Math.max(d1,1e-7))*k);
   const toDir=fly.to.p.clone().sub(fly.to.t).normalize(),dir=tmp.copy(fly.from.p).sub(fly.from.t).normalize().lerp(toDir,k);if(dir.lengthSq()<1e-6)dir.copy(toDir);dir.normalize();camera.position.copy(controls.target).addScaledVector(dir,dist);if(t>=1)fly=null;}
  controls.update();const h=container.clientHeight,w=container.clientWidth,camDist=camera.position.distanceTo(controls.target),pxPerUnit=d=>h/(2*Math.tan(camera.fov*Math.PI/360)*d);
  for(const m of bodies){const d=camera.position.distanceTo(m.position),type=m.userData.location.type,pixels=type==='Star'?16:type==='Planet'?11:type==='Moon'?5:4;if(type==='Planet'||type==='Moon')m.rotation.y+=.0008;const zoom=Math.min(4,Math.max(1,Math.pow(extent/Math.max(d,1e-7),.3))),minR=pixels*(type==='Planet'||type==='Star'?zoom:type==='Moon'?Math.min(zoom,2):1)/pxPerUnit(d);const r=Math.max(minR,m.userData.trueRadius||0);m.scale.setScalar(r);m.userData.screenRadius=r*pxPerUnit(d);}
  if(dots)dots.material.size=camDist<.05?6:camDist<2?5:3.5;
  // Labels: always-on ones first, then nearby details as you zoom in.
  // Labels stay pinned directly under their object (below the drawn disk for planets/moons).
  // Overlaps hide the lower-priority label instead of moving it, so a name never drifts onto another body.
  const used=[];for(const l of labels.sort((a,b)=>(b.priority+(b.shown?.3:0))-(a.priority+(a.shown?.3:0)))){const d=camera.position.distanceTo(l.pos);let reveal=l.always||l.loc.id===selected||l.loc===hovered||(l.priority>=2.5?d<extent*.45:l.priority>=2?d<.05:d<.006);
   if(reveal&&l.surfaceOf&&l.loc.id!==selected){const n=tmp.copy(l.pos).sub(l.surfaceOf),R=n.length();if(R>0&&n.dot(camera.position.clone().sub(l.surfaceOf))/R<R*.97)reveal=false;}
   if(!reveal){l.el.style.display='none';l.shown=false;continue;}
   const s=screenOf(l.pos),gap=(l.mesh?.userData.screenRadius||3)+5,bw=l.el.offsetWidth||90,rect={x:s.x-bw/2,y:s.y+gap,w:bw,h:20,sx:s.x,sy:s.y};
   const hitOf=rc=>used.find(r=>rc.x<r.x+r.w+2&&rc.x+rc.w+2>r.x&&rc.y<r.y+r.h+1&&rc.y+rc.h+1>r.y);
   // Names of objects sharing the same spot (a station at its planet) stack under that label; others hide.
   let blocker=hitOf(rect),tries=0;while(blocker&&tries<4&&Math.hypot(blocker.sx-s.x,blocker.sy-s.y)<Math.max(14,blocker.gap||0)){rect.x=blocker.sx-bw/2;rect.y=blocker.y+blocker.h+1;blocker=hitOf(rect);tries++;}
   const ok=s.front&&s.x>0&&s.x<w&&rect.y>36&&rect.y<h-36&&(l.loc.id===selected||!blocker);
   l.el.style.display=ok?'block':'none';l.shown=ok;if(ok){l.el.style.transform=`translate(${Math.round(rect.x+bw/2)}px,${Math.round(rect.y)}px) translate(-50%,0)`;l.el.classList.toggle('selected',l.loc.id===selected);rect.gap=gap;used.push(rect);}}
  if(legLabel){const s=screenOf(legLabel.pos);legLabel.el.style.display=s.front?'block':'none';legLabel.el.style.transform=`translate(${Math.round(s.x)}px,${Math.round(s.y-26)}px) translate(-50%,0)`;}
  renderer.render(scene,camera);}
 renderer.domElement.style.cursor='grab';container.parentElement.tabIndex=-1;
 draw();animate();
 return {setSystem(s){setSystem(s,true);},setRoute(p,index){route=p;activeIndex=index;draw(false);},focus(id){flyTo(id);},focusLeg:frameLeg,home,selectedSystem:()=>system,search:q=>{const n=String(q).toLowerCase();return data.locations.filter(l=>l.name.toLowerCase().includes(n)).slice(0,12);},flyTo};
}

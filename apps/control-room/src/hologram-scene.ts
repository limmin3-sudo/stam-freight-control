import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import nebulaUrl from './assets/stanton-nebula.png';
import atlasUrl from './assets/stanton-surface-atlas.png';
import solarUrl from './assets/stellar-plasma.png';
import stationUrl from './assets/station-hologram.png';
import projectionUrl from './assets/table-projection-optical.png';
import {bodyLook,cloudMaterial,atmosphereMaterial,routeRibbon} from './hologram-materials.mjs';
import {displayRoute} from './hologram-route';
import {surfaceMaterial,celestialBackdrop,navigationPlanetMaterial,orbitFilament,planetLimbColor,stellarRadiance} from './hologram-visuals';
import {tableProjection} from './hologram-projection';
import {hologramFrame,hologramDisplay,stationNames,type HologramPoint} from './hologram-layout';
import {systemPoints,systemThemes,displayPositions,displayRadius,isBody,markerKind,type SystemId} from './hologram-catalogue';

type Options={expanded:boolean;motion:boolean;selected:string;example:boolean;system:SystemId;orbits:boolean};
type Flight={from:THREE.Vector3;to:THREE.Vector3;eye:THREE.Vector3;toEye:THREE.Vector3;zoom:number;targetZoom:number;started:number};
export function createHologram(host:HTMLElement,labels:Map<string,HTMLElement>,select:(id:string)=>void){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0,0);
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 const canvas=renderer.domElement;canvas.dataset.hologram='stanton';canvas.setAttribute('aria-hidden','true');host.prepend(canvas);
 const scene=new THREE.Scene(),world=new THREE.Group(),camera=new THREE.OrthographicCamera(-6,6,3,-3,.01,100);scene.add(world);
 camera.position.set(...hologramFrame.roomTilt);camera.lookAt(0,0,0);
 const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.enablePan=false;controls.minZoom=.7;controls.maxZoom=9;controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI*.49;controls.enabled=false;
 const geometry=new THREE.SphereGeometry(1,144,96),textures:THREE.Texture[]=[];
 let state:Options={expanded:false,motion:true,selected:'',example:false,system:'stanton',orbits:true};
 let frame=0,last=0,dirty=true,disposed=false,visible=true,flight:Flight|null=null;
 let points:HologramPoint[]=[],materials:THREE.ShaderMaterial[]=[],hitTargets:THREE.Object3D[]=[],ribbons:THREE.Mesh[]=[];
 const positions=new Map<string,THREE.Vector3>();let guides=new THREE.Group(),route=new THREE.Group(),extent=5;
 let markers:THREE.Sprite[]=[],hovered='';
 const masks=Array.from({length:8},()=>new THREE.Vector3(-10000,-10000,0));
 const load=(url:string)=>{const t=new THREE.TextureLoader().load(url,()=>{dirty=true;});t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.push(t);return t;};
 const atlas=load(atlasUrl),solar=load(solarUrl),stationTexture=load(stationUrl);
 const backdrop=celestialBackdrop(load(nebulaUrl));backdrop.renderOrder=-100;backdrop.frustumCulled=false;backdrop.visible=false;scene.add(backdrop);
 const beam=tableProjection(load(projectionUrl));beam.material.uniforms.uBodyMasks={value:masks};beam.material.uniforms.uDpr={value:renderer.getPixelRatio()};beam.renderOrder=-90;beam.frustumCulled=false;scene.add(beam);
 function disposeWorld(){const geos=new Set<THREE.BufferGeometry>(),mats=new Set<THREE.Material>();world.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){if(o.geometry!==geometry)geos.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}else if(o instanceof THREE.Sprite)mats.add(o.material);});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());world.clear();}
 function sphere(radius:number,pos:THREE.Vector3,material:THREE.Material){const mesh=new THREE.Mesh(geometry,material);mesh.scale.setScalar(radius);mesh.position.copy(pos);world.add(mesh);if(material instanceof THREE.ShaderMaterial)materials.push(material);return mesh;}
 function build(system:SystemId){
  disposeWorld();materials=[];hitTargets=[];ribbons=[];positions.clear();markers=[];hovered='';points=systemPoints(system);
  for(const [id,p] of displayPositions(system))positions.set(id,new THREE.Vector3(...p));
  extent=Math.max(4.5,...[...positions.values()].map(p=>p.length()+.25));
  guides=new THREE.Group();route=new THREE.Group();world.add(guides,route);guides.visible=state.orbits;route.visible=state.example&&system==='stanton';
  canvas.dataset.system=system;backdrop.material.uniforms.uTint!.value.set(...systemThemes[system].background);
  for(const p of points.filter(p=>['Star','Planet'].includes(p.type))){
   const position=positions.get(p.id)!,r=displayRadius(p),isStar=p.type==='Star';
   const material=isStar?new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false}):system==='stanton'?surfaceMaterial(atlas,p.name):navigationPlanetMaterial(p.name,p.type);
   const mesh=sphere(r,position,material);mesh.userData.id=p.id;hitTargets.push(mesh);
   if(isStar){
    // A reference-derived stellar VFX sprite at the canonical 3D location. The
    // sphere supplies the pick volume; detailed plasma is view-facing, not a simulated surface.
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:solar,transparent:true,depthWrite:false,toneMapped:false,color:system==='pyro'?'#ffd6a7':'#ffffff'}));sprite.position.copy(position);sprite.scale.setScalar(r*2.56);world.add(sprite);const radiance=stellarRadiance(r);radiance.position.copy(position);world.add(radiance);continue;
   }
   const look=bodyLook(p.name,p.type);if(look.clouds)sphere(r*1.009,position,cloudMaterial(p.name,look.clouds*.55));sphere(r*1.045,position,atmosphereMaterial(planetLimbColor(p.name,p.type),.6));
   if(points.some(q=>q.id===p.parentId&&q.type==='Star')){const radius=Math.hypot(position.x,position.z);const path=Array.from({length:257},(_,i)=>new THREE.Vector3(Math.cos(i/256*Math.PI*2)*radius,0,Math.sin(i/256*Math.PI*2)*radius));for(const [width,alpha,color] of [[8,.25,'#2bcde9'],[3,.45,'#68e8ff'],[1.2,.97,'#d4fbff']] as const){const ring=orbitFilament(path,width,alpha,color,masks,renderer.getPixelRatio());guides.add(ring);ribbons.push(ring);}}
  }
  for(const p of points.filter(p=>!isBody(p))){
   const glyph=new THREE.Sprite(new THREE.SpriteMaterial({map:stationTexture,transparent:true,depthWrite:false,depthTest:false,toneMapped:false,color:'#d3f4ff',blending:THREE.AdditiveBlending}));
   glyph.position.copy(positions.get(p.id)!);glyph.userData={id:p.id,kind:markerKind(p),overview:stationNames.includes(p.name)||p.name==='Grim HEX'||markerKind(p)==='lagrange'};glyph.renderOrder=5;world.add(glyph);hitTargets.push(glyph);markers.push(glyph);
  }
  if(system==='stanton'){
   const a=positions.get(points.find(p=>p.name==='Port Tressler')!.id)!,b=positions.get(points.find(p=>p.name==='Baijini Point')!.id)!;
   const path=displayRoute(a,b,points.filter(p=>['Star','Planet'].includes(p.type)).map(p=>({center:positions.get(p.id)!,radius:displayRadius(p)*1.2})));
   if(path.length>1)for(const [width,alpha,color] of [[12,.24,'#52d6ff'],[3,.92,'#b5f1ff']] as const){
    const line=routeRibbon(path,{color,width,flow:0}),m=line.material as THREE.ShaderMaterial;
    m.uniforms.uAlpha!.value=alpha;m.uniforms.uBodyMasks={value:masks};m.uniforms.uDpr={value:renderer.getPixelRatio()};
    m.fragmentShader=`uniform vec3 uColor;uniform float uAlpha,uDpr;uniform vec3 uBodyMasks[8];varying float vAcross;varying float vAlong;void main(){for(int i=0;i<8;i++){if(distance(gl_FragCoord.xy/uDpr,uBodyMasks[i].xy)<uBodyMasks[i].z)discard;}float edge=1.-smoothstep(.12,1.,abs(vAcross));gl_FragColor=vec4(uColor,pow(edge,1.6)*uAlpha);}`;
    route.add(line);ribbons.push(line);materials.push(m);
   }
  }
  dirty=true;resize();
 }
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let down:[number,number]|null=null;
 const onDown=(e:PointerEvent)=>{flight=null;down=[e.clientX,e.clientY];};
 const onUp=(e:PointerEvent)=>{if(!state.expanded||!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(hitTargets)[0];if(hit?.object.userData.id)select(hit.object.userData.id as string);};
 const onMove=(e:PointerEvent)=>{if(!state.expanded)return;const r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);hovered=ray.intersectObjects(hitTargets.filter(o=>o.visible))[0]?.object.userData.id||'';canvas.style.cursor=hovered?'pointer':'grab';dirty=true;};
 canvas.addEventListener('pointermove',onMove);
 canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointerup',onUp);controls.addEventListener('change',()=>{dirty=true;});controls.addEventListener('start',()=>{flight=null;});
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);const aspect=w/h,height=state.expanded?Math.max(hologramFrame.minimumHeight,extent*1.4,Math.max(hologramFrame.width,extent*2.1)/aspect):Math.max(3.6,hologramFrame.width/aspect);camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();backdrop.material.uniforms.uRes!.value.set(w,h);ribbons.forEach(l=>(l.material as THREE.ShaderMaterial).uniforms.uRes!.value.set(w,h));dirty=true;}
 function home(){flight=null;controls.enableDamping=false;controls.update();controls.target.set(0,0,0);camera.position.fromArray(state.expanded?hologramFrame.tilt:hologramFrame.roomTilt);camera.zoom=state.expanded?hologramDisplay.mapZoom:1;camera.updateProjectionMatrix();controls.update();controls.enableDamping=true;dirty=true;}
 function zoomBy(factor:number){flight=null;camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,controls.minZoom,controls.maxZoom);camera.updateProjectionMatrix();controls.update();dirty=true;}
 function focus(id=state.selected){const to=positions.get(id)?.clone();if(!to)return;const body=points.find(p=>p.id===id&&p.type==='Planet');const neighbor=body&&points.find(p=>p.parentId===id&&!isBody(p));if(neighbor)to.lerp(positions.get(neighbor.id)!, .15);flight={from:controls.target.clone(),to,eye:camera.position.clone(),toEye:camera.position.clone().add(to.clone().sub(controls.target)),zoom:camera.zoom,targetZoom:host.clientWidth<600?6:4.5,started:performance.now()};dirty=true;}
 build('stanton');const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);resize();
 const intersection=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false;dirty=true;});intersection.observe(host);
 function animate(stamp:number){if(disposed)return;frame=requestAnimationFrame(animate);if(!visible||document.hidden||stamp-last<1000/30)return;const dt=Math.min(.05,(stamp-last)/1000);last=stamp;
  if(flight){const f=flight,k=state.motion?Math.min(1,(stamp-f.started)/750):1,e=k*k*(3-2*k);controls.target.lerpVectors(f.from,f.to,e);camera.position.lerpVectors(f.eye,f.toEye,e);camera.zoom=f.zoom+(f.targetZoom-f.zoom)*e;camera.updateProjectionMatrix();dirty=true;if(k===1)flight=null;}
  const changed=controls.update(dt);if(!dirty&&!changed&&!state.motion)return;const time=state.motion?stamp/1000:0;
  for(const m of materials)if(m.uniforms.uTime)m.uniforms.uTime.value=time;beam.material.uniforms.uTime!.value=time;
  if(!state.expanded){
   const outerRadius=Math.max(...points.filter(p=>p.type==='Planet'&&points.some(q=>q.id===p.parentId&&q.type==='Star')).map(p=>{const v=positions.get(p.id)!;return Math.hypot(v.x,v.z);}));
   const c=new THREE.Vector3().project(camera),x=new THREE.Vector3(outerRadius,0,0).project(camera),z=new THREE.Vector3(0,0,outerRadius).project(camera);
   beam.material.uniforms.uOrbit!.value.set((c.x+1)/2,(c.y+1)/2,Math.abs(x.x-c.x)/2,Math.abs(z.y-c.y)/2);
  }
  masks.forEach(m=>m.set(-10000,-10000,0));points.filter(isBody).slice(0,8).forEach((p,i)=>{const q=positions.get(p.id)!.clone().project(camera);masks[i]!.set((q.x+1)*host.clientWidth/2,(q.y+1)*host.clientHeight/2,displayRadius(p)*host.clientHeight/(camera.top-camera.bottom)*camera.zoom+2);});
  const pixelWorld=(camera.top-camera.bottom)/camera.zoom/host.clientHeight;
  for(const marker of markers){const active=marker.userData.id===state.selected||marker.userData.id===hovered;marker.visible=state.expanded?(marker.userData.kind!=='relay'||camera.zoom>=2||active):marker.userData.overview;marker.scale.setScalar(pixelWorld*(state.expanded?(marker.userData.kind==='relay'?hologramDisplay.relayPixels:hologramDisplay.stationPixels):16)*(state.expanded&&active?1.3:1));}
  canvas.dataset.orbits=String(guides.visible);canvas.dataset.orbitStyle='luminous-filaments';canvas.dataset.stationCount=String(markers.length);canvas.dataset.visibleStations=String(markers.filter(m=>m.visible).length);canvas.dataset.projection=beam.visible?'orbit-linked':'off';canvas.dataset.visibleLagrange=String(markers.filter(m=>m.visible&&m.userData.kind==='lagrange').length);
  canvas.dataset.focus=state.selected;canvas.dataset.zoom=camera.zoom.toFixed(4);canvas.dataset.view=JSON.stringify([...camera.position.toArray(),...controls.target.toArray()].map(n=>+n.toFixed(4)));
  renderer.render(scene,camera);const occupied:{x:number;y:number;w:number;h:number}[]=[];
  // Labels may not cover a planet or the star, even when a nearby station's
  // alternate label position would otherwise fit the text collision checks.
  for(const p of points.filter(isBody)){const q=positions.get(p.id)!.clone().project(camera),r=displayRadius(p)*host.clientHeight/(camera.top-camera.bottom)*camera.zoom;occupied.push({x:(q.x+1)*host.clientWidth/2-r,y:(1-q.y)*host.clientHeight/2-r,w:r*2,h:r*2});}
  const priority=(id:string)=>id===state.selected?110:id===hovered?100:isBody(points.find(p=>p.id===id)!)?90:markerKind(points.find(p=>p.id===id)!)==='relay'?0:10;
  for(const [id,el] of [...labels].filter(([id])=>positions.has(id)).sort(([a],[b])=>priority(b)-priority(a))){const worldPosition=positions.get(id),p=points.find(q=>q.id===id);if(!worldPosition||!p){el.hidden=true;continue;}const q=worldPosition.clone().project(camera);const pr=displayRadius(p)*host.clientHeight/(camera.top-camera.bottom)*camera.zoom;const full=el.dataset.fullName||p.name,code=p.name.match(/^[A-Z]{3}-L\d/);el.textContent=code&&camera.zoom<2&&id!==state.selected&&id!==hovered?code[0]:full;
   const w=el.offsetWidth||100,h=el.offsetHeight||30;
   let x=(q.x+1)*host.clientWidth/2+pr+12,y=(1-q.y)*host.clientHeight/2-h/2;if(x+w>host.clientWidth-10)x=(q.x+1)*host.clientWidth/2-pr-w-12;
   // Keep names close to their marker. If both sides are occupied, hide the
   // lower-priority label until hover/selection instead of drifting far away.
   const overlaps=(xx:number)=>occupied.some(r=>xx<r.x+r.w+8&&xx+w+8>r.x&&y<r.y+r.h+6&&y+h+6>r.y);
   if(overlaps(x)){const alternate=(q.x+1)*host.clientWidth/2-pr-w-12;if(alternate>=8&&!overlaps(alternate))x=alternate;}
   const clashes=occupied.some(r=>x<r.x+r.w+8&&x+w+8>r.x&&y<r.y+r.h+6&&y+h+6>r.y);
   const hidden=!state.expanded||(clashes&&id!==state.selected&&id!==hovered)||(markerKind(p)==='relay'&&camera.zoom<2&&id!==state.selected&&id!==hovered)||q.z< -1||q.z>1||Math.abs(q.x)>.95||Math.abs(q.y)>.92||y+h>host.clientHeight-10;
   el.hidden=hidden;if(!hidden)occupied.push({x,y,w,h});el.style.left=`${x}px`;el.style.top=`${y}px`;el.dataset.selected=String(id===state.selected);
  }dirty=false;
 }
 frame=requestAnimationFrame(animate);
 return {focus,home,zoomBy,
  setState(next:Options){const systemChange=state.system!==next.system,collapse=state.expanded&&!next.expanded,expansionChange=state.expanded!==next.expanded;state=next;if(expansionChange)resize();if(systemChange){build(next.system);home();}else if(collapse){flight={from:controls.target.clone(),to:new THREE.Vector3(),eye:camera.position.clone(),toEye:new THREE.Vector3(...hologramFrame.roomTilt),zoom:camera.zoom,targetZoom:1,started:performance.now()};}else if(expansionChange){home();}controls.enabled=next.expanded;backdrop.visible=next.expanded;beam.visible=!next.expanded;route.visible=next.example&&next.system==='stanton';guides.visible=next.orbits;dirty=true;},
  dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);resizeObserver.disconnect();intersection.disconnect();controls.dispose();canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointerup',onUp);canvas.removeEventListener('pointermove',onMove);disposeWorld();geometry.dispose();backdrop.geometry.dispose();backdrop.material.dispose();beam.geometry.dispose();beam.material.dispose();textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();canvas.remove();}
 };
}

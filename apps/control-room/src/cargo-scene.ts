import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {CargoShip,Packing} from './cargo-plan.mjs';
import {cargoWorldCenter} from './cargo-plan.mjs';
import {paintedCargoSurface,cargoIdentification,cargoMicrosurface,hologramField,hologramWall,hologramBrackets} from './cargo-look';

export type CargoCamera='orbit'|'top'|'port'|'starboard';
type Marker={node:HTMLElement;position:THREE.Vector3};
export function createCargoScene(host:HTMLElement,onSelect:(id:string|null)=>void,onFailure:()=>void){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#020611');
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 host.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','Cargo 3D');
 const labels=document.createElement('div');labels.className='cargo-spatial-labels';host.append(labels);
 const camera=new THREE.PerspectiveCamera(35,1,.1,2000);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.12;
 controls.mouseButtons.MIDDLE=THREE.MOUSE.PAN;controls.maxPolarAngle=Math.PI*.91;controls.zoomSpeed=.8;controls.rotateSpeed=.65;
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);
 scene.environment=environment.texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xd6edff,0x263946,.85));
 const key=new THREE.DirectionalLight(0xfff2de,2.3);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.normalBias=.03;key.shadow.bias=-.0002;scene.add(key,key.target);
 const fill=new THREE.DirectionalLight(0x9ddfff,.85);fill.position.set(-30,12,-20);scene.add(fill);
 const rim=new THREE.DirectionalLight(0xb5eaff,1.4);rim.position.set(20,18,-30);scene.add(rim);
 const root=new THREE.Group();scene.add(root);
 const geometryCache=new Map<string,THREE.BufferGeometry>(),materialCache=new Map<string,THREE.Material>();
 const textureCache=new Map<string,THREE.CanvasTexture>();
 const markers:Marker[]=[];const selectable:THREE.Object3D[]=[];const objects=new Map<string,THREE.Group>();
 const center=new THREE.Vector3();let radius=10,frame=0,dead=false,visible=true,selected:string|null=null,dirty=true;
 let gridShape='';let hover:string|null=null;let transition:{from:THREE.Vector3;target:THREE.Vector3;to:THREE.Vector3;start:number}|null=null;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const mesh=(geo:THREE.BufferGeometry,mat:THREE.Material,parent:THREE.Object3D)=>{const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const mat=(id:string,make:()=>THREE.Material)=>{if(!materialCache.has(id))materialCache.set(id,make());return materialCache.get(id)!;};
 const cached=(id:string,make:()=>THREE.BufferGeometry)=>{if(!geometryCache.has(id))geometryCache.set(id,make());return geometryCache.get(id)!;};
 const metal=mat('frame',()=>new THREE.MeshStandardMaterial({color:0x354650,metalness:.87,roughness:.27}));
 const silver=mat('silver',()=>new THREE.MeshStandardMaterial({color:0x89999f,metalness:.92,roughness:.3}));
 const dark=mat('rubber',()=>new THREE.MeshStandardMaterial({color:0x15222c,metalness:.2,roughness:.65}));
 const micro=cargoMicrosurface();textureCache.set('micro',micro);
 function texture(color:string){
  const id=color;if(!textureCache.has(id)){
   const t=paintedCargoSurface(color);t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textureCache.set(id,t);
  }return textureCache.get(id)!;
 }
 function bodyGeometry(d:number[]){return cached('body'+d.join(','),()=>{
  const [w,h,l]=d as [number,number,number];const g=new RoundedBoxGeometry(w,h,l,2,.045);
  const p=g.attributes.position!,n=g.attributes.normal!,uv=g.attributes.uv!;
  for(let i=0;i<p.count;i++){
   const x=Math.abs(n.getX(i)),y=Math.abs(n.getY(i)),z=Math.abs(n.getZ(i));
   if(x>=y&&x>=z)uv.setXY(i,p.getZ(i)/l+.5,p.getY(i)/h+.5);
   else if(y>=z)uv.setXY(i,p.getZ(i)/l+.5,p.getX(i)/w+.5);
   else uv.setXY(i,p.getX(i)/w+.5,p.getY(i)/h+.5);
  }return g;
 });}
 function structure(d:number[],kind:'rails'|'corners'|'ribs'|'locks'){
  return cached(kind+d.join(','),()=>{
   const [w,h,l]=d as [number,number,number],parts:THREE.BufferGeometry[]=[];
   const bar=(a:number,b:number,c:number,x:number,y:number,z:number)=>{const g=new THREE.BoxGeometry(a,b,c).toNonIndexed();g.translate(x,y,z);parts.push(g);};
   if(kind==='rails'){
    for(const y of [-1,1])for(const z of [-1,1])bar(w,.08,.08,0,y*(h/2-.04),z*(l/2-.04));
    for(const x of [-1,1])for(const z of [-1,1])bar(.08,h,.08,x*(w/2-.04),0,z*(l/2-.04));
    for(const x of [-1,1])for(const y of [-1,1])bar(.08,.08,l,x*(w/2-.04),y*(h/2-.04),0);
   }else if(kind==='corners'){
    for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
     bar(.17,.14,.17,x*(w/2-.08),y*(h/2-.065),z*(l/2-.08));
    }
   }else if(kind==='locks'){
    // Recessed end doors: split seal, locking rods and short cam handles.
    // Every fitting stays inside the packer's box envelope.
    for(const side of [-1,1]){
     for(const x of [-1,1]){
      bar(.035,h-.27,.035,x*w*.22,0,side*(l/2-.024));
      for(const y of [-1,1]){
       bar(.105,.085,.045,x*w*.22,y*(h/2-.14),side*(l/2-.025));
      }
      bar(.14,.035,.055,x*w*.22,-h*.13,side*(l/2-.03));
     }
    }
   }else{
    for(let z=-l/2+.45;z<l/2-.3;z+=1.5){
     for(const x of [-1,1])bar(.055,Math.max(.1,h-.18),.06,x*(w/2-.03),0,z);
     for(const y of [-1,1])bar(Math.max(.1,w-.18),.055,.06,0,y*(h/2-.03),z);
    }
    for(const side of [-1,1])bar(.022,h-.16,.015,0,0,side*(l/2-.052));
    if(!parts.length)bar(.1,.1,.1,0,0,0);
   }
   const g=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());return g;
  });
 }
 function identification(d:number[],size:number,parent:THREE.Group){
  const [w,h,l]=d as [number,number,number];
  const material=mat('plate:'+size,()=>{
   const map=cargoIdentification(size);map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textureCache.set('plate:'+size,map);
   return new THREE.MeshStandardMaterial({map,metalness:.25,roughness:.55});
  });
  const width=Math.min(.76,w*.65,l*.65,h*.85),height=width/2;
  const geometry=cached('plate:'+width,()=>new THREE.PlaneGeometry(width,height));
  for(const side of [-1,1]){
   const end=mesh(geometry,material,parent);end.rotation.y=side===1?0:Math.PI;end.position.set(0,h*.21,side*(l/2-.059));
   const flank=mesh(geometry,material,parent);flank.rotation.y=side*Math.PI/2;flank.position.set(side*(w/2-.059),-h*.25,l*.19);
  }
 }
 function marker(text:string,position:THREE.Vector3,kind=''){
  const node=document.createElement('span');node.className=kind;node.textContent=text;labels.append(node);markers.push({node,position});
 }
 function resetContent(){
  root.traverse(o=>{if(o instanceof THREE.InstancedMesh)o.dispose();if(o instanceof THREE.Mesh||o instanceof THREE.Line){if(![...geometryCache.values()].includes(o.geometry))o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms)if(![...materialCache.values()].includes(m))m.dispose();}});
  root.clear();selectable.length=0;objects.clear();markers.length=0;labels.replaceChildren();
 }
 function update(ship:CargoShip,packing:Packing|null,en:boolean){
  const nextShape=JSON.stringify([ship.id,ship.grids.map(g=>[g.x,g.y,g.z,g.w,g.h,g.l,g.rotation])]);
  const refit=gridShape!==nextShape;gridShape=nextShape;
  resetContent();
  const bounds=new THREE.Box3();
  for(const [index,g] of ship.grids.entries()){
   const obj=new THREE.Group();obj.position.set(g.x+g.w/2,g.y+g.h/2,g.z+g.l/2);obj.rotation.set(...(g.rotation.map(a=>a*Math.PI/180) as [number,number,number]));root.add(obj);
   const shape=new THREE.BoxGeometry(g.w,g.h,g.l);
   const cage=new THREE.LineSegments(new THREE.EdgesGeometry(shape),new THREE.LineBasicMaterial({color:g.disabled?0x7c8a91:0x9dbfd0,transparent:true,opacity:g.disabled?.3:.52}));shape.dispose();obj.add(cage);
   if(!g.disabled){
    obj.add(hologramBrackets(g.w,g.h,g.l));
    // The twelve rails describe the real packing volume, including its ceiling.
    const railParts:THREE.BufferGeometry[]=[],baseParts:THREE.BufferGeometry[]=[];
    const rail=(a:THREE.Vector3,b:THREE.Vector3)=>{const delta=b.clone().sub(a);const geo=new THREE.CylinderGeometry(a.y===-g.h/2&&b.y===-g.h/2?.035:.014,a.y===-g.h/2&&b.y===-g.h/2?.035:.014,delta.length(),6);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));geo.translate(...a.clone().add(b).multiplyScalar(.5).toArray());(a.y===-g.h/2&&b.y===-g.h/2?baseParts:railParts).push(geo);};
    for(const x of [-1,1])for(const z of [-1,1])rail(new THREE.Vector3(x*g.w/2,-g.h/2,z*g.l/2),new THREE.Vector3(x*g.w/2,g.h/2,z*g.l/2));
    for(const y of [-1,1])for(const z of [-1,1])rail(new THREE.Vector3(-g.w/2,y*g.h/2,z*g.l/2),new THREE.Vector3(g.w/2,y*g.h/2,z*g.l/2));
    for(const x of [-1,1])for(const y of [-1,1])rail(new THREE.Vector3(x*g.w/2,y*g.h/2,-g.l/2),new THREE.Vector3(x*g.w/2,y*g.h/2,g.l/2));
    obj.add(new THREE.Mesh(mergeGeometries(railParts)!,new THREE.MeshBasicMaterial({color:0x8cbacc,transparent:true,opacity:.52,toneMapped:false})));railParts.forEach(p=>p.dispose());
    obj.add(new THREE.Mesh(mergeGeometries(baseParts)!,new THREE.MeshBasicMaterial({color:0xbda16b,transparent:true,opacity:.7})));baseParts.forEach(p=>p.dispose());
    const hidden=new THREE.LineSegments(cage.geometry.clone(),new THREE.LineDashedMaterial({color:0x7bd9f3,transparent:true,opacity:.09,depthTest:false,depthWrite:false,dashSize:.16,gapSize:.14}));hidden.computeLineDistances();hidden.renderOrder=4;obj.add(hidden);
    const ticks:number[]=[];
    for(let y=1;y<g.h;y++)for(const x of [-1,1])ticks.push(x*g.w/2,y-g.h/2,-g.l/2,x*g.w/2,y-g.h/2,g.l/2);
    for(let x=1;x<g.w;x++)ticks.push(x-g.w/2,g.h/2,-g.l/2,x-g.w/2,g.h/2,g.l/2);
    for(let z=1;z<g.l;z++)ticks.push(-g.w/2,g.h/2,z-g.l/2,g.w/2,g.h/2,z-g.l/2);
    const tickGeo=new THREE.BufferGeometry();tickGeo.setAttribute('position',new THREE.Float32BufferAttribute(ticks,3));obj.add(new THREE.LineSegments(tickGeo,new THREE.LineBasicMaterial({color:0x58bbdb,transparent:true,opacity:.12,depthWrite:false})));

    const attachment=new THREE.Mesh(new THREE.PlaneGeometry(g.w,g.l),new THREE.MeshStandardMaterial({color:0x3b3425,metalness:.52,roughness:.64,transparent:true,opacity:.55,side:THREE.DoubleSide}));attachment.rotation.x=-Math.PI/2;attachment.position.y=-g.h/2;attachment.receiveShadow=true;obj.add(attachment);
    const field=new THREE.Mesh(new THREE.PlaneGeometry(g.w,g.l),hologramField(g.w,g.l));field.rotation.x=-Math.PI/2;field.position.y=-g.h/2+.015;obj.add(field);
    const wall=new THREE.Mesh(new THREE.BoxGeometry(g.w,g.h,g.l),hologramWall());obj.add(wall);
    // Luminous anchoring perimeter belongs to the actual attachment face.
    const anchorBox=new THREE.BoxGeometry(g.w,.018,g.l);const anchor=new THREE.LineSegments(new THREE.EdgesGeometry(anchorBox),new THREE.LineBasicMaterial({color:0xbda16b,transparent:true,opacity:.6}));anchorBox.dispose();anchor.position.y=-g.h/2;obj.add(anchor);
   }
   obj.updateMatrixWorld(true);bounds.union(new THREE.Box3().setFromObject(obj));
   const used=packing?.bins[index]?.used||0;
   const name=ship.grids.length===1?(en?'HOLD':'화물칸'):`${en?'GRID':'구역'} ${String(index+1).padStart(2,'0')}`;
   marker(`${name}  ·  ${g.disabled?'OFF':`${used} / ${g.w*g.h*g.l} SCU`}${ship.grids.length>4?'':`\n${g.w} × ${g.l} × ${g.h} ${en?'cells':'셀'}`}`,obj.localToWorld(new THREE.Vector3(0,g.h/2+.35,0)),g.disabled?'grid-caption disabled':'grid-caption');
  }
  bounds.getCenter(center);const size=bounds.getSize(new THREE.Vector3());radius=Math.max(3,size.length()*.55);
  scene.fog=new THREE.FogExp2(0x020611,.006/radius*10);
  // Only ship-defined attachment grids are rendered. There is no room-wide floor.
  key.position.set(center.x-radius*1.2,center.y+radius*2,center.z+radius);key.target.position.copy(center);key.shadow.camera.left=-radius*1.5;key.shadow.camera.right=radius*1.5;key.shadow.camera.top=radius*1.5;key.shadow.camera.bottom=-radius*1.5;key.shadow.camera.far=radius*6;key.shadow.camera.updateProjectionMatrix();
  marker(en?'▲ BOW / FRONT':'▲ 선수 / 앞',new THREE.Vector3(center.x,bounds.min.y,bounds.min.z-2.1),'orientation bow');
  marker(en?'STERN / REAR':'선미 / 뒤',new THREE.Vector3(center.x,bounds.min.y,bounds.max.z+1.6),'orientation stern');
  marker(en?'PORT':'좌현',new THREE.Vector3(bounds.min.x-1,center.y,center.z),'orientation');
  marker(en?'STARBOARD':'우현',new THREE.Vector3(bounds.max.x+1,center.y,center.z),'orientation');
  // Physical direction guides stay aligned with the ship when the user orbits.
  const guideY=bounds.min.y-.25;
  const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,-1),new THREE.Vector3(bounds.min.x-.8,guideY,bounds.max.z),size.z+1.2,0xffcb72,.8,.6);root.add(arrow);
  const nose=new THREE.Shape();nose.moveTo(-.5,0);nose.lineTo(0,-.7);nose.lineTo(.5,0);nose.lineTo(.24,0);nose.lineTo(0,-.32);nose.lineTo(-.24,0);nose.closePath();
  const chevron=new THREE.Mesh(new THREE.ShapeGeometry(nose),new THREE.MeshBasicMaterial({color:0xffcb72,side:THREE.DoubleSide}));chevron.rotation.x=Math.PI/2;chevron.position.set(center.x,guideY,bounds.min.z-.5);root.add(chevron);
  const access=ship.access||'rear';
  if(access!=='external'){
   const at=access==='front'?new THREE.Vector3(center.x,bounds.min.y,bounds.min.z-2.1):access==='left'?new THREE.Vector3(bounds.min.x-2,center.y,center.z):access==='right'?new THREE.Vector3(bounds.max.x+2,center.y,center.z):new THREE.Vector3(center.x,bounds.min.y,bounds.max.z+2.1);
   marker(en?'CARGO ACCESS':'화물 출입구',at,'access');
   const side=access==='left'||access==='right';const doorway=new THREE.Mesh(new THREE.BoxGeometry(side?.09:size.x*.7,.035,side?size.z*.7:.09),new THREE.MeshBasicMaterial({color:0xffc778}));doorway.position.copy(at);doorway.position.y=guideY;root.add(doorway);
  }
  for(const b of packing?.boxes||[]){
   const g=ship.grids[b.bin];if(!g)continue;
   const group=new THREE.Group();group.position.fromArray(cargoWorldCenter(g,b));group.rotation.set(...(g.rotation.map(a=>a*Math.PI/180) as [number,number,number]));
   const container=new THREE.Group();group.add(container);root.add(group);
   const d=b.dims.map(x=>Math.max(.12,x-.07));
   const painted=mat(`paint:${b.color}`,()=>new THREE.MeshPhysicalMaterial({map:texture(b.color),metalness:.38,roughness:.68,roughnessMap:micro,bumpMap:micro,bumpScale:.006,clearcoat:.08,clearcoatRoughness:.48}));
   // The painted body is recessed behind the frame; previously the full-size
   // shell swallowed the rails, flattening both silhouettes and contact shadows.
   mesh(bodyGeometry(d.map(v=>v-.12)),painted,container);
   mesh(structure(d,'rails'),metal,container);mesh(structure(d,'ribs'),dark,container);mesh(structure(d,'corners'),silver,container);mesh(structure(d,'locks'),silver,container);
   identification(d,b.size,container);
   for(const child of container.children)child.userData.boxId=b.boxId;
   const edges=new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeometry(d),30),new THREE.LineBasicMaterial({color:0xffb658,depthTest:false,transparent:true,opacity:.85}));edges.name='selection';edges.visible=false;edges.scale.setScalar(1.008);edges.renderOrder=10;container.add(edges);
   objects.set(b.boxId,container);
  }
  // Reuse draw calls across crates. Geometry detail does not multiply draw calls
  // for large holds; instance IDs still map back to independent cargo ownership.
  root.updateMatrixWorld(true);
  const batches=new Map<string,{geometry:THREE.BufferGeometry;material:THREE.Material;matrices:THREE.Matrix4[];ids:(string|null)[]}>();
  for(const container of objects.values())for(const child of [...container.children]){
   if(!(child instanceof THREE.Mesh))continue;
   const material=child.material as THREE.Material,key=child.geometry.uuid+material.uuid;
   if(!batches.has(key))batches.set(key,{geometry:child.geometry,material,matrices:[],ids:[]});
   const batch=batches.get(key)!;batch.matrices.push(child.matrixWorld.clone());batch.ids.push(child.userData.boxId||null);container.remove(child);
  }
  selectable.length=0;
  for(const batch of batches.values()){
   const instances=new THREE.InstancedMesh(batch.geometry,batch.material,batch.matrices.length);
   batch.matrices.forEach((matrix,i)=>instances.setMatrixAt(i,matrix));instances.instanceMatrix.needsUpdate=true;instances.castShadow=true;instances.receiveShadow=true;
   instances.userData.boxIds=batch.ids;root.add(instances);if(batch.ids.some(Boolean))selectable.push(instances);
  }
  select(selected);if(refit)home('orbit',true);host.dataset.grids=String(ship.grids.length);host.dataset.boxes=String(packing?.boxes.length||0);host.dataset.ready='true';invalidate();
 }
 function select(id:string|null){selected=id;objects.forEach((o,key)=>{const outline=o.getObjectByName('selection')!;outline.visible=key===selected||key===hover;});invalidate();}
 function home(mode:CargoCamera='orbit',instant=false){
  controls.enableDamping=false;controls.update();controls.enableDamping=true;
  const dir=mode==='top'?new THREE.Vector3(0,1,.001):mode==='port'?new THREE.Vector3(-1,.2,.001):mode==='starboard'?new THREE.Vector3(1,.2,.001):new THREE.Vector3(-.9,.85,1.15);
  const distance=radius*3.5/Math.min(1,camera.aspect);const to=center.clone().add(dir.normalize().multiplyScalar(distance));controls.minDistance=radius*.55;controls.maxDistance=distance*2.5;
  if(instant||reduced.matches){camera.position.copy(to);controls.target.copy(center);transition=null;}
  else transition={from:camera.position.clone(),target:controls.target.clone(),to,start:performance.now()};
  invalidate();
 }
 function zoom(amount:number){transition=null;const d=camera.position.clone().sub(controls.target);d.setLength(THREE.MathUtils.clamp(d.length()*amount,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(d);invalidate();}
 function render(now:number){frame=0;if(dead||!visible||document.hidden)return;
  const moving=!!transition;if(transition){const t=THREE.MathUtils.clamp((now-transition.start)/450,0,1),s=t*t*(3-2*t);camera.position.lerpVectors(transition.from,transition.to,s);controls.target.lerpVectors(transition.target,center,s);if(t===1)transition=null;}
  const changed=controls.update();const off=controls.target.clone().sub(center);if(off.length()>radius){const correction=off.setLength(off.length()-radius);controls.target.sub(correction);camera.position.sub(correction);}
  if(dirty||changed||moving){host.dataset.view=JSON.stringify([...camera.position.toArray(),...controls.target.toArray()].map(n=>+n.toFixed(4)));renderer.render(scene,camera);dirty=false;const w=host.clientWidth,h=host.clientHeight;for(const mark of markers){const p=mark.position.clone().project(camera);mark.node.hidden=p.z>1||p.z< -1||Math.abs(p.x)>.95||Math.abs(p.y)>.9;const half=mark.node.offsetWidth/2+8;const x=THREE.MathUtils.clamp((p.x*.5+.5)*w,half,w-half);mark.node.style.transform=`translate(${x}px,${(-p.y*.5+.5)*h}px) translate(-50%,-50%)`;}}
  if(changed||transition)invalidate();
 }
 function invalidate(){dirty=true;if(!frame&&!dead&&visible&&!document.hidden)frame=requestAnimationFrame(render);}
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();invalidate();}
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
 const observer=new IntersectionObserver(entries=>{visible=!!entries[0]?.isIntersecting;if(visible)invalidate();});observer.observe(host);
 const visibility=()=>{if(!document.hidden)invalidate();};document.addEventListener('visibilitychange',visibility);
 controls.addEventListener('change',invalidate);controls.addEventListener('start',()=>{transition=null;});
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down:number[]|null=null;
 function hit(e:PointerEvent){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const h=ray.intersectObjects(selectable,false)[0];return h?.instanceId!==undefined?h.object.userData.boxIds[h.instanceId] as string:undefined;}
 const pointerDown=(e:PointerEvent)=>{down=e.isPrimary&&e.button===0&&!e.shiftKey&&!e.ctrlKey?[e.clientX,e.clientY]:null;};
 const pointerUp=(e:PointerEvent)=>{if(down&&Math.hypot(e.clientX-down[0]!,e.clientY-down[1]!)<5)onSelect(hit(e)||null);down=null;};
 const pointerMove=(e:PointerEvent)=>{const next=hit(e)||null;if(next!==hover){hover=next;renderer.domElement.style.cursor=hover?'pointer':'grab';select(selected);}};
 const pointerLeave=()=>{hover=null;down=null;select(selected);};
 const lost=(e:Event)=>{e.preventDefault();onFailure();};
 renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointerleave',pointerLeave);renderer.domElement.addEventListener('webglcontextlost',lost);
 resize();
 return {update,select,home,zoom,dispose(){dead=true;cancelAnimationFrame(frame);observer.disconnect();resizeObserver.disconnect();document.removeEventListener('visibilitychange',visibility);controls.dispose();renderer.domElement.removeEventListener('webglcontextlost',lost);resetContent();geometryCache.forEach(g=>g.dispose());materialCache.forEach(m=>m.dispose());textureCache.forEach(t=>t.dispose());environment.dispose();renderer.dispose();renderer.forceContextLoss();host.replaceChildren();}};
}

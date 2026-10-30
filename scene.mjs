import {DEFAULT_SHIP} from './ships.mjs';
import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {buildHull,hullKind} from './hulls.mjs';
import {STAR_COLORS,surfaceTexture,atmosphereColor,glowSprite,createBackdrop} from './mapfx.mjs';
const PALETTE={Hurston:'#b58c55',Crusader:'#d9b5a2',ArcCorp:'#ab8878',microTech:'#a8d4dd',Bloom:'#c1d9cf',Monox:'#ac7761','Pyro I':'#c57945','Pyro IV':'#b18e76','Pyro V':'#acb587',Terminus:'#9ba1b8',Nyx:'#e0e6fa'};
function setup(container,opts={}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,logarithmicDepthBuffer:!!opts.logDepth});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);container.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,opts.near||.0001,100000);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=.002;controls.maxDistance=2500;
 scene.add(new THREE.AmbientLight(0xbad5e4,2.1));const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(-40,70,10);scene.add(sun);
 const resize=()=>{const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(container);resize();
 return {renderer,scene,camera,controls};
}
function clearGroup(group){while(group.children.length){const o=group.children[0];group.remove(o);o.traverse(c=>{c.geometry?.dispose();if(Array.isArray(c.material))c.material.forEach(m=>m.dispose());else c.material?.dispose();});}}
function line(points,color,opacity=.4){const g=new THREE.BufferGeometry().setFromPoints(points);return new THREE.Line(g,new THREE.LineBasicMaterial({color,transparent:true,opacity}));}
export {createStarMap} from './starmap.mjs';
export {setup,clearGroup,line,PALETTE};

export function createCargoView(container){
 container.innerHTML='<div class="cargo-split"><div class="cargo-viewport" data-side="left"><div class="cargo-side-title">좌측에서 보기</div><div class="cargo-canvas"></div><div class="cargo-zone-labels"></div><button type="button" class="cargo-camera-reset">시점 초기화</button></div><div class="cargo-viewport" data-side="right"><div class="cargo-side-title">우측에서 보기</div><div class="cargo-canvas"></div><div class="cargo-zone-labels"></div><button type="button" class="cargo-camera-reset">시점 초기화</button></div></div>';
 let profile=DEFAULT_SHIP,profileKey='',latest=null,latestOptions={};
 const views=[...container.querySelectorAll('.cargo-viewport')].map(el=>{const canvas=el.querySelector('.cargo-canvas'),ctx=setup(canvas),frame=new THREE.Group(),boxes=new THREE.Group();ctx.scene.add(frame,boxes);ctx.scene.traverse(o=>{if(o.isAmbientLight)o.intensity=.75;if(o.isDirectionalLight){o.intensity=2.6;o.position.set(el.dataset.side==='left'?-60:60,80,-30);}});ctx.scene.add(new THREE.HemisphereLight(0xd8ecff,0x18212b,1.1));const rim=new THREE.DirectionalLight(0x7fd8ff,1.4);rim.position.set(el.dataset.side==='left'?50:-50,20,90);ctx.scene.add(rim);ctx.renderer.toneMapping=THREE.ACESFilmicToneMapping;ctx.renderer.toneMappingExposure=1.05;return {...ctx,el,canvas,frame,boxes,labels:[],side:el.dataset.side,center:new THREE.Vector3(),radius:15};});
 function home(v){v.controls.target.copy(v.center);v.camera.position.copy(v.center).add(new THREE.Vector3((v.side==='left'?-1:1),.55,.3).normalize().multiplyScalar(v.radius*3));v.controls.maxDistance=v.radius*8;v.controls.minDistance=.8;v.controls.update();}
 views.forEach(v=>v.el.querySelector('button').onclick=()=>home(v));
 function model(ship){profile=ship;const hull=hullKind(ship)==='hull-b',bounds=new THREE.Box3();ship.grids.forEach(g=>{bounds.expandByPoint(new THREE.Vector3(g.x,g.y,g.z));bounds.expandByPoint(new THREE.Vector3(g.x+g.w,g.y+g.h,g.z+g.l));});
  for(const v of views){clearGroup(v.frame);clearGroup(v.boxes);v.el.querySelector('.cargo-zone-labels').replaceChildren();v.labels=[];v.cages=[];const shape=buildHull(ship,bounds);v.frame.add(shape);const all=bounds.clone().union(new THREE.Box3().setFromObject(shape)),center=all.getCenter(new THREE.Vector3()),size=all.getSize(new THREE.Vector3());v.center.copy(center);v.radius=Math.max(8,size.length()*.42);const floor=new THREE.GridHelper(Math.ceil(size.length()*1.4),Math.ceil(size.length()*1.4/2.5),0x2b4a5c,0x16283a);floor.position.set(center.x,all.min.y-2,center.z);floor.material.transparent=true;floor.material.opacity=.5;v.frame.add(floor);
   ship.grids.forEach((g,i)=>{const group=new THREE.Group(),cage=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(g.w,g.h,g.l)),new THREE.LineBasicMaterial({color:0x6b9daf,transparent:true,opacity:.55}));group.position.set(g.x+g.w/2,g.y+g.h/2,g.z+g.l/2);group.rotation.set(...(g.rotation||[0,0,0]).map(a=>a*Math.PI/180));group.add(cage);v.frame.add(group);v.cages.push(group);const label=document.createElement('span');label.className='cargo-zone-label';label.textContent=g.name.split(' · ')[0];v.el.querySelector('.cargo-zone-labels').append(label);v.labels.push({element:label,point:group.position.clone(),bin:i});});home(v);
  }
 }
 function update(packing,options={}){const ship=options.ship||DEFAULT_SHIP,key=JSON.stringify(ship);if(key!==profileKey){profileKey=key;model(ship);}latest=packing;latestOptions=options;const hull=hullKind(ship)==='hull-b';
  for(const v of views){clearGroup(v.boxes);const allowed=i=>!hull||(v.side==='left'?ship.grids[i].x+ship.grids[i].w/2<0:ship.grids[i].x+ship.grids[i].w/2>=0);v.cages.forEach((c,i)=>c.visible=allowed(i)&&(!options.hideEmpty||!!packing?.bins[i]?.boxes.length));
   for(const p of packing?.boxes||[]){if(!allowed(p.bin))continue;const g=ship.grids[p.bin],muted=options.boxIds?!options.boxIds.includes(p.boxId):options.missionId&&p.missionId!==options.missionId;const center=new THREE.Vector3(p.cell[0]+p.dims[0]/2-g.w/2,p.cell[1]+p.dims[1]/2-g.h/2,p.cell[2]+p.dims[2]/2-g.l/2);const origin=v.cages[p.bin];const boxGroup=new THREE.Group();boxGroup.position.copy(origin.position);boxGroup.rotation.copy(origin.rotation);const geometry=new THREE.BoxGeometry(...p.dims.map(d=>d-.04)),mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:p.color,metalness:.1,roughness:.7,transparent:!!muted,opacity:muted?.08:1,depthWrite:!muted}));mesh.position.copy(center);boxGroup.add(mesh);const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:0x09202b,transparent:true,opacity:muted?.05:.6}));edge.position.copy(center);boxGroup.add(edge);v.boxes.add(boxGroup);}
  }
 }
 function loop(){requestAnimationFrame(loop);if(document.hidden)return;for(const v of views){v.controls.update();const rect=v.canvas.getBoundingClientRect();for(const l of v.labels){const p=l.point.clone().project(v.camera),x=(p.x*.5+.5)*rect.width,y=(-p.y*.5+.5)*rect.height;const visible=v.cages[l.bin].visible&&p.z<1&&x>12&&x<rect.width-12&&y>30&&y<rect.height-28;l.element.hidden=!visible;if(visible){l.element.style.left=x+'px';l.element.style.top=y+'px';}}v.renderer.render(v.scene,v.camera);}}
 update(null,{ship:DEFAULT_SHIP,hideEmpty:false});loop();return {update,home(){views.forEach(home);}};
}

import {placeCargoLabels} from './cargo-label-layout.mjs';
import {DEFAULT_SHIP,hullKind} from './ships.mjs';
import {shipAccess} from './engine.mjs';
import {createBloom} from './cargo-bloom.mjs';
import {observeRenderLoop,dampingForDelta} from './render-loop.mjs';
import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
// Boxes loaded at the selected stop glow cyan; boxes coming off glow orange.
const LOAD_GLOW=new THREE.Color(.35,.95,1.25),UNLOAD_GLOW=new THREE.Color(1.25,.55,.2);
const PALETTE={Hurston:'#b58c55',Crusader:'#d9b5a2',ArcCorp:'#ab8878',microTech:'#a8d4dd',Bloom:'#c1d9cf',Monox:'#ac7761','Pyro I':'#c57945','Pyro IV':'#b18e76','Pyro V':'#acb587',Terminus:'#9ba1b8',Nyx:'#e0e6fa'};
function setup(container,opts={}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,logarithmicDepthBuffer:!!opts.logDepth});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);container.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,opts.near||.0001,100000);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=.002;controls.maxDistance=2500;
 scene.add(new THREE.AmbientLight(0xbad5e4,2.1));const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(-40,70,10);scene.add(sun);
 const resize=()=>{const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);resize();
 return {renderer,scene,camera,controls,resizeObserver};
}
function clearGroup(group){while(group.children.length){const o=group.children[0];group.remove(o);o.traverse(c=>{if(!c.geometry?.userData.shared)c.geometry?.dispose();for(const m of Array.isArray(c.material)?c.material:[c.material]){if(!m||m.userData.shared)continue;if(m.userData.ownedMap)m.map?.dispose();m.dispose();}});}}
function line(points,color,opacity=.4){const g=new THREE.BufferGeometry().setFromPoints(points);return new THREE.Line(g,new THREE.LineBasicMaterial({color,transparent:true,opacity}));}
export {setup,clearGroup,line,PALETTE};

// Container texture: destination colour, darker frame, ribs and the SCU size stencilled on the side.
const crateCache=new Map();let cargoUsers=0;
function crateTexture(color,size){const key=color+size;if(crateCache.has(key))return crateCache.get(key);const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
 // Painted inset panels, structural rails and legible stencils. Destination colour
 // stays on the body; lighting/selection never replaces it with a white glow.
 g.fillStyle='#1c262c';g.fillRect(0,0,256,256);g.fillStyle=color;g.fillRect(18,18,220,220);
 const paint=g.createLinearGradient(0,0,256,256);paint.addColorStop(0,'rgba(255,255,255,.12)');paint.addColorStop(.45,'rgba(0,0,0,.05)');paint.addColorStop(1,'rgba(0,0,0,.35)');g.fillStyle=paint;g.fillRect(18,18,220,220);
 // Deep inset segmented panels and broad cast frame match in-game SCU crates.
 // Destination paint remains visible; container dimensions and packing stay unchanged.
 g.fillStyle='rgba(4,12,17,.43)';g.fillRect(31,33,194,137);
 for(let y=42;y<163;y+=38){g.strokeStyle='rgba(6,14,20,.85)';g.lineWidth=5;g.strokeRect(40,y,176,28);g.strokeStyle='rgba(204,223,228,.2)';g.lineWidth=1;g.strokeRect(43,y+2,170,24);}
 for(const x of [9,229]){g.fillStyle='#45545d';g.fillRect(x,7,18,242);g.fillStyle='#839097';g.fillRect(x+2,9,2,238);}
 for(const y of [9,229]){g.fillStyle='#45545d';g.fillRect(8,y,240,18);g.fillStyle='#839097';g.fillRect(10,y+2,236,2);}
 for(const x of [6,218])for(const y of [6,218]){g.fillStyle='#67767c';g.fillRect(x,y,32,32);g.fillStyle='#17242b';g.fillRect(x+8,y+9,16,14);g.strokeStyle='#a5b3b5';g.lineWidth=1;g.strokeRect(x+3,y+3,26,26);}
 g.fillStyle=color;g.fillRect(42,18,172,7);g.fillRect(19,48,6,156);
 g.strokeStyle='#101a21';g.lineWidth=6;g.strokeRect(18,18,220,220);g.strokeStyle='#7c8b91';g.lineWidth=1;g.strokeRect(8,8,240,240);
 for(const x of [11,245])for(const y of [11,245]){g.fillStyle='#bac7cb';g.beginPath();g.arc(x,y,2.3,0,Math.PI*2);g.fill();}
 g.fillStyle='#14212be8';g.fillRect(28,184,200,40);g.textAlign='left';g.fillStyle='#91aab8';g.font='9px Arial';g.fillText('STAM / CARGO',36,198);
 g.font='bold 19px Arial';g.fillStyle='#f3f6ed';g.textAlign='right';g.fillText(size+' SCU',219,215);
 for(let x=36;x<109;x+=4){g.fillStyle='#b4c5cb';g.fillRect(x,205,x%3?1:2,10);}
 for(let x=32;x<224;x+=12){g.fillStyle=x%24?'#293b43':'#c3a563';g.fillRect(x,229,10,3);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;crateCache.set(key,t);return t;}
const bodyCache=new Map();
function crateBody(dx,dy,dz){const key=[dx,dy,dz].join();if(bodyCache.has(key))return bodyCache.get(key);
 const bevel=Math.min(.035,dx/10,dy/10,dz/10),x=dx/2-bevel,y=dy/2-bevel,shape=new THREE.Shape();shape.moveTo(-x,-y);shape.lineTo(x,-y);shape.lineTo(x,y);shape.lineTo(-x,y);shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:dz-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,steps:1,curveSegments:1});geometry.translate(0,0,-dz/2+bevel);
 // Stable face-local UVs prevent long crates stretching the stencil around corners.
 const pos=geometry.attributes.position,normal=geometry.attributes.normal,uv=geometry.attributes.uv;
 for(let i=0;i<pos.count;i++){const nx=Math.abs(normal.getX(i)),ny=Math.abs(normal.getY(i)),nz=Math.abs(normal.getZ(i));if(nz>=nx&&nz>=ny)uv.setXY(i,pos.getX(i)/dx+.5,pos.getY(i)/dy+.5);else if(nx>=ny)uv.setXY(i,pos.getZ(i)/dz+.5,pos.getY(i)/dy+.5);else uv.setXY(i,pos.getX(i)/dx+.5,pos.getZ(i)/dz+.5);}
 geometry.userData.shared=true;bodyCache.set(key,geometry);return geometry;}
// Steel frame (12 rails + 8 corner castings) merged into one geometry, cached per box size.
const frameCache=new Map();
function mergeGeos(geos){const pos=[],nor=[],idx=[];let off=0;for(const g of geos){const p=g.attributes.position.array,n=g.attributes.normal.array,ix=g.index.array;pos.push(...p);nor.push(...n);for(const i of ix)idx.push(i+off);off+=p.length/3;g.dispose();}const m=new THREE.BufferGeometry();m.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));m.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));m.setIndex(idx);return m;}
function crateFrame(dx,dy,dz){const key=[dx,dy,dz].join();if(frameCache.has(key))return frameCache.get(key);const t=.07,c=.13,parts=[],hx=dx/2,hy=dy/2,hz=dz/2;
 const bar=(w,h,l,x,y,z)=>{const g=new THREE.BoxGeometry(w,h,l);g.translate(x,y,z);parts.push(g);};
 for(const sy of [-1,1])for(const sz of [-1,1])bar(dx,t,t,0,sy*(hy-t/2),sz*(hz-t/2));for(const sx of [-1,1])for(const sz of [-1,1])bar(t,dy,t,sx*(hx-t/2),0,sz*(hz-t/2));for(const sx of [-1,1])for(const sy of [-1,1])bar(t,t,dz,sx*(hx-t/2),sy*(hy-t/2),0);
 for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1])bar(c,c,c,sx*(hx-c/2+.005),sy*(hy-c/2+.005),sz*(hz-c/2+.005));
 const g=mergeGeos(parts);g.userData.shared=true;frameCache.set(key,g);return g;}
let shadowTex=null;function contactShadow(){if(shadowTex)return shadowTex;const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),r=g.createRadialGradient(64,64,10,64,64,64);r.addColorStop(0,'rgba(0,0,0,.75)');r.addColorStop(.6,'rgba(0,0,0,.35)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,128,128);shadowTex=new THREE.CanvasTexture(c);return shadowTex;}
function bracketGeo(w,h,l){const k=Math.min(.6,Math.min(w,h,l)*.3),p=[],hx=w/2,hy=h/2,hz=l/2;for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){const x=sx*hx,y=sy*hy,z=sz*hz;p.push(x,y,z,x-sx*k,y,z,x,y,z,x,y-sy*k,z,x,y,z,x,y,z-sz*k);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));return g;}
export function createCargoView(container,{onGridToggle,isGridLocked=()=>false}={}){
 cargoUsers++;let disposed=false;const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 // Grid-only cargo view (no ship exterior). Every hold, Hull B included, uses one rotatable 3D view with side labels.
 let views=[],layout='',profileKey='',ship=DEFAULT_SHIP,lastBoxes=new Set(),dropStart=0,nameOf=null,missionNameOf=null,selecting=false,lastPacking=null,lastOptions={};
 function viewport(side,title){return `<div class="cargo-viewport" data-side="${side}"><div class="cargo-side-title">${title}</div><div class="cargo-canvas"></div><div class="cargo-zone-labels"></div><div class="cargo-tip" hidden></div><div class="cargo-grid-help">구역을 눌러 사용 여부를 변경하십시오 · 회색은 사용 안 함</div><button type="button" class="cargo-grid-toggle" aria-pressed="false">그리드 켜기/끄기</button><button type="button" class="cargo-label-toggle"></button><div class="cargo-camera-presets" role="group" aria-label="적재 시점"><button type="button" data-view="top">위</button><button type="button" data-view="left">좌현</button><button type="button" data-view="right">우현</button><button type="button" class="cargo-camera-reset">전체</button></div></div>`;}
 function disposeViews(){for(const v of views){v.dead=true;v.loop?.dispose();v.controls.dispose();v.bloom.dispose();v.resizeObserver?.disconnect();clearGroup(v.frame);clearGroup(v.boxes);v.renderer.dispose();v.renderer.forceContextLoss?.();}views=[];}
 function build(kind){disposeViews();layout=kind;container.innerHTML=kind==='split'?`<div class="cargo-split">${viewport('left','좌현(왼쪽)에서 보기')}${viewport('right','우현(오른쪽)에서 보기')}</div>`:`<div class="cargo-split cargo-single">${viewport('single','화물칸 그리드')}</div>`;
  views=[...container.querySelectorAll('.cargo-viewport')].map(el=>{const canvas=el.querySelector('.cargo-canvas'),ctx=setup(canvas),frame=new THREE.Group(),boxes=new THREE.Group();ctx.scene.add(frame,boxes);
   ctx.renderer.toneMapping=THREE.ACESFilmicToneMapping;ctx.renderer.toneMappingExposure=1.05;ctx.scene.traverse(o=>{if(o.isAmbientLight)o.intensity=.4;if(o.isDirectionalLight){o.intensity=2.7;o.color.set(0xffedda);o.position.set(-30,60,40);}});ctx.scene.add(new THREE.HemisphereLight(0xd1e4ef,0x101724,.85));const fill=new THREE.DirectionalLight(0x91b9db,.7);fill.position.set(-25,15,-30);ctx.scene.add(fill);const rim=new THREE.DirectionalLight(0x9cdbef,1.1);rim.position.set(40,25,-50);ctx.scene.add(rim);
   ctx.controls.dampingFactor=.09;ctx.controls.rotateSpeed=.6;ctx.controls.zoomSpeed=.9;ctx.controls.screenSpacePanning=true;
   ctx.scene.background=new THREE.Color('#06121b');const bloom=createBloom(ctx.renderer,{strength:0});const v={...ctx,el,canvas,frame,boxes,bloom,labels:[],cages:[],side:el.dataset.side,center:new THREE.Vector3(),radius:15,tip:el.querySelector('.cargo-tip')};el.querySelector('.cargo-camera-reset').onclick=()=>home(v);el.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>home(v,b.dataset.view));ctx.controls.addEventListener('start',()=>{v.transition=null;});ctx.controls.addEventListener('change',()=>v.loop?.invalidate());el.querySelector('.cargo-grid-toggle').onclick=()=>{selecting=!selecting;update(lastPacking,lastOptions);};
   // Grid name/fill labels can be hidden to see the boxes; remembered per browser.
   const labelBtn=el.querySelector('.cargo-label-toggle'),showLabels=on=>{el.classList.toggle('labels-off',!on);labelBtn.textContent=on?'라벨 숨기기':'라벨 보기';try{localStorage.setItem('vh-cargo-labels',on?'1':'0');}catch{}};
   let labelsOn=true;try{labelsOn=localStorage.getItem('vh-cargo-labels')!=='0';}catch{}showLabels(labelsOn);labelBtn.onclick=()=>showLabels(el.classList.contains('labels-off'));
   let press=null;canvas.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY];});canvas.addEventListener('pointerup',e=>{if(selecting&&press&&Math.hypot(e.clientX-press[0],e.clientY-press[1])<5)pickGrid(v,e);press=null;});canvas.addEventListener('pointermove',e=>hoverBox(v,e));canvas.addEventListener('pointerleave',()=>{v.tip.hidden=true;v.hoverId=null;v.loop?.invalidate();});v.loop=observeRenderLoop(el,(dt,stamp)=>render(v,dt,stamp));return v;});}
 function home(v,mode='orbit',instant=false){
  const dir=mode==='top'?new THREE.Vector3(0,1,.001):mode==='left'?new THREE.Vector3(-1,.2,0):mode==='right'?new THREE.Vector3(1,.2,0):new THREE.Vector3(-.45,.85,.9);
  // Clear residual OrbitControls inertia before starting an interruptible transition.
  v.controls.enableDamping=false;v.controls.update();v.controls.enableDamping=true;
  v.controls.maxDistance=v.radius*3.6;v.controls.minDistance=Math.max(2,v.radius*.35);
  const position=v.center.clone().add(dir.normalize().multiplyScalar(v.radius*2.8));
  if(instant||reducedMotion.matches){v.controls.target.copy(v.center);v.camera.position.copy(position);v.controls.update();v.transition=null;}
  else v.transition={from:v.camera.position.clone(),target:v.controls.target.clone(),to:position,start:performance.now()};
  v.loop?.invalidate();
 }

 function addLabel(v,text,point,cls,bin=-1){const el=document.createElement(bin>=0?'button':'span');if(bin>=0){el.type='button';el.dataset.gridBin=bin;el.tabIndex=-1;el.onclick=()=>{if(selecting)onGridToggle?.(bin);};}el.className=cls;el.textContent=text;v.el.querySelector('.cargo-zone-labels').append(el);const leader=document.createElementNS('http://www.w3.org/2000/svg','line');v.leaders?.append(leader);v.labels.push({element:el,point,bin,leader});}
 function shortNames(grids){const strip=new Set(['DRAK','MISC','RSI','CRUS','ANVL','AEGS','ARGO','ORIG','CNOU','Cargo','Inventory','Drake','Caterpillar','Hermes','Hercules','Starlifter']);return grids.map(g=>{const w=g.name.split(' · ')[0].split(/\s+/).filter(x=>!strip.has(x));return w.join(' ')||g.name.split(' · ')[0];});}
 const glowLine=(geo,color,op)=>new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity:op,depthWrite:false}));
 function model(next){ship=next;const short=shortNames(next.grids);const kind='single';if(kind!==layout)build(kind);
  const bounds=new THREE.Box3();ship.grids.forEach(G=>{const g=G._world?{...G,...G._world}:G;bounds.expandByPoint(new THREE.Vector3(g.x,g.y,g.z));bounds.expandByPoint(new THREE.Vector3(g.x+g.w,g.y+g.h,g.z+g.l));});const c=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),min=bounds.min,max=bounds.max;
  for(const v of views){clearGroup(v.frame);clearGroup(v.boxes);v.el.querySelector('.cargo-zone-labels').replaceChildren();v.leaders=document.createElementNS('http://www.w3.org/2000/svg','svg');v.leaders.classList.add('cargo-label-leaders');v.leaders.setAttribute('aria-hidden','true');v.el.querySelector('.cargo-zone-labels').append(v.leaders);v.labels=[];v.cages=[];v.center.copy(c);v.radius=Math.max(6,size.length()*.55);
   // Deck: dark plate with a fine holographic grid that fades toward the edges.
   const span=Math.ceil(Math.max(size.x,size.z)+10);const deckTex=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=512;const g=cv.getContext('2d'),rg=g.createRadialGradient(256,256,30,256,256,256);rg.addColorStop(0,'rgba(23,42,56,.6)');rg.addColorStop(1,'rgba(5,12,18,0)');g.fillStyle=rg;g.fillRect(0,0,512,512);g.strokeStyle='rgba(110,160,185,.09)';g.lineWidth=1;const step=512/span;for(let i=0;i<=span;i++){g.beginPath();g.moveTo(i*step,0);g.lineTo(i*step,512);g.stroke();g.beginPath();g.moveTo(0,i*step);g.lineTo(512,i*step);g.stroke();}g.globalCompositeOperation='destination-in';const fade=g.createRadialGradient(256,256,100,256,256,290);fade.addColorStop(0,'#fff');fade.addColorStop(1,'#0000');g.fillStyle=fade;g.fillRect(0,0,512,512);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;})();
   const deck=new THREE.Mesh(new THREE.PlaneGeometry(span,span),new THREE.MeshBasicMaterial({map:deckTex,transparent:true,depthWrite:false}));deck.rotation.x=-Math.PI/2;deck.position.set(c.x,min.y-.62,c.z);deck.material.userData.ownedMap=true;v.frame.add(deck);
   const arrowLen=size.z*.5+3;v.frame.add(new THREE.ArrowHelper(new THREE.Vector3(0,0,-1),new THREE.Vector3(c.x,min.y-.55,c.z+arrowLen*.5),arrowLen,new THREE.Color(1.6,1.0,.35),1.4,.9));
   if(hullKind(ship)==='hull-b'){v.frame.add(glowLine(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,min.z-2),new THREE.Vector3(0,0,max.z+2)]),new THREE.Color(.6,1.1,1.4),.7));addLabel(v,'중심축',new THREE.Vector3(0,0,max.z+2.5),'cargo-guide subtle');}
   const acc=shipAccess(ship),door=' · 출입구';addLabel(v,'▲ 앞 (기수)'+(acc==='front'?door:''),new THREE.Vector3(c.x,min.y-.5,min.z-2.2),'cargo-guide front');addLabel(v,'뒤 (후미)'+(acc==='rear'?door:''),new THREE.Vector3(c.x,min.y-.5,max.z+2.2),acc==='rear'?'cargo-guide door':'cargo-guide');
   const upAt=new THREE.Vector3(v.side==='right'?min.x-1.5:max.x+1.5,min.y-.6,max.z+1.5);v.frame.add(new THREE.ArrowHelper(new THREE.Vector3(0,1,0),upAt,size.y+2.4,new THREE.Color(.6,1.1,1.4),.9,.6));addLabel(v,'위',upAt.clone().add(new THREE.Vector3(0,size.y+3.2,0)),'cargo-guide');
   if(v.side!=='right')addLabel(v,'좌현'+(acc==='left'?door:''),new THREE.Vector3(min.x-2,c.y,c.z),acc==='left'?'cargo-guide door':'cargo-guide');if(v.side!=='left')addLabel(v,'우현'+(acc==='right'?door:''),new THREE.Vector3(max.x+2,c.y,c.z),acc==='right'?'cargo-guide door':'cargo-guide');
   ship.grids.forEach((g,i)=>{const group=new THREE.Group();group.position.set(g.x+g.w/2,g.y+g.h/2,g.z+g.l/2);group.rotation.set(...(g.rotation||[0,0,0]).map(a=>a*Math.PI/180));
    const box=new THREE.BoxGeometry(g.w,g.h,g.l);group.add(glowLine(new THREE.EdgesGeometry(box),new THREE.Color(.22,.44,.54),.28));group.add(glowLine(bracketGeo(g.w,g.h,g.l),new THREE.Color(.4,.7,.8),.55));

    // Translucent energy walls + per-cell floor lines.
    const wall=new THREE.Mesh(box,new THREE.MeshBasicMaterial({color:0x3fbfe6,transparent:true,opacity:.012,depthWrite:false,side:THREE.DoubleSide}));wall.userData.gridBin=i;group.add(wall);
    const pts=[];for(let x=1;x<g.w;x++)pts.push(x-g.w/2,-g.h/2,-g.l/2,x-g.w/2,-g.h/2,g.l/2);for(let z=1;z<g.l;z++)pts.push(-g.w/2,-g.h/2,z-g.l/2,g.w/2,-g.h/2,z-g.l/2);if(pts.length){const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));group.add(glowLine(lg,0x426777,.24));}
    const plate=new THREE.Mesh(new THREE.PlaneGeometry(g.w,g.l),new THREE.MeshBasicMaterial({color:0x1b4a60,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}));plate.rotation.x=-Math.PI/2;plate.position.y=-g.h/2+.01;group.add(plate);
    group.traverse(o=>{if(o.material){o.userData.baseColor=o.material.color.clone();o.userData.baseOpacity=o.material.opacity;}});v.frame.add(group);v.cages.push(group);// Long side-by-side grids (Hull B style) get their name at the outer end so it never sits on top of the boxes.
    const atEnd=ship.grids.length>1&&g.l>=Math.max(g.w,g.h)*2,labelAt=atEnd?new THREE.Vector3(group.position.x,group.position.y,group.position.z<c.z?g.z-.7:g.z+g.l+.7):group.position.clone().add(new THREE.Vector3(0,g.h/2+.45,0));
    addLabel(v,short[i],labelAt,'cargo-zone-label',i);});
   home(v,'orbit',true);}
 }
 const frameMat=new THREE.MeshStandardMaterial({color:0x677781,metalness:.45,roughness:.42});frameMat.userData.shared=true;
 function allowed(v,i){return layout!=='split'||(v.side==='left'?ship.grids[i].x+ship.grids[i].w/2<0:ship.grids[i].x+ship.grids[i].w/2>=0);}
 function update(packing,options={}){if(disposed)return;lastPacking=packing;lastOptions=options;container.classList.toggle('cargo-grid-selecting',selecting);nameOf=options.nameOf||nameOf;missionNameOf=options.missionNameOf||missionNameOf;const next=options.ship||DEFAULT_SHIP,key=JSON.stringify({...next,grids:next.grids.map(({disabled,...g})=>g)});if(key!==profileKey){profileKey=key;model(next);}else ship=next;
  const now=new Set((packing?.boxes||[]).map(b=>b.boxId)),fresh=new Set([...now].filter(id=>!lastBoxes.has(id)));lastBoxes=now;dropStart=performance.now();
  for(const v of views){clearGroup(v.boxes);v.el.querySelector('.cargo-grid-toggle').setAttribute('aria-pressed',String(selecting));v.el.querySelector('.cargo-grid-toggle').textContent=selecting?'선택 완료':'그리드 켜기/끄기';v.cages.forEach((c,i)=>{const off=ship.grids[i].disabled;c.visible=allowed(v,i)&&(selecting||!off);c.traverse(o=>{if(!o.material||!o.userData.baseColor)return;o.material.color.copy(off?new THREE.Color('#647480'):o.userData.baseColor);o.material.opacity=off?o.userData.baseOpacity*.4:o.userData.baseOpacity;});});
   v.labels.forEach(l=>{if(l.bin>=0){const b=packing?.bins[l.bin],cap=ship.grids[l.bin].w*ship.grids[l.bin].h*ship.grids[l.bin].l,used=b?.used||0;const off=ship.grids[l.bin].disabled;l.element.tabIndex=selecting?0:-1;l.element.setAttribute('aria-pressed',String(!off));l.element.setAttribute('aria-label',`${ship.grids[l.bin].name} · ${off?'사용 안 함':'사용 중'}${isGridLocked(l.bin)?' · 적재 중':''}`);l.element.classList.toggle('grid-disabled',!!off);l.element.classList.toggle('grid-locked',selecting&&isGridLocked(l.bin));const title=document.createElement('b'),bar=document.createElement('i'),count=document.createElement('small');title.textContent=l.element.dataset.name||(l.element.dataset.name=l.element.textContent);bar.style.setProperty('--fill',`${Math.round(used/cap*100)}%`);count.textContent=`${off?'OFF':used+'/'+cap}${selecting&&isGridLocked(l.bin)?' · 적재 중':''}`;l.element.replaceChildren(title,bar,count);}});
   v.badges?.forEach(b=>b.element.remove());v.badges=[];
   for(const p of packing?.boxes||[]){if(!allowed(v,p.bin))continue;const g=ship.grids[p.bin],muted=options.boxIds?!options.boxIds.includes(p.boxId):options.missionId&&p.missionId!==options.missionId,loading=options.loadIds?.includes(p.boxId),focus=options.boxIds?.includes(p.boxId)||options.focusIds?.includes(p.boxId)||loading;
    const center=new THREE.Vector3(p.cell[0]+p.dims[0]/2-g.w/2,p.cell[1]+p.dims[1]/2-g.h/2,p.cell[2]+p.dims[2]/2-g.l/2),origin=v.cages[p.bin],boxGroup=new THREE.Group();boxGroup.position.copy(origin.position);boxGroup.rotation.copy(origin.rotation);
    const reserved=!!p.reservation;
    const d=p.dims.map(x=>x-.1),geometry=reserved?new THREE.BoxGeometry(...d):crateBody(...d),tex=reserved?null:crateTexture(p.color,p.size),mat=reserved?new THREE.MeshBasicMaterial({color:p.color,transparent:true,opacity:muted?.035:.12,depthWrite:false}):new THREE.MeshPhysicalMaterial({map:tex,metalness:.12,roughness:.66,clearcoat:.1,clearcoatRoughness:.55,transparent:!!muted,opacity:muted?.1:1,depthWrite:!muted,emissive:new THREE.Color(p.color),emissiveIntensity:focus?.035:.01});
    const mesh=new THREE.Mesh(geometry,mat);mesh.position.copy(center);mesh.userData={box:p,base:center.clone(),drop:fresh.has(p.boxId)&&!muted&&!p.aboard&&!reserved,focus,order:options.order?.get(p.boxId)};boxGroup.add(mesh);
    if(reserved)mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:p.color,transparent:true,opacity:muted?.15:.85})));
    else if(!muted){mesh.add(new THREE.Mesh(crateFrame(...d.map(x=>x+.02)),frameMat));const sh=new THREE.Mesh(new THREE.PlaneGeometry(d[0]+.5,d[2]+.5),new THREE.MeshBasicMaterial({map:contactShadow(),transparent:true,depthWrite:false}));sh.rotation.x=-Math.PI/2;sh.position.set(center.x,center.y-p.dims[1]/2+.012,center.z);boxGroup.add(sh);}
    if(focus){const glow=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:loading?new THREE.Color(p.color).lerp(new THREE.Color(0xc4d5dc),.4):UNLOAD_GLOW}));glow.scale.setScalar(1.02);mesh.add(glow);}
    v.boxes.add(boxGroup);}
   // Boxes unloaded at this stop: drawn where they were, lifting out and fading on a loop (orange), so a stop
   // that both unloads and loads shows both motions.
   for(const p of options.leaving||[]){if(!allowed(v,p.bin))continue;const g=ship.grids[p.bin],origin=v.cages[p.bin],boxGroup=new THREE.Group();boxGroup.position.copy(origin.position);boxGroup.rotation.copy(origin.rotation);
    const center=new THREE.Vector3(p.cell[0]+p.dims[0]/2-g.w/2,p.cell[1]+p.dims[1]/2-g.h/2,p.cell[2]+p.dims[2]/2-g.l/2),d=p.dims.map(x=>x-.1),geometry=new THREE.BoxGeometry(...d);
    const material=p.reservation?new THREE.MeshBasicMaterial({color:p.color,transparent:true,opacity:.12,depthWrite:false}):new THREE.MeshPhysicalMaterial({map:crateTexture(p.color,p.size),transparent:true,opacity:.8,depthWrite:false,emissive:UNLOAD_GLOW,emissiveIntensity:.6});const mesh=new THREE.Mesh(geometry,material);mesh.position.copy(center);mesh.userData={box:p,base:center.clone(),leave:true,phase:Math.random()*.25};
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:UNLOAD_GLOW,transparent:true}));edge.scale.setScalar(1.02);mesh.add(edge);boxGroup.add(mesh);v.boxes.add(boxGroup);}
   v.loop.invalidate();
  }
 }
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
 function pickGrid(v,e){const r=v.canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,v.camera);const hit=ray.intersectObjects(v.frame.children,true).find(h=>h.object.userData.gridBin!==undefined&&v.cages[h.object.userData.gridBin]?.visible);if(hit)onGridToggle?.(hit.object.userData.gridBin);}
 function hoverBox(v,e){if(selecting){v.tip.hidden=true;return;}const r=v.canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,v.camera);const hit=ray.intersectObjects(v.boxes.children,true).find(h=>h.object.userData.box);if(!hit){v.tip.hidden=true;if(v.hoverId){v.hoverId=null;v.loop?.invalidate();}return;}const b=hit.object.userData.box;if(v.hoverId!==b.boxId){v.hoverId=b.boxId;v.loop?.invalidate();}v.tip.hidden=false;const title=document.createElement('b');title.textContent=nameOf?nameOf(b.dropoffId):b.dropoffId;v.tip.replaceChildren(title,document.createTextNode(` · ${b.retained?'남은 화물 · ':b.aboard?'위치 유지 · ':''}${b.reservation?'예약 공간 ':''}${b.size} SCU · ${b.commodity||''}${missionNameOf?' · '+missionNameOf(b.missionId):''}`));v.tip.style.left=(e.clientX-r.left+12)+'px';v.tip.style.top=(e.clientY-r.top+12)+'px';}
 function render(v,dt,stamp){if(v.dead)return 0;const t=(stamp-dropStart)/1000,pulse=reducedMotion.matches?.1:.08+.04*Math.sin(stamp/600);let animated=false;
   v.controls.dampingFactor=dampingForDelta(.09,dt);
   if(v.transition){const tr=v.transition;const k=Math.min(1,Math.max(0,(stamp-tr.start)/550)),ease=k*k*(3-2*k);v.camera.position.lerpVectors(tr.from,tr.to,ease);v.controls.target.lerpVectors(tr.target,v.center,ease);if(k===1)v.transition=null;}
   const cameraMoved=v.controls.update(dt);
   // Like the star map: panning cannot drift the hold out of view.
   const off=v.controls.target.clone().sub(v.center),lim=v.radius*.8;if(off.length()>lim){const fix=off.setLength(off.length()-lim);v.controls.target.sub(fix);v.camera.position.sub(fix);}
   v.boxes.traverse(o=>{const u=o.userData;if(!u?.box)return;
    if(u.drop){const k=reducedMotion.matches?1:Math.min(1,Math.max(0,t-.05)/.55),e=1-Math.pow(1-k,3);o.position.y=u.base.y+(1-e)*3.5;if(k<1)animated=true;else u.drop=false;}
    if(u.leave){const k=reducedMotion.matches?0:((stamp/2200)+u.phase)%1;o.position.y=u.base.y+k*2.6;o.material.opacity=.85*(1-k);o.children[0].material.opacity=1-k;o.material.emissiveIntensity=pulse;animated||=!reducedMotion.matches;return;}
    if(u.focus){o.material.emissiveIntensity=.035;}
    else if(u.box.boxId===v.hoverId)o.material.emissiveIntensity=.1;else if(!o.material.transparent)o.material.emissiveIntensity=.01;});
   const rect=v.canvas.getBoundingClientRect();for(const b of v.badges||[]){const wp=b.mesh.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,b.mesh.geometry.parameters.height/2+.25,0)),p=wp.project(v.camera),x=(p.x*.5+.5)*rect.width,y=(-p.y*.5+.5)*rect.height;b.element.hidden=!(p.z<1&&x>8&&x<rect.width-8&&y>20&&y<rect.height-20);b.element.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-50%)`;}
   const projected=[];
   for(const [id,l] of v.labels.entries()){const p=l.point.clone().project(v.camera),x=(p.x*.5+.5)*rect.width,y=(-p.y*.5+.5)*rect.height,visible=(l.bin<0||v.cages[l.bin].visible)&&p.z<1&&p.z>-1&&x>0&&x<rect.width&&y>0&&y<rect.height;l.element.hidden=!visible;l.leader.style.display='none';if(visible)projected.push({id,x,y,priority:l.bin<0?0:1});}
   // Batch visibility writes before measuring; measuring after each write forces
   // a separate layout for every grid label on a loaded ship.
   for(const at of projected){const l=v.labels[at.id];at.width=l.element.offsetWidth||88;at.height=l.element.offsetHeight||22;}
   for(const at of placeCargoLabels(projected,rect.width,rect.height)){const l=v.labels[at.id],original=projected.find(p=>p.id===at.id);l.element.style.transform=`translate(${Math.round(at.x)}px,${Math.round(at.y)}px) translate(-50%,-50%)`;if(l.bin>=0&&Math.hypot(at.x-original.x,at.y-original.y)>8){l.leader.style.display='';l.leader.setAttribute('x1',original.x);l.leader.setAttribute('y1',original.y);l.leader.setAttribute('x2',at.x);l.leader.setAttribute('y2',at.y);}}

   v.bloom.render(v.scene,v.camera);return cameraMoved||v.transition?60:animated?30:0;}
 update(null,{ship:DEFAULT_SHIP,hideEmpty:false});return {update,home(){views.forEach(v=>home(v));},
  dispose(){if(disposed)return;disposed=true;disposeViews();frameMat.dispose();if(--cargoUsers===0){crateCache.forEach(t=>t.dispose());crateCache.clear();frameCache.forEach(g=>g.dispose());frameCache.clear();bodyCache.forEach(g=>g.dispose());bodyCache.clear();shadowTex?.dispose();shadowTex=null;}container.replaceChildren();},
  _debug:()=>views.map(v=>({loop:v.loop.stats(),post:v.bloom.stats(),camera:v.camera.position.toArray(),grids:v.cages.filter(c=>c.visible).length,boxes:v.boxes.children.length,memory:{...v.renderer.info.memory}}))};
}

export {createStarMap} from './starmap.mjs';

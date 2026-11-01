import {DEFAULT_SHIP,hullKind} from './ships.mjs';
import {shipAccess} from './engine.mjs';
import {createBloom} from './bloom.mjs';
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
function clearGroup(group){while(group.children.length){const o=group.children[0];group.remove(o);o.traverse(c=>{c.geometry?.dispose();if(Array.isArray(c.material))c.material.forEach(m=>m.dispose());else c.material?.dispose();});}}
function line(points,color,opacity=.4){const g=new THREE.BufferGeometry().setFromPoints(points);return new THREE.Line(g,new THREE.LineBasicMaterial({color,transparent:true,opacity}));}
export {createStarMap} from './starmap.mjs';
export {setup,clearGroup,line,PALETTE};

// Container texture: destination colour, darker frame, ribs and the SCU size stencilled on the side.
const crateCache=new Map();
function crateTexture(color,size){const key=color+size;if(crateCache.has(key))return crateCache.get(key);const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),base=new THREE.Color(color);
 g.fillStyle=color;g.fillRect(0,0,256,256);const grad=g.createLinearGradient(0,0,0,256);grad.addColorStop(0,'rgba(255,255,255,.18)');grad.addColorStop(.5,'rgba(255,255,255,0)');grad.addColorStop(1,'rgba(0,0,0,.25)');g.fillStyle=grad;g.fillRect(0,0,256,256);
 g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=3;for(let x=40;x<256;x+=44){g.beginPath();g.moveTo(x,22);g.lineTo(x,234);g.stroke();}
 g.strokeStyle='rgba(12,16,20,.85)';g.lineWidth=22;g.strokeRect(11,11,234,234);g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=2;g.strokeRect(24,24,208,208);
 g.fillStyle='rgba(10,14,18,.75)';g.fillRect(150,186,82,40);g.fillStyle=base.getHSL({h:0,s:0,l:0}).l>.55?'#0b1218':'#f2f6f8';g.font='700 30px "Barlow Condensed",Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(size+' SCU',191,207);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;crateCache.set(key,t);return t;}
// Steel frame (12 rails + 8 corner castings) merged into one geometry, cached per box size.
const frameCache=new Map();
function mergeGeos(geos){const pos=[],nor=[],idx=[];let off=0;for(const g of geos){const p=g.attributes.position.array,n=g.attributes.normal.array,ix=g.index.array;pos.push(...p);nor.push(...n);for(const i of ix)idx.push(i+off);off+=p.length/3;g.dispose();}const m=new THREE.BufferGeometry();m.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));m.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));m.setIndex(idx);return m;}
function crateFrame(dx,dy,dz){const key=[dx,dy,dz].join();if(frameCache.has(key))return frameCache.get(key);const t=.07,c=.13,parts=[],hx=dx/2,hy=dy/2,hz=dz/2;
 const bar=(w,h,l,x,y,z)=>{const g=new THREE.BoxGeometry(w,h,l);g.translate(x,y,z);parts.push(g);};
 for(const sy of [-1,1])for(const sz of [-1,1])bar(dx,t,t,0,sy*(hy-t/2),sz*(hz-t/2));for(const sx of [-1,1])for(const sz of [-1,1])bar(t,dy,t,sx*(hx-t/2),0,sz*(hz-t/2));for(const sx of [-1,1])for(const sy of [-1,1])bar(t,t,dz,sx*(hx-t/2),sy*(hy-t/2),0);
 for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1])bar(c,c,c,sx*(hx-c/2+.005),sy*(hy-c/2+.005),sz*(hz-c/2+.005));
 const g=mergeGeos(parts);frameCache.set(key,g);return g;}
let shadowTex=null;function contactShadow(){if(shadowTex)return shadowTex;const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),r=g.createRadialGradient(64,64,10,64,64,64);r.addColorStop(0,'rgba(0,0,0,.75)');r.addColorStop(.6,'rgba(0,0,0,.35)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,128,128);shadowTex=new THREE.CanvasTexture(c);return shadowTex;}
function bracketGeo(w,h,l){const k=Math.min(.6,Math.min(w,h,l)*.3),p=[],hx=w/2,hy=h/2,hz=l/2;for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){const x=sx*hx,y=sy*hy,z=sz*hz;p.push(x,y,z,x-sx*k,y,z,x,y,z,x,y-sy*k,z,x,y,z,x,y,z-sz*k);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));return g;}
export function createCargoView(container){
 // Grid-only cargo view (no ship exterior). Every hold, Hull B included, uses one rotatable 3D view with side labels.
 let views=[],layout='',profileKey='',ship=DEFAULT_SHIP,lastBoxes=new Set(),dropStart=0,nameOf=null;
 function viewport(side,title){return `<div class="cargo-viewport" data-side="${side}"><div class="cargo-side-title">${title}</div><div class="cargo-canvas"></div><div class="cargo-zone-labels"></div><div class="cargo-tip" hidden></div><button type="button" class="cargo-label-toggle"></button><button type="button" class="cargo-camera-reset">시점 초기화</button></div>`;}
 function dispose(){for(const v of views){v.dead=true;v.resizeObserver?.disconnect();clearGroup(v.frame);clearGroup(v.boxes);v.renderer.dispose();v.renderer.forceContextLoss?.();}views=[];}
 function build(kind){dispose();layout=kind;container.innerHTML=kind==='split'?`<div class="cargo-split">${viewport('left','좌현(왼쪽)에서 보기')}${viewport('right','우현(오른쪽)에서 보기')}</div>`:`<div class="cargo-split cargo-single">${viewport('single','화물칸 그리드')}</div>`;
  views=[...container.querySelectorAll('.cargo-viewport')].map(el=>{const canvas=el.querySelector('.cargo-canvas'),ctx=setup(canvas),frame=new THREE.Group(),boxes=new THREE.Group();ctx.scene.add(frame,boxes);
   ctx.scene.traverse(o=>{if(o.isAmbientLight)o.intensity=.55;if(o.isDirectionalLight){o.intensity=2.4;o.position.set(-30,60,40);}});ctx.scene.add(new THREE.HemisphereLight(0xbfe6ff,0x0b1520,.9));const rim=new THREE.DirectionalLight(0x6fe3ff,1.2);rim.position.set(40,25,-50);ctx.scene.add(rim);
   ctx.controls.dampingFactor=.09;ctx.controls.rotateSpeed=.7;ctx.controls.zoomSpeed=1.6;ctx.controls.screenSpacePanning=true;
   ctx.scene.background=new THREE.Color('#06121b');const bloom=createBloom(ctx.renderer,{strength:0});const v={...ctx,el,canvas,frame,boxes,bloom,labels:[],cages:[],side:el.dataset.side,center:new THREE.Vector3(),radius:15,tip:el.querySelector('.cargo-tip')};el.querySelector('.cargo-camera-reset').onclick=()=>home(v);
   // Grid name/fill labels can be hidden to see the boxes; remembered per browser.
   const labelBtn=el.querySelector('.cargo-label-toggle'),showLabels=on=>{el.classList.toggle('labels-off',!on);labelBtn.textContent=on?'라벨 숨기기':'라벨 보기';try{localStorage.setItem('vh-cargo-labels',on?'1':'0');}catch{}};
   let labelsOn=true;try{labelsOn=localStorage.getItem('vh-cargo-labels')!=='0';}catch{}showLabels(labelsOn);labelBtn.onclick=()=>showLabels(el.classList.contains('labels-off'));
   canvas.addEventListener('pointermove',e=>hoverBox(v,e));canvas.addEventListener('pointerleave',()=>{v.tip.hidden=true;v.hoverId=null;});return v;});}
 function home(v){const dir=v.side==='left'?new THREE.Vector3(-1,.5,-.25):v.side==='right'?new THREE.Vector3(1,.5,-.25):new THREE.Vector3(-.45,.85,.9);v.controls.target.copy(v.center);v.camera.position.copy(v.center).add(dir.normalize().multiplyScalar(v.radius*2.8));v.controls.maxDistance=v.radius*3.6;v.controls.minDistance=Math.max(2,v.radius*.35);v.controls.update();}
 function addLabel(v,text,point,cls,bin=-1){const el=document.createElement('span');el.className=cls;el.textContent=text;v.el.querySelector('.cargo-zone-labels').append(el);v.labels.push({element:el,point,bin});}
 function shortNames(grids){const strip=new Set(['DRAK','MISC','RSI','CRUS','ANVL','AEGS','ARGO','ORIG','CNOU','Cargo','Inventory','Drake','Caterpillar','Hermes','Hercules','Starlifter']);return grids.map(g=>{const w=g.name.split(' · ')[0].split(/\s+/).filter(x=>!strip.has(x));return w.join(' ')||g.name.split(' · ')[0];});}
 const glowLine=(geo,color,op)=>new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity:op,depthWrite:false}));
 function model(next){ship=next;const short=shortNames(next.grids);const kind='single';if(kind!==layout)build(kind);
  const bounds=new THREE.Box3();ship.grids.forEach(G=>{const g=G._world?{...G,...G._world}:G;bounds.expandByPoint(new THREE.Vector3(g.x,g.y,g.z));bounds.expandByPoint(new THREE.Vector3(g.x+g.w,g.y+g.h,g.z+g.l));});const c=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),min=bounds.min,max=bounds.max;
  for(const v of views){clearGroup(v.frame);clearGroup(v.boxes);v.el.querySelector('.cargo-zone-labels').replaceChildren();v.labels=[];v.cages=[];v.center.copy(c);v.radius=Math.max(6,size.length()*.55);
   // Deck: dark plate with a fine holographic grid that fades toward the edges.
   const span=Math.ceil(Math.max(size.x,size.z)+10);const deckTex=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=512;const g=cv.getContext('2d'),rg=g.createRadialGradient(256,256,30,256,256,256);rg.addColorStop(0,'rgba(30,70,95,.55)');rg.addColorStop(1,'rgba(5,12,18,0)');g.fillStyle=rg;g.fillRect(0,0,512,512);g.strokeStyle='rgba(110,200,235,.18)';g.lineWidth=1;const step=512/span;for(let i=0;i<=span;i++){g.beginPath();g.moveTo(i*step,0);g.lineTo(i*step,512);g.stroke();g.beginPath();g.moveTo(0,i*step);g.lineTo(512,i*step);g.stroke();}const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;})();
   const deck=new THREE.Mesh(new THREE.PlaneGeometry(span,span),new THREE.MeshBasicMaterial({map:deckTex,transparent:true,depthWrite:false}));deck.rotation.x=-Math.PI/2;deck.position.set(c.x,min.y-.62,c.z);v.frame.add(deck);
   const arrowLen=size.z*.5+3;v.frame.add(new THREE.ArrowHelper(new THREE.Vector3(0,0,-1),new THREE.Vector3(c.x,min.y-.55,c.z+arrowLen*.5),arrowLen,new THREE.Color(1.6,1.0,.35),1.4,.9));
   if(hullKind(ship)==='hull-b'){v.frame.add(glowLine(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,min.z-2),new THREE.Vector3(0,0,max.z+2)]),new THREE.Color(.6,1.1,1.4),.7));addLabel(v,'중심축',new THREE.Vector3(0,0,max.z+2.5),'cargo-guide subtle');}
   const acc=shipAccess(ship),door=' · 출입구';addLabel(v,'▲ 앞 (기수)'+(acc==='front'?door:''),new THREE.Vector3(c.x,min.y-.5,min.z-2.2),'cargo-guide front');addLabel(v,'뒤 (후미)'+(acc==='rear'?door:''),new THREE.Vector3(c.x,min.y-.5,max.z+2.2),acc==='rear'?'cargo-guide door':'cargo-guide');
   const upAt=new THREE.Vector3(v.side==='right'?min.x-1.5:max.x+1.5,min.y-.6,max.z+1.5);v.frame.add(new THREE.ArrowHelper(new THREE.Vector3(0,1,0),upAt,size.y+2.4,new THREE.Color(.6,1.1,1.4),.9,.6));addLabel(v,'위',upAt.clone().add(new THREE.Vector3(0,size.y+3.2,0)),'cargo-guide');
   if(v.side!=='right')addLabel(v,'좌현'+(acc==='left'?door:''),new THREE.Vector3(min.x-2,c.y,c.z),acc==='left'?'cargo-guide door':'cargo-guide');if(v.side!=='left')addLabel(v,'우현'+(acc==='right'?door:''),new THREE.Vector3(max.x+2,c.y,c.z),acc==='right'?'cargo-guide door':'cargo-guide');
   ship.grids.forEach((g,i)=>{const group=new THREE.Group();group.position.set(g.x+g.w/2,g.y+g.h/2,g.z+g.l/2);group.rotation.set(...(g.rotation||[0,0,0]).map(a=>a*Math.PI/180));
    const box=new THREE.BoxGeometry(g.w,g.h,g.l);group.add(glowLine(new THREE.EdgesGeometry(box),new THREE.Color(.3,.75,.95),.38));group.add(glowLine(bracketGeo(g.w,g.h,g.l),new THREE.Color(.6,1.4,1.8),1));
    const scan=new THREE.Mesh(new THREE.PlaneGeometry(g.w,g.h),new THREE.MeshBasicMaterial({color:new THREE.Color(.4,1.2,1.6),transparent:true,opacity:.0,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));scan.userData.scan={l:g.l,phase:i*.37};group.add(scan);
    // Translucent energy walls + per-cell floor lines.
    const wall=new THREE.Mesh(box,new THREE.MeshBasicMaterial({color:0x3fbfe6,transparent:true,opacity:.045,depthWrite:false,side:THREE.DoubleSide}));group.add(wall);
    const pts=[];for(let x=1;x<g.w;x++)pts.push(x-g.w/2,-g.h/2,-g.l/2,x-g.w/2,-g.h/2,g.l/2);for(let z=1;z<g.l;z++)pts.push(-g.w/2,-g.h/2,z-g.l/2,g.w/2,-g.h/2,z-g.l/2);if(pts.length){const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));group.add(glowLine(lg,0x4fa9c6,.5));}
    const plate=new THREE.Mesh(new THREE.PlaneGeometry(g.w,g.l),new THREE.MeshBasicMaterial({color:0x1b4a60,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false}));plate.rotation.x=-Math.PI/2;plate.position.y=-g.h/2+.01;group.add(plate);
    v.frame.add(group);v.cages.push(group);// Long side-by-side grids (Hull B style) get their name at the outer end so it never sits on top of the boxes.
    const atEnd=ship.grids.length>1&&g.l>=Math.max(g.w,g.h)*2,labelAt=atEnd?new THREE.Vector3(group.position.x,group.position.y,group.position.z<c.z?g.z-.7:g.z+g.l+.7):group.position.clone().add(new THREE.Vector3(0,g.h/2+.45,0));
    addLabel(v,short[i],labelAt,'cargo-zone-label',i);});
   home(v);}
 }
 const frameMat=new THREE.MeshStandardMaterial({color:0x1a2228,metalness:.75,roughness:.35});
 function allowed(v,i){return layout!=='split'||(v.side==='left'?ship.grids[i].x+ship.grids[i].w/2<0:ship.grids[i].x+ship.grids[i].w/2>=0);}
 function update(packing,options={}){nameOf=options.nameOf||nameOf;const next=options.ship||DEFAULT_SHIP,key=JSON.stringify(next);if(key!==profileKey){profileKey=key;model(next);}
  const now=new Set((packing?.boxes||[]).map(b=>b.boxId)),fresh=new Set([...now].filter(id=>!lastBoxes.has(id)));lastBoxes=now;dropStart=performance.now();
  for(const v of views){clearGroup(v.boxes);v.cages.forEach((c,i)=>c.visible=allowed(v,i)&&(!options.hideEmpty||!!packing?.bins[i]?.boxes.length));
   v.labels.forEach(l=>{if(l.bin>=0){const b=packing?.bins[l.bin],cap=ship.grids[l.bin].w*ship.grids[l.bin].h*ship.grids[l.bin].l,used=b?.used||0;l.element.innerHTML=`<b>${l.element.dataset.name||(l.element.dataset.name=l.element.textContent)}</b><i style="--fill:${Math.round(used/cap*100)}%"></i><small>${used}/${cap}</small>`;}});
   v.badges?.forEach(b=>b.element.remove());v.badges=[];
   for(const p of packing?.boxes||[]){if(!allowed(v,p.bin))continue;const g=ship.grids[p.bin],muted=options.boxIds?!options.boxIds.includes(p.boxId):options.missionId&&p.missionId!==options.missionId,loading=options.loadIds?.includes(p.boxId),focus=options.boxIds?.includes(p.boxId)||options.focusIds?.includes(p.boxId)||loading;
    const center=new THREE.Vector3(p.cell[0]+p.dims[0]/2-g.w/2,p.cell[1]+p.dims[1]/2-g.h/2,p.cell[2]+p.dims[2]/2-g.l/2),origin=v.cages[p.bin],boxGroup=new THREE.Group();boxGroup.position.copy(origin.position);boxGroup.rotation.copy(origin.rotation);
    const d=p.dims.map(x=>x-.1),geometry=new THREE.BoxGeometry(...d),tex=crateTexture(p.color,p.size),mat=new THREE.MeshPhysicalMaterial({map:tex,metalness:.2,roughness:.48,clearcoat:.6,clearcoatRoughness:.35,transparent:!!muted,opacity:muted?.1:1,depthWrite:!muted,emissive:loading?LOAD_GLOW:new THREE.Color(p.color),emissiveIntensity:focus?.5:.04});
    const mesh=new THREE.Mesh(geometry,mat);mesh.position.copy(center);mesh.userData={box:p,base:center.clone(),drop:fresh.has(p.boxId)&&!muted,focus,order:options.order?.get(p.boxId)};boxGroup.add(mesh);
    if(!muted){mesh.add(new THREE.Mesh(crateFrame(...d.map(x=>x+.02)),frameMat));const sh=new THREE.Mesh(new THREE.PlaneGeometry(d[0]+.5,d[2]+.5),new THREE.MeshBasicMaterial({map:contactShadow(),transparent:true,depthWrite:false}));sh.rotation.x=-Math.PI/2;sh.position.set(center.x,center.y-p.dims[1]/2+.012,center.z);boxGroup.add(sh);}
    if(focus){const glow=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:loading?LOAD_GLOW:UNLOAD_GLOW}));glow.scale.setScalar(1.02);mesh.add(glow);}
    v.boxes.add(boxGroup);}
   // Boxes unloaded at this stop: drawn where they were, lifting out and fading on a loop (orange), so a stop
   // that both unloads and loads shows both motions.
   for(const p of options.leaving||[]){if(!allowed(v,p.bin))continue;const g=ship.grids[p.bin],origin=v.cages[p.bin],boxGroup=new THREE.Group();boxGroup.position.copy(origin.position);boxGroup.rotation.copy(origin.rotation);
    const center=new THREE.Vector3(p.cell[0]+p.dims[0]/2-g.w/2,p.cell[1]+p.dims[1]/2-g.h/2,p.cell[2]+p.dims[2]/2-g.l/2),d=p.dims.map(x=>x-.1),geometry=new THREE.BoxGeometry(...d);
    const mesh=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({map:crateTexture(p.color,p.size),transparent:true,opacity:.8,depthWrite:false,emissive:UNLOAD_GLOW,emissiveIntensity:.6}));mesh.position.copy(center);mesh.userData={box:p,base:center.clone(),leave:true,phase:Math.random()*.25};
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:UNLOAD_GLOW,transparent:true}));edge.scale.setScalar(1.02);mesh.add(edge);boxGroup.add(mesh);v.boxes.add(boxGroup);}
  }
 }
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
 function hoverBox(v,e){const r=v.canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,v.camera);const hit=ray.intersectObjects(v.boxes.children,true).find(h=>h.object.userData.box);if(!hit){v.tip.hidden=true;v.hoverId=null;return;}const b=hit.object.userData.box;v.hoverId=b.boxId;v.tip.hidden=false;v.tip.innerHTML=`<b>${nameOf?nameOf(b.dropoffId):b.dropoffId}</b> · ${b.size} SCU · ${b.commodity||''}`;v.tip.style.left=(e.clientX-r.left+12)+'px';v.tip.style.top=(e.clientY-r.top+12)+'px';}
 function loop(){requestAnimationFrame(loop);if(document.hidden)return;const t=(performance.now()-dropStart)/1000,pulse=.45+.35*Math.sin(performance.now()/260);
  for(const v of views){if(v.dead)continue;v.controls.update();
   // Like the star map: panning cannot drift the hold out of view.
   const off=v.controls.target.clone().sub(v.center),lim=v.radius*.8;if(off.length()>lim){const fix=off.setLength(off.length()-lim);v.controls.target.sub(fix);v.camera.position.sub(fix);}
   v.boxes.traverse(o=>{const u=o.userData;if(!u?.box)return;if(u.drop){const k=Math.min(1,Math.max(0,t-.05)/.55),e=1-Math.pow(1-k,3);o.position.y=u.base.y+(1-e)*3.5;o.material.opacity=o.material.transparent?o.material.opacity:1;}if(u.leave){const k=((performance.now()/2200)+u.phase)%1;o.position.y=u.base.y+k*2.6;o.material.opacity=.85*(1-k);o.children[0].material.opacity=1-k;o.material.emissiveIntensity=pulse;return;}if(u.focus)o.material.emissiveIntensity=pulse;else if(u.box.boxId===v.hoverId)o.material.emissiveIntensity=.35;else if(!o.material.transparent)o.material.emissiveIntensity=.06;});
   const now=performance.now()/1000;v.frame.traverse(o=>{const sc=o.userData?.scan;if(!sc)return;const ph=((now*.22+sc.phase)%1.4);o.position.z=(ph-.2)*sc.l-sc.l/2;o.material.opacity=ph<1?.10*Math.sin(Math.PI*Math.min(1,ph)):0;o.visible=ph<1&&ph>0;});
   const rect=v.canvas.getBoundingClientRect();for(const b of v.badges||[]){const wp=b.mesh.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,b.mesh.geometry.parameters.height/2+.25,0)),p=wp.project(v.camera),x=(p.x*.5+.5)*rect.width,y=(-p.y*.5+.5)*rect.height;b.element.hidden=!(p.z<1&&x>8&&x<rect.width-8&&y>20&&y<rect.height-20);b.element.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-50%)`;}
   for(const l of v.labels){const p=l.point.clone().project(v.camera),x=(p.x*.5+.5)*rect.width,y=(-p.y*.5+.5)*rect.height;const visible=(l.bin<0||v.cages[l.bin].visible)&&p.z<1&&x>12&&x<rect.width-12&&y>26&&y<rect.height-26;l.element.hidden=!visible;if(visible)l.element.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-50%)`;}
   v.bloom.render(v.scene,v.camera);}}
 update(null,{ship:DEFAULT_SHIP,hideEmpty:false});loop();return {update,home(){views.forEach(home);}};
}

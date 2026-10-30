import {DEFAULT_SHIP,hullKind} from './ships.mjs';
import {shipAccess} from './engine.mjs';
import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
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

export function createCargoView(container){
 // Grid-only cargo view. Ship exteriors are not drawn: without an official model a hand-made hull would be misleading.
 // Hull B carries cargo on both sides of its spine, so it gets a port and a starboard view; flat holds use one view.
 let views=[],layout='',profileKey='',latest=null,latestOptions={},ship=DEFAULT_SHIP;
 function viewport(side,title){return `<div class="cargo-viewport" data-side="${side}"><div class="cargo-side-title">${title}</div><div class="cargo-canvas"></div><div class="cargo-zone-labels"></div><button type="button" class="cargo-camera-reset">시점 초기화</button></div>`;}
 function dispose(){for(const v of views){v.dead=true;v.resizeObserver?.disconnect();clearGroup(v.frame);clearGroup(v.boxes);v.renderer.dispose();v.renderer.forceContextLoss?.();}views=[];}
 function build(kind){dispose();layout=kind;container.innerHTML=kind==='split'?`<div class="cargo-split">${viewport('left','좌현(왼쪽)에서 보기')}${viewport('right','우현(오른쪽)에서 보기')}</div>`:`<div class="cargo-split cargo-single">${viewport('single','화물칸 그리드')}</div>`;
  views=[...container.querySelectorAll('.cargo-viewport')].map(el=>{const canvas=el.querySelector('.cargo-canvas'),ctx=setup(canvas),frame=new THREE.Group(),boxes=new THREE.Group();ctx.scene.add(frame,boxes);ctx.scene.traverse(o=>{if(o.isAmbientLight)o.intensity=1.4;if(o.isDirectionalLight)o.intensity=2.2;});const v={...ctx,el,canvas,frame,boxes,labels:[],cages:[],side:el.dataset.side,center:new THREE.Vector3(),radius:15};el.querySelector('button').onclick=()=>home(v);return v;});}
 function home(v){const dir=v.side==='left'?new THREE.Vector3(-1,.5,-.25):v.side==='right'?new THREE.Vector3(1,.5,-.25):new THREE.Vector3(-.45,.85,.9);v.controls.target.copy(v.center);v.camera.position.copy(v.center).add(dir.normalize().multiplyScalar(v.radius*2.8));v.controls.maxDistance=v.radius*8;v.controls.minDistance=.8;v.controls.update();}
 function addLabel(v,text,point,cls,bin=-1){const el=document.createElement('span');el.className=cls;el.textContent=text;v.el.querySelector('.cargo-zone-labels').append(el);v.labels.push({element:el,point,bin});}
 function shortNames(grids){const words=grids.map(g=>g.name.split(' · ')[0].split(/\s+/));let k=0;if(words.length>1)while(words.every(w=>w.length>k+1&&w[k]===words[0][k]))k++;return words.map(w=>w.slice(k).join(' '));}
 function model(next){ship=next;const short=shortNames(next.grids);const kind=hullKind(ship)==='hull-b'?'split':'single';if(kind!==layout)build(kind);
  const bounds=new THREE.Box3();ship.grids.forEach(g=>{bounds.expandByPoint(new THREE.Vector3(g.x,g.y,g.z));bounds.expandByPoint(new THREE.Vector3(g.x+g.w,g.y+g.h,g.z+g.l));});const c=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),min=bounds.min,max=bounds.max;
  for(const v of views){clearGroup(v.frame);clearGroup(v.boxes);v.el.querySelector('.cargo-zone-labels').replaceChildren();v.labels=[];v.cages=[];v.center.copy(c);v.radius=Math.max(6,size.length()*.55);
   // Deck grid under everything, bow arrow along the centre line.
   const span=Math.ceil(Math.max(size.x,size.z)+8),floor=new THREE.GridHelper(span,span,0x2b4a5c,0x16283a);floor.position.set(c.x,min.y-.6,c.z);floor.material.transparent=true;floor.material.opacity=.45;v.frame.add(floor);
   const arrowLen=size.z*.5+3;v.frame.add(new THREE.ArrowHelper(new THREE.Vector3(0,0,-1),new THREE.Vector3(c.x,min.y-.55,c.z+arrowLen*.5),arrowLen,0xffc67c,1.4,.9));
   if(ship.grids.length&&hullKind(ship)==='hull-b'){v.frame.add(line([new THREE.Vector3(0,0,min.z-2),new THREE.Vector3(0,0,max.z+2)],0x8fb8c9,.6));addLabel(v,'중심축',new THREE.Vector3(0,0,max.z+2.5),'cargo-guide subtle');}
   const acc=shipAccess(ship),door=' · 출입구';addLabel(v,'▲ 앞 (기수)'+(acc==='front'?door:''),new THREE.Vector3(c.x,min.y-.5,min.z-2.2),'cargo-guide front');addLabel(v,'뒤 (후미)'+(acc==='rear'?door:''),new THREE.Vector3(c.x,min.y-.5,max.z+2.2),acc==='rear'?'cargo-guide door':'cargo-guide');
   const upAt=new THREE.Vector3(v.side==='right'?min.x-1.5:max.x+1.5,min.y-.6,max.z+1.5);v.frame.add(new THREE.ArrowHelper(new THREE.Vector3(0,1,0),upAt,size.y+2.4,0x9fd7e6,.9,.6));addLabel(v,'위',upAt.clone().add(new THREE.Vector3(0,size.y+3.2,0)),'cargo-guide');
   if(v.side!=='right')addLabel(v,'좌현'+(acc==='left'?door:''),new THREE.Vector3(min.x-2,c.y,c.z),acc==='left'?'cargo-guide door':'cargo-guide');if(v.side!=='left')addLabel(v,'우현'+(acc==='right'?door:''),new THREE.Vector3(max.x+2,c.y,c.z),acc==='right'?'cargo-guide door':'cargo-guide');
   ship.grids.forEach((g,i)=>{const group=new THREE.Group();group.position.set(g.x+g.w/2,g.y+g.h/2,g.z+g.l/2);group.rotation.set(...(g.rotation||[0,0,0]).map(a=>a*Math.PI/180));
    const box=new THREE.BoxGeometry(g.w,g.h,g.l);group.add(new THREE.LineSegments(new THREE.EdgesGeometry(box),new THREE.LineBasicMaterial({color:0x7fb4c6,transparent:true,opacity:.75})));
    // Cell lines on the floor of each grid so 1-SCU steps are readable.
    const pts=[];for(let x=1;x<g.w;x++)pts.push(x-g.w/2,-g.h/2,-g.l/2,x-g.w/2,-g.h/2,g.l/2);for(let z=1;z<g.l;z++)pts.push(-g.w/2,-g.h/2,z-g.l/2,g.w/2,-g.h/2,z-g.l/2);if(pts.length){const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));group.add(new THREE.LineSegments(lg,new THREE.LineBasicMaterial({color:0x3f6a7c,transparent:true,opacity:.55})));}
    const plate=new THREE.Mesh(new THREE.PlaneGeometry(g.w,g.l),new THREE.MeshBasicMaterial({color:0x1d3b4a,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false}));plate.rotation.x=-Math.PI/2;plate.position.y=-g.h/2+.01;group.add(plate);
    v.frame.add(group);v.cages.push(group);addLabel(v,short[i],group.position.clone(),'cargo-zone-label',i);});
   home(v);}
 }
 function allowed(v,i){return layout!=='split'||(v.side==='left'?ship.grids[i].x+ship.grids[i].w/2<0:ship.grids[i].x+ship.grids[i].w/2>=0);}
 function update(packing,options={}){const next=options.ship||DEFAULT_SHIP,key=JSON.stringify(next);if(key!==profileKey){profileKey=key;model(next);}latest=packing;latestOptions=options;
  for(const v of views){clearGroup(v.boxes);v.cages.forEach((c,i)=>c.visible=allowed(v,i)&&(!options.hideEmpty||!!packing?.bins[i]?.boxes.length));
   for(const p of packing?.boxes||[]){if(!allowed(v,p.bin))continue;const g=ship.grids[p.bin],muted=options.boxIds?!options.boxIds.includes(p.boxId):options.missionId&&p.missionId!==options.missionId;const center=new THREE.Vector3(p.cell[0]+p.dims[0]/2-g.w/2,p.cell[1]+p.dims[1]/2-g.h/2,p.cell[2]+p.dims[2]/2-g.l/2);const origin=v.cages[p.bin];const boxGroup=new THREE.Group();boxGroup.position.copy(origin.position);boxGroup.rotation.copy(origin.rotation);const geometry=new THREE.BoxGeometry(...p.dims.map(d=>d-.06)),mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:p.color,metalness:.05,roughness:.75,transparent:!!muted,opacity:muted?.08:1,depthWrite:!muted}));mesh.position.copy(center);boxGroup.add(mesh);const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:0x09202b,transparent:true,opacity:muted?.05:.7}));edge.position.copy(center);boxGroup.add(edge);v.boxes.add(boxGroup);}
  }
 }
 function loop(){requestAnimationFrame(loop);if(document.hidden)return;for(const v of views){if(v.dead)continue;v.controls.update();const rect=v.canvas.getBoundingClientRect();for(const l of v.labels){const p=l.point.clone().project(v.camera),x=(p.x*.5+.5)*rect.width,y=(-p.y*.5+.5)*rect.height;const visible=(l.bin<0||v.cages[l.bin].visible)&&p.z<1&&x>12&&x<rect.width-12&&y>26&&y<rect.height-26;l.element.hidden=!visible;if(visible)l.element.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-50%)`;}v.renderer.render(v.scene,v.camera);}}
 update(null,{ship:DEFAULT_SHIP,hideEmpty:false});loop();return {update,home(){views.forEach(home);}};
}

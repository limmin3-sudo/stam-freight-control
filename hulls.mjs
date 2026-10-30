import * as THREE from 'three';

// Reference hulls for the cargo view. Coordinates are in SCU cells (1 cell = 1.25 m):
// x = port(-)/starboard(+), y = up, z = bow(-)/stern(+). The cargo grids from ships.mjs / ships.json
// sit inside these shapes. These are reconstructions from review footage, not official models.

let panelTexture=null;
function gridTexture(){
 if(panelTexture)return panelTexture;
 const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
 g.fillStyle='#1c2a35';g.fillRect(0,0,128,128);g.strokeStyle='#4f6d80';g.lineWidth=3;
 for(let i=0;i<=128;i+=32){g.beginPath();g.moveTo(i,0);g.lineTo(i,128);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(128,i);g.stroke();}
 g.fillStyle='rgba(255,90,80,.55)';g.fillRect(14,14,4,4);g.fillRect(78,78,4,4);
 panelTexture=new THREE.CanvasTexture(c);panelTexture.wrapS=panelTexture.wrapT=THREE.RepeatWrapping;panelTexture.colorSpace=THREE.SRGBColorSpace;return panelTexture;
}
let plateTexture=null;
function hullTexture(){
 if(plateTexture)return plateTexture;
 const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
 g.fillStyle='#8e9aa3';g.fillRect(0,0,256,256);let seed=7;const r=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 for(let i=0;i<70;i++){const v=130+Math.floor(r()*40);g.fillStyle=`rgb(${v},${v+6},${v+12})`;g.fillRect(Math.floor(r()*8)*32,Math.floor(r()*8)*32,32*(1+Math.floor(r()*3)),16*(1+Math.floor(r()*2)));}
 g.strokeStyle='rgba(30,40,48,.55)';g.lineWidth=1.5;for(let i=0;i<=256;i+=32){g.beginPath();g.moveTo(i,0);g.lineTo(i,256);g.stroke();}for(let i=0;i<=256;i+=16){g.beginPath();g.moveTo(0,i);g.lineTo(256,i);g.stroke();}
 plateTexture=new THREE.CanvasTexture(c);plateTexture.wrapS=plateTexture.wrapT=THREE.RepeatWrapping;plateTexture.repeat.set(3,3);plateTexture.colorSpace=THREE.SRGBColorSpace;return plateTexture;
}

const metal=(color,o={})=>new THREE.MeshStandardMaterial({color,metalness:.22,roughness:.55,map:o.map===false?null:hullTexture(),...o,...(o.map===false?{map:null}:{})});
const glass=()=>new THREE.MeshStandardMaterial({color:0x0b1a24,metalness:.9,roughness:.08,emissive:0x0d2a3a,emissiveIntensity:.6});
const glow=color=>new THREE.MeshBasicMaterial({color});

// Side profile (z,y pairs) extruded across the ship's width and centred on x=0.
function profile(points,width,bevel=.5){
 const s=new THREE.Shape();points.forEach(([z,y],i)=>i?s.lineTo(z,y):s.moveTo(z,y));s.closePath();
 const geo=new THREE.ExtrudeGeometry(s,{depth:Math.max(.1,width-bevel*2),bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel*.8,bevelSegments:3,curveSegments:8});
 geo.rotateY(-Math.PI/2);geo.translate((width-bevel*2)/2,0,0);geo.computeVertexNormals();return geo;
}
function box(w,h,l,material,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,l),material);m.position.set(x,y,z);return m;}
function engine(group,x,y,z,radius,length,color=0x7fd8ff){
 const body=new THREE.Mesh(new THREE.CylinderGeometry(radius*1.05,radius*.92,length,20,1,true),metal(0x55636e,{side:THREE.DoubleSide}));body.rotation.x=Math.PI/2;body.position.set(x,y,z+length/2);group.add(body);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,radius*.12,8,24),metal(0x2c353c,{map:false}));ring.position.set(x,y,z+length);group.add(ring);
 const core=new THREE.Mesh(new THREE.CircleGeometry(radius*.9,24),glow(color));core.position.set(x,y,z+length-.05);group.add(core);
 const plume=new THREE.Mesh(new THREE.ConeGeometry(radius*.85,radius*3,20,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide}));plume.rotation.x=-Math.PI/2;plume.position.set(x,y,z+length+radius*1.5);group.add(plume);
}
// Interior ships get an x-ray shell so the hold stays visible.
function shell(geo,group,color=0x9fb3c2){
 const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,metalness:.4,roughness:.45,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide}));m.renderOrder=-1;group.add(m);
 group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo,28),new THREE.LineBasicMaterial({color:0x9fd7e6,transparent:true,opacity:.45})));
}

function hullB(){
 const g=new THREE.Group(),steel=metal(0xb4bec6),dark=metal(0x4a5862),frame=metal(0x6d7d88,{map:false});
 // Command module (bow): wide wedge with a flat dorsal deck, MISC-style rounded nose.
 g.add(new THREE.Mesh(profile([[-11,-3.2],[-11,3.4],[-17.2,4.3],[-23.2,4.1],[-27,3.1],[-30,1.4],[-30.9,.2],[-30.4,-1.4],[-27.7,-2.9],[-21,-3.6]],8,.7),steel));
 const canopy=new THREE.Mesh(profile([[-29.7,1.2],[-27.3,3.05],[-25.1,3.5],[-25.1,2.6],[-29.4,.6]],5.4,.25),glass());g.add(canopy);
 g.add(box(8.6,.5,8,dark,0,4.4,-18.5));g.add(box(9.2,1.4,2,dark,0,0,-11.6));
 for(const sx of [-1,1]){g.add(box(.6,1.8,7,dark,sx*4.1,-.6,-21.5));g.add(box(.4,.4,5,glow(0xffb36b),sx*4.25,1.2,-22.5));}
 // Spine with ribs.
 g.add(box(2.2,2.2,26,frame,0,0,0));for(let z=-11;z<=12;z+=2.6)g.add(box(3,3,.45,dark,0,0,z));
 // Deployable cargo arms: struts from the spine to each quadrant + gridded mounting panels.
 const panel=new THREE.MeshStandardMaterial({map:gridTexture(),metalness:.5,roughness:.5,side:THREE.DoubleSide});
 for(const sx of [-1,1])for(const sy of [-1,1]){
  for(const z of [-8,-3.5,3.5,8]){const strut=box(.35,.35,2.63,frame);strut.position.set(sx*2.01,sy*2.05,z);strut.lookAt(sx*2.92,sy*3,z);g.add(strut);g.add(box(2,.3,.3,frame,sx*2.05,sy*1.1,z));}
  const p=new THREE.Mesh(new THREE.PlaneGeometry(18,4),panel.clone());p.material.map=gridTexture().clone();p.material.map.needsUpdate=true;p.material.map.repeat.set(14.4,3.2);p.rotation.y=Math.PI/2;p.position.set(sx*2.92,sy*3,0);g.add(p);
  g.add(box(.25,4.2,.25,frame,sx*2.92,sy*3,-9.1));g.add(box(.25,4.2,.25,frame,sx*2.92,sy*3,9.1));
 }
 // Engine block (stern) with four main engines and outboard fins.
 g.add(new THREE.Mesh(profile([[13,-3.3],[13,3.3],[19,3.9],[23.5,3],[23.5,-3],[19,-3.9]],8.4,.6),steel));
 for(const sx of [-1,1])for(const sy of [-1,1])engine(g,sx*2.2,sy*1.7,23.3,1.15,2.6);
 for(const sx of [-1,1]){const fin=new THREE.Mesh(profile([[14,0],[22,.4],[24.5,2.8],[19,1.6]],.4,.1),dark);fin.position.x=sx*4.6;fin.rotation.z=sx*-.25;g.add(fin);}
 g.add(box(5,.4,4,dark,0,4,18));
 return g;
}

function zeus(variant='cl'){
 const g=new THREE.Group(),dark=metal(0x3b4650),accent=metal(0xd7dde1);
 // Fuselage: RSI wedge, cockpit forward, cargo deck aft with a stern ramp.
 const body=profile([[10,-1.2],[10,4],[3,4.6],[-5,4.4],[-11,3.4],[-17,2.1],[-21,.5],[-21,-.5],[-17,-1.5],[-6,-1.6]],10.2,.6);shell(body,g);
 g.add(new THREE.Mesh(profile([[-20.2,.8],[-17,2.4],[-12.5,3.5],[-12.5,2.4],[-19,.3]],4.2,.2),glass()));
 // Deck floor and the loading-zone stripe from the review footage.
 g.add(box(6.2,.2,11,dark,0,-.12,3.6));g.add(box(5.6,.03,.25,glow(0xf5c04a),0,0,9.6));
 // Swept wings with tip nacelles.
 for(const sx of [-1,1]){
  const wingShape=new THREE.Shape([new THREE.Vector2(0,-4),new THREE.Vector2(sx*6.5,1),new THREE.Vector2(sx*6.5,6),new THREE.Vector2(0,6)]);
  const wing=new THREE.Mesh(new THREE.ExtrudeGeometry(wingShape,{depth:.45,bevelEnabled:true,bevelSize:.15,bevelThickness:.15,bevelSegments:2}),new THREE.MeshStandardMaterial({color:0xd7dde1,metalness:.55,roughness:.42,map:hullTexture(),side:THREE.DoubleSide}));
  wing.rotation.x=Math.PI/2;wing.position.set(sx*5,1.6,0);g.add(wing);
  engine(g,sx*11.2,1.3,1,1,6.5);
  engine(g,sx*3.2,2.6,10,1.15,2.2);
 }
 // Open stern ramp.
 const ramp=box(5.8,.3,4,dark);ramp.position.set(0,-1.9,11.8);ramp.rotation.x=.42;g.add(ramp);
 if(variant==='es')g.add(box(1.2,.8,2,accent,0,5,-2));
 return g;
}

function hermes(){
 const g=new THREE.Group(),dark=metal(0x34404a),accent=metal(0xd2d8dc);
 const body=profile([[21,-1.4],[21,3.6],[10,4.2],[0,4.4],[-8,4],[-13,2.9],[-16.5,1.2],[-16.5,-.6],[-12,-1.6]],11.6,.7);shell(body,g);
 // Raised bridge forward with a wraparound canopy.
 g.add(new THREE.Mesh(profile([[-15.5,3],[-13.5,4.9],[-9.5,5.6],[-7,5.6],[-7,4.1],[-14.5,2.8]],5,.3),accent));
 g.add(new THREE.Mesh(profile([[-15.6,3.1],[-13.6,5],[-11.5,5.4],[-11.5,4.2],[-14.6,3]],5.2,.15),glass()));
 // Twin holds share a centre walkway with the tractor rail.
 g.add(box(10,.2,19,dark,0,-.12,9));g.add(box(.35,.08,19,glow(0x6fe3ff),0,0,9));
 for(const z of [1,6,11,16])g.add(box(10.6,.4,.4,dark,0,4.1,z));
 // Side sponsons and stern engines.
 for(const sx of [-1,1]){g.add(new THREE.Mesh(profile([[2,-.8],[2,2.4],[14,2.8],[20,2],[20,-.8]],2.4,.3),accent).translateX(sx*6.6));engine(g,sx*6.6,1,19.5,1.25,3);engine(g,sx*3,2.6,20.6,.8,1.6);}
 const ramp=box(9.4,.3,4.5,dark);ramp.position.set(0,-2.1,23);ramp.rotation.x=.42;g.add(ramp);
 return g;
}

// Fallback: a rounded transport shell around the registered grids.
function generic(bounds){
 const g=new THREE.Group(),size=bounds.getSize(new THREE.Vector3()),c=bounds.getCenter(new THREE.Vector3()),z0=bounds.min.z-1,z1=bounds.max.z+1.5,top=bounds.max.y+1.2,bottom=bounds.min.y-1.2,nose=z0-Math.max(5,size.z*.35);
 const body=profile([[z1,bottom],[z1,top],[z0,top+.4],[nose+2,top*.5+c.y*.5],[nose,c.y],[nose+2,bottom+.6],[z0,bottom]],size.x+2.4,.5);body.translate(c.x,0,0);shell(body,g);
 engine(g,c.x-size.x/4,c.y,z1,.9,1.5);engine(g,c.x+size.x/4,c.y,z1,.9,1.5);
 g.add(box(size.x+1,.2,size.z+2,metal(0x34404a),c.x,bounds.min.y-.12,c.z));
 return g;
}

export function hullKind(ship){
 const id=String(ship.id||''),name=String(ship.name||'');
 if(id==='misc-hull-b'||/hull[ -]?b\b/i.test(name))return 'hull-b';
 if(/zeus.*\bes\b/i.test(name)||id==='rsi-zeus-mk-ii-es')return 'zeus-es';
 if(/zeus/i.test(name))return 'zeus-cl';
 if(/hermes/i.test(name))return 'hermes';
 return 'generic';
}
export function buildHull(ship,bounds){
 const kind=hullKind(ship),g=kind==='hull-b'?hullB():kind==='zeus-cl'?zeus('cl'):kind==='zeus-es'?zeus('es'):kind==='hermes'?hermes():generic(bounds);
 g.userData={kind,reference:kind!=='generic'};return g;
}
export const HULL_NOTE={'hull-b':'Hull B · 리뷰 영상 기준 재구성 외형','zeus-cl':'Zeus Mk II CL · 리뷰 영상 기준 재구성 외형','zeus-es':'Zeus Mk II ES · CL 외형 기반 개략','hermes':'RSI Hermes · 리뷰 영상 기준 재구성 외형',generic:'등록 그리드 기준 개략 외피'};

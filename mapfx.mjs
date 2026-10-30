import * as THREE from 'three';

// Procedural look for the star map: surfaces, atmospheres, star glow and a backdrop.
// Colours are artistic approximations of each body, not texture data from the game.
export const STAR_COLORS={stanton:'#fff0cf',pyro:'#ff8d52',nyx:'#c9d8ff'};
const SURFACE={
 Hurston:{base:'#b58c55',alt:'#7d5c36',atmo:'#e9c58c',bands:.25},
 Crusader:{base:'#d9b5a2',alt:'#f0d9c9',atmo:'#ffe4d1',bands:1,gas:true},
 ArcCorp:{base:'#ab8878',alt:'#6e5248',atmo:'#f0b28f',bands:.15,city:true},
 microTech:{base:'#d9eef5',alt:'#8fb9cc',atmo:'#c4ecff',bands:.2,ice:true},
 'Pyro I':{base:'#c57945',alt:'#6d3a1d',atmo:'#ff9a5a',bands:.2},
 Monox:{base:'#ac7761',alt:'#5e3c30',atmo:'#e39a78',bands:.2},
 Bloom:{base:'#c1d9cf',alt:'#6f8f84',atmo:'#c9ffe9',bands:.3},
 'Pyro IV':{base:'#b18e76',alt:'#6b5244',atmo:'#e6b394',bands:.2},
 'Pyro V':{base:'#acb587',alt:'#d9cf9a',atmo:'#f2e6aa',bands:1,gas:true},
 Terminus:{base:'#9ba1b8',alt:'#5f6478',atmo:'#c7cff0',bands:.2},
 'Nyx I':{base:'#8c8f9c',alt:'#5a5c66',atmo:'#c9d8ff',bands:.1},
 'Nyx II':{base:'#a0a7b8',alt:'#6a7080',atmo:'#c9d8ff',bands:.1},
 'Nyx III':{base:'#b7c3d8',alt:'#7b879c',atmo:'#d9e6ff',bands:.4,gas:true}
};
const cache=new Map();
function rng(text){let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);let s=(h>>>0)||1;return()=>{s=Math.imul(s^(s>>>15),2246822507)>>>0;s=Math.imul(s^(s>>>13),3266489909)>>>0;s^=s>>>16;return(s>>>0)/4294967296;};}
export function surfaceTexture(name,type){
 const key='s:'+name+type;if(cache.has(key))return cache.get(key);
 const spec=SURFACE[name]||(type==='Moon'?{base:'#9ea3a8',alt:'#62676c',bands:0,craters:true}:{base:'#8aa4b4',alt:'#556b78',bands:.2});
 const c=document.createElement('canvas');c.width=512;c.height=256;const g=c.getContext('2d'),r=rng(name);
 g.fillStyle=spec.base;g.fillRect(0,0,512,256);
 // Latitude banding (strong for gas giants).
 for(let y=0;y<256;y+=2){const n=Math.sin(y*.09+r()*.6)*.5+Math.sin(y*.031+3)*.5;g.globalAlpha=Math.abs(n)*spec.bands*(spec.gas?.55:.22);g.fillStyle=n>0?spec.alt:'#ffffff';g.fillRect(0,y,512,2);}
 // Continents / dust / storms.
 for(let i=0;i<(spec.gas?40:160);i++){const x=r()*512,y=20+r()*216,w=(spec.gas?60:14)+r()*(spec.gas?160:60),h=spec.gas?2+r()*6:6+r()*28;g.globalAlpha=.08+r()*.18;g.fillStyle=r()>.5?spec.alt:spec.base;g.beginPath();g.ellipse(x,y,w,h,r()*(spec.gas?.08:3),0,Math.PI*2);g.fill();}
 if(spec.gas){g.globalAlpha=.35;g.fillStyle=spec.alt;g.beginPath();g.ellipse(170+r()*170,90+r()*70,26,12,0,0,Math.PI*2);g.fill();}
 if(spec.ice||type==='Moon'||spec.craters){for(let i=0;i<(type==='Moon'?90:30);i++){const x=r()*512,y=r()*256,s=2+r()*9;g.globalAlpha=.22;g.fillStyle='#2b3035';g.beginPath();g.arc(x,y,s,0,Math.PI*2);g.fill();g.globalAlpha=.18;g.fillStyle='#ffffff';g.beginPath();g.arc(x-s*.25,y-s*.25,s*.7,0,Math.PI*2);g.fill();}}
 if(spec.ice){g.globalAlpha=.75;g.fillStyle='#f4fbff';g.fillRect(0,0,512,26);g.fillRect(0,230,512,26);}
 if(spec.city){g.globalAlpha=.55;for(let i=0;i<1400;i++){g.fillStyle=r()>.5?'#ffd08a':'#ff9f6b';g.fillRect(Math.floor(r()*128)*4,24+Math.floor(r()*52)*4,2,2);}}
 g.globalAlpha=1;
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;cache.set(key,t);return t;
}
export function atmosphereColor(name){return SURFACE[name]?.atmo||null;}
export function glowTexture(color,soft=1){
 const key='g:'+color+soft;if(cache.has(key))return cache.get(key);
 const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),grad=g.createRadialGradient(128,128,0,128,128,128),col=new THREE.Color(color),rgb=`${Math.round(col.r*255)},${Math.round(col.g*255)},${Math.round(col.b*255)}`;
 if(soft===2){grad.addColorStop(0,`rgba(${rgb},0)`);grad.addColorStop(.36,`rgba(${rgb},0)`);grad.addColorStop(.42,`rgba(${rgb},.55)`);grad.addColorStop(.6,`rgba(${rgb},.12)`);grad.addColorStop(1,`rgba(${rgb},0)`);}
 else{grad.addColorStop(0,`rgba(255,255,255,1)`);grad.addColorStop(.12,`rgba(${rgb},.9)`);grad.addColorStop(.35,`rgba(${rgb},.28)`);grad.addColorStop(1,`rgba(${rgb},0)`);}
 g.fillStyle=grad;g.fillRect(0,0,256,256);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;cache.set(key,t);return t;
}
export function glowSprite(color,scale,opacity=1,ring=false){
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(color,ring?2:1),color:0xffffff,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending}));s.scale.setScalar(scale);s.userData.glow=true;return s;
}
// Faint nebula backdrop + layered starfield, tinted by system.
export function createBackdrop(scene){
 const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d'),tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 const sphere=new THREE.Mesh(new THREE.SphereGeometry(4000,48,24),new THREE.MeshBasicMaterial({map:tex,side:THREE.BackSide,depthWrite:false,fog:false}));sphere.renderOrder=-10;scene.add(sphere);
 const layers=[];for(const [count,size,opacity] of [[2600,.9,.55],[700,1.6,.75],[140,2.8,.95]]){const r=rng('stars'+count),pos=[],col=[];for(let i=0;i<count;i++){const u=r()*2-1,t=r()*Math.PI*2,rad=3200,s=Math.sqrt(1-u*u);pos.push(rad*s*Math.cos(t),rad*u*.92,rad*s*Math.sin(t));const tint=r();const cc=new THREE.Color(tint<.15?'#ffd9b0':tint<.35?'#c9dcff':'#ffffff');col.push(cc.r,cc.g,cc.b);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));const pts=new THREE.Points(geo,new THREE.PointsMaterial({size,sizeAttenuation:false,vertexColors:true,transparent:true,opacity,depthWrite:false}));scene.add(pts);layers.push(pts);}
 function paint(system){const r=rng('neb'+system),hue={stanton:['#173a5c','#3a2350'],pyro:['#5c2414','#3b1830'],nyx:['#1c2b5c','#25184a']}[system]||['#173a5c','#3a2350'];g.fillStyle='#03060b';g.fillRect(0,0,1024,512);
  for(let i=0;i<70;i++){const x=r()*1024,y=180+Math.sin(x/1024*Math.PI*2)*70+(r()-.5)*160,rad=40+r()*170,gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,hue[i%2]+'55');gr.addColorStop(1,hue[i%2]+'00');g.fillStyle=gr;g.fillRect(x-rad,y-rad,rad*2,rad*2);}
  g.globalAlpha=.5;for(let i=0;i<900;i++){const x=r()*1024,y=180+Math.sin(x/1024*Math.PI*2)*70+(r()-.5)*120;g.fillStyle='#ffffff';g.fillRect(x,y,r()<.9?1:2,1);}g.globalAlpha=1;tex.needsUpdate=true;}
 return {paint,sphere,layers};
}

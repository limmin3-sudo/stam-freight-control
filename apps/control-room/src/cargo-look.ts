import * as THREE from 'three';

// Full painted faces encode destination. Structural metal stays neutral.
export function paintedCargoSurface(color:string,size:number){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
 const c=canvas.getContext('2d')!;
 c.fillStyle=new THREE.Color(color).multiplyScalar(.65).getStyle();c.fillRect(0,0,1024,512);
 const shade=c.createLinearGradient(0,0,650,512);shade.addColorStop(0,'#ffffff18');shade.addColorStop(.4,'#ffffff00');shade.addColorStop(1,'#061a2738');c.fillStyle=shade;c.fillRect(0,0,1024,512);
 // Large recessed painted panels, restrained machining seams and rubber seals.
 c.strokeStyle='#10232a99';c.lineWidth=9;c.strokeRect(17,17,990,478);
 c.strokeStyle='#e5faff60';c.lineWidth=2;c.strokeRect(25,25,974,462);
 for(let x=38;x<1000;x+=316){
  c.fillStyle='#14243125';c.fillRect(x,54,298,395);
  c.strokeStyle='#132734aa';c.lineWidth=3;c.strokeRect(x,54,298,395);
  c.strokeStyle='#ffffff48';c.lineWidth=1;c.beginPath();c.moveTo(x+3,446);c.lineTo(x+3,57);c.lineTo(x+294,57);c.stroke();
 }
 let seed=921;
 for(let i=0;i<16000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%1024;seed=(Math.imul(seed,1664525)+1013904223)>>>0;c.fillStyle=i%3?'#10212b0a':'#ffffff12';c.fillRect(x,seed%512,1+i%6,.5);}
 // Edge wear is sparse; it must never turn the destination faces grey.
 for(let i=0;i<80;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;c.fillStyle='#b6c4c880';c.fillRect(seed%1000+12,i%2?22:484,1+i%7,1);}
 c.fillStyle='#15242ce8';c.fillRect(54,326,280,110);c.fillStyle='#b7c9d0';c.font='500 15px sans-serif';c.fillText('STAM / FREIGHT DIVISION',70,350);c.font='600 41px sans-serif';c.fillStyle='#edf8fa';c.fillText(`${size} SCU`,70,401);
 c.fillStyle='#19313c';c.font='500 15px monospace';c.fillText('LOCK / SECURE',720,402);
 for(let x=723;x<927;x+=6){c.fillStyle='#19313caa';c.fillRect(x,416,x%3+1,15);}
 for(const x of [33,991])for(const y of [33,479]){c.fillStyle='#17242b';c.beginPath();c.arc(x,y,6,0,Math.PI*2);c.fill();c.strokeStyle='#bfcbce';c.lineWidth=2;c.beginPath();c.moveTo(x-3,y);c.lineTo(x+3,y);c.stroke();}
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
 return map;
}
export function cargoMicrosurface(){
 const cv=document.createElement('canvas');cv.width=cv.height=512;const c=cv.getContext('2d')!;
 c.fillStyle='#969696';c.fillRect(0,0,512,512);let seed=8753;
 for(let i=0;i<45000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%512;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const y=seed%512,v=100+seed%74;c.fillStyle=`rgb(${v},${v},${v})`;c.fillRect(x,y,1+seed%4,1);}
 const texture=new THREE.CanvasTexture(cv);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;return texture;
}
// A one-cell board confined to each real ship attachment face.
// Never extend it into a background or room-wide reference floor.
// World-space glow bands provide neon depth without full-frame bloom.
export function hologramField(width:number,length:number){
 return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
  uniforms:{extent:{value:new THREE.Vector2(width,length)},origin:{value:new THREE.Vector2(width/2,length/2)}},
  vertexShader:`varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec2 p;uniform vec2 extent;uniform vec2 origin;
   void main(){
    vec2 cell=p+origin;
    vec2 dist=abs(fract(cell+.5)-.5);
    vec2 aa=max(fwidth(cell),vec2(.0001));
    // One uniform, restrained gold attachment surface; no alternating tiles.
    vec2 coreAxis=1.-smoothstep(vec2(.003),vec2(.003)+aa*.8,dist);
    float core=max(coreAxis.x,coreAxis.y);
    float nearest=min(dist.x,dist.y);
    float halo=exp(-nearest*nearest/.0015);
    float perimeter=min(extent.x*.5-abs(p.x),extent.y*.5-abs(p.y));
    float frame=1.-smoothstep(.01,.01+max(aa.x,aa.y),perimeter);
    vec3 gold=vec3(.62,.42,.17);
    vec3 face=vec3(.085,.057,.025);
    vec3 color=face+gold*(core*.23+halo*.055+frame*.24);
    gl_FragColor=vec4(color,.68);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
}

export function hologramWall(){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
 vertexShader:`varying vec3 n;varying vec3 v;varying vec3 p;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-mv.xyz);p=position;gl_Position=projectionMatrix*mv;}`,
 fragmentShader:`varying vec3 n;varying vec3 v;varying vec3 p;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),3.);float scan=pow(.5+.5*sin(p.y*100.),16.);gl_FragColor=vec4(.3,.85,1.,.008+rim*.065+scan*.012);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});}
export function hologramBrackets(w:number,h:number,l:number){
 const points:number[]=[],reach=Math.min(.55,Math.min(w,h,l)*.25);
 for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
  const x=sx*w/2,y=sy*h/2,z=sz*l/2;
  points.push(x,y,z,x-sx*reach,y,z,x,y,z,x,y-sy*reach,z,x,y,z,x,y,z-sz*reach);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
 return new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xb6f5ff,transparent:true,opacity:.9}));
}

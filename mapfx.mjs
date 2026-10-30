import * as THREE from 'three';

// Visual effects for the star map: procedural planet surfaces, atmosphere and star shaders, glow sprites,
// text label sprites and the space backdrop. Surfaces are artistic approximations (not game textures).
export const STAR_COLORS={stanton:'#f3b866',pyro:'#e87539',nyx:'#efc88e'};
const cache=new Map();

// ---- deterministic 3D value noise ---------------------------------------------------------------
function hash(x,y,z,s){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,1274126177)^Math.imul(s,2246822519);h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967295;}
function vnoise(x,y,z,s){const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=x-xi,yf=y-yi,zf=z-zi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),w=zf*zf*(3-2*zf);
 const l=(a,b,t)=>a+(b-a)*t;return l(l(l(hash(xi,yi,zi,s),hash(xi+1,yi,zi,s),u),l(hash(xi,yi+1,zi,s),hash(xi+1,yi+1,zi,s),u),v),l(l(hash(xi,yi,zi+1,s),hash(xi+1,yi,zi+1,s),u),l(hash(xi,yi+1,zi+1,s),hash(xi+1,yi+1,zi+1,s),u),v),w);}
function fbm(x,y,z,s,oct=5){let a=.5,f=1,t=0,n=0;for(let i=0;i<oct;i++){t+=a*vnoise(x*f,y*f,z*f,s+i*31);n+=a;a*=.5;f*=2.07;}return t/n;}
const seedOf=t=>{let h=7;for(const c of t)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
const mix=(a,b,t)=>a+(b-a)*t,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const rgb=h=>{const c=new THREE.Color(h);return [c.r*255,c.g*255,c.b*255];};
const ramp=(stops,t)=>{t=clamp(t);for(let i=1;i<stops.length;i++)if(t<=stops[i][0]){const [t0,c0]=stops[i-1],[t1,c1]=stops[i],k=(t-t0)/Math.max(1e-6,t1-t0);return [mix(c0[0],c1[0],k),mix(c0[1],c1[1],k),mix(c0[2],c1[2],k)];}return stops.at(-1)[1];};
const S=(...pairs)=>pairs.map(([t,h])=>[t,rgb(h)]);

// Body looks. kind: rock | desert | ice | gas | city | lava | toxic
export const BODY_LOOK={
 Hurston:{kind:'desert',ramp:S([0,'#4c3a26'],[.42,'#8a6a42'],[.55,'#b08a57'],[.7,'#7a6b5a'],[1,'#d6c4a0']),atmo:'#e9c58c',atmoStrength:.9,clouds:.15,diameter:2000},
 Crusader:{kind:'gas',ramp:S([0,'#c98f7b'],[.3,'#f0c9b0'],[.5,'#fbe8da'],[.7,'#e3a98f'],[1,'#fff3ea']),atmo:'#ffd9c2',atmoStrength:1.2,diameter:14900},
 ArcCorp:{kind:'city',ramp:S([0,'#3a2a26'],[.45,'#6e4b3e'],[.6,'#9b6a52'],[1,'#c79b7c']),atmo:'#f0a882',atmoStrength:.9,lights:'#ffb46b',diameter:1600},
 microTech:{kind:'ice',ramp:S([0,'#6f8fa3'],[.45,'#b8cfdb'],[.6,'#e3eef3'],[1,'#ffffff']),atmo:'#bfe7ff',atmoStrength:1.1,clouds:.35,diameter:2000},
 Arial:{kind:'lava',ramp:S([0,'#2b1712'],[.5,'#6b3524'],[.75,'#a5532c'],[1,'#e08a46']),diameter:690},
 Aberdeen:{kind:'toxic',ramp:S([0,'#4a4224'],[.5,'#8d7c3c'],[.8,'#c2b061'],[1,'#e6dc94']),atmo:'#e8d77a',atmoStrength:.6,diameter:548},
 Magda:{kind:'rock',ramp:S([0,'#3c4248'],[.5,'#6c747a'],[1,'#a6aeb3']),diameter:682},
 Ita:{kind:'rock',ramp:S([0,'#3b3a2c'],[.5,'#6b6a4c'],[1,'#a3a080']),diameter:650},
 Cellin:{kind:'rock',ramp:S([0,'#2f3134'],[.5,'#5d6064'],[1,'#9a9da0']),diameter:520},
 Daymar:{kind:'desert',ramp:S([0,'#6b3f22'],[.5,'#b0703c'],[1,'#e2b07a']),atmo:'#ffbe85',atmoStrength:.45,diameter:590},
 Yela:{kind:'ice',ramp:S([0,'#8b98a6'],[.5,'#cbd6df'],[1,'#ffffff']),diameter:626},
 Lyria:{kind:'ice',ramp:S([0,'#7e9db3'],[.5,'#b9d2e1'],[1,'#f2fbff']),diameter:446},
 Wala:{kind:'rock',ramp:S([0,'#4a453e'],[.5,'#8b8273'],[1,'#c8bea9']),diameter:566},
 Calliope:{kind:'ice',ramp:S([0,'#93a7b8'],[.5,'#d3e0ea'],[1,'#ffffff']),diameter:480},
 Clio:{kind:'ice',ramp:S([0,'#6f93ad'],[.5,'#b5d3e6'],[1,'#ffffff']),diameter:674},
 Euterpe:{kind:'ice',ramp:S([0,'#8c9eab'],[.5,'#cad6de'],[1,'#f7fbff']),diameter:426},
 'Pyro I':{kind:'lava',ramp:S([0,'#1d0f0c'],[.5,'#5a2418'],[.8,'#a2401f'],[1,'#ff7a2e']),atmo:'#ff8a4c',atmoStrength:.5,diameter:1400},
 Monox:{kind:'rock',ramp:S([0,'#2b2624'],[.5,'#5a504a'],[1,'#988c84']),atmo:'#d9a28a',atmoStrength:.6,diameter:1800},
 Bloom:{kind:'toxic',ramp:S([0,'#22352e'],[.45,'#4d6d5b'],[.7,'#86a78f'],[1,'#c9e2cd']),atmo:'#b8ffe0',atmoStrength:1,clouds:.25,diameter:2600},
 'Pyro IV':{kind:'desert',ramp:S([0,'#3e2a20'],[.5,'#7d5741'],[1,'#c99a7a']),atmo:'#e6b394',atmoStrength:.5,diameter:1600},
 'Pyro V':{kind:'gas',ramp:S([0,'#7b6a3c'],[.3,'#b9a65e'],[.55,'#e4d59a'],[.75,'#c08a4e'],[1,'#f5ecc6']),atmo:'#f2e6aa',atmoStrength:1.2,diameter:8400},
 Terminus:{kind:'ice',ramp:S([0,'#5d6478'],[.5,'#9aa2b8'],[1,'#dfe4f2']),atmo:'#c7cff0',atmoStrength:.7,diameter:2200},
 Adir:{kind:'rock',ramp:S([0,'#3a2f2a'],[.5,'#6e5a4f'],[1,'#a8917f']),diameter:500},Fairo:{kind:'ice',ramp:S([0,'#6d7a88'],[.5,'#a9b8c6'],[1,'#e6eef5']),diameter:520},
 Fuego:{kind:'lava',ramp:S([0,'#22110d'],[.5,'#5f2a1b'],[1,'#d1612f']),diameter:480},Ignis:{kind:'lava',ramp:S([0,'#1c0e0b'],[.5,'#56261a'],[1,'#c45a2a']),diameter:500},
 Vatra:{kind:'rock',ramp:S([0,'#2d2b2a'],[.5,'#5e5955'],[1,'#9c968f']),diameter:540},Vuur:{kind:'desert',ramp:S([0,'#4a2f1f'],[.5,'#8e5d3c'],[1,'#d2a074']),diameter:460},
 'Nyx I':{kind:'rock',ramp:S([0,'#2b2d33'],[.5,'#5d6170'],[1,'#a2a7b6']),diameter:1200},'Nyx II':{kind:'rock',ramp:S([0,'#323642'],[.5,'#666d82'],[1,'#a9b0c4']),diameter:1500},
 'Nyx III':{kind:'gas',ramp:S([0,'#5d6b8c'],[.4,'#94a3c4'],[.7,'#c4cfe6'],[1,'#eef2fb']),atmo:'#d9e6ff',atmoStrength:1,diameter:7000}
};
export function bodyLook(name,type){return BODY_LOOK[name]||(type==='Moon'?{kind:'rock',ramp:S([0,'#3a3d40'],[.5,'#6d7276'],[1,'#a9aeb2']),diameter:500}:{kind:'rock',ramp:S([0,'#3a4a55'],[.5,'#6a8494'],[1,'#a8c0cc']),diameter:1500});}

// ---- GPU procedural surfaces ------------------------------------------------------------------
// Surfaces are computed per pixel from 3D noise on the sphere, so detail keeps increasing as you zoom in.
const KIND={rock:0,desert:1,ice:2,gas:3,city:4,lava:5,toxic:6};
const NOISE=`float hsh(vec3 p){p=fract(p*.3183099+vec3(.71,.113,.419));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hsh(i),hsh(i+vec3(1,0,0)),f.x),mix(hsh(i+vec3(0,1,0)),hsh(i+vec3(1,1,0)),f.x),f.y),mix(mix(hsh(i+vec3(0,0,1)),hsh(i+vec3(1,0,1)),f.x),mix(hsh(i+vec3(0,1,1)),hsh(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p,int o){float a=.5,s=0.,n=0.;for(int i=0;i<9;i++){if(i>=o)break;s+=a*vn(p);n+=a;p=p*2.07+vec3(1.7,9.2,3.1);a*=.5;}return s/n;}
float ridge(vec3 p,int o){float a=.5,s=0.,n=0.;for(int i=0;i<8;i++){if(i>=o)break;float r=1.-abs(2.*vn(p)-1.);s+=a*r*r;n+=a;p=p*2.11+vec3(4.3,1.1,7.7);a*=.5;}return s/n;}`;
const LOGV='#include <common>\n#include <logdepthbuf_pars_vertex>\n',LOGF='#include <logdepthbuf_pars_fragment>\nuniform mat4 modelMatrix;\n';
const SPHERE_V=LOGV+`varying vec3 vP;varying vec3 vN;varying vec3 vW;void main(){vP=position;vec4 wp=modelMatrix*vec4(position,1.);vW=wp.xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*wp;\n#include <logdepthbuf_vertex>\n}`;
function linearStops(look){const st=look.ramp.slice(0,5);while(st.length<5)st.push(st.at(-1));return {c:st.map(([,c])=>new THREE.Color().setRGB(c[0]/255,c[1]/255,c[2]/255,THREE.SRGBColorSpace)),t:st.map(([t])=>t)};}
export function planetMaterial(name,type){const look=bodyLook(name,type),stops=linearStops(look),seed=seedOf(name)%997;
 return new THREE.ShaderMaterial({uniforms:{uC:{value:stops.c},uT:{value:stops.t},uKind:{value:KIND[look.kind]??0},uSeed:{value:new THREE.Vector3(seed*.137,seed*.071,seed*.193)},uSun:{value:new THREE.Vector3()},uTime:{value:0},
  uAtmo:{value:new THREE.Color(look.atmo||'#000000')},uAtmoK:{value:look.atmo?(look.atmoStrength||1):0},uLights:{value:new THREE.Color(look.lights||'#ffb46b')},uCity:{value:look.kind==='city'?1:look.cityLights||0},uIce:{value:look.kind==='ice'?1:look.clouds?.25:0},uDetail:{value:1}},
  vertexShader:SPHERE_V,
  fragmentShader:LOGF+`uniform vec3 uC[5];uniform float uT[5];uniform int uKind;uniform vec3 uSeed;uniform vec3 uSun;uniform float uTime;uniform vec3 uAtmo;uniform float uAtmoK;uniform vec3 uLights;uniform float uCity;uniform float uIce;uniform float uDetail;varying vec3 vP;varying vec3 vN;varying vec3 vW;
 ${NOISE}
 vec3 ramp(float t){t=clamp(t,0.,1.);vec3 c=uC[0];for(int i=1;i<5;i++){float k=clamp((t-uT[i-1])/max(1e-4,uT[i]-uT[i-1]),0.,1.);c=mix(c,uC[i],k);}return c;}
 float height(vec3 q){if(uKind==3){return 0.;}float c=fbm(q*1.1,5);float m=ridge(q*3.2+c*1.3,int(4.+2.*uDetail));float d=fbm(q*14.,3);float h=c*.55+m*.38+d*.07;if(uKind==0||uKind==5){float cr=fbm(q*7.,2);h-=smoothstep(.62,.7,cr)*.08;}return h;}
 void main(){\n#include <logdepthbuf_fragment>\n
  vec3 sp=normalize(vP),q=sp*2.2+uSeed;vec3 V=normalize(cameraPosition-vW),L=normalize(uSun-vW),N=normalize(vN);
  vec3 col;float h;vec3 emis=vec3(0.);float spec=0.;
  if(uKind==3){float lat=sp.y;float turb=fbm(q*1.3+vec3(uTime*.004,0.,0.),5);float fine=fbm(q*vec3(1.,9.,1.)*1.6+turb*2.,4);float band=.5+.5*sin(lat*15.+turb*5.+sin(lat*4.)*1.7);float storm=smoothstep(.72,.9,fbm(q*3.+vec3(0.,0.,uTime*.003),3));h=band*.72+fine*.22+storm*.15;col=ramp(h);}
  else{h=height(q);
   // bump: perturb the normal with the height gradient
   vec3 t1=normalize(cross(sp,vec3(0.,1.,.001))),t2=cross(sp,t1);float e=.0035;float hx=height((sp+t1*e)*2.2+uSeed),hy=height((sp+t2*e)*2.2+uSeed);vec3 bn=normalize(sp-(.9+uDetail*.6)*((hx-h)*t1+(hy-h)*t2)/e*.06);N=normalize(mat3(modelMatrix)*bn);
   col=ramp((h-.22)*1.8);
   float lat=abs(sp.y);float cap=smoothstep(.78-uIce*.18,.92-uIce*.12,lat+(fbm(q*4.,3)-.5)*.12);col=mix(col,vec3(.93,.96,1.),cap);if(uKind==2){spec=.35*(1.-cap*.3);}
   if(uKind==5){float crack=smoothstep(.78,.92,ridge(q*5.,4));emis+=vec3(2.6,.75,.18)*crack*(.6+.4*sin(uTime*.6+h*30.));}
   if(uKind==6){col=mix(col,col*vec3(.85,1.05,.8),fbm(q*6.,3));}}
  float ndl=dot(N,L);float day=smoothstep(-.08,.35,ndl);float diff=max(ndl,0.)*.95+.04;
  // terminator warm tint + rim scattering
  float term=smoothstep(.0,.25,ndl)*(1.-smoothstep(.25,.6,ndl));vec3 lit=col*diff+col*uAtmo*term*.25*uAtmoK;
  vec3 R=reflect(-L,N);lit+=vec3(1.)*pow(max(dot(R,V),0.),40.)*spec*day;
  // night side city lights
  if(uCity>0.){float cityN=smoothstep(.58,.66,fbm(q*22.,4))*step(abs(sp.y),.86);float grid=smoothstep(.45,.5,fbm(q*80.,2));emis+=uLights*(cityN*.9+cityN*grid*.8)*2.2*(1.-day)*uCity;}
  float rim=pow(1.-max(dot(normalize(vN),V),0.),3.);lit+=uAtmo*rim*uAtmoK*1.2*smoothstep(-.25,.4,dot(normalize(vN),L));
  gl_FragColor=vec4(lit+emis,1.);}`});}
export function cloudMaterial(name,amount=.4){const seed=seedOf(name+'cloud')%991;return new THREE.ShaderMaterial({uniforms:{uSeed:{value:new THREE.Vector3(seed*.11,seed*.07,seed*.05)},uSun:{value:new THREE.Vector3()},uTime:{value:0},uAmount:{value:amount}},transparent:true,depthWrite:false,vertexShader:SPHERE_V,
 fragmentShader:LOGF+`uniform vec3 uSeed;uniform vec3 uSun;uniform float uTime;uniform float uAmount;varying vec3 vP;varying vec3 vN;varying vec3 vW;${NOISE}
 void main(){\n#include <logdepthbuf_fragment>\nvec3 sp=normalize(vP);vec3 q=sp*3.+uSeed+vec3(uTime*.006,0.,uTime*.002);float w=fbm(q*.8,3);float c=fbm(q+vec3(w*1.8),7);float lat=abs(sp.y);c+=.08*sin(sp.y*22.+w*6.);float a=smoothstep(.56-uAmount*.12,.78,c)*(.85+.15*lat);vec3 L=normalize(uSun-vW);float day=smoothstep(-.1,.35,dot(normalize(vN),L));gl_FragColor=vec4(vec3(1.)*(day*1.05+.02),a*uAmount*1.6);}`});}
// Fresnel atmosphere shell: blue-ish/planet tint on the day limb, warm at the terminator.
export function atmosphereMaterial(color,strength=1){return new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color(color)},uSun:{value:new THREE.Vector3()},uStrength:{value:strength}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.BackSide,
 vertexShader:SPHERE_V,
 fragmentShader:LOGF+`uniform vec3 uColor;uniform vec3 uSun;uniform float uStrength;varying vec3 vP;varying vec3 vN;varying vec3 vW;void main(){\n#include <logdepthbuf_fragment>\nvec3 V=normalize(cameraPosition-vW),N=-normalize(vN);float f=1.-abs(dot(N,V));float glow=pow(f,1.6)*smoothstep(1.,.55,f);float l=dot(normalize(vW-(modelMatrix*vec4(0.,0.,0.,1.)).xyz),normalize(uSun-vW));float day=smoothstep(-.35,.45,l);float term=smoothstep(-.35,0.,l)*(1.-smoothstep(0.,.35,l));vec3 c=mix(uColor,vec3(1.,.55,.3),term*.6)*(day+term*.4);gl_FragColor=vec4(c*glow*uStrength*1.8,glow*uStrength);}`});}
// Warm, bounded radiance preserves granulation after tone mapping instead of clipping to white.
export function starMaterial(color){return new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color(color)},uTime:{value:0}},vertexShader:SPHERE_V,
 fragmentShader:LOGF+`uniform vec3 uColor;uniform float uTime;varying vec3 vP;varying vec3 vN;varying vec3 vW;${NOISE}
 void main(){\n#include <logdepthbuf_fragment>\nvec3 V=normalize(cameraPosition-vW);float mu=max(dot(normalize(vN),V),0.);vec3 p=normalize(vP);vec3 drift=vec3(uTime*.009,0.,uTime*.006);float broad=fbm(p*4.+drift,4);float cells=fbm(p*40.-drift*2.,3);float filaments=1.-abs(sin((broad*2.+cells)*13.));float spots=smoothstep(.63,.8,fbm(p*9.+drift*.4,3));float heat=clamp(.42+broad*.44+cells*.22-spots*.25,0.,1.);vec3 edge=uColor*vec3(.78,.53,.3);vec3 cream=vec3(1.,.76,.43);vec3 surface=mix(edge,mix(uColor,cream,.48),heat);float limb=.36+.64*pow(mu,.4);float detail=.68+cells*.38+filaments*.12;gl_FragColor=vec4(surface*limb*detail*1.18,1.);}`});}
// Thin geometry shell, not screen-space bloom: a quiet, local corona at the stellar limb.
export function starCoronaMaterial(color){return new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color(color)},uTime:{value:0}},transparent:true,depthWrite:false,side:THREE.BackSide,vertexShader:SPHERE_V,
 fragmentShader:LOGF+`uniform vec3 uColor;uniform float uTime;varying vec3 vP;varying vec3 vN;varying vec3 vW;${NOISE}
 void main(){\n#include <logdepthbuf_fragment>\nfloat edge=1.-abs(dot(normalize(vN),normalize(cameraPosition-vW)));float band=pow(edge,7.);float curl=.7+.3*fbm(normalize(vP)*12.+vec3(uTime*.012),3);gl_FragColor=vec4(uColor*vec3(.9,.7,.45),band*curl*.28);}`});}
// Route ribbon: screen-space width, glowing core, flowing energy, reveal animation (Star Citizen-style quantum line).
export function routeRibbon(points,{color='#5fe6ff',width=5,flow=1,dashed=false}={}){
 const n=points.length,pos=[],prev=[],next=[],side=[],along=[],idx=[];let len=0;const acc=[0];for(let i=1;i<n;i++){len+=points[i].distanceTo(points[i-1]);acc.push(len);}
 for(let i=0;i<n;i++){const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(n-1,i+1)];for(const sd of [-1,1]){pos.push(p.x,p.y,p.z);prev.push(a.x,a.y,a.z);next.push(b.x,b.y,b.z);side.push(sd);along.push(acc[i]/Math.max(len,1e-9));}if(i<n-1){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('aPrev',new THREE.Float32BufferAttribute(prev,3));g.setAttribute('aNext',new THREE.Float32BufferAttribute(next,3));g.setAttribute('aSide',new THREE.Float32BufferAttribute(side,1));g.setAttribute('aAlong',new THREE.Float32BufferAttribute(along,1));g.setIndex(idx);
 const m=new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color(color)},uWidth:{value:width},uRes:{value:new THREE.Vector2(1,1)},uTime:{value:0},uReveal:{value:0},uFlow:{value:flow},uDashed:{value:dashed?1:0},uLen:{value:len},uAlpha:{value:1}},transparent:true,depthWrite:false,side:THREE.DoubleSide,
  vertexShader:LOGV+`attribute vec3 aPrev;attribute vec3 aNext;attribute float aSide;attribute float aAlong;uniform float uWidth;uniform vec2 uRes;varying float vAcross;varying float vAlong;
  void main(){mat4 pv=projectionMatrix*modelViewMatrix;vec4 c=pv*vec4(position,1.),a=pv*vec4(aPrev,1.),b=pv*vec4(aNext,1.);vec2 sc=c.xy/c.w,sa=a.xy/a.w,sb=b.xy/b.w;vec2 d=sb-sa;if(length(d)<1e-6)d=vec2(1.,0.);d=normalize(d*uRes);vec2 nrm=vec2(-d.y,d.x);c.xy+=nrm*aSide*uWidth*2./uRes*c.w;gl_Position=c;vAcross=aSide;vAlong=aAlong;\n#include <logdepthbuf_vertex>\n}`,
  fragmentShader:LOGF+`uniform vec3 uColor;uniform float uTime;uniform float uReveal;uniform float uFlow;uniform float uDashed;uniform float uLen;uniform float uAlpha;varying float vAcross;varying float vAlong;
  void main(){\n#include <logdepthbuf_fragment>\nif(vAlong>uReveal)discard;float x=abs(vAcross);float core=1.-smoothstep(.55,1.,x);float halo=0.;float head=smoothstep(uReveal-.04,uReveal,vAlong)*step(uReveal,.999)*2.5;
  float pulse=pow(.5+.5*sin((vAlong*uLen*3.-uTime*2.2)*6.2831/ max(.15,uLen*.04+.3)),6.)*uFlow;float dash=uDashed>.5?step(.45,fract(vAlong*uLen*2.5-uTime*.6)):1.;
  float i=core*dash*(.85+pulse*.35)+head*core*.4;gl_FragColor=vec4(mix(uColor,vec3(1.),pulse*.35)*min(i,1.2),clamp(i,0.,1.)*uAlpha);}`});
 const mesh=new THREE.Mesh(g,m);mesh.frustumCulled=false;mesh.renderOrder=4;return mesh;}
export function glowTexture(color,ring=false){
 const key='g:'+color+ring;if(cache.has(key))return cache.get(key);
 const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),grad=g.createRadialGradient(128,128,0,128,128,128),col=new THREE.Color(color),rgbs=`${Math.round(col.r*255)},${Math.round(col.g*255)},${Math.round(col.b*255)}`;
 if(ring){grad.addColorStop(0,`rgba(${rgbs},0)`);grad.addColorStop(.38,`rgba(${rgbs},0)`);grad.addColorStop(.44,`rgba(${rgbs},.9)`);grad.addColorStop(.52,`rgba(${rgbs},.15)`);grad.addColorStop(1,`rgba(${rgbs},0)`);}
 else{grad.addColorStop(0,'rgba(255,255,255,1)');grad.addColorStop(.1,`rgba(${rgbs},.85)`);grad.addColorStop(.3,`rgba(${rgbs},.25)`);grad.addColorStop(.6,`rgba(${rgbs},.06)`);grad.addColorStop(1,`rgba(${rgbs},0)`);}
 g.fillStyle=grad;g.fillRect(0,0,256,256);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;cache.set(key,t);return t;}
export function glowSprite(color,scale,opacity=1,ring=false){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(color,ring),transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending}));s.scale.setScalar(scale);return s;}

// Icons for non-body locations (screen-sized sprites): station hexagon, city, outpost diamond, lagrange cross, POI ring, asteroid.
export function iconTexture(kind,color){const key='i:'+kind+color;if(cache.has(key))return cache.get(key);const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.translate(32,32);g.strokeStyle=color;g.fillStyle=color;g.lineWidth=5;g.shadowColor='rgba(0,0,0,.8)';g.shadowBlur=3;
 const poly=(n,r,rot=0)=>{g.beginPath();for(let i=0;i<n;i++){const a=rot+i/n*Math.PI*2;g[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}g.closePath();};
 if(kind==='station'){poly(6,20,Math.PI/6);g.globalAlpha=.25;g.fill();g.globalAlpha=1;g.stroke();g.beginPath();g.arc(0,0,5,0,Math.PI*2);g.fill();}
 else if(kind==='city'){g.beginPath();g.arc(0,0,18,0,Math.PI*2);g.stroke();g.beginPath();g.arc(0,0,9,0,Math.PI*2);g.fill();}
 else if(kind==='outpost'){poly(4,17);g.globalAlpha=.35;g.fill();g.globalAlpha=1;g.stroke();}
 else if(kind==='lagrange'){g.beginPath();g.moveTo(-18,0);g.lineTo(18,0);g.moveTo(0,-18);g.lineTo(0,18);g.stroke();g.beginPath();g.arc(0,0,8,0,Math.PI*2);g.stroke();}
 else if(kind==='gate'){poly(4,20,Math.PI/4);g.stroke();poly(4,10,Math.PI/4);g.fill();}
 else if(kind==='waypoint'){g.shadowBlur=0;g.lineWidth=4;g.beginPath();g.arc(0,0,24,0,Math.PI*2);g.stroke();g.lineWidth=2;g.beginPath();g.arc(0,0,15,0,Math.PI*2);g.stroke();}
 else if(kind==='poi'){g.beginPath();g.arc(0,0,14,0,Math.PI*2);g.stroke();}
 else{g.beginPath();g.arc(0,0,9,0,Math.PI*2);g.globalAlpha=.8;g.fill();}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;cache.set(key,t);return t;}

// Two-line label (NAME + subtitle) drawn on a canvas; used as a screen-sized sprite pinned to its object.
export function labelSprite(name,sub,color='#cfe6f2',opts={}){const c=document.createElement('canvas'),g=c.getContext('2d'),title=opts.upper===false?name:name.toUpperCase(),big=opts.big?40:30;
 g.font=`700 ${big}px "Barlow Condensed","Noto Sans KR",Arial,sans-serif`;const tw=g.measureText(title).width;g.font=`500 20px "Noto Sans KR",Arial,sans-serif`;const sw=sub?g.measureText(sub).width:0;
 c.width=Math.ceil(Math.max(tw,sw)+28);c.height=sub?big+40:big+16;g.textAlign='center';g.textBaseline='top';
 if(opts.pill){g.fillStyle=opts.pill;const r=c.height/2;g.beginPath();g.roundRect(2,2,c.width-4,c.height-4,r);g.fill();}
 g.font=`700 ${big}px "Barlow Condensed","Noto Sans KR",Arial,sans-serif`;g.shadowColor=opts.pill?'transparent':'rgba(0,0,0,.95)';g.shadowBlur=6;g.fillStyle=opts.pill?'#14100a':color;g.fillText(title,c.width/2,6);
 
 if(sub){g.shadowColor='rgba(0,0,0,.9)';g.shadowBlur=4;g.font=`500 20px "Noto Sans KR",Arial,sans-serif`;g.fillStyle=opts.pill?'#14100a':'rgba(205,225,236,.72)';g.fillText(sub,c.width/2,big+10);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false,depthWrite:false,sizeAttenuation:false}));s.renderOrder=20;s.userData.px=[c.width/2,c.height/2];return s;}

// Faint nebula backdrop + layered starfield, tinted by system.
function rng(text){let s=seedOf(text)||1;return()=>{s=Math.imul(s^(s>>>15),2246822507)>>>0;s=Math.imul(s^(s>>>13),3266489909)>>>0;s^=s>>>16;return(s>>>0)/4294967296;};}
export function createBackdrop(scene){
 const c=document.createElement('canvas');c.width=2048;c.height=1024;const g=c.getContext('2d'),tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 const sphere=new THREE.Mesh(new THREE.SphereGeometry(9000,64,32),new THREE.MeshBasicMaterial({map:tex,side:THREE.BackSide,depthWrite:false,fog:false}));sphere.renderOrder=-10;scene.add(sphere);
 for(const [count,size,opacity] of [[4200,1,.55],[900,1.7,.75],[160,2.8,.95]]){const r=rng('stars'+count),pos=[],col=[];for(let i=0;i<count;i++){const u=r()*2-1,t=r()*Math.PI*2,rad=8000,s=Math.sqrt(1-u*u);pos.push(rad*s*Math.cos(t),rad*u*.9,rad*s*Math.sin(t));const tint=r(),cc=new THREE.Color(tint<.15?'#ffd9b0':tint<.35?'#c9dcff':'#ffffff');col.push(cc.r,cc.g,cc.b);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));scene.add(new THREE.Points(geo,new THREE.PointsMaterial({size,sizeAttenuation:false,vertexColors:true,transparent:true,opacity,depthWrite:false})));}
 function paint(system){const r=rng('neb'+system),theme={stanton:{base:'#020b15',hue:['#124964','#174474','#154f58']},pyro:{base:'#120504',hue:['#75281a','#591a20','#7c401f']},nyx:{base:'#050615',hue:['#27265b','#1d3268','#35234f']},galaxy:{base:'#030713',hue:['#1b3a66','#3d2460','#14324a']}}[system]||{base:'#020b15',hue:['#124964','#174474','#154f58']},hue=theme.hue;
  g.fillStyle=theme.base;g.fillRect(0,0,2048,1024);
  for(let i=0;i<110;i++){const x=r()*2048,y=360+Math.sin(x/2048*Math.PI*2)*140+(r()-.5)*320,rad=60+r()*300,gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,hue[i%3]+'40');gr.addColorStop(1,hue[i%3]+'00');g.fillStyle=gr;g.fillRect(x-rad,y-rad,rad*2,rad*2);}
  for(let i=0;i<60;i++){const x=r()*2048,y=360+Math.sin(x/2048*Math.PI*2)*140+(r()-.5)*120,rad=20+r()*80,gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,'#00000070');gr.addColorStop(1,'#00000000');g.fillStyle=gr;g.fillRect(x-rad,y-rad,rad*2,rad*2);}
  g.globalAlpha=.55;for(let i=0;i<2600;i++){const x=r()*2048,y=360+Math.sin(x/2048*Math.PI*2)*140+(r()-.5)*230;g.fillStyle=r()<.2?'#ffe2c4':'#ffffff';g.fillRect(x,y,r()<.92?1:2,1);}g.globalAlpha=1;tex.needsUpdate=true;}
 return {paint,sphere};}

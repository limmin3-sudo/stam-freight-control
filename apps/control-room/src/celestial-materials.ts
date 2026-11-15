import * as THREE from 'three';
import {glowSprite,bodyLook} from './hologram-materials.mjs';
import hurston from './assets/celestial/hurston.png';
import microtech from './assets/celestial/microtech.png';
import arccorp from './assets/celestial/arccorp.png';
import crusader from './assets/celestial/crusader.png';
import rock from './assets/celestial/rock.png';
import stellarPlasma from './assets/stellar-plasma.png';
import clouds from './assets/celestial/clouds.png';
import {skyFragment} from './chart-sky';

const vertex=`
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv; varying vec3 vN,vW,vP,vCenter;
void main(){vUv=uv;vP=position;vN=normalize(mat3(modelMatrix)*normal);
vW=(modelMatrix*vec4(position,1.)).xyz;vCenter=(modelMatrix*vec4(0.,0.,0.,1.)).xyz;
gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.);
#include <logdepthbuf_vertex>
}`;
// Surface detail is evaluated in object space, filtered by the pixel footprint.
// It augments the approved colour artwork; it does not invent terrain from snow brightness.
const detail=`
float grainHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float grain(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(grainHash(i),grainHash(i+vec3(1,0,0)),f.x),mix(grainHash(i+vec3(0,1,0)),grainHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(grainHash(i+vec3(0,0,1)),grainHash(i+vec3(1,0,1)),f.x),mix(grainHash(i+vec3(0,1,1)),grainHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
vec3 bodyAlbedo(vec3 source,vec3 tint,vec3 low,vec3 mid,vec3 high,float recolor){
 float value=dot(source,vec3(.2126,.7152,.0722));
 // The shared rock map supplies structure; each body's documented palette supplies colour.
 float tone=clamp(sqrt(value)*1.65,0.,1.);
 vec3 palette=mix(low,mid,smoothstep(0.,.57,tone));
 palette=mix(palette,high,smoothstep(.57,1.,tone));
 // Keep crater/terrain contrast when applying a bright ice palette.
 palette*=clamp(.24+1.25*sqrt(value),.24,1.12);
 return mix(source*tint,palette,recolor);
}
`;
const head=`
#include <logdepthbuf_pars_fragment>
varying vec2 vUv;varying vec3 vN,vW,vP,vCenter;
// Generated maps are not assumed perfectly periodic. Blend only the narrow seam.
vec4 sphereMap(sampler2D tex,vec2 uv){
 uv=vec2(fract(uv.x),clamp(uv.y,.001,.999));
 vec4 c=texture2D(tex,uv);float edge=min(uv.x,1.-uv.x);
 if(edge<.018)c=mix((c+texture2D(tex,vec2(1.-uv.x,uv.y)))*.5,c,smoothstep(0.,.018,edge));
 return c;
}
vec3 lightDirection(){return normalize(-vCenter);}
`;
const start=`void main(){
#include <logdepthbuf_fragment>
`;
const end=`
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const hashName=(name:string)=>Array.from(name).reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,7)/4294967296;

export function createCelestialMaterials({hologram=false}={}){
 const textures=new Map<string,THREE.Texture>();
 const load=(url:string,data=false)=>{
  if(textures.has(url))return textures.get(url)!;
  const t=new THREE.TextureLoader().load(url);t.colorSpace=data?THREE.NoColorSpace:THREE.SRGBColorSpace;
  t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.ClampToEdgeWrapping;t.anisotropy=8;
  textures.set(url,t);return t;
 };
 const cloudMap=load(clouds,true);
 const markers=new Map<string,THREE.Texture>();
 const marker=(kind:string,color:string)=>{
  const key=kind+color;if(markers.has(key))return markers.get(key)!;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
  const g=canvas.getContext('2d')!;g.translate(48,48);g.strokeStyle=kind==='station'||kind==='lagrange'?'#a4c4d1':color;g.fillStyle=g.strokeStyle;g.lineWidth=2.8;
  g.shadowColor=color;g.shadowBlur=hologram?6:0;
  if(kind==='waypoint'){
   for(let i=0;i<3;i++){g.beginPath();g.arc(0,0,30,i*Math.PI*2/3+.12,(i+1)*Math.PI*2/3-.12);g.stroke();}
   g.shadowBlur=0;g.globalAlpha=.55;g.beginPath();g.arc(0,0,23,0,Math.PI*2);g.stroke();
  }else{
   const r=kind==='city'||kind==='outpost'?19:14;
   g.beginPath();if(kind==='city'||kind==='outpost'){g.moveTo(0,-r);g.lineTo(r,0);g.lineTo(0,r);g.lineTo(-r,0);g.closePath();}else{g.arc(0,0,r,0,Math.PI*2);}g.stroke();
   g.shadowBlur=0;g.beginPath();g.arc(0,0,2,0,Math.PI*2);g.fill();
   if(kind==='station'||kind==='lagrange'){g.globalAlpha=.65;g.beginPath();g.moveTo(-24,0);g.lineTo(-18,0);g.moveTo(18,0);g.lineTo(24,0);g.stroke();}
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;markers.set(key,texture);return texture;
 };
 // A separate projected volume, deliberately without latitude/longitude grids,
 // scan lines or wireframe. Surface luminance only modulates the projected light.
 const projectedMaterial=(texture:THREE.Texture,offset=0,tint=new THREE.Color('#ffffff'),rimColor='#c5d8df',palette=[tint,tint,tint],recolor=0)=>new THREE.ShaderMaterial({
  name:'projected-celestial-volume',vertexShader:vertex,
  transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uMap:{value:texture},uOffset:{value:offset},uLow:{value:palette[0]},uMid:{value:palette[1]},uHigh:{value:palette[2]},uRecolor:{value:recolor},uHighlight:{value:0},uColor:{value:new THREE.Color(rimColor)},uTint:{value:tint}},
  fragmentShader:head+detail+`uniform sampler2D uMap;uniform float uOffset,uHighlight,uRecolor;uniform vec3 uColor,uTint,uLow,uMid,uHigh;`+start+`
   vec3 N=normalize(vN),V=normalize(cameraPosition-vW);float facing=abs(dot(N,V));
   vec3 albedo=bodyAlbedo(sphereMap(uMap,vUv+vec2(uOffset,0.)).rgb,uTint,uLow,uMid,uHigh,uRecolor);
   float rim=pow(1.-facing,4.5),surface=dot(albedo,vec3(.2126,.7152,.0722));
   float relief=smoothstep(.035,.65,surface);
   float light=.42+.58*max(dot(N,lightDirection()),0.);
   // Smooth coloured glass: do not turn texture gradients into noisy luminous dots.
   vec3 surfaceLight=albedo*.8+sqrt(max(albedo,vec3(0.)))*.2;
   vec3 edgeColor=mix(uColor,vec3(.88,.96,1.),.1);
   edgeColor=mix(edgeColor,vec3(1.,.69,.29),uHighlight*rim);
   float reflection=pow(max(dot(reflect(-V,N),normalize(vec3(-.4,.8,1.))),0.),70.);
   vec3 color=surfaceLight*(1.1+relief*.5)*light+edgeColor*rim*.8;
   color+=vec3(.55,.75,.9)*reflection*.25;
   float alpha=.24+relief*.32+rim*.3+reflection*.1;
   // Back faces form a faint inner volume, not an opaque second globe.
   if(!gl_FrontFacing){alpha*=.16;color*=.7;}
   gl_FragColor=vec4(color,alpha);
  `+end,
 });
 const bodyProfile=(name:string,type:string)=>{
  const look=bodyLook(name,type);const kind=look.kind;
  const named:Record<string,string>={Hurston:hurston,microTech:microtech,ArcCorp:arccorp,Crusader:crusader};
  const tint= new THREE.Color(name in named?'#ffffff':name==='Nyx III'?'#9fc5ff':name==='Pyro V'?'#ded29c':({ice:'#c6d9eb',desert:'#d8b18d',lava:'#c88b64',toxic:'#b6c7a0',gas:'#dfcaa8',rock:'#d2c8bd'}[kind]||'#ffffff'));
  const stops=look.ramp;
  const stopColor=(index:number)=>new THREE.Color().setRGB(...stops[index]![1].map(v=>v/255) as [number,number,number]);
  const palette=[stopColor(0),stopColor(Math.floor((stops.length-1)/2)),stopColor(stops.length-1)];
  return {look,kind,tint,palette,recolor:name in named?0:1,url:named[name]||(kind==='gas'?crusader:rock),offset:name in named?0:hashName(name)};
 };
 return {
  selectionColor:'#f0cd86',marker,routeStyle:{optical:true,widthScale:hologram?1.45:1.25},orbitStyle:{color:hologram?'#7bc9d2':'#7195a6',ticks:!hologram},
  // Keep the post-redesign stellar artwork. This is a view-facing VFX asset at
  // the star's 3D position, not a rotating surface texture or the legacy shader.
  starObject(color:string){
   const group=new THREE.Group();group.name=hologram?'projected-stellar-vfx':'redesign-stellar-vfx';
   const halo=glowSprite(color,3.7,.12);halo.name='restrained-stellar-corona';group.add(halo);
   const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:load(stellarPlasma),transparent:true,depthWrite:false,toneMapped:false,opacity:hologram?.78:1,color:color==='#e87539'?'#ffd6a7':'#ffffff'}));
   // Both looks retain the user-approved plasma artwork, never a cloud-mask globe.
   sprite.name='redesign-stellar-plasma';sprite.scale.setScalar(2.56);group.add(sprite);
   return group;
  },
  planet(name:string,type:string){
   const {look,kind,tint,url,offset,palette,recolor}=bodyProfile(name,type);
   if(hologram)return projectedMaterial(load(url),offset,tint,look.atmo||palette[1]!.getStyle(),palette,recolor);
   return new THREE.ShaderMaterial({name:'celestial-surface-'+name,vertexShader:vertex,uniforms:{
    uLow:{value:palette[0]},uMid:{value:palette[1]},uHigh:{value:palette[2]},uRecolor:{value:recolor},uDetail:{value:1},
    uMap:{value:load(url)},uClouds:{value:cloudMap},uCloudAmount:{value:look.clouds||0},uTime:{value:0},
    uOffset:{value:offset},uTint:{value:tint},uAtmosphere:{value:new THREE.Color(look.atmo||'#8198ac')},uHaze:{value:look.atmo ? .1 : 0},uHighlight:{value:0},uGas:{value:kind==='gas'?1:0},uCity:{value:kind==='city'?1:0},uOcean:{value:name==='microTech'?1:0},
   },fragmentShader:head+detail+`uniform float uRecolor,uDetail;uniform vec3 uLow,uMid,uHigh;uniform sampler2D uMap,uClouds;uniform float uCloudAmount,uTime,uOffset,uGas,uCity,uOcean;uniform vec3 uTint,uAtmosphere;uniform float uHaze,uHighlight;
   `+start+`
    vec2 uv=vUv+vec2(uOffset,0.);vec3 albedo=bodyAlbedo(sphereMap(uMap,uv).rgb,uTint,uLow,uMid,uHigh,uRecolor);
    float footprint=length(fwidth(vP))*180.;
    float resolved=1.-smoothstep(.35,1.4,footprint);
    if(uDetail>.5 && resolved>.01 && uGas<.5){
     float mineral=grain(vP*180.+uOffset*31.)-.5;
     albedo*=1.+mineral*.14*resolved;
    }
    vec3 N=normalize(vN),V=normalize(cameraPosition-vW),L=lightDirection();
    // Albedo is color, not elevation: snow/shore boundaries must not become ridges.
    float height=dot(albedo,vec3(.2126,.7152,.0722));
    float nl=dot(N,L),day=smoothstep(-.09,.22,nl);
    float diffuse=max(nl,0.);float cloud=sphereMap(uClouds,vUv+vec2(uTime*.00022+.002,.001)).r;
    float shadow=1.-smoothstep(.10,.7,cloud)*min(uCloudAmount*1.3,.65)*day;
    vec3 color=albedo*(vec3(.018,.024,.033)+diffuse*1.38)*shadow;
    float sea=smoothstep(.008,.06,albedo.b-albedo.r)*uOcean;
    color+=vec3(.9,.83,.65)*pow(max(dot(N,normalize(L+V)),0.),110.)*sea*day*.7;
    vec2 cityUv=uv*vec2(1400.,700.),streets=abs(fract(cityUv)-.5);
    float cityFootprint=max(fwidth(cityUv.x),fwidth(cityUv.y));
    float streetLight=mix(step(.45,max(streets.x,streets.y)),.19,smoothstep(.2,1.,cityFootprint));
    float city=smoothstep(.12,.32,height)*uCity*streetLight;
    color+=vec3(1.,.48,.17)*city*(1.-day)*.65;
    float fresnel=pow(1.-max(dot(N,V),0.),3.5);
    float airPath=(1.-exp(-fresnel*2.))*uHaze;
    color=mix(color,uAtmosphere*(.14+diffuse*.48),airPath*smoothstep(-.2,.4,nl));
    color+=uAtmosphere*fresnel*smoothstep(-.12,.5,nl)*uHaze*.65;
    color+=vec3(1.,.69,.29)*pow(1.-max(dot(N,V),0.),7.)*uHighlight*.42;
    gl_FragColor=vec4(color,1.);
   `+end});
  },
  cloud(_name:string,amount:number){return new THREE.ShaderMaterial({name:'celestial-cloud-layer',vertexShader:vertex,transparent:true,depthWrite:false,
   uniforms:{uClouds:{value:cloudMap},uAmount:{value:hologram?0:amount},uTime:{value:0}},fragmentShader:head+`uniform sampler2D uClouds;uniform float uAmount,uTime;`+start+`
   vec3 N=normalize(vN),V=normalize(cameraPosition-vW),L=lightDirection();float nl=dot(N,L);
   float density=sphereMap(uClouds,vUv+vec2(uTime*.00022,0.)).r;
   float alpha=smoothstep(.045,.85,density)*min(1.,uAmount*2.3);
   vec3 color=vec3(.86,.91,1.)*(.045+max(nl,0.)*1.4);
   color+=vec3(.2,.11,.055)*pow(max(dot(V,-L),0.),8.)*smoothstep(-.2,.2,nl);
   gl_FragColor=vec4(color,alpha);
   `+end});},
  atmosphere(color:string,strength:number){return new THREE.ShaderMaterial({name:'celestial-atmosphere',vertexShader:vertex,transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,
   uniforms:{uColor:{value:new THREE.Color(color)},uStrength:{value:hologram?strength*.75:strength}},fragmentShader:head+`uniform vec3 uColor;uniform float uStrength;`+start+`
   vec3 N=normalize(vN),V=normalize(cameraPosition-vW),L=lightDirection();
   float rim=pow(1.-abs(dot(N,V)),3.2);float sun=smoothstep(-.24,.55,dot(N,L));
   gl_FragColor=vec4(uColor,rim*(.018+sun*.65)*uStrength);
   `+end});},
  backdrop(scene:THREE.Scene){
   const profiles:Record<string,{tint:string;seed:number}>={stanton:{tint:'#6e9bd1',seed:0},pyro:{tint:'#d99358',seed:7.3},nyx:{tint:'#5baca5',seed:19.7},galaxy:{tint:'#8ca1bd',seed:0}};
   // Direction-only ray field: no sky parallax, seams, pole stretching or image upscaling.
   const mat=new THREE.ShaderMaterial({name:'celestial-system-sky',depthTest:false,depthWrite:false,uniforms:{uTint:{value:new THREE.Color(profiles.stanton!.tint)},uSeed:{value:0},uHologram:{value:hologram?1:0}},
    vertexShader:`varying vec3 vRay;void main(){vec3 ray=vec3(position.x/projectionMatrix[0][0],position.y/projectionMatrix[1][1],-1.);vRay=ray*mat3(viewMatrix);gl_Position=vec4(position.xy,.99999,1.);}`,
    fragmentShader:skyFragment});
   const sky=new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat);sky.name='system-panorama';sky.frustumCulled=false;sky.renderOrder=-100;scene.add(sky);
   // Stars are geometry, not magnified dots baked into the nebula panorama.
   const positions:number[]=[],sizes:number[]=[],colors:number[]=[];let seed=8317;
   const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   for(let i=0;i<14000;i++){
    const a=rand()*Math.PI*2,y=rand()*2-1,r=Math.sqrt(1-y*y),bright=rand();
    positions.push(Math.cos(a)*r,y,Math.sin(a)*r);sizes.push(.55+Math.pow(bright,14)*2.1);
    const warm=rand()>.8,power=(.22+Math.pow(bright,3)*.65)*(hologram?.28:1);colors.push(power,power*(warm?.86:.94),power*(warm?.66:1.1));
   }
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('aSize',new THREE.Float32BufferAttribute(sizes,1));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
   const stars=new THREE.Points(geo,new THREE.ShaderMaterial({name:'celestial-distant-stars',vertexColors:true,transparent:true,depthTest:true,depthWrite:false,
    uniforms:{uDpr:{value:Math.min(globalThis.devicePixelRatio||1,2)}},
    vertexShader:`attribute float aSize;uniform float uDpr;varying vec3 vColor;void main(){vColor=color;vec3 p=mat3(viewMatrix)*position;gl_Position=projectionMatrix*vec4(p*1000.,1.);gl_Position.z=gl_Position.w;gl_PointSize=aSize*uDpr;}`,
    fragmentShader:`varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vColor,exp(-d*d*2.5));
    #include <colorspace_fragment>
    }`}));stars.name='crisp-distant-stars';stars.frustumCulled=false;stars.renderOrder=-99;scene.add(stars);
   return {paint(system:string){const profile=profiles[system]||profiles.stanton!;mat.uniforms.uTint!.value.set(profile.tint);mat.uniforms.uSeed!.value=profile.seed;}};
  },
  dispose(){textures.forEach(t=>t.dispose());textures.clear();markers.forEach(t=>t.dispose());markers.clear();},
 };
}

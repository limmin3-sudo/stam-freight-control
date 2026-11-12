import * as THREE from 'three';
import {bodyLook} from './hologram-materials.mjs';
import hurston from './assets/celestial/hurston.png';
import microtech from './assets/celestial/microtech.png';
import arccorp from './assets/celestial/arccorp.png';
import crusader from './assets/celestial/crusader.png';
import rock from './assets/celestial/rock.png';
import stellarPlasma from './assets/stellar-plasma.png';
import clouds from './assets/celestial/clouds.png';
import stanton from './assets/celestial/sky-stanton.png';
import pyro from './assets/celestial/sky-pyro.png';
import nyx from './assets/celestial/sky-nyx.png';

const vertex=`
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv; varying vec3 vN,vW,vP,vCenter;
void main(){vUv=uv;vP=position;vN=normalize(mat3(modelMatrix)*normal);
vW=(modelMatrix*vec4(position,1.)).xyz;vCenter=(modelMatrix*vec4(0.,0.,0.,1.)).xyz;
gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.);
#include <logdepthbuf_vertex>
}`;
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

export function createCelestialMaterials(){
 const textures=new Map<string,THREE.Texture>();
 const load=(url:string,data=false)=>{
  if(textures.has(url))return textures.get(url)!;
  const t=new THREE.TextureLoader().load(url);t.colorSpace=data?THREE.NoColorSpace:THREE.SRGBColorSpace;
  t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.ClampToEdgeWrapping;t.anisotropy=8;
  textures.set(url,t);return t;
 };
 const cloudMap=load(clouds,true);
 const bodyProfile=(name:string,type:string)=>{
  const look=bodyLook(name,type);const kind=(look as {kind?:string}).kind||'rock';
  const named:Record<string,string>={Hurston:hurston,microTech:microtech,ArcCorp:arccorp,Crusader:crusader};
  const tint= new THREE.Color(name in named?'#ffffff':name==='Nyx III'?'#9fc5ff':name==='Pyro V'?'#ded29c':({ice:'#c6d9eb',desert:'#d8b18d',lava:'#c88b64',toxic:'#b6c7a0',gas:'#dfcaa8',rock:'#d2c8bd'}[kind]||'#ffffff'));
  return {look,kind,tint,url:named[name]||(kind==='gas'?crusader:rock),offset:name in named?0:hashName(name)};
 };
 return {
  // Keep the post-redesign stellar artwork. This is a view-facing VFX asset at
  // the star's 3D position, not a rotating surface texture or the legacy shader.
  starObject(color:string){
   const group=new THREE.Group();group.name='redesign-stellar-vfx';
   const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:load(stellarPlasma),transparent:true,depthWrite:false,toneMapped:false,color:color==='#e87539'?'#ffd6a7':'#ffffff'}));
   sprite.name='redesign-stellar-plasma';sprite.scale.setScalar(2.56);group.add(sprite);
   return group;
  },
  planet(name:string,type:string){
   const {look,kind,tint,url,offset}=bodyProfile(name,type);
   return new THREE.ShaderMaterial({name:'celestial-surface-'+name,vertexShader:vertex,uniforms:{
    uMap:{value:load(url)},uClouds:{value:cloudMap},uCloudAmount:{value:look.clouds||0},uTime:{value:0},
    uOffset:{value:offset},uTint:{value:tint},uGas:{value:kind==='gas'?1:0},uCity:{value:kind==='city'?1:0},uOcean:{value:name==='microTech'?1:0},
   },fragmentShader:head+`uniform sampler2D uMap,uClouds;uniform float uCloudAmount,uTime,uOffset,uGas,uCity,uOcean;uniform vec3 uTint;
   `+start+`
    vec2 uv=vUv+vec2(uOffset,0.);vec3 albedo=sphereMap(uMap,uv).rgb*uTint;
    vec3 N=normalize(vN),V=normalize(cameraPosition-vW),L=lightDirection();
    // Albedo is color, not elevation: snow/shore boundaries must not become ridges.
    float height=dot(albedo,vec3(.2126,.7152,.0722));
    float nl=dot(N,L),day=smoothstep(-.09,.22,nl);
    float diffuse=max(nl,0.);float cloud=sphereMap(uClouds,vUv+vec2(uTime*.00022+.002,.001)).r;
    float shadow=1.-smoothstep(.10,.7,cloud)*min(uCloudAmount*1.3,.65)*day;
    vec3 color=albedo*(.035+diffuse*1.65)*shadow;
    float sea=smoothstep(.008,.06,albedo.b-albedo.r)*uOcean;
    color+=vec3(.9,.83,.65)*pow(max(dot(N,normalize(L+V)),0.),110.)*sea*day*.7;
    float city=smoothstep(.12,.32,height)*uCity;
    color+=vec3(1.,.45,.12)*city*(1.-day)*.48;
    gl_FragColor=vec4(color,1.);
   `+end});
  },
  cloud(_name:string,amount:number){return new THREE.ShaderMaterial({name:'celestial-cloud-layer',vertexShader:vertex,transparent:true,depthWrite:false,
   uniforms:{uClouds:{value:cloudMap},uAmount:{value:amount},uTime:{value:0}},fragmentShader:head+`uniform sampler2D uClouds;uniform float uAmount,uTime;`+start+`
   vec3 N=normalize(vN),V=normalize(cameraPosition-vW),L=lightDirection();float nl=dot(N,L);
   float density=sphereMap(uClouds,vUv+vec2(uTime*.00022,0.)).r;
   float alpha=smoothstep(.045,.85,density)*min(1.,uAmount*2.3);
   vec3 color=vec3(.86,.91,1.)*(.045+max(nl,0.)*1.4);
   color+=vec3(.2,.11,.055)*pow(max(dot(V,-L),0.),8.)*smoothstep(-.2,.2,nl);
   gl_FragColor=vec4(color,alpha);
   `+end});},
  atmosphere(color:string,strength:number){return new THREE.ShaderMaterial({name:'celestial-atmosphere',vertexShader:vertex,transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,
   uniforms:{uColor:{value:new THREE.Color(color)},uStrength:{value:strength}},fragmentShader:head+`uniform vec3 uColor;uniform float uStrength;`+start+`
   vec3 N=normalize(vN),V=normalize(cameraPosition-vW),L=lightDirection();
   float rim=pow(1.-abs(dot(N,V)),5.);float sun=smoothstep(-.22,.6,dot(N,L));
   gl_FragColor=vec4(uColor,rim*(.035+sun*.38)*uStrength);
   `+end});},
  backdrop(scene:THREE.Scene){
   const skies:Record<string,string>={stanton,pyro,nyx,galaxy:stanton};
   // Full-screen ray direction gives an infinitely distant sky: rotation changes it,
   // camera translation never produces sky parallax or escapes a finite sphere.
   const mat=new THREE.ShaderMaterial({name:'celestial-system-sky',depthTest:false,depthWrite:false,uniforms:{uMap:{value:load(stanton)}},
    vertexShader:`varying vec3 vRay;void main(){vec3 ray=vec3(position.x/projectionMatrix[0][0],position.y/projectionMatrix[1][1],-1.);vRay=ray*mat3(viewMatrix);gl_Position=vec4(position.xy,.99999,1.);}`,
    fragmentShader:`varying vec3 vRay;uniform sampler2D uMap;
    void main(){vec3 d=normalize(vRay);d.yz=mat2(.955,.296,-.296,.955)*d.yz;vec2 uv=vec2(fract(atan(d.z,d.x)/6.2831853+.75),asin(clamp(d.y,-1.,1.))/3.14159265+.5);
    vec3 color=texture2D(uMap,uv).rgb;float edge=min(uv.x,1.-uv.x);
    if(edge<.018)color=mix((color+texture2D(uMap,vec2(1.-uv.x,uv.y)).rgb)*.5,color,smoothstep(0.,.018,edge));
    float pole=smoothstep(.96,1.,abs(d.y));color=mix(color,vec3(.0003,.0005,.0007),pole);
    gl_FragColor=vec4(color*.8,1.);
    #include <colorspace_fragment>
    }`});
   const sky=new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat);sky.name='system-panorama';sky.frustumCulled=false;sky.renderOrder=-100;scene.add(sky);
   // Stars are geometry, not magnified dots baked into the nebula panorama.
   const positions:number[]=[],sizes:number[]=[],colors:number[]=[];let seed=8317;
   const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   for(let i=0;i<6500;i++){
    const a=rand()*Math.PI*2,y=rand()*2-1,r=Math.sqrt(1-y*y),bright=rand();
    positions.push(Math.cos(a)*r,y,Math.sin(a)*r);sizes.push(.65+Math.pow(bright,7)*1.5);
    const warm=rand()>.8,power=.16+bright*.5;colors.push(power,power*(warm?.86:.94),power*(warm?.66:1.1));
   }
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('aSize',new THREE.Float32BufferAttribute(sizes,1));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
   const stars=new THREE.Points(geo,new THREE.ShaderMaterial({name:'celestial-distant-stars',vertexColors:true,transparent:true,depthTest:true,depthWrite:false,
    uniforms:{uDpr:{value:Math.min(globalThis.devicePixelRatio||1,2)}},
    vertexShader:`attribute float aSize;uniform float uDpr;varying vec3 vColor;void main(){vColor=color;vec3 p=mat3(viewMatrix)*position;gl_Position=projectionMatrix*vec4(p*1000.,1.);gl_Position.z=gl_Position.w;gl_PointSize=aSize*uDpr;}`,
    fragmentShader:`varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vColor,exp(-d*d*2.5));
    #include <colorspace_fragment>
    }`}));stars.name='crisp-distant-stars';stars.frustumCulled=false;stars.renderOrder=-99;scene.add(stars);
   return {paint(system:string){mat.uniforms.uMap!.value=load(skies[system]||stanton);}};
  },
  dispose(){textures.forEach(t=>t.dispose());textures.clear();},
 };
}

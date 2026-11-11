import * as THREE from 'three';
import {planetMaterial} from './hologram-materials.mjs';

// These shaders belong to the shared room/map renderer. No post-process bloom.
const noise=`
float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+13.7;a*=.5;}return v;}`;
const sphereVertex=`varying vec2 vUv;varying vec3 vN;varying vec3 vW;varying vec3 vP;
void main(){vUv=uv;vP=position;vN=normalize(mat3(modelMatrix)*normal);vW=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.);}`;

export function surfaceMaterial(texture:THREE.Texture,name:string){
 const regions:Record<string,number[]>={Hurston:[0,.5],Crusader:[.5,.5],ArcCorp:[0,0],microTech:[.5,0]};
 const atmos:Record<string,string>={Hurston:'#c9a16d',Crusader:'#bfa6dc',ArcCorp:'#91c7e1',microTech:'#8bd6ff'};
 return new THREE.ShaderMaterial({uniforms:{uMap:{value:texture},uOffset:{value:new THREE.Vector2(regions[name]![0],regions[name]![1])},uAtmo:{value:new THREE.Color(atmos[name])},uCity:{value:name==='ArcCorp'?1:0},uOcean:{value:name==='microTech'?1:0},uGas:{value:name==='Crusader'?1:0}},vertexShader:sphereVertex,
 fragmentShader:`uniform sampler2D uMap;uniform vec2 uOffset;uniform vec3 uAtmo;uniform float uCity,uOcean,uGas;varying vec2 vUv;varying vec3 vN,vW,vP;${noise}
 void main(){
  vec2 uv=uOffset+vec2(.001)+vUv*vec2(.498);vec3 albedo=texture2D(uMap,uv).rgb;
  vec3 N=normalize(vN),V=normalize(cameraPosition-vW),L=normalize(-vW);
  float nl=dot(N,L),day=smoothstep(-.12,.65,nl),rim=pow(1.-max(dot(N,V),0.),3.5);
  float relief=fbm(vP*95.);float grain=mix(.91+relief*.18,1.,uGas);
  float fill=.30+.12*pow(max(dot(N,V),0.),.8);
  vec3 color=albedo*grain*(fill+.72*day); // navigation fill reveals the night hemisphere while retaining the terminator
  float sea=smoothstep(.025,.16,albedo.b-albedo.r)*uOcean;
  float spec=pow(max(dot(N,normalize(L+V)),0.),65.)*sea*day;
  color+=vec3(.62,.80,.94)*spec*.45;
  float city=max(0.,albedo.r-albedo.b)*smoothstep(.17,.44,albedo.r);
  color+=vec3(1.,.61,.24)*city*2.4*uCity*(1.-day);
  color+=uAtmo*rim*(.18+day*.65);
  gl_FragColor=vec4(color,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
}

export function celestialBackdrop(texture:THREE.Texture){
 return new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{uRes:{value:new THREE.Vector2(1,1)},uMap:{value:texture},uTint:{value:new THREE.Vector3(.22,.45,1)}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy, .999,1.);}',
 fragmentShader:`varying vec2 vUv;uniform vec2 uRes;uniform sampler2D uMap;uniform vec3 uTint;
 void main(){vec2 uv=vUv;float aspect=uRes.x/uRes.y;uv.x=(uv.x-.5)*min(1.,aspect/2.)+.5;uv.y=(uv.y-.5)*min(1.,2./aspect)+.5;
 vec3 source=texture2D(uMap,uv).rgb;float l=max(max(source.r,source.g),source.b);vec3 c=mix(source, l*uTint,.86)*.72+uTint*.003;c*=1.-.25*smoothstep(.25,.75,length(vUv-.5));gl_FragColor=vec4(c,1.);
 #include <colorspace_fragment>
 }`}));
}


// Keep the shared production material unchanged; preview navigation gets a soft
// camera-side fill so Pyro/Nyx bodies remain readable at every viewing angle.
export function navigationPlanetMaterial(name:string,type:string){
 const material=planetMaterial(name,type);
 material.fragmentShader=material.fragmentShader.replace('gl_FragColor=vec4(lit+emis,1.);','lit+=col*(.30+.12*pow(max(dot(N,V),0.),.8));gl_FragColor=vec4(lit+emis,1.);');
 return material;
}

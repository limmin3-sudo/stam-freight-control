import * as THREE from 'three';
import {loungeTourStops} from './lounge-tour-content';
import deskPhoto from '../../../docs/cinematics/desk-cinema-25d-20261113/assets/desk-clean.png';
import deskPerson from '../../../docs/cinematics/desk-cinema-25d-20261113/assets/guide-cutout.png';
import loungePhoto from './assets/lounge-original-composite.png';
import cinemaPhoto from '../../../docs/cinematics/desk-cinema-25d-20261113/assets/cinema-approach.png';
import escort from '../../../docs/cinematics/lounge-tour-20261114/assets/guide-escort.png';
import cinema from '../../../docs/cinematics/lounge-tour-20261114/assets/guide-cinema.png';
import archive from '../../../docs/cinematics/lounge-tour-20261114/assets/guide-archive.png';
import service from '../../../docs/cinematics/lounge-tour-20261114/assets/guide-service.png';
import waiting from '../../../docs/cinematics/lounge-tour-20261114/assets/guide-waiting.png';

export const tourGuideImages={escort,cinema,archive,service,waiting};
const sources={deskPhoto,deskPerson,loungePhoto,cinemaPhoto,...tourGuideImages};
const W=1672,H=941,aspect=W/H,fov=42,tan=Math.tan(THREE.MathUtils.degToRad(fov/2));
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=(a:number,b:number,t:number)=>{const n=clamp((t-a)/(b-a));return n*n*(3-2*n);};
const point=(x:number,y:number,d:number)=>new THREE.Vector3((x/W*2-1)*d*tan*aspect,(1-y/H*2)*d*tan,-d);
type Card={mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;shadow:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>};

function photo(texture:THREE.Texture){return new THREE.ShaderMaterial({uniforms:{map:{value:texture}},vertexShader:`varying vec3 ref;void main(){ref=vec3(position.x/${tan*aspect},position.y/${tan},-position.z);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:'uniform sampler2D map;varying vec3 ref;void main(){vec2 uv=vec2(ref.x/ref.z,ref.y/ref.z)*.5+.5;gl_FragColor=texture2D(map,uv);\n#include <colorspace_fragment>\n}',transparent:true,depthWrite:false});}
function relief(scene:THREE.Scene,texture:THREE.Texture,far=15,near=6,horizon=.54){
 const positions:number[]=[],indices:number[]=[],cols=90,rows=50;
 for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){const y=r/rows,d=far-(far-near)*smooth(horizon,1,y);positions.push(...point(c/cols*W,y*H,d).toArray());}
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const a=r*(cols+1)+c,b=a+1,z=a+cols+1;indices.push(a,z,b,b,z,z+1);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
 const mesh=new THREE.Mesh(geometry,photo(texture));mesh.frustumCulled=false;scene.add(mesh);
}
function card(scene:THREE.Scene,texture:THREE.Texture,x:number,y:number,h:number):Card{
 const depth=15-9*smooth(.54,1,y/H),foot=point(x,y,depth),height=h/H*2*depth*tan,ratio=texture.image.width/texture.image.height;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(height*ratio,height),new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.025,depthWrite:false}));mesh.position.copy(foot);mesh.position.y+=height/2;mesh.renderOrder=3;scene.add(mesh);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d')!;
 const gradient=ctx.createRadialGradient(32,32,2,32,32,32);gradient.addColorStop(0,'#0006');gradient.addColorStop(.5,'#0002');gradient.addColorStop(1,'#0000');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(height*.4,height*.15),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false,side:THREE.DoubleSide}));shadow.position.copy(foot);shadow.rotation.x=-Math.PI/2;scene.add(shadow);return {mesh,shadow};
}
function opacity(sprite:Card,n:number){sprite.mesh.material.opacity=n;sprite.mesh.visible=n>.002;sprite.shadow.material.opacity=n;sprite.shadow.visible=n>.002;}

// Canvas-only adapter: owns GPU resources, never routes, reads storage, mounts
// app DOM, plays a video or touches flight data. Scene sources keep their ratio.
export async function createLoungeTourRenderer(host:HTMLElement){
 const textures={} as Record<keyof typeof sources,THREE.Texture>;
 const results=await Promise.allSettled(Object.entries(sources).map(async([key,url])=>{const texture=await new THREE.TextureLoader().loadAsync(url);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;textures[key as keyof typeof sources]=texture;}));
 if(results.some(r=>r.status==='rejected')){Object.values(textures).forEach(t=>t.dispose());throw new Error('Tour images could not load');}
 let renderer:THREE.WebGLRenderer;
 try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch(error){Object.values(textures).forEach(t=>t.dispose());throw error;}
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor('#07111a');renderer.toneMapping=THREE.NoToneMapping;host.append(renderer.domElement);
 const scenes=[new THREE.Scene(),new THREE.Scene(),new THREE.Scene()] as const;
 const cameras=scenes.map(()=>{const c=new THREE.PerspectiveCamera(fov,aspect,.05,100);c.lookAt(0,0,-15);return c;});
 relief(scenes[0],textures.deskPhoto,14,7,.64);
 const depth=4.6;scenes[0].add(new THREE.Mesh(new THREE.PlaneGeometry(depth*tan*aspect*2,depth*tan*2).translate(0,0,-depth),photo(textures.deskPerson)));
 relief(scenes[1],textures.loungePhoto);relief(scenes[2],textures.cinemaPhoto,14,7,.70);
 const leader=card(scenes[1],textures.escort,1250,750,335);
 const presenters=loungeTourStops.map(s=>card(scenes[1],textures[s.guide],...s.foot,s.height));
 card(scenes[2],textures.cinema,1125,823,450);
 const targets=scenes.map(()=>new THREE.WebGLRenderTarget(16,16)),blendScene=new THREE.Scene(),blendCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 const blendMaterial=new THREE.ShaderMaterial({uniforms:{a:{value:targets[0]!.texture},b:{value:targets[1]!.texture},mix0:{value:0}},vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform sampler2D a;uniform sampler2D b;uniform float mix0;varying vec2 uv0;void main(){gl_FragColor=mix(texture2D(a,uv0),texture2D(b,uv0),mix0);\n#include <colorspace_fragment>\n}'});
 blendScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),blendMaterial));
 let disposed=false,scale=1;
 function resize(quality=scale){if(disposed)return;scale=quality;renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)*scale);renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight));const size=renderer.getDrawingBufferSize(new THREE.Vector2());targets.forEach(t=>t.setSize(size.x,size.y));}
 function blend(a:number,b:number,mix:number){
  if(mix<=0||mix>=1){const i=mix<=0?a:b;renderer.setRenderTarget(null);renderer.render(scenes[i]!,cameras[i]!);return;}
  for(const i of[a,b]){renderer.setRenderTarget(targets[i]!);renderer.render(scenes[i]!,cameras[i]!);}
  blendMaterial.uniforms.a!.value=targets[a]!.texture;blendMaterial.uniforms.b!.value=targets[b]!.texture;blendMaterial.uniforms.mix0!.value=mix;renderer.setRenderTarget(null);renderer.render(blendScene,blendCamera);
 }
 function render(index:number,time:number){
  if(disposed)return {left:60,top:25};
  const stop=loungeTourStops[index]!,p=smooth(1,7.6,time),previous=index===0?836:loungeTourStops[index-1]!.focus,cx=THREE.MathUtils.lerp(previous,stop.focus,p);
  const cam=cameras[1]!,horizontalLimit=Math.atan(tan*aspect),turn=Math.atan((cx/W*2-1)*tan*aspect),safeFov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(horizontalLimit-Math.abs(turn)-.035)/aspect));
  cam.position.set(0,0,0);cam.fov=Math.min(THREE.MathUtils.lerp(index===0?42:28,28,p),safeFov);cam.lookAt(point(cx,H/2,15));cam.updateProjectionMatrix();
  presenters.forEach((g,i)=>opacity(g,i===index?smooth(5,5.3,time):0));
  const leaderFoot=point(index===0?1250:(previous+stop.focus)/2,750,15-9*smooth(.54,1,750/H));leader.mesh.position.x=leaderFoot.x;leader.mesh.position.z=leaderFoot.z;leader.shadow.position.x=leaderFoot.x;leader.shadow.position.z=leaderFoot.z;opacity(leader,1-smooth(4.65,5,time));
  cameras[0]!.position.set(.4*smooth(.6,2.8,time),0,.3*smooth(.6,2.8,time));cameras[0]!.lookAt(.7*smooth(.6,2.8,time),0,-14);
  const near=smooth(6.3,8.3,time);cameras[2]!.position.set(.1*near,0,-.5*near);cameras[2]!.lookAt(.4*near,-.04,-14);
  if(index===0&&time<3.6)blend(0,1,smooth(1.5,3.6,time));else if(index===0)blend(1,2,smooth(6.3,7.4,time));else{renderer.setRenderTarget(null);renderer.render(scenes[1],cam);}
  const anchors=[[1510,470],[1254,470],[920,450],[690,500]] as const;
  const coordinates=anchors[index]!;
  const anchor=index===0&&time>7.4?point(1390,320,14).project(cameras[2]!):point(coordinates[0],coordinates[1],15).project(cam);
  return {left:clamp((anchor.x+1)*50-9,12,72),top:clamp((1-anchor.y)*50-25,8,54)};
 }
 function dispose(){if(disposed)return;disposed=true;const maps=new Set<THREE.Texture>(Object.values(textures));[...scenes,blendScene].forEach(scene=>scene.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach((material:THREE.Material&{map?:THREE.Texture})=>{if(material.map)maps.add(material.map);material.dispose();});}}));maps.forEach(t=>t.dispose());targets.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}
 resize();return {render,resize,dispose,canvas:renderer.domElement};
}

import * as THREE from 'three';

// Small HDR bloom pipeline: scene → half-float target, bright pass, blurred mip chain, ACES tone map.
// Written for this app so no extra library files are needed.
const VERT='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
export function createBloom(renderer,{strength=.95,threshold=1.0,knee=.6,levels=5}={}){
 const quadScene=new THREE.Scene(),quadCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2));quad.frustumCulled=false;quadScene.add(quad);
 const mat=(frag,uniforms)=>new THREE.ShaderMaterial({uniforms,vertexShader:VERT,fragmentShader:frag,depthTest:false,depthWrite:false});
 const bright=mat(`uniform sampler2D t;uniform float th;uniform float kn;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb;float l=max(c.r,max(c.g,c.b));float s=clamp(l-th+kn,0.,2.*kn);s=s*s/(4.*kn+1e-4);float w=max(s,l-th)/max(l,1e-4);gl_FragColor=vec4(c*w,1.);}`,{t:{value:null},th:{value:threshold},kn:{value:knee}});
 const blur=mat(`uniform sampler2D t;uniform vec2 dir;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb*.227027;c+=texture2D(t,vUv+dir*1.3846).rgb*.316216;c+=texture2D(t,vUv-dir*1.3846).rgb*.316216;c+=texture2D(t,vUv+dir*3.2308).rgb*.070270;c+=texture2D(t,vUv-dir*3.2308).rgb*.070270;gl_FragColor=vec4(c,1.);}`,{t:{value:null},dir:{value:new THREE.Vector2()}});
 const copy=mat(`uniform sampler2D t;varying vec2 vUv;void main(){gl_FragColor=texture2D(t,vUv);}`,{t:{value:null}});
 const comp=mat(`uniform sampler2D scene;uniform sampler2D m0;uniform sampler2D m1;uniform sampler2D m2;uniform sampler2D m3;uniform sampler2D m4;uniform float strength;uniform float exposure;varying vec2 vUv;
 vec3 aces(vec3 x){x*=exposure;return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}vec3 srgb(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
 void main(){vec3 s=texture2D(scene,vUv).rgb;vec3 b=texture2D(m0,vUv).rgb*.9+texture2D(m1,vUv).rgb*.85+texture2D(m2,vUv).rgb*.75+texture2D(m3,vUv).rgb*.65+texture2D(m4,vUv).rgb*.6;gl_FragColor=vec4(srgb(aces(s+b*strength)),1.);}`,{scene:{value:null},m0:{value:null},m1:{value:null},m2:{value:null},m3:{value:null},m4:{value:null},strength:{value:strength},exposure:{value:1.05}});
 let w=0,h=0,sceneRT=null,mips=[];
 const make=(W,H,samples=0)=>new THREE.WebGLRenderTarget(W,H,{type:THREE.HalfFloatType,samples,depthBuffer:samples>0,colorSpace:THREE.NoColorSpace});
 function resize(){const size=renderer.getDrawingBufferSize(new THREE.Vector2());if(size.x===w&&size.y===h)return;w=size.x;h=size.y;sceneRT?.dispose();mips.forEach(m=>{m.a.dispose();m.b.dispose();});sceneRT=make(w,h,4);mips=[];let mw=Math.max(1,w>>1),mh=Math.max(1,h>>1);for(let i=0;i<levels;i++){mips.push({a:make(mw,mh),b:make(mw,mh),w:mw,h:mh});mw=Math.max(1,mw>>1);mh=Math.max(1,mh>>1);}}
 function pass(material,target){quad.material=material;renderer.setRenderTarget(target);renderer.render(quadScene,quadCam);}
 return {strength:v=>comp.uniforms.strength.value=v,render(scene,camera){resize();const tm=renderer.toneMapping;renderer.toneMapping=THREE.NoToneMapping;
   renderer.setRenderTarget(sceneRT);renderer.clear();renderer.render(scene,camera);
   const on=comp.uniforms.strength.value>0;if(on){bright.uniforms.t.value=sceneRT.texture;pass(bright,mips[0].a);}
   if(on)for(let i=0;i<mips.length;i++){const m=mips[i];if(i>0){copy.uniforms.t.value=mips[i-1].a.texture;pass(copy,m.a);}blur.uniforms.t.value=m.a.texture;blur.uniforms.dir.value.set(1/m.w,0);pass(blur,m.b);blur.uniforms.t.value=m.b.texture;blur.uniforms.dir.value.set(0,1/m.h);pass(blur,m.a);}
   comp.uniforms.scene.value=sceneRT.texture;mips.forEach((m,i)=>comp.uniforms['m'+i].value=m.a.texture);pass(comp,null);renderer.toneMapping=tm;}};
}

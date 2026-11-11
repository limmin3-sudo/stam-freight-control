import * as THREE from 'three';

/** Independent alpha VFX artwork. Its receiver follows the actual outer orbit;
 * all bodies, stations and routes remain live scene geometry. Originals are retained. */
export function tableProjection(texture:THREE.Texture){return new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uStrength:{value:.72},uArtwork:{value:texture},uOrbit:{value:new THREE.Vector4(.5,.5,.44,.32)}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.99,1.);}',fragmentShader:`
 varying vec2 vUv;uniform float uTime,uStrength;uniform vec4 uOrbit;uniform sampler2D uArtwork;uniform vec3 uBodyMasks[8];uniform float uDpr;
 void main(){
  // Anchor the source to the pedestal and fit the illustrated receiving ellipse
  // to microTech's projected orbit. Never bake the interactive map into the layer.
  float front=uOrbit.y-uOrbit.w;
  float y=vUv.y<front?mix(.06,.33,(vUv.y-.018)/max(.02,front-.018)):.58+(vUv.y-uOrbit.y)*.25/max(.02,uOrbit.w);
  vec2 uv=vec2(.5+(vUv.x-uOrbit.x)*.43/max(.02,uOrbit.z),y);
  if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))discard;
  vec4 art=texture2D(uArtwork,uv);
  float visibility=1.;
  for(int i=0;i<8;i++){visibility*=smoothstep(uBodyMasks[i].z*.88,uBodyMasks[i].z*1.1,distance(gl_FragCoord.xy/uDpr,uBodyMasks[i].xy));}
  float breath=.985+.015*sin(uTime*.55);
  gl_FragColor=vec4(art.rgb,art.a*uStrength*breath*visibility*smoothstep(0.,.01,vUv.y));
  #include <colorspace_fragment>
 }` }));}

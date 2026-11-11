import * as THREE from 'three';

/** The table's projected light is room-only; it is not the discarded UI projector. */
export function tableProjection(){return new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uStrength:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.99,1.);}',fragmentShader:`
 varying vec2 vUv;uniform float uTime,uStrength;
 void main(){float y=vUv.y;float x=abs(vUv.x-.5);float width=.06+y*.5;float cone=1.-smoothstep(width*.7,width,x);float slope=(vUv.x-.5)/max(y,.025);float shafts=pow(.5+.5*sin(slope*88.+uTime*.035),16.)*.12+pow(.5+.5*sin(slope*151.),32.)*.045;
 float base=exp(-y*34.)*exp(-pow((vUv.x-.5)*13.,4.));float fade=pow(1.-smoothstep(.05,.98,y),1.6);float a=(cone*(.08+shafts)*fade+base*.9)*smoothstep(0.,.018,y)*uStrength;gl_FragColor=vec4(.18,.72,1.,a);}` }));}

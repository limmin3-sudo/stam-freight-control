import * as THREE from '/apps/control-room/node_modules/three/build/three.module.js';

const $=id=>document.getElementById(id);
const viewer=$('viewer'),canvasHost=$('world'),duration=16;
const root='/apps/control-room/src/assets/';
const W=1672,H=941,aspect=W/H,fov=42,tan=Math.tan(THREE.MathUtils.degToRad(fov/2));
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,t)=>{const p=clamp((t-a)/(b-a));return p*p*(3-2*p);};
let renderer,scenes,cameras,targets,blendScene,blendCamera,blendMaterial;
let guideMesh,leadingGuide,entranceGuide,ready=false,time=0,playing=false,raf=0,last=0,voice=false,spoken=-1;
let frameSamples=[],lastRender=0,draws=0,quality=1,minimumQuality=1,slowFrames=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const lines=[
 {at:.1,until:3.6,text:'셔틀 출발 전에 잠깐 둘러볼까요? 먼저 시네마로 가시죠.'},
 {at:4,until:8.4,text:'이쪽이에요. 제가 앞에서 안내해 드릴게요. 먼저 시네마부터 보시죠.'},
 {at:10.9,until:16.1,text:'이곳에서는 준비된 영상을 감상하실 수 있어요. 둘러보실 시간은 나중에 드릴게요. 지금은 셔틀 시간에 맞춰 움직이시죠.'},
];
const phase=t=>t<.02?'ready':t<2?'departing':t<8.6?'travelling':t<10.7?'approaching':t<11.1?'ignition':'cinema';

function projectPoint(x,y,d){return new THREE.Vector3((x/W*2-1)*d*tan*aspect,(1-y/H*2)*d*tan,-d);}
// Source photographs are projected onto surfaces at different depths. The
// reference projection keeps each layer registered at its starting viewpoint.
// This is a shallow photographic set, not an inferred full room model.
function photoMaterial(texture){return new THREE.ShaderMaterial({
 uniforms:{map:{value:texture},fade:{value:1},ratio:{value:aspect},tanHalf:{value:tan}},
 vertexShader:'varying vec3 ref;uniform float ratio;uniform float tanHalf;void main(){ref=vec3(position.x/(tanHalf*ratio),position.y/tanHalf,-position.z);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform sampler2D map;uniform float fade;varying vec3 ref;void main(){vec2 uv=ref.xy/ref.z*.5+.5;gl_FragColor=texture2D(map,uv);gl_FragColor.a*=fade;if(gl_FragColor.a<.005)discard;\n#include <colorspace_fragment>\n}',
 transparent:true,depthWrite:true,side:THREE.DoubleSide,
 });}
function polygon(scene,texture,points,depth){
 const pts=points.map(p=>new THREE.Vector2(p[0],-p[1]));
 const indices=THREE.ShapeUtils.triangulateShape(pts,[]).flat();
 const vertices=points.map((p,i)=>projectPoint(p[0],p[1],Array.isArray(depth)?depth[i]:depth));
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flatMap(p=>[p.x,p.y,p.z]),3));geo.setIndex(indices);geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,photoMaterial(texture));mesh.frustumCulled=false;scene.add(mesh);return mesh;
}
const rect=[[0,0],[W,0],[W,H],[0,H]];
function plane(scene,texture,depth){return polygon(scene,texture,rect,depth);}
function relief(scene,texture,far,near,horizon){
 const cols=100,rows=58,positions=[],indices=[];
 for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
  const y=row/rows,x=col/cols,depth=far-(far-near)*smooth(horizon,1,y);
  const p=projectPoint(x*W,y*H,depth);positions.push(p.x,p.y,p.z);
 }
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const a=row*(cols+1)+col,b=a+1,c=a+cols+1,d=c+1;indices.push(a,c,b,b,c,d);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
 const mesh=new THREE.Mesh(geometry,photoMaterial(texture));mesh.frustumCulled=false;scene.add(mesh);return mesh;
}
// Full-body cards keep the source aspect ratio and a fixed world-space foot
// contact. The camera follows them; the planted poses are not slid over the floor.
function guideAhead(scene,texture,x,footY,pixelHeight,far,near,horizon){
 const depth=far-(far-near)*smooth(horizon,1,footY/H),foot=projectPoint(x,footY,depth);
 const height=pixelHeight/H*2*depth*tan,width=height*texture.image.width/texture.image.height;
 const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.02,depthWrite:false});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
 mesh.position.copy(foot);mesh.position.y+=height/2;mesh.renderOrder=3;scene.add(mesh);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d');
 const gradient=ctx.createRadialGradient(32,32,2,32,32,32);gradient.addColorStop(0,'rgba(0,0,0,.4)');gradient.addColorStop(.45,'rgba(0,0,0,.17)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(height*.38,height*.16),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false,side:THREE.DoubleSide}));
 shadow.position.copy(foot);shadow.position.y-=.005;shadow.rotation.x=-Math.PI/2;shadow.renderOrder=2;scene.add(shadow);
 return {mesh,shadow,foot,pixelHeight,sourceAspect:texture.image.width/texture.image.height};
}
function makeCamera(){const c=new THREE.PerspectiveCamera(fov,aspect,.05,100);c.position.set(0,0,0);c.lookAt(0,0,-12);return c;}

async function init(){
 try{
  const loader=new THREE.TextureLoader();
  // Use the current app's composite: archival lounge-original.png still has
  // the discarded central terminal and must never be used for this scene.
  const urls=['./assets/desk-clean.png','./assets/guide-cutout.png',root+'lounge-original-composite.png','./assets/cinema-approach.png','./assets/guide-leading.png','./assets/guide-entrance.png'];
  const textures=await Promise.all(urls.map(url=>loader.loadAsync(url)));
  textures.forEach(texture=>{texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;});
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor('#02070b');renderer.toneMapping=THREE.NoToneMapping;
  canvasHost.append(renderer.domElement);renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();pause();$('status').textContent='화면이 중단됐습니다. 새로고침해서 다시 열어 주세요.';});
  scenes=[new THREE.Scene(),new THREE.Scene(),new THREE.Scene()];cameras=scenes.map(makeCamera);
  // Continuous depth surfaces avoid exposing hard seams between floor cards.
  // The depth is deliberately shallow: no invisible room geometry is invented.
  relief(scenes[0],textures[0],14,7,.64);
  guideMesh=plane(scenes[0],textures[1],4.6);
  relief(scenes[1],textures[2],15,6,.54);
  relief(scenes[2],textures[3],14,7,.70);
  leadingGuide=guideAhead(scenes[1],textures[4],1260,720,330,15,6,.54);
  entranceGuide=guideAhead(scenes[2],textures[5],1125,823,450,14,7,.70);
  targets=scenes.map(()=>new THREE.WebGLRenderTarget(16,16,{depthBuffer:true}));
  blendScene=new THREE.Scene();blendCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  blendMaterial=new THREE.ShaderMaterial({uniforms:{a:{value:targets[0].texture},b:{value:targets[1].texture},c:{value:targets[2].texture},ab:{value:0},bc:{value:0}},vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform sampler2D a;uniform sampler2D b;uniform sampler2D c;uniform float ab;uniform float bc;varying vec2 uv0;void main(){gl_FragColor=mix(mix(texture2D(a,uv0),texture2D(b,uv0),ab),texture2D(c,uv0),bc);\n#include <colorspace_fragment>\n}'});
  blendScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),blendMaterial));
  new ResizeObserver(resize).observe(viewer);resize();
  ready=true;$('loading').hidden=true;$('play').disabled=false;$('scrub').disabled=false;$('skip').disabled=false;$('status').textContent='가이드의 안내를 시작해 보세요';
  render(0);window.__tour.ready=true;
 }catch(error){$('loading').textContent='시안을 열지 못했습니다. 이 페이지의 전용 미리보기 서버로 다시 열어 주세요.';$('status').textContent='불러오기 실패';console.error(error);}
}
function resize(){if(!renderer)return;renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)*quality);const width=viewer.clientWidth,height=width/aspect;renderer.setSize(width,height);const size=renderer.getDrawingBufferSize(new THREE.Vector2());targets.forEach(target=>target.setSize(size.x,size.y));if(ready)render(time);}
function world(t){
 const leave=smooth(1.25,4.3,t),walk=smooth(3.7,8.8,t),near=smooth(8.2,10.7,t);
 cameras[0].position.set(.45*leave,.018*Math.sin(leave*Math.PI),.4*leave);
 cameras[0].lookAt(.8*leave,.03,-14);
 guideMesh.material.uniforms.fade.value=1-smooth(2.3,3.4,t);
 cameras[1].position.set(.55*walk,-.025*walk,-1.6*walk);
 cameras[1].lookAt(2.5*walk,-.1*walk,-15);
 cameras[1].fov=fov-6*walk;cameras[1].updateProjectionMatrix();
 cameras[2].position.set(.2*near,-.015*near,-.75*near);cameras[2].lookAt(.7*near,-.07,-14);
 blendMaterial.uniforms.ab.value=smooth(2.7,4.15,t);blendMaterial.uniforms.bc.value=smooth(7.4,8.5,t);
 const ab=blendMaterial.uniforms.ab.value,bc=blendMaterial.uniforms.bc.value;
 const needed=bc>=1?[2]:bc>0?[1,2]:ab>=1?[1]:ab>0?[0,1]:[0];
 if(needed.length===1){renderer.setRenderTarget(null);renderer.render(scenes[needed[0]],cameras[needed[0]]);}
 else{for(const i of needed){renderer.setRenderTarget(targets[i]);renderer.render(scenes[i],cameras[i]);}renderer.setRenderTarget(null);renderer.render(blendScene,blendCamera);}
 // Inspectable evidence: front/back camera projection is calculated separately.
 const g=projectPoint(1100,360,4.6).project(cameras[0]);const bg=projectPoint(1100,360,14).project(cameras[0]);
 window.__tour.parallax={guideX:g.x,backgroundX:bg.x,delta:g.x-bg.x};
 window.__tour.guideAssets={leading:leadingGuide.sourceAspect,entrance:entranceGuide.sourceAspect,leadingRenderedAspect:leadingGuide.mesh.geometry.parameters.width/leadingGuide.mesh.geometry.parameters.height,entranceRenderedAspect:entranceGuide.mesh.geometry.parameters.width/entranceGuide.mesh.geometry.parameters.height,leadingWorldPosition:leadingGuide.mesh.position.toArray(),entranceWorldPosition:entranceGuide.mesh.position.toArray()};
}
function describe(t){
 const current=lines.findIndex(line=>t>=line.at&&t<line.until);
 $('guide-caption').hidden=current<0;
 if(current>=0&&$('caption-text').textContent!==lines[current].text)$('caption-text').textContent=lines[current].text;
 $('next-stop').hidden=t<13.6;
 if(playing&&voice&&current>=0&&current!==spoken){spoken=current;speak(lines[current].text);}
 if(current<0)spoken=-1;
}
function render(t){
 time=clamp(t,0,duration);if(time<11.2||!draws)world(time);draws++;const p=phase(time);viewer.dataset.phase=p;
 const close=smooth(.65,1.45,time);$('desk-panel').style.transform=`translateX(${-115*close}%)`;$('desk-panel').style.opacity=1-close;
 $('desk-panel').inert=time>.65;
 $('scene-heading').style.opacity=1-smooth(.15,.8,time);
 $('destination').style.opacity=smooth(3.9,4.5,time)*(1-smooth(9.9,10.2,time));
 const wideMark=projectPoint(1510,470,15).project(cameras[1]),nearMark=projectPoint(1390,320,14).project(cameras[2]),mix=smooth(7.4,8.5,time);
 $('destination').style.left=`${clamp(THREE.MathUtils.lerp((wideMark.x+1)*50,(nearMark.x+1)*50,mix),45,94)}%`;
 const markerTop=clamp(THREE.MathUtils.lerp((1-wideMark.y)*50,(1-nearMark.y)*50,mix),18,63);
 $('destination').style.top=`${markerTop}%`;
 if(viewer.clientWidth<=760){const anchorY=markerTop/100*viewer.clientWidth/aspect;$('destination').style.setProperty('--label-top',`${Math.max(8,anchorY-92)-anchorY}px`);}else $('destination').style.removeProperty('--label-top');
 window.__tour.guideStage=time<3?'desk':time<7.9?'ahead':time<11.1?'entrance':'screen';
 const dark=smooth(10.15,10.65,time);$('blackout').style.opacity=dark;
 $('standby').style.opacity=smooth(10.45,10.7,time)*(1-smooth(10.92,11.15,time));
 const live=smooth(10.95,11.2,time);$('live-cinema').style.opacity=live;
 $('live-cinema').classList.toggle('visible',live>.99);$('live-cinema').inert=live<.99;
 if(time>8&&!$('live-cinema').src){$('live-cinema').src=$('live-cinema').dataset.src;}
 const flash=time>=10.95&&time<=11.2?Math.sin((time-10.95)/.25*Math.PI)*(time<11.08?.8:.35):0;$('plasma').style.opacity=flash;
 const portrait=smooth(11.1,11.7,time);$('guide-portrait').style.display=portrait>0?'block':'none';$('guide-portrait').style.opacity=portrait;$('guide-portrait').style.transform=`translateX(${(1-portrait)*30}%)`;
 describe(time);$('scrub').value=time;$('time').textContent=time.toFixed(1).padStart(4,'0')+' / 16.0';
 $('route-desk').classList.toggle('active',time<3);$('route-travel').classList.toggle('active',time>=3&&time<10.9);$('route-cinema').classList.toggle('active',time>=10.9);
 window.__tour.time=time;window.__tour.phase=p;window.__tour.draws=draws;
}
function tick(now){if(!playing)return;const elapsed=now-last;const dt=Math.min(elapsed/1000,.1);last=now;if(time<10.5&&quality===1){slowFrames=elapsed>48?slowFrames+1:0;if(slowFrames>=3){quality=.65;minimumQuality=Math.min(minimumQuality,quality);resize();}}time=Math.min(time+dt,duration);if(lastRender&&time<11.2)frameSamples.push(now-lastRender);lastRender=now;render(time);if(time>=duration){pause(false);$('status').textContent='시네마 도착 · 화면에서 안내를 이어갑니다';return;}raf=requestAnimationFrame(tick);}
function play(){if(!ready)return;if(time>=duration)seek(0);if(reduced&&time<10.9){seek(14);$('status').textContent='동작 줄이기 설정으로 도착 화면을 표시합니다';return;}playing=true;slowFrames=0;last=performance.now();lastRender=0;$('pause').disabled=false;$('pause').textContent='일시정지';$('play').textContent='안내 중';$('play').disabled=true;$('status').textContent='셔틀 출발 전, 가이드와 시네마로';raf=requestAnimationFrame(tick);}
function pause(stopSpeech=true){playing=false;cancelAnimationFrame(raf);if(quality!==1){quality=1;resize();}if(stopSpeech)spoken=-1;$('play').disabled=!ready;$('play').textContent=time>=duration?'다시 따라가기 →':'가이드 따라가기 →';$('pause').disabled=!ready;$('pause').textContent='계속 보기';if(stopSpeech&&'speechSynthesis'in window)speechSynthesis.cancel();}
function seek(t){pause();spoken=-1;render(t);$('status').textContent=time>=11.2?'시네마 실제 화면':'장면 확인 중';}
function speak(text){if(!('speechSynthesis'in window))return;speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='ko-KR';utterance.rate=1.08;const candidate=speechSynthesis.getVoices().find(v=>v.lang.startsWith('ko'));if(candidate)utterance.voice=candidate;speechSynthesis.speak(utterance);}
document.querySelectorAll('[data-start]').forEach(button=>button.addEventListener('click',play));
$('play').addEventListener('click',play);$('pause').addEventListener('click',()=>playing?(pause(),$('status').textContent='일시정지'):play());
$('replay').addEventListener('click',()=>{seek(0);$('arrival-note').hidden=true;$('status').textContent='안내 데스크';});
$('skip').addEventListener('click',()=>seek(14));$('scrub').addEventListener('input',event=>seek(Number(event.target.value)));
$('leave-desk').addEventListener('click',play);
$('voice').addEventListener('click',()=>{if(!('speechSynthesis'in window)){$('status').textContent='이 브라우저에서는 자막으로 안내합니다';return;}const voices=speechSynthesis.getVoices();if(!voices.some(v=>v.lang.startsWith('ko'))){$('status').textContent='한국어 음성이 없어 자막으로 안내합니다';return;}voice=!voice;$('voice').setAttribute('aria-pressed',String(voice));$('voice').textContent=voice?'안내 음성 끄기':'안내 음성 켜기';if(!voice)speechSynthesis.cancel();else{spoken=-1;if(!playing)speak('셔틀 출발 전에 시네마부터 간단히 안내해 드릴게요.');}});
$('next-stop').addEventListener('click',()=>{$('arrival-note').hidden=false;$('arrival-note').textContent='시네마 소개는 여기까지예요. 다음은 아카이브로 안내해 드릴게요. (이번 시안은 여기서 끝납니다.)';});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){pause();$('status').textContent='창을 벗어나 안내를 일시정지했습니다';}});
window.addEventListener('keydown',event=>{if(event.target.closest('input,button,iframe'))return;if(event.code==='Space'){event.preventDefault();playing?pause():play();}if(event.key==='Escape'){if(playing)pause();$('arrival-note').hidden=true;}});
window.addEventListener('pagehide',()=>{pause();targets?.forEach(target=>target.dispose());scenes?.forEach(scene=>scene.traverse(object=>{object.geometry?.dispose();if(object.material){object.material.uniforms?.map?.value.dispose();object.material.map?.dispose();object.material.dispose();}}));renderer?.dispose();});
window.__tour={ready:false,time:0,phase:'loading',draws:0,seek,play,pause,metrics:()=>({draws,frameSamples,playing,minimumQuality,webgl:!!renderer,videoElements:document.querySelectorAll('video').length})};
init();

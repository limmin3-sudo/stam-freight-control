import * as THREE from '/apps/control-room/node_modules/three/build/three.module.js';
import {createPhotoWalkRig} from './photo-walk-rig.js';
const $=id=>document.getElementById(id),stage=$('walk-stage');
let renderer,scene,camera,rig,photo,ground,ready=false,time=0,playing=false,last=0,raf=0,loop=false,lounge=false,rest=true,loopTimer=null;
const errors=[],frameIntervals=[];
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
async function init(){
 try{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0,0);renderer.localClippingEnabled=true;stage.prepend(renderer.domElement);
  const loader=new THREE.TextureLoader();const [portrait,background]=await Promise.all([loader.loadAsync('../assets/guide-entrance.png'),loader.loadAsync('/apps/control-room/src/assets/lounge-original-composite.png')]);
  portrait.colorSpace=background.colorSpace=THREE.SRGBColorSpace;
  scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,10000);
  rig=createPhotoWalkRig(THREE,portrait);scene.add(rig.group);
  photo=new THREE.Mesh(new THREE.PlaneGeometry(1672,941),new THREE.MeshBasicMaterial({map:background,depthWrite:false}));photo.position.set(836,470.5,-60);photo.renderOrder=-5;photo.visible=false;scene.add(photo);
  ground=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1800,-8,-20),new THREE.Vector3(2600,-8,-20)]),new THREE.LineBasicMaterial({color:0x91c7d6,transparent:true,opacity:.25}));scene.add(ground);
  const gradient=document.createElement('canvas');gradient.width=gradient.height=64;const c=gradient.getContext('2d'),g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(0,0,0,.35)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,64,64);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(370,35),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(gradient),transparent:true,depthTest:false,depthWrite:false}));shadow.position.set(0,-8,-1);shadow.renderOrder=-1;rig.group.add(shadow);
  rig.shadow=shadow;
  new ResizeObserver(resize).observe(stage);ready=true;resize();$('walk-load').hidden=true;$('walk-play').disabled=false;$('walk-pause').disabled=false;window.__walk.ready=true;
 }catch(error){errors.push(String(error));$('walk-load').textContent='걷기 시험을 열지 못했습니다. 전용 미리보기 서버로 다시 열어 주세요.';console.error(error);}
}
function resize(){
 if(!ready)return;const width=stage.clientWidth,height=stage.clientHeight;renderer.setSize(width,height);
 if(lounge){camera.left=0;camera.right=1672;camera.top=941;camera.bottom=0;camera.position.set(0,0,3000);camera.lookAt(0,0,0);rig.group.scale.setScalar(.19);rig.group.position.set(1090,221,10);}
 else{const heightUnits=2020,widthUnits=heightUnits*width/height,center=495;camera.left=center-widthUnits/2;camera.right=center+widthUnits/2;camera.top=1870;camera.bottom=-150;camera.position.set(0,0,3000);camera.lookAt(0,0,0);rig.group.scale.setScalar(1);rig.group.position.set(0,0,0);}
 camera.updateProjectionMatrix();photo.visible=lounge;ground.visible=!lounge;render(time,rest);
}
function render(t,staticPose=false){
 time=Math.max(0,Math.min(rig.duration,t));rest=staticPose;const pose=rig.update(time,staticPose);rig.shadow.position.x=pose.distance;
 renderer.render(scene,camera);$('walk-time').value=`${time.toFixed(2)} / ${rig.duration.toFixed(2)}초`;
 $('walk-status').textContent=staticPose?'승인된 원래 자세':pose.finished?'세 걸음 · 두 발 접지':'걷기 동작';
 window.__walk.state=pose;window.__walk.time=time;window.__walk.rest=rest;
}
function tick(now){
 if(!playing)return;const elapsed=now-last;if(frameIntervals.length<2000)frameIntervals.push(elapsed);const dt=Math.min(elapsed/1000,.08);last=now;const next=time+dt;
 render(next,false);
 if(next>=rig.duration){if(loop){playing=false;loopTimer=setTimeout(()=>{loopTimer=null;if(loop){render(0,false);play();}},700);}else pause();return;}
 raf=requestAnimationFrame(tick);
}
function play(){if(!ready)return;if(reduced){render(0,true);$('walk-status').textContent='동작 줄이기 설정 · 정지 자세로 표시';return;}if(time>=rig.duration)time=0;playing=true;rest=false;last=performance.now();$('walk-play').disabled=true;$('walk-pause').textContent='일시정지';raf=requestAnimationFrame(tick);}
function pause(){playing=false;cancelAnimationFrame(raf);if(loopTimer!==null){clearTimeout(loopTimer);loopTimer=null;}$('walk-play').disabled=!ready;$('walk-pause').textContent='계속 보기';}
$('walk-play').onclick=play;$('walk-pause').onclick=()=>playing?pause():play();
$('walk-reset').onclick=()=>{pause();loop=false;$('walk-loop').setAttribute('aria-pressed','false');$('walk-loop').textContent='반복 끔';render(0,true);};
$('walk-loop').onclick=()=>{loop=!loop;$('walk-loop').setAttribute('aria-pressed',String(loop));$('walk-loop').textContent=loop?'반복 켬':'반복 끔';if(loop&&!playing){time=0;play();}};
$('walk-backdrop').onclick=()=>{lounge=!lounge;stage.dataset.backdrop=lounge?'lounge':'studio';stage.style.aspectRatio=lounge?'1672 / 941':'';$('walk-backdrop').setAttribute('aria-pressed',String(lounge));$('walk-backdrop').textContent=lounge?'동작 크게 보기':'라운지에서 보기';$('walk-copy').textContent=lounge?'가이드가 앞서서 시네마 방향으로 이동합니다.':'한 발이 바닥을 딛는 동안 다른 발이 앞으로 나가는 동작을 확인합니다.';resize();};
window.addEventListener('keydown',e=>{if(e.target.closest('button,a,input'))return;if(e.code==='Space'){e.preventDefault();playing?pause():play();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('pagehide',()=>{pause();rig?.dispose();renderer?.dispose();});
window.__walk={ready:false,errors,frameIntervals,seek(t){pause();render(t,false);},play,pause,source:'../assets/guide-entrance.png'};
init();

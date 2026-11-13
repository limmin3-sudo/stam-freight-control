import * as THREE from '/apps/control-room/node_modules/three/build/three.module.js';

const $=id=>document.getElementById(id);
const root='/apps/control-room/src/assets/',old='../desk-cinema-25d-20261113/assets/';
const W=1672,H=941,aspect=W/H,fov=42,tan=Math.tan(THREE.MathUtils.degToRad(fov/2)),duration=14;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=(a,b,t)=>{const p=clamp((t-a)/(b-a));return p*p*(3-2*p);};
const lerp=THREE.MathUtils.lerp;
export const stops=[
 {id:'cinema',name:'시네마',code:'CINEMA',detail:'준비된 영상과 소개 콘텐츠',focus:1190,foot:[1260,760],height:340,guide:'cinema',screen:'cinema',text:'여기가 시네마예요. 준비된 영상과 소개 콘텐츠를 감상하실 수 있죠. 자세히 둘러보실 시간은 나중에 드릴게요. 지금은 셔틀 시간에 맞춰 다음으로 가시죠.',travel:'먼저 시네마로 가시죠. 이쪽이에요. 제가 앞에서 안내해 드릴게요.'},
 {id:'archive',name:'아카이브',code:'ARCHIVE',detail:'함선 · 미션 · 화물 자료',focus:1120,foot:[1160,790],height:360,guide:'archive',screen:'information',text:'아카이브에는 함선과 미션, 화물에 관한 자료가 모여 있어요. 운송을 준비하시면서 필요한 내용을 찾아보시면 돼요. 지금은 위치만 기억해 두시고, 서비스센터로 가실까요?',travel:'이번에는 아카이브예요. 시네마 옆에 있으니 금방 도착해요.'},
 {id:'service',name:'서비스센터',code:'SERVICE CENTER',detail:'계정 · 기록 · 이용안내',focus:930,foot:[1000,760],height:350,guide:'service',screen:'service',text:'여기는 서비스센터예요. 계정과 이용 기록, 이용안내 같은 도움말을 확인하실 수 있어요. 필요한 건 나중에 천천히 살펴보시죠. 이제 게이트로 안내해 드릴게요.',travel:'도움이 필요하실 땐 서비스센터를 찾아주세요. 저쪽 중앙이에요.'},
 {id:'gate',name:'탑승 게이트',code:'BOARDING GATE',detail:'셔틀 탑승 전 집결 장소',focus:730,foot:[760,810],height:410,guide:'waiting',screen:null,text:'게이트에 도착했어요. 라운지는 돌아오셔서 천천히 둘러보셔도 돼요. 이제 셔틀에 타실 준비를 하시죠. 탑승 안내도 제가 이어서 도와드릴게요.',travel:'셔틀 출발 전에 맞춰 왔네요. 게이트까지 조금만 더 따라오세요.'},
];

let renderer,wide,desk,near,cameras,targets,blendScene,blendCamera,blendMaterial,deskGuide,escort,nearGuide,presenters;
let ready=false,appReady=false,playing=false,stop=-1,time=0,raf,last=0,manual=false,sceneDraws=0,activeRoute='lounge';
let quality=1,slow=0,menuSeen=new Set(),lastDraw=0,frames=[],menuRequested=null,appObserver;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const sourceAspects={};

function point(x,y,d){return new THREE.Vector3((x/W*2-1)*d*tan*aspect,(1-y/H*2)*d*tan,-d);}
function photo(texture){return new THREE.ShaderMaterial({uniforms:{map:{value:texture},fade:{value:1}},vertexShader:`varying vec3 ref;void main(){ref=vec3(position.x/${tan*aspect},position.y/${tan},-position.z);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:'uniform sampler2D map;uniform float fade;varying vec3 ref;void main(){vec2 uv=vec2(ref.x/ref.z,ref.y/ref.z)*.5+.5;gl_FragColor=texture2D(map,uv)*vec4(1.,1.,1.,fade);\n#include <colorspace_fragment>\n}',transparent:true,depthWrite:false});}
function relief(scene,texture,far=15,near=6,horizon=.54){
 const pos=[],indices=[],cols=90,rows=50;
 for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){const y=r/rows,d=far-(far-near)*smooth(horizon,1,y);pos.push(...point(c/cols*W,y*H,d).toArray());}
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const a=r*(cols+1)+c,b=a+1,z=a+cols+1;indices.push(a,z,b,b,z,z+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(indices);const mesh=new THREE.Mesh(g,photo(texture));mesh.frustumCulled=false;scene.add(mesh);return mesh;
}
function card(scene,texture,x,y,h,id){
 const depth=15-9*smooth(.54,1,y/H),foot=point(x,y,depth),height=h/H*2*depth*tan,ratio=texture.image.width/texture.image.height;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(height*ratio,height),new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.025,depthWrite:false}));mesh.position.copy(foot);mesh.position.y+=height/2;mesh.renderOrder=3;scene.add(mesh);sourceAspects[id]={source:ratio,rendered:mesh.geometry.parameters.width/height,foot:foot.toArray()};
 const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,2,32,32,32);g.addColorStop(0,'#0006');g.addColorStop(.5,'#0002');g.addColorStop(1,'#0000');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(height*.4,height*.15),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,side:THREE.DoubleSide}));shadow.position.copy(foot);shadow.rotation.x=-Math.PI/2;scene.add(shadow);return {mesh,shadow,foot};
}
function opacity(sprite,n){sprite.mesh.material.opacity=n;sprite.mesh.visible=n>.002;sprite.shadow.material.opacity=n;sprite.shadow.visible=n>.002;}
function camera(){const c=new THREE.PerspectiveCamera(fov,aspect,.05,100);c.lookAt(0,0,-15);return c;}
function align(){
 if(!appReady)return;
 try{const d=$('app').contentDocument,top=d.querySelector('.space-topbar')?.getBoundingClientRect().bottom||67,side=d.querySelector('.space-sidebar')?.getBoundingClientRect();const left=side&&side.width&&side.x>=-1&&side.right<$('app').clientWidth*.55?side.right:0;
 $('content-overlay').style.top=top+'px';$('content-overlay').style.left=left+'px';
 }catch{}
 if(renderer){renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)*quality);renderer.setSize($('scene').clientWidth,$('scene').clientHeight);const size=renderer.getDrawingBufferSize(new THREE.Vector2());targets.forEach(t=>t.setSize(size.x,size.y));if(ready&&!playing)draw();}
}
function connectApp(){
 try{const w=$('app').contentWindow,d=w.document;if(!d.querySelector('.space-topbar'))return false;
 appReady=true;d.querySelector('.opening-film button:last-child')?.click();
 if(!d.documentElement.dataset.tourConnected){d.documentElement.dataset.tourConnected='true';d.addEventListener('click',event=>{if(!event.target.closest('.space-sidebar a,.room-brand,.space-menu-toggle'))return;manual=true;pause();$('travel').hidden=true;$('caption').hidden=true;$('portrait').hidden=true;$('blackout').style.opacity=0;$('standby').style.opacity=0;$('plasma').style.opacity=0;$('status').textContent='일반 메뉴를 사용하고 있습니다. 처음부터를 누르면 투어로 돌아옵니다.';});appObserver?.disconnect();appObserver=new MutationObserver(()=>{if(ready&&!playing&&!manual&&time>=9.2)draw();});appObserver.observe(d.getElementById('root'),{childList:true,subtree:true});}
 align();return true;
 }catch{return false;}
}
function appHas(screen){try{const d=$('app').contentDocument;return d.querySelector('.space-experience')?.dataset.screen===screen&&d.querySelector(screen==='cinema'?'.space-cinema':screen==='information'?'.space-information':'.space-service')!==null;}catch{return false;}}
function requestMenu(screen){
 if(!screen||!appReady)return;
 if(menuRequested!==screen){menuRequested=screen;activeRoute=screen;$('app').contentWindow.location.hash=`#/${screen}?lang=ko`;}
 if(appHas(screen))menuSeen.add(screen);
}
function resetMenu(){if(appReady){$('app').contentWindow.location.hash='#/lounge?lang=ko';activeRoute='lounge';menuRequested=null;}}

async function init(){try{
 const urls=[old+'desk-clean.png',old+'guide-cutout.png',root+'lounge-original-composite.png',old+'cinema-approach.png',...['escort','cinema','archive','service','waiting'].map(n=>`./assets/guide-${n}.png`)];
 const textures=await Promise.all(urls.map(url=>new THREE.TextureLoader().loadAsync(url)));textures.forEach(t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;});
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor('#07111a');renderer.toneMapping=THREE.NoToneMapping;$('world').append(renderer.domElement);
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();pause();$('status').textContent='화면이 중단됐습니다. 새로고침해서 다시 열어 주세요.';});
 desk=new THREE.Scene();wide=new THREE.Scene();near=new THREE.Scene();cameras=[camera(),camera(),camera()];
 relief(desk,textures[0],14,7,.64);const d=4.6;deskGuide=new THREE.Mesh(new THREE.PlaneGeometry(d*tan*aspect*2,d*tan*2).translate(0,0,-d),photo(textures[1]));desk.add(deskGuide);
 // The approved terminal-free composite is the only panoramic lounge plate.
 relief(wide,textures[2]);relief(near,textures[3],14,7,.70);
 escort=card(wide,textures[4],1250,750,335,'escort');
 presenters=stops.map((s,i)=>card(wide,textures[i===0?5:i===1?6:i===2?7:8],...s.foot,s.height,s.guide));
 nearGuide=card(near,textures[5],1125,823,450,'cinema-near');
 targets=[desk,wide,near].map(()=>new THREE.WebGLRenderTarget(16,16));
 blendScene=new THREE.Scene();blendCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 blendMaterial=new THREE.ShaderMaterial({uniforms:{a:{value:targets[0].texture},b:{value:targets[1].texture},mix0:{value:0}},vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform sampler2D a;uniform sampler2D b;uniform float mix0;varying vec2 uv0;void main(){gl_FragColor=mix(texture2D(a,uv0),texture2D(b,uv0),mix0);\n#include <colorspace_fragment>\n}'});blendScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),blendMaterial));
 const appStart=performance.now();while(!connectApp()){if(performance.now()-appStart>20000)throw new Error('현재 앱 빌드가 없습니다. README의 미리보기 빌드 절차를 확인해 주세요.');await new Promise(r=>setTimeout(r,100));}
 new ResizeObserver(align).observe($('app-shell'));window.addEventListener('resize',align);$('app').addEventListener('load',connectApp);
 ready=true;window.__tour.ready=true;align();$('loading').hidden=true;['play','pause','skip','scrub'].forEach(id=>$(id).disabled=false);reset();
 }catch(error){console.error(error);$('loading').textContent='시안을 열지 못했습니다. 전용 서버와 실제 앱 빌드를 확인해 주세요.';$('status').textContent=error.message;}}
function blend(a,b,m){if(m<=0||m>=1){const i=m<=0?a:b;renderer.setRenderTarget(null);renderer.render([desk,wide,near][i],cameras[i]);return;}for(const i of [a,b]){renderer.setRenderTarget(targets[i]);renderer.render([desk,wide,near][i],cameras[i]);}blendMaterial.uniforms.a.value=targets[a].texture;blendMaterial.uniforms.b.value=targets[b].texture;blendMaterial.uniforms.mix0.value=m;renderer.setRenderTarget(null);renderer.render(blendScene,blendCamera);}
function world(){
 const t=time,index=Math.max(0,stop),s=stops[index],p=smooth(1,7.6,t),previous=index===0?836:stops[index-1].focus;
 const cam=cameras[1],cx=lerp(previous,s.focus,p),horizontalLimit=Math.atan(tan*aspect),turn=Math.atan((cx/W*2-1)*tan*aspect),safeFov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(horizontalLimit-Math.abs(turn)-.035)/aspect));
 // Keep every camera ray inside the photographed set; no exposed card edges.
 cam.position.set(0,0,0);cam.fov=Math.min(lerp(index===0?42:28,28,p),safeFov);cam.lookAt(point(cx,H/2,15));cam.updateProjectionMatrix();
 presenters.forEach((g,i)=>opacity(g,i===index?smooth(5,5.3,t):0));
 // Poses are planted photographic cutouts. They dissolve between guide
 // gestures; neither a skeletal walk nor sliding feet is presented as walking.
 const escortX=index===0?1250:(previous+s.focus)/2,escortFoot=point(escortX,750,15-9*smooth(.54,1,750/H));escort.mesh.position.x=escortFoot.x;escort.mesh.position.z=escortFoot.z;escort.shadow.position.x=escortFoot.x;escort.shadow.position.z=escortFoot.z;
 opacity(escort,(1-smooth(4.65,5,t))*(stop<0?0:1));
 cameras[0].position.set(.4*smooth(.6,2.8,t),0,.3*smooth(.6,2.8,t));cameras[0].lookAt(.7*smooth(.6,2.8,t),0,-14);
 const c=cameras[2],nearMove=smooth(6.3,8.3,t);c.position.set(.1*nearMove,0,-.5*nearMove);c.lookAt(.4*nearMove,-.04,-14);
 if(stop<0){cameras[0].position.set(0,0,0);cameras[0].lookAt(0,0,-14);renderer.setRenderTarget(null);renderer.render(desk,cameras[0]);}
 else if(index===0&&t<3.6)blend(0,1,smooth(1.5,3.6,t));
 else if(index===0)blend(1,2,smooth(6.3,7.4,t));
 else{renderer.setRenderTarget(null);renderer.render(wide,cam);}
 const anchors=[[1510,470],[1254,470],[920,450],[690,500]],nearCinema=index===0&&t>7.4;
 const anchor=nearCinema?point(1390,320,14).project(cameras[2]):point(...anchors[index],15).project(cam);
 $('destination').style.left=`${clamp((anchor.x+1)*50-9,12,72)}%`;$('destination').style.top=`${clamp((1-anchor.y)*50-25,8,54)}%`;
 sceneDraws++;window.__tour.guideAssets=sourceAspects;window.__tour.cameraFocus=cx;
}
function draw(){
 if(!ready)return;const s=stops[Math.max(0,stop)],gate=stop===3,arrived=stop>=0&&time>=9.2;
 if(stop>=0&&time>7.3&&!gate)requestMenu(s.screen);
 const liveReady=gate||(!s.screen?true:appHas(s.screen));
 const showLive=arrived&&!gate&&liveReady;
 if(!manual){$('travel').hidden=showLive;$('portrait').hidden=!showLive;$('caption').hidden=stop<0;
 if(!showLive)world();
 $('desk-panel').hidden=stop!==0&&stop>=0;const close=stop<0?0:smooth(.2,.85,time);$('desk-panel').style.transform=`translateX(${-115*close}%)`;$('desk-panel').style.opacity=1-close;$('desk-panel').inert=stop>=0;
 $('destination').hidden=stop<0||time<3||time>8.6&&!gate;$('destination-name').textContent=s.name;$('destination-code').textContent=`LOUNGE TOUR / 0${Math.max(0,stop)+2}`;$('destination-detail').textContent=s.detail;
 let dark=0,logo=0,flash=0;if(stop>=0&&!gate){dark=smooth(8.1,8.65,time)*(1-smooth(8.95,9.2,time));logo=smooth(8.4,8.7,time)*(1-smooth(8.95,9.2,time));if(time>=8.95&&time<=9.2)flash=Math.sin((time-8.95)/.25*Math.PI)*.8;if(arrived&&!liveReady){dark=1;logo=1;}}
 $('blackout').style.opacity=dark;$('standby').style.opacity=logo;$('plasma').style.opacity=reduced()?0:flash;$('standby-place').textContent=`STAM / ${s.code}`;
 $('caption-location').textContent=s.name;const text=arrived?s.text:s.travel;if($('caption-text').textContent!==text)$('caption-text').textContent=text;
 $('caption').style.transform=`translateY(${(1-smooth(.1,.65,time))*150}%)`;
 $('portrait').style.transform=`translateX(${(1-smooth(9.2,9.75,time))*110}%)`;
 $('next').hidden=!arrived;
 // Korean UI remains Korean. Screen ids stay stable for future menu changes.
 $('next').textContent=gate?'라운지 투어 마치기':`${stops[stop+1]?.name||'게이트'}로 가시죠 →`;
 if($('portrait-image').dataset.guide!==s.guide){$('portrait-image').src=`./assets/guide-${s.guide}.png`;$('portrait-image').dataset.guide=s.guide;}
 $('content-overlay').dataset.phase=stop<0?'desk':arrived?gate?'gate':'menu':'travel';
 }
 document.querySelectorAll('[data-stop]').forEach(el=>{const active=Number(el.dataset.stop)===stop;if(active)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
 $('scrub').value=time;$('time').textContent=`${time.toFixed(1)} / 14.0`;
 window.__tour.time=time;window.__tour.stop=stop;window.__tour.phase=stop<0?'desk':arrived?gate?'gate':'menu':'travel';window.__tour.menuReady=liveReady;window.__tour.activeRoute=activeRoute;
}
function tick(now){if(!playing)return;const ms=now-last;last=now;time=Math.min(duration,time+Math.min(ms/1000,.1));if(lastDraw)frames.push(now-lastDraw);lastDraw=now;
 if(ms>65&&time<8.2){if(++slow>=4&&quality===1){quality=.65;align();}}else slow=0;
 draw();if(time>=duration){pause();$('status').textContent=stop===3?'게이트 도착 · 탑승 안내로 이어질 지점':'장소 소개 완료 · 다음 안내를 선택해 주세요';if($('auto').checked&&stop<3)begin(stop+1);return;}raf=requestAnimationFrame(tick);}
function play(){if(!ready)return;if(stop<0){begin(0);return;}if(manual){manual=false;begin(Math.max(0,stop));return;}if(time>=duration){if(stop<3)begin(stop+1);return;}if(reduced()&&time<9.3)time=9.3;playing=true;last=performance.now();lastDraw=0;$('play').disabled=true;$('pause').textContent='일시정지';$('status').textContent=`${stops[stop].name} 안내 중`;raf=requestAnimationFrame(tick);}
function pause(){playing=false;cancelAnimationFrame(raf);$('play').disabled=!ready;$('play').textContent=time>=duration&&stop<3?'다음 장소로':'가이드 따라가기';$('pause').textContent='계속 보기';if(quality!==1){quality=1;align();}}
function begin(index,autoPlay=true){pause();manual=false;stop=clamp(index,0,3);time=0;menuRequested=null;resetMenu();draw();if(autoPlay)play();}
function seek(t,index=stop){pause();manual=false;if(index>=0&&index!==stop){stop=clamp(index,0,3);menuRequested=null;resetMenu();}if(stop<0)stop=0;time=clamp(t,0,duration);draw();$('status').textContent='장면 확인 중';}
function reset(){pause();manual=false;stop=-1;time=0;menuRequested=null;resetMenu();draw();$('status').textContent='데스크 → 시네마 → 아카이브 → 서비스센터 → 게이트';}
function next(){if(stop===3){pause();$('caption-text').textContent='라운지 투어는 여기까지예요. 다음은 셔틀 탑승 안내로 이어집니다.';$('next').hidden=true;$('status').textContent='게이트에서 투어 완료 · 셔틀 자동 재생 없음';return;}begin(stop+1);}
$('start').addEventListener('click',()=>begin(0));$('play').addEventListener('click',play);$('pause').addEventListener('click',()=>playing?pause():play());$('skip').addEventListener('click',()=>seek(12,Math.max(0,stop)));$('replay').addEventListener('click',reset);$('next').addEventListener('click',next);$('scrub').addEventListener('input',e=>seek(Number(e.target.value)));
document.querySelectorAll('[data-stop]').forEach(button=>button.addEventListener('click',()=>Number(button.dataset.stop)<0?reset():begin(Number(button.dataset.stop),false)));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){pause();$('status').textContent='창을 벗어나 투어를 일시정지했습니다';}});
document.addEventListener('keydown',e=>{if(e.target.closest('button,a,input,iframe'))return;if(e.code==='Space'){e.preventDefault();playing?pause():play();}if(e.key==='Escape')pause();});
window.addEventListener('pagehide',()=>{pause();appObserver?.disconnect();[desk,wide,near]?.forEach(s=>s?.traverse(o=>{o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();}));targets?.forEach(t=>t.dispose());renderer?.dispose();});
window.__tour={ready:false,time:0,stop:-1,phase:'loading',play,pause,seek,begin,reset,metrics:()=>({sceneDraws,frames,quality,menuSeen:[...menuSeen],newAssets:5,travelVideoElements:$('travel').querySelectorAll('video').length,playing})};
init();

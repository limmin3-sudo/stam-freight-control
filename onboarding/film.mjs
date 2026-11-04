// Original generated departure artwork + actual STAM renders using synthetic contracts.
const canvas=document.querySelector('canvas');canvas.width=1920;canvas.height=1080;const c=canvas.getContext('2d'),W=1920,H=1080;
const files=['departure','map-demo','cargo-demo','control-demo'];const images=await Promise.all(files.map(async name=>{const i=new Image();i.src='../assets/onboarding/'+name+'.jpg';await i.decode();return i;}));await document.fonts.ready;
const ease=t=>t*t*(3-2*t),clamp=t=>Math.max(0,Math.min(1,t));
const scenes=[{a:0,b:5.5,img:0,eyebrow:'STAM / FREIGHT CONTROL',title:'Every contract.',sub:'A course to chart.',caption:'HAULING CONTRACTS. CLEAR ROUTES. CARGO READY.'},{a:5.5,b:10.5,img:1,eyebrow:'01  /  PLAN YOUR ROUTE',title:'Plot your route.',sub:'Make every stop count.',caption:'HAULING CONTRACTS  /  ROUTE PLANNING'},{a:10.5,b:15.5,img:2,eyebrow:'02  /  CARGO WITH PURPOSE',title:'Plan the load.',sub:'Group the drop-offs.',caption:'GROUP BY DESTINATION. KEEP CONTRACTS DISTINCT.'},{a:15.5,b:19.5,img:3,eyebrow:'03  /  YOUR CONTROL ROOM',title:'Your ship.',sub:'Your flight plan.',caption:'STARMAP  /  CARGO GRID  /  FLIGHT CREW'},{a:19.5,b:24,img:0,eyebrow:'READY FOR DEPARTURE',title:'Flight ready.',sub:'Let’s get hauling.',caption:'STAM FREIGHT CONTROL  /  UNOFFICIAL HAULING PLANNER'}];
function cover(img,x,y,w,h,scale=1){const k=Math.max(w/img.width,h/img.height)*scale;const iw=img.width*k,ih=img.height*k;c.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);}
function draw(scene,t){const p=clamp((t-scene.a)/(scene.b-scene.a)),z=ease(p),img=images[scene.img];c.save();
 if(scene.img===0){cover(img,0,115,W,850,1.05+z*.07);c.fillStyle='#030b1644';c.fillRect(0,0,W,H);}else{
  c.fillStyle='#050c14';c.fillRect(0,0,W,H);c.save();c.beginPath();c.rect(720,130,1120,820);c.clip();cover(img,720-20*z,130,1120,820,1+z*.035);c.restore();
  const left=c.createLinearGradient(700,0,1050,0);left.addColorStop(0,'#050c14');left.addColorStop(1,'#050c1400');c.fillStyle=left;c.fillRect(690,115,380,850);
 }
 const shade=c.createLinearGradient(0,0,1350,0);shade.addColorStop(0,'#030b16f5');shade.addColorStop(.5,'#030b16cc');shade.addColorStop(1,'#030b1600');c.fillStyle=shade;c.fillRect(0,110,1500,860);
 const appear=ease(clamp((t-scene.a-.18)/.8));c.globalAlpha*=appear;c.translate(0,(1-appear)*24);
 c.fillStyle='#b4cbd7';c.font='17px "Segoe UI",sans-serif';c.letterSpacing='5px';c.fillText(scene.eyebrow,105,310);c.letterSpacing='0px';
 c.font='700 72px "Segoe UI",sans-serif';c.fillStyle='#f1f5f3';c.fillText(scene.title,100,440);c.fillText(scene.sub,100,548);
 c.fillStyle='#b5c6cf';c.font='19px "Segoe UI",sans-serif';c.fillText(scene.caption,105,630);
 c.fillStyle='#d0a66b';c.fillRect(105,690,80+z*50,2);c.restore();
}
window.renderFrame=t=>{
 c.globalAlpha=1;c.fillStyle='#030910';c.fillRect(0,0,W,H);let i=scenes.findIndex(s=>t<s.b);if(i<0)i=4;
 draw(scenes[i],t);
 if(i>0&&t-scenes[i].a<.32){c.globalAlpha=1-clamp((t-scenes[i].a)/.32);draw(scenes[i-1],scenes[i-1].b-.01);c.globalAlpha=1;}
 c.fillStyle='#030910';c.fillRect(0,0,W,110);c.fillRect(0,970,W,110);
 c.font='600 20px "Segoe UI",sans-serif';c.letterSpacing='7px';c.fillStyle='#dce7e9';c.fillText('S T A M',105,66);c.letterSpacing='0px';c.font='13px "Noto Sans CJK KR",sans-serif';c.fillStyle='#8497a4';c.fillText('ORIGINAL CONCEPT ART / SYNTHETIC CONTRACT DEMO / NOT LIVE GAME VERIFICATION',105,1020);
 const subtitles=['수락한 계약에 맞춰 항로를 준비합니다.','픽업부터 배송까지, 방문 순서를 정리하세요.','같은 배송지의 화물은 가까이 배치하세요.','항로와 적재 상태를 한눈에 확인하세요.','출항 준비 완료. 운송을 시작하세요.'];c.font='26px \"Noto Sans CJK KR\",sans-serif';c.textAlign='center';c.fillStyle='#f4f5f4';c.shadowColor='#000';c.shadowBlur=8;c.fillText(subtitles[i],W/2,925);c.shadowBlur=0;c.textAlign='left';
 c.fillStyle='#bca076';c.fillRect(W-270,1013,160*clamp(t/24),2);
 const fade=Math.min(clamp(t/.65),clamp((24-t)/.8));c.fillStyle=`rgba(0,0,0,${1-fade})`;c.fillRect(0,0,W,H);
};window.renderFrame(3);

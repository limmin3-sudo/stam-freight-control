// Original motion graphics. No CIG ship mesh, trailer footage or audio is used.
const canvas=document.querySelector('canvas'),c=canvas.getContext('2d'),W=1280,H=720;
const demo=new Image();demo.src='../assets/onboarding/control-demo.jpg';await demo.decode();await document.fonts.ready;
const shots=[
 ['FLIGHT BRIEFING / STAM','운송의 다음 항로.','계약은 게임에서. 항로와 적재는 STAM에서.'],
 ['01 / CONNECT','관제 연결, 준비 완료.','STAM.exe → Game.log 선택 → 브라우저 관제'],
 ['02 / CONTRACTS','계약이 들어오면, 계획으로.','확인된 품목·수량·배송지를 연결합니다.'],
 ['03 / CARGO','같은 배송지는 가까이.','상자 구성이 미확인일 때는 공간 가이드로 준비합니다.'],
 ['04 / FLIGHT','함장님의 항로를 따라.','파트너별 계획 · 예상 이동 · 관제 시점'],
 ['READY FOR DEPARTURE','함장님, 출항을 준비해 주세요.','먼저 이용 안내를 확인하고, 시험 출항으로 검증합니다.']
];
const stars=Array.from({length:160},(_,i)=>({x:(i*379.37)%W,y:(i*173.13)%H,r:.4+(i%3)*.4}));
function line(points,stroke='#70dfe3',fill=null){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));if(fill){c.closePath();c.fillStyle=fill;c.fill();}c.strokeStyle=stroke;c.stroke();}
function freighter(t){c.save();c.translate(900,340);c.rotate(-.18+Math.sin(t*.12)*.04);const s=1+Math.sin(t*.1)*.035;c.scale(s,s);c.shadowColor='#2ca9d5';c.shadowBlur=25;
 line([[-330,0],[-170,-35],[195,-28],[305,0],[195,28],[-170,35]],'#5494ab','#112b3e');
 for(let side of [-1,1])for(let i=0;i<4;i++){const x=-170+i*80,y=side*58;line([[x,y],[x+64,y-8],[x+64,y+side*82],[x,y+side*92]],'#729cac','#162e3f');line([[x+8,y+side*12],[x+55,y+side*10],[x+55,y+side*72],[x+8,y+side*80]],'#263f50','#1c394c');}
 line([[185,-28],[245,-58],[295,-36],[305,0]],'#abc9d9','#203c50');c.shadowBlur=45;c.strokeStyle='#67d9fd';c.lineWidth=6;c.beginPath();c.moveTo(-300,-10);c.lineTo(-350,-10);c.moveTo(-300,10);c.lineTo(-350,10);c.stroke();c.restore();}
function cargo(t){c.save();c.translate(860,350);c.scale(1.05,1.05);let off=Math.sin(t*.15)*10;
 for(let group=0;group<2;group++)for(let j=0;j<3;j++)for(let i=0;i<3;i++){
  const x=(i-j)*47+off+group*160-150,y=(i+j)*23-40;const color=group?'#edb16a':'#67dfe3';
  line([[x,y],[x+45,y-23],[x+90,y],[x+45,y+23]],color,group?'#584b3333':'#28556255');line([[x,y],[x,y+90],[x+45,y+113],[x+90,y+90],[x+90,y]],color);line([[x+45,y+23],[x+45,y+113]],color);
 }c.restore();}
window.renderFrame=t=>{
 const shot=Math.min(5,Math.floor(t/11)),local=t-shot*11,alpha=Math.min(1,local/1.2,(11-local)/1.2);c.globalAlpha=1;c.fillStyle='#050e17';c.fillRect(0,0,W,H);
 const glow=c.createRadialGradient(910,220,10,850,350,650);glow.addColorStop(0,'#194560');glow.addColorStop(1,'#050e17');c.fillStyle=glow;c.fillRect(0,0,W,H);
 for(const s of stars){c.fillStyle='#c6e8ff';c.globalAlpha=.2+(s.r/2);c.fillRect((s.x+t*1.5)%W,s.y,s.r,s.r);}c.globalAlpha=Math.max(0,alpha);
 if(shot===3)cargo(t);else if(shot===2||shot===4){c.save();c.translate(580,120);c.rotate(-.025);c.strokeStyle='#69bacb';c.lineWidth=2;c.strokeRect(-2,-2,642,446);c.drawImage(demo,0,0,1440,1000,0,0,640,444);c.restore();}else freighter(t);
 const shade=c.createLinearGradient(0,0,800,0);shade.addColorStop(0,'#050e17');shade.addColorStop(.65,'#050e17f0');shade.addColorStop(1,'#050e1700');c.fillStyle=shade;c.fillRect(0,0,900,H);
 c.font='13px sans-serif';c.fillStyle='#71dfe7';c.fillText(shots[shot][0],64,220);c.fillStyle='#effaff';c.font='bold 42px "Noto Sans CJK KR",sans-serif';
 const title=shots[shot][1];if(title.length>20){c.fillText(title.slice(0,13),64,300);c.fillText(title.slice(13),64,357);}else c.fillText(title,64,310);
 c.fillStyle='#b9cedb';c.font='19px "Noto Sans CJK KR",sans-serif';
 const subtitle=shots[shot][2];if(subtitle.length>35){c.fillText(subtitle.slice(0,25),64,398);c.fillText(subtitle.slice(25),64,430);}else c.fillText(subtitle,64,398);
 c.fillStyle='#eab174';c.fillRect(64,454,60+local*8,2);c.font='12px monospace';c.fillText('STAM / FREIGHT CONTROL',64,493);
 c.globalAlpha=1;c.strokeStyle='#345160';c.lineWidth=1;line([[40,80],[40,40],[80,40]],'#345160');line([[1200,680],[1240,680],[1240,640]],'#345160');
 c.fillStyle='#9db7c9';c.font='12px "Noto Sans CJK KR",sans-serif';c.fillText('개발판 흐름 소개 · 예시 관제 화면 · 실게임 검증 영상이 아닙니다',64,654);c.fillStyle='#70dfe3';c.font='12px monospace';c.fillText(`${String(shot+1).padStart(2,'0')} / 06`,1160,65);
};window.renderFrame(5);

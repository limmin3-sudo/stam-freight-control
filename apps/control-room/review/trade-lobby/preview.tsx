import React, {useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {CrewEncounter} from '../../src/CrewEncounter';
import background from '../../src/assets/facility-lobbies/trade-two-door.png';
import officer from '../../src/assets/facility-staff/officer-lobby.webp';
import broker from '../../src/assets/facility-staff/ling-broker.png';
import brokerClose from '../../src/assets/dialogue-originals/ling-broker.webp';
import officerClose from '../../../../docs/cinematics/guide-close-dialogue-20261117/assets/senior-trade-officer-close.png';
import prices from './prices.webp';
import records from './records.webp';
import './preview.css';

const rooms = {
 control: {name:'무역관제실',title:'시세 검색',x:46.5,y:54,rx:15,ry:11},
 records: {name:'거래기록실',title:'매입 · 판매 · 잔량 · 정산',x:81.7,y:54,rx:5.8,ry:8}
};
const partners = {
 officer:{name:'수석 무역관',image:officer,portrait:officerClose,x:56.5,line:'같은 행성계 안의 거래처를 살펴보겠습니다. 함선과 가용 자본에 맞춰 이동 경로를 함께 검토하시죠.',scope:'행성계 내부'},
 broker:{name:'링 가문 중개인',image:broker,portrait:brokerClose,x:63.8,line:'행성계를 오가는 거래를 맡고 있어요. 출발지부터 목적지까지, 자금과 이동 계획을 함께 살펴보죠.',scope:'행성계 간'}
};
type Room=keyof typeof rooms;
type Person=keyof typeof partners;
function Lobby(){
 const [screen,setScreen]=useState<'lobby'|Room|'plan'>('lobby');
 const [scope,setScope]=useState('');
 const [light,setLight]=useState<Room|null>(null);
 const [person,setPerson]=useState<Person|null>(null);
 const [quick,setQuick]=useState(false);
 const world=useRef<HTMLDivElement>(null), power=useRef<HTMLDivElement>(null);
 const source=useRef<HTMLButtonElement|null>(null),zoom=useRef<Animation|null>(null),busy=useRef(false);
 const back=useRef<HTMLButtonElement>(null);
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 async function enter(room:Room, origin:HTMLButtonElement, direct:boolean){
  if(busy.current)return;
  busy.current=true;source.current=origin;setQuick(false);setLight(null);
  if(!direct&&!reduced()){
   const view=world.current!;
   view.style.transformOrigin=rooms[room].x+'% '+rooms[room].y+'%';
   zoom.current=view.animate([{transform:'scale(1)',filter:'brightness(1)'},{transform:'scale(3.6)',filter:'brightness(.1)'}],{duration:800,easing:'cubic-bezier(.53,.03,.72,1)',fill:'forwards'});
   await zoom.current.finished;
   const pulse=power.current!.animate([{opacity:0},{opacity:1,offset:.24},{opacity:.87,offset:.55},{opacity:1}],{duration:250,fill:'forwards'});
   await pulse.finished;setScreen(room);await new Promise(requestAnimationFrame);pulse.cancel();
  }else setScreen(room);
  busy.current=false;requestAnimationFrame(()=>back.current?.focus());
 }
 async function leave(){
  if(busy.current)return;
  busy.current=true;setScreen('lobby');
  if(zoom.current){if(!reduced()){zoom.current.reverse();await zoom.current.finished;}zoom.current.cancel();zoom.current=null;}
  busy.current=false;
  (source.current?.isConnected?source.current:document.querySelector<HTMLButtonElement>('.quick-toggle'))?.focus();
 }
 const target=light&&rooms[light];
 return <main className="preview facility-lobby">
  <div className="stage-box">
   <div ref={world} className="world" inert={screen!=='lobby'||!!person}>
    <img className="scene" src={background} alt="무역센터 전경. 정면 유리벽 안쪽에 무역관제실, 오른쪽에 거래기록실이 있다."/>
    {target&&<div className="shade" style={{background:`radial-gradient(ellipse ${target.rx}% ${target.ry}% at ${target.x}% ${target.y}%, #ffe5aa24 0%, #ffe5aa12 58%, transparent 71%, #040912a6 130%)`}}/>}
    {(Object.keys(rooms) as Room[]).map(key=><button className={'door '+key} key={key} onPointerEnter={()=>setLight(key)} onPointerLeave={()=>setLight(null)} onFocus={()=>setLight(key)} onBlur={()=>setLight(null)} onClick={e=>enter(key,e.currentTarget,false)}><span className="door-label">{rooms[key].name}</span></button>)}
    {(Object.keys(partners) as Person[]).map(key=><button className="person" key={key} data-person={key} style={{left:partners[key].x+'%'}} onClick={e=>{source.current=e.currentTarget;setPerson(key);}}><img src={partners[key].image} alt=""/><span>{partners[key].name}</span></button>)}
   </div>
   {screen!=='lobby'&&<section className="monitor"><small>STAM / COMMERCE</small><h1>{screen==='plan'?scope+' 경로 계획':rooms[screen].title}</h1>
    {screen!=='plan'&&<img src={screen==='control'?prices:records} alt="기존 기능 화면 참고 캡처"/>}
    <button ref={back} onClick={leave}>← 로비로</button></section>}
   <div ref={power} className="power" aria-hidden="true">STAM</div>
  </div>
  {screen==='lobby'&&!person&&<aside><button className="quick-toggle" aria-expanded={quick} onClick={()=>setQuick(!quick)}>☰　빠른 이동</button>{quick&&(Object.keys(rooms) as Room[]).map(key=><button key={key} onClick={e=>enter(key,e.currentTarget,true)}>{rooms[key].name}</button>)}</aside>}
  {person&&source.current&&<CrewEncounter id={person==='broker'?'ling-broker':'senior-trade-officer'} name={partners[person].name} image={partners[person].portrait} background={background} focus={partners[person].x} line={partners[person].line} en={false} motion={!reduced()} origin={source.current} onClose={()=>setPerson(null)} actions={[{label:partners[person].scope+' 경로 계획',onSelect:()=>{setScope(partners[person].scope);setScreen('plan');requestAnimationFrame(()=>back.current?.focus());}}]}/>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<Lobby/>);

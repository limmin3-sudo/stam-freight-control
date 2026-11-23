import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {Locale} from './navigation';
import type {Visit} from './flight-types';
import type {useFlight} from './use-flight';
import type {CompanionSummary,createCompanionDock} from './CompanionDisplay';
import {useCompanionLink} from './use-companion-link';
import {useTradeView} from './use-trade-view';
import {useTradeSuite} from './use-trade-suite';
import {expeditionSummary,remainingSaleGoal,type SuiteCommand} from './trade-expedition';
import {loadMarket,marketWithRecentQuotes,refreshCommodity} from './market-reference';
import type {MarketSnapshot} from './trade-data';
import {tradeLabel} from './trade-labels';
import {tradeNextStep} from './trade-workflow';
import {resolveTradeTerminal} from './trade-navigation.mjs';
import {saleOffers} from './copilot-market';
import {priceAnswer} from './companion-guidance';
import {jobVolume,placeName,routeReady,shipIdFor} from './mission-trial';
import {canonicalPlace} from './flight-engine.mjs';
import {findPorts} from './port-search.mjs';
import {applyWord,cancelWord,cargoRoom,changeStops,contractMatches,normalized} from './copilot-navigation';
import {contractFields,readContractFields,spokenJob,spokenScu,startsSpokenContract,type ContractFields} from './spoken-contract';
import {currentLocationData,currentLocationPoint} from './personal-locations.mjs';
import './flight-copilot.css';
import {shipImageRecord} from './ship-image';

type ManualEntry={stamp:string;until:number;fields:ContractFields;expected?:keyof ContractFields;ids:Partial<Record<'from'|'to',string>>;scope?:{field:'from'|'to';id:string};airport?:'from'|'to';airportQuestion?:'from'|'to'};
type Proposal={id:string;label:string;stamp:string;expires:number;apply:()=>void|Promise<unknown>;undo?:()=>void|Promise<unknown>};
type Choice={label:string;choose:()=>string|Promise<string>};
type Props={flight:ReturnType<typeof useFlight>;locale:Locale;dock:ReturnType<typeof createCompanionDock>};
export function CopilotStation({flight,locale,dock}:Props){
 const en=locale==='en',t=(ko:string,eng:string)=>en?eng:ko,name=(id:string)=>placeName(id,en?1:0);
 const [enabled,setEnabled]=useTradeView('companion-enabled',false),store=useTradeSuite();
 const [input,setInput]=useState(''),[answer,setAnswer]=useState(''),[market,setMarket]=useState<MarketSnapshot|null>(null);
 const [pending,setPending]=useState<Proposal|null>(null),pendingRef=useRef<Proposal|null>(null);
 const [choices,setChoices]=useState<Choice[]>([]),choiceRef=useRef<{rows:Choice[];stamp:string}|null>(null);
 const manual=useRef<ManualEntry|null>(null);
 const undoRef=useRef<Proposal|null>(null),generation=useRef(0),dialog=useRef<HTMLDialogElement>(null);
 const [opened,show]=useState(false);
 useEffect(()=>{dock.open=()=>show(true);return()=>{dock.open=()=>{};};},[dock]);
 useEffect(()=>{if(opened&&!dialog.current?.open)dialog.current?.showModal();},[opened]);
 useEffect(()=>{if(!enabled&&!opened)return;let alive=true;loadMarket().then(m=>{if(alive)setMarket(m);}).catch(()=>{});return()=>{alive=false;};},[enabled,opened]);
 const {session}=flight,{run,plan}=session,visits=plan?.visits.slice(run?.index??0)??[],visit=visits[0],destination=visit&&visit.events.some(e=>e.type==='departure')?visits[1]:visit;
 const activeTrade=useMemo(()=>store.book?.runs.find(r=>expeditionSummary(r).status==='active'),[store.book]);
 const trade=useMemo(()=>activeTrade?expeditionSummary(activeTrade):null,[activeTrade]);
 const lots=trade?.holdings.filter(l=>l.terminalId===null)??[],personal=lots.reduce((n,l)=>n+l.quantity,0);
 const goal=activeTrade&&trade?remainingSaleGoal(activeTrade,trade):null;
 const terminal=(id:number)=>{const row=market?.terminals.find(x=>x.id===id);return row?tradeLabel(row.name,'places',locale):'#'+id;};
 const goods=(id:number)=>{const row=market?.commodities.find(x=>x.id===id);return row?tradeLabel(row.name,'goods',locale):'#'+id;};
 const sale=goal?t('판매 목표','Sell')+' · '+goal.quantity+' SCU → '+terminal(goal.terminalId):'';
 const freightLoad=run?.loadScu??run?.aboard.reduce((n,b)=>n+b.size,0)??0;
 const sameShip=!activeTrade||activeTrade.options.shipId===(plan?.ship.id??shipIdFor(session.draft.ship));
 const goalTerminal=goal&&market?.terminals.find(row=>row.id===goal.terminalId);
 const goalPlace=goalTerminal&&resolveTradeTerminal(goalTerminal)?.point.id;
 const saleIndex=goalPlace?visits.findIndex(v=>v.locationId===goalPlace):-1;
 const buyingLeg=saleIndex>=0?visits.slice(0,saleIndex+1):visits;
 const room=sameShip?cargoRoom(plan,buyingLeg,freightLoad,personal):null;
 const tradeStep=activeTrade&&trade?tradeNextStep(activeTrade,trade):null;
 const tradeTarget=trade?.target??goal?.terminalId??(tradeStep?.aligned?tradeStep.leg?.destinationId:null);
 const tradeBrief=tradeTarget?t('무역 목적지','Trade destination')+' · '+terminal(tradeTarget):'';
 const facilityFor=(event:Visit['events'][number])=>{
  if(!destination)return '';
  const job=session.draft.jobs.find(j=>j.id===event.missionId);
  const pickup=event.type==='pickup';
  const facility=job?.shipments.find(row=>canonicalPlace(pickup?row.from:row.to)===destination.locationId&&(pickup?row.pickupFacility:row.deliveryFacility));
  const label=pickup?facility?.pickupFacility:facility?.deliveryFacility;
  return label?' · '+label[en?1:0]:'';
 };
 const task=flight.active&&destination?name(destination.locationId)+' · '+destination.events.filter(e=>['pickup','delivery'].includes(e.type)&&!e.reservationContinuation).map(e=>(e.type==='pickup'?t('픽업','Pick up'):t('배송','Deliver'))+' '+tradeLabel(e.commodity,'goods',locale)+' '+(e.pickupQuantityUnknown||!e.scu?'?':e.scu)+' SCU'+facilityFor(e)).join(' / '):'';
 let recommendation=sale||tradeBrief||task||t('미션콘솔에서 함선과 출발지를 정하거나 무역관제실에서 운항을 시작하세요.','Set up freight in the mission console or start a trade expedition.');
 if(flight.active&&room!==null){
  const scope=saleIndex>=0?t('판매처에 도착할 때까지','Before reaching the buyer'):t('남은 운항에서','Across the remaining flight');
  recommendation=room>=0?scope+' '+t('계약 화물 자리를 남기면 ','you can reserve the contract cargo and buy ')+room+' SCU'+t(' 더 살 수 있어요.','.'):t('계약과 개인 화물이 함선 용량을 ','Contract and trade cargo exceed capacity by ')+(-room)+' SCU'+t(' 초과해요. 먼저 배송하거나 판매하세요.','. Deliver or sell first.');
 }
 if(flight.receiptChanges.length)recommendation=t('수신 계약이 바뀌었어요. 계약 변경 검토를 먼저 열어 주세요.','Review the changed freight contract first.');
 const suggested=flight.active?flight.receipts.cards.filter(j=>routeReady(j)&&!session.draft.jobs.some(x=>x.id===j.id)):[];
 const suggestion=suggested.length?t('추가 가능한 수신 계약 ','New contracts available: ')+suggested.length+t('건. 추가할까요?',' — add one?'):'';
 const revision=useMemo(()=>crypto.randomUUID(),[session,store.raw,store.owner,flight.receipts.cards,flight.blocked]);
 const live=useRef(revision);live.current=revision;
 const proposal=(p:Proposal|null)=>{pendingRef.current=p;setPending(p);};
 function clear(){manual.current=null;recordContext.current=null;generation.current++;proposal(null);choiceRef.current=null;setChoices([]);undoRef.current=null;setAnswer('');follow.current=null;}
 const recordContext=useRef<{lot:string;revision:string}|null>(null);
 const follow=useRef<{lot:string;at:number;revision:string}|null>(null);
 useEffect(()=>{const boundary=()=>{clear();setEnabled(false);show(false);};window.addEventListener('stam-account-boundary',boundary);return()=>window.removeEventListener('stam-account-boundary',boundary);},[setEnabled]);
 useEffect(()=>{if(pendingRef.current&&pendingRef.current.stamp!==revision)proposal(null);if(choiceRef.current?.stamp!==revision){choiceRef.current=null;setChoices([]);}},[revision]);
 useEffect(()=>{
  if(!pending)return;
  const timer=setTimeout(()=>{if(pendingRef.current?.id===pending.id){proposal(null);setAnswer(t('변경안이 만료됐어요. 다시 요청해 주세요.','Change expired. Please ask again.'));}},Math.max(0,pending.expires-Date.now()));
  return()=>clearTimeout(timer);
 },[pending]);
 function offer(label:string,apply:Proposal['apply'],undo?:Proposal['undo']){
  if(live.current!==revision)throw Error(t('운항 상태가 바뀌었어요. 다시 요청하세요.','The plan changed. Ask again.'));
  proposal({id:crypto.randomUUID(),label,stamp:revision,expires:Date.now()+90000,apply,undo});return label+' '+t('적용할까요?','Apply this change?');
 }
 function ask(label:string,rows:Choice[]){
  choiceRef.current={rows,stamp:revision};setChoices(rows);
  return label+' '+rows.map((r,i)=>(i+1)+'. '+r.label).join(' / ');
 }
 async function decide(id:string,accept:boolean){
  const p=pendingRef.current;
  if(p&&p.id!==id)return stale();
  if(!p||p.stamp!==live.current||Date.now()>p.expires){proposal(null);return t('계획이 바뀌었거나 확인 시간이 지났어요. 다시 요청하세요.','Plan changed or confirmation expired. Ask again.');}
  proposal(null);if(!accept)return t('변경을 취소했어요.','Change cancelled.');
  await p.apply();undoRef.current=p.undo?p:null;return t('반영했어요.','Applied.')+' '+p.label;
 }
 async function preview(edit:Parameters<typeof flight.previewCopilotEdit>[0],label:string):Promise<string>{
  const serial=generation.current,result=await flight.previewCopilotEdit(edit);
  if(serial!==generation.current||live.current!==revision)return t('새 요청이나 운항 변경으로 이전 제안을 닫았어요.','The earlier request has expired.');
  const roomAfter=sameShip?cargoRoom(result.plan,result.plan.visits,freightLoad,personal):null;
  if(roomAfter!==null&&roomAfter<0){
   const added=edit.add??edit.manualJob;
   if(added&&!edit.deferUntil){
    const currentStops=visits.filter(v=>!v.events.some(e=>e.type==='departure')).map(v=>v.locationId);
    const pickups=[...new Set(added.shipments.map(row=>canonicalPlace(row.from)))];
    const deliveries=[...new Set(added.shipments.map(row=>canonicalPlace(row.to)))];
    if(currentStops.length)return preview({...edit,stops:[...currentStops,...pickups,...deliveries],deferUntil:currentStops.length},label+' · '+t('기존 배송 후 새 계약 픽업','collect the new contract after existing deliveries'));
   }
   return t('개인 화물을 포함하면 ','Including trade cargo, capacity is short by ')+(-roomAfter)+t(' SCU 초과예요. 기존 배송을 먼저 끝내거나 개인 화물을 내려 주세요.',' SCU. Free up cargo space before collecting more.');
  }
  const path=result.plan.visits.filter(v=>!v.events.some(e=>e.type==='departure')).map(v=>name(v.locationId)).join(' → ');
  return offer(label+' · '+(path||t('남은 거점 없음','No remaining stops')),result.apply,result.undo);
 }
 const stale=()=>t('운항이 바뀌었어요. 다시 요청하세요.','Plan changed. Ask again.');
 function tradeOffer(command:SuiteCommand,label:string){
  const owner=store.owner,raw=store.raw;let committed:string|undefined;
  const reverse:SuiteCommand|undefined=command.kind==='saleGoal'&&activeTrade?{kind:'saleGoal',runId:activeTrade.id,goal:activeTrade.saleGoal??null}:command.kind==='event'?{kind:'undo',runId:command.runId}:undefined;
  return offer(label,async()=>{
   if(store.owner!==owner||live.current!==revision)throw Error(stale());
   committed=JSON.stringify(await store.dispatch(command,raw));
  },reverse?async()=>{if(!committed)throw Error(stale());await store.dispatch(reverse,committed);}:undefined);
 }
 function planSale(lot:typeof lots[number],at:number,quantity:number){
  if(!activeTrade)return stale();
  if(quantity<=0||quantity>lot.quantity||quantity%lot.boxSize)return t('판매량은 보유량 이하, 상자 크기의 배수여야 해요.','Use a whole box quantity within your holding.')+' '+lot.quantity+' SCU / '+lot.boxSize+' SCU.';
  follow.current={lot:lot.id,at,revision};
  return tradeOffer({kind:'saleGoal',runId:activeTrade.id,goal:{lotId:lot.id,quantity,terminalId:at,sinceEvent:activeTrade.events.length}},t('판매 계획','Sale plan')+' · '+goods(lot.commodityId)+' '+quantity+' SCU → '+terminal(at)+' · '+t('예상 잔량','Will remain')+' '+(lot.quantity-quantity)+' SCU');
 }
 async function compareSales(data:MarketSnapshot,id:number,units:number){
  const request=generation.current;
  await refreshCommodity(data,id).catch(()=>{});const prices=marketWithRecentQuotes(data);
  if(request!==generation.current||revision!==live.current)return stale();
  const rows=saleOffers(prices,id,units,new Set(visits.map(v=>v.locationId)));
  if(!rows.length)return priceAnswer(prices,'sell',id,en,units);
  const offerLabel=(r:typeof rows[number])=>(r.onRoute?t('항로 내','On route'):t('항로 밖','Off route'))+' · '+terminal(r.terminal.id)+' · '+r.fill+' SCU × '+r.price.toLocaleString()+' aUEC · '+new Date(r.reported).toLocaleString(en?'en-GB':'ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
  const stock=lots.filter(l=>l.commodityId===id);
  if(stock.length!==1)return rows.map(offerLabel).join(' / ');
  const lot=stock[0]!;
  if(rows.length===1)follow.current={lot:lot.id,at:rows[0]!.terminal.id,revision};
  return ask(t('판매 후보예요. 몇 번을 계획에 넣을까요?','Which buyer would you like to plan for?'),rows.map(r=>({label:offerLabel(r),choose:()=>planSale(lot,r.terminal.id,Math.floor(Math.min(r.fill,lot.quantity)/lot.boxSize)*lot.boxSize)})));
 }
 function choose<T>(list:T[],label:(item:T)=>string,act:(item:T)=>Promise<string>|string,prompt:string){
  if(!list.length)return t('일치하는 항목이 없어요. 이름을 다시 확인해 주세요.','No match. Check the name and ask again.');
  if(list.length===1)return act(list[0]!);
  const page=(offset:number):string=>{
   const batch:Choice[]=list.slice(offset,offset+5).map(item=>({label:label(item),choose:()=>act(item)}));
   if(list.length>offset+5)batch.push({label:t('다음 후보','More choices'),choose:()=>page(offset+5)});
   return ask(prompt,batch);
  };
  return page(0);
 }
 async function manualContract(text:string):Promise<string>{
  if(!flight.active)return t('운항을 시작한 뒤 추가할 미션을 말씀해 주세요.','Start the flight before adding a mission in progress.');
  const prior=manual.current;
  const draft=prior&&prior.stamp===revision&&prior.until>Date.now()?prior:{stamp:revision,until:0,fields:{},ids:{}} as ManualEntry;
  draft.until=Date.now()+90000;manual.current=draft;
  const typed=readContractFields(text,draft.expected);
  if(Object.keys(typed).length){
   for(const key of ['from','to'] as const)if(typed[key]){delete draft.ids[key];if(draft.airport===key)delete draft.airport;}
   Object.assign(draft.fields,typed);
  }else if(!Object.keys(draft.fields).length){
   draft.expected='from';
   return t('미션 내용을 말해 주세요. 어디서 무엇을 얼마나 싣고 어디로 가나요?','Tell me about the mission. Where are you picking up, what and how much, and where are you delivering?');
  }
  const prompts={from:t('어디서 실으시나요?','Where do you pick up?'),to:t('어디에 배송하시나요?','Where do you deliver?'),cargo:t('무슨 물품을 싣나요?','Which cargo are you hauling?'),quantity:t('몇 SCU를 싣나요?','How many SCU are you hauling?')};
  const process=async():Promise<string>=>{
   for(const key of contractFields){
    draft.expected=key;
    const value=draft.fields[key];if(!value)return prompts[key];
    if(key==='cargo'||key==='quantity'||draft.ids[key])continue;
    const scope=draft.scope?.field===key?draft.scope:undefined;
    const airport=/^(?:어거스트|오거스트)\s*던로우\s*(?:우주항|공항|우주공항)|^august dunlow/i.test(value);
    const query=airport?'Orison':value;
    const matches=findPorts(query).filter(p=>!scope||currentLocationPoint(p.id)?.parentId===scope.id);
    const exact=matches.filter(p=>[p.name,name(p.id),placeName(p.id,0),placeName(p.id,1)].some(n=>normalized(n)===normalized(query)));
    const accept=async(id:string):Promise<string>=>{
     const place=currentLocationPoint(id);
     if(place?.type==='Planet'||place?.type==='Moon'){
      draft.scope={field:key,id};delete draft.fields[key];
      const children=currentLocationData().locations.filter(p=>p.parentId===id&&['LandingZone','Outpost','Manmade'].includes(p.type))
       .sort((a,b)=>Number(b.type==='LandingZone')-Number(a.type==='LandingZone'));
      const examples=children.slice(0,3).map(p=>name(p.id)).join(', ');
      return name(id)+' '+prompts[key]+(examples?' '+t('예를 들면 ','For example, ')+examples+'.':'');
     }
     if(place?.name==='Orison'&&place.system==='stanton'&&!airport){
      draft.airportQuestion=key;draft.ids[key]=id;
      return t('오리슨은 어거스트 던로우 우주항인가요? 맞으면 “응”, 다른 곳이면 지명을 말해 주세요.','Is the Orison stop August Dunlow Spaceport? Say yes or name another stop.');
     }
     draft.ids[key]=id;if(airport)draft.airport=key;delete draft.scope;return process();
    };
    if(!matches.length){delete draft.fields[key];return t('그 위치를 찾지 못했어요. ','I could not find that location. ')+prompts[key];}
    return choose(exact.length?exact:matches,p=>name(p.id),p=>accept(p.id),prompts[key]);
   }
   const {from,to}=draft.ids;
   if(!from||!to)return prompts.from;
   if(from===to){delete draft.ids.to;delete draft.fields.to;delete draft.airportQuestion;if(draft.airport==='to')delete draft.airport;draft.expected='to';return t('픽업지와 배송지가 같아요. 다른 배송지를 알려 주세요.','The two stops match. Which other stop is the delivery?');}
   const scu=spokenScu(draft.fields.quantity!);
   if(!scu){delete draft.fields.quantity;draft.expected='quantity';return t('수량은 1에서 10,000 사이의 정수 SCU로 말해 주세요.','Give a whole quantity from 1 to 10,000 SCU.');}
   const job=spokenJob(from,to,draft.fields.cargo!,scu);
   const facility=t('어거스트 던로우 우주항','August Dunlow Spaceport');
   if(draft.airport){
    const row=job.shipments[0]!;
    if(draft.airport==='from')row.pickupFacility=['어거스트 던로우 우주항','August Dunlow Spaceport'];
    else row.deliveryFacility=['어거스트 던로우 우주항','August Dunlow Spaceport'];
   }
   const label=(key:'from'|'to')=>name(draft.ids[key]!)+(draft.airport===key?' ('+facility+')':'');
   manual.current=null;
   return preview({manualJob:job},job.title[en?1:0]+' '+scu+' SCU · '+label('from')+' → '+label('to'));
  };
  return process();
 }
 async function interpret(text:string):Promise<string>{
  if(recordContext.current?.revision===revision&&/^[\d,]+\s*(?:scu|에스씨유).*?(?:단가|개당|at)\s*[\d,]+/i.test(text)){
   const lot=lots.find(l=>l.id===recordContext.current?.lot);if(lot){follow.current={lot:lot.id,at:trade!.position,revision};text+=' '+t('팔았어','sold');}
  }
  recordContext.current=null;
  if(/^(?:거기(?:서)?\s*)?[0-9,]+\s*(?:SCU|에스씨유)?\s*만[.! ]*$/i.test(text)&&(follow.current?.revision===revision||goal))text+=' 팔아';
  const draft=manual.current;
  if(draft&&(draft.stamp!==revision||Date.now()>draft.until)){manual.current=null;choiceRef.current=null;setChoices([]);}
  if(manual.current&&cancelWord(text)){manual.current=null;choiceRef.current=null;setChoices([]);return t('미션 입력을 취소했어요.','Mission entry cancelled.');}
  if(applyWord(text)||cancelWord(text)){const p=pendingRef.current;if(p)return decide(p.id,applyWord(text));choiceRef.current=null;setChoices([]);return t('대기 중인 변경안이 없어요.','No pending change.');}
  const menu=choiceRef.current;
  if(menu?.stamp===revision){const ordinal=text.trim().match(/^([1-6])\s*(?:번|번째)?$/),pick=ordinal?menu.rows[Number(ordinal[1])-1]:menu.rows.find(r=>normalized(r.label)===normalized(text));
   if(pick){choiceRef.current=null;setChoices([]);return pick.choose();}}
  if(manual.current||startsSpokenContract(text)){
   proposal(null);choiceRef.current=null;setChoices([]);
   const draft=manual.current,field=draft?.airportQuestion;
   if(draft&&field){
    delete draft.airportQuestion;
    if(/^(?:그냥\s*)?(?:오리슨(?:까지만|으로만|만)|city only)[.! ]*$/i.test(text.trim())){delete draft.scope;return manualContract('');}
    if(/^(?:응|네|예|맞아(?:요)?|그래|yes|yep)[.! ]*$/i.test(text.trim())){draft.airport=field;delete draft.scope;return manualContract('');}
    delete draft.ids[field];delete draft.fields[field];draft.expected=field;
    if(/^(아니(?:요|야)?|no)[.! ]*$/i.test(text.trim()))return t('그럼 어느 거점인가요?','Which stop should I use?');
   }
   return manualContract(text);
  }
  if(/되돌|^undo/i.test(text)){const last=undoRef.current;if(!last?.undo)return t('되돌릴 변경이 없어요.','There is no copilot edit to undo.');return offer(t('직전 변경 되돌리기','Undo last route edit'),last.undo);}
  if(/여유|얼마나 더|free space/i.test(text)&&flight.active&&room===null)return sameShip?t('경로 전용 운항이거나 화물 수량이 미확인이라 매입 가능량을 계산할 수 없어요.','Route-only or unknown cargo quantities prevent a capacity estimate.'):t('운송과 개인 무역에 서로 다른 함선이 설정돼 있어요. 같은 함선으로 설정하면 합산할 수 있어요.','Freight and trade use different ships. Select the same ship for a combined estimate.');
  if(/추천|여유|얼마나 더|recommend|free space/i.test(text)&&!/판매|팔|sell|buyer/i.test(text))return recommendation;
  if(/다음.*(뭐|어디)|뭘 해|next (task|stop)/i.test(text))return [task,sale||tradeBrief].filter(Boolean).join(' / ')||recommendation;
  proposal(null);choiceRef.current=null;setChoices([]);
  if(/미션|계약|contract|mission/i.test(text)&&/추가|넣어|빼|제외|삭제|add|remove/i.test(text)){
   const remove=/빼|제외|삭제|remove/i.test(text);
   const candidates=remove?session.draft.jobs.filter(j=>!session.receiptReview?.excluded.includes(j.id)&&visits.some(v=>v.events.some(e=>e.missionId===j.id))):flight.receipts.cards.filter(j=>routeReady(j)&&!session.draft.jobs.some(old=>old.id===j.id));
   return choose(contractMatches(candidates,text),j=>j.title[en?1:0]+' · '+jobVolume(j)+' SCU',j=>preview(remove?{exclude:j.id}:{add:j},j.title[en?1:0]+' '+(remove?t('운항에서 제외','remove from flight'):t('운항에 추가','add to flight'))),t('어느 계약인가요? 번호로 답해 주세요.','Which contract? Say its number.'));
  }
  if(/^(?:(?:남은\s*)?(?:경로|항로)(?:를)?\s*(?:다시\s*(?:짜|계산)|재계산)(?:해)?(?:줘|주세요)?|recalculate (?:the )?route|reroute)[.!? ]*$/i.test(text.trim())){
   return preview({},t('현재 위치에서 남은 항로 재계산','Recalculate remaining route from current position'));
  }
  if(/판매처.*항로|항로에도 넣어|add sale stop/i.test(text)&&goal&&market){
   const term=market.terminals.find(x=>x.id===goal.terminalId),stop=term&&resolveTradeTerminal(term)?.point.id;
   if(!stop)return t('거래소에 대응하는 항법 좌표가 확인되지 않았어요. 거점 이름을 지정해 주세요.','Terminal coordinates are unconfirmed. Specify a stop.');
   const remaining=visits.filter(v=>!v.events.some(e=>e.type==='departure')).map(v=>v.locationId);
   if(remaining.includes(stop))return t('이미 남은 항로에 있는 판매처예요.','This buyer is already on your remaining route.');
   return preview({stops:[...remaining,stop]},t('판매처를 마지막 거점으로 추가','Add buyer after freight stops'));
  }
  if(/들러|경유|먼저 가|stop at|via /i.test(text)){
   const chunks=text.replace(/\s*(?:경유지?에서?\s*빼줘|경유지?\s*(?:추가|제외)|들러(?:줘)?|먼저 가|경유(?:해줘|해)?)\s*[.!?]?$/,'').replace(/^(?:stop at|via)\s+/i,'').split(/\s*다음에?\s*/);
   const find=(s:string,act:(id:string)=>string|Promise<string>)=>{const q=s.trim().replace(/(?:에서|에|을|를)$/,'');const hits=findPorts(q);const exact=hits.filter(p=>[p.id,p.name,name(p.id)].some(n=>normalized(n)===normalized(q)));return choose(exact.length?exact:hits,p=>name(p.id),p=>act(p.id),t('어느 거점인가요?','Which stop?'));};
   const modify=(id:string,anchor?:string)=>preview({stops:changeStops(visits.filter(v=>!v.events.some(e=>e.type==='departure')).map(v=>v.locationId),id,anchor,/빼|제외/.test(text))},t('남은 항로 변경','Edit remaining route'));
   return chunks.length===2?find(chunks[0]!,a=>find(chunks[1]!,id=>modify(id,a))):find(chunks[0]!,id=>modify(id));
  }
  if(/무역.*(출발|도착)|trade (depart|arrive)/i.test(text)&&activeTrade&&trade){
   const arriving=/도착|arrive/i.test(text),at=arriving?trade.target:goal?.terminalId;
   if(!at||(!arriving&&(trade.target!==null||trade.position===at)))return t('현재 위치와 무역 목표를 확인하세요.','Check the current position and sale target.');
   return tradeOffer({kind:'event',runId:activeTrade.id,event:{id:crypto.randomUUID(),kind:arriving?'arrive':'depart',at:new Date().toISOString(),terminalId:at,note:''}},terminal(at)+(arriving?t(' 무역 도착 기록',' · record trade arrival'):t(' 방면 무역 출발 기록',' · record trade departure')));
  }
  if(/샀어|매입했|매입 완료|bought/i.test(text)&&!/어디|팔|where/i.test(text)){
   if(!activeTrade||!trade||!market)return t('개인 무역 운항을 열고 거래소를 확인하세요.','Open a personal expedition and check its terminal.');
   if(trade.target!==null)return t('먼저 거래소 도착을 기록해 주세요.','Record arrival at the terminal first.');
   const amount=text.match(/([\d,]+)\s*(?:SCU|에스씨유)/i),price=text.match(/(?:단가|개당|at)\s*([\d,]+(?:\.\d+)?)/i);
   if(!amount||!price)return t('품목, 수량, 실제 단가를 알려 주세요. 예를 들어 “티타늄 8 SCU 단가 100에 샀어”예요.','Give the commodity, quantity and unit price, e.g. “bought titanium 8 SCU at 100”.');
   const units=Number(amount[1]!.replaceAll(',','')),total=Math.round(units*Number(price[1]!.replaceAll(',',''))*100)/100;
   if(!Number.isSafeInteger(units)||units<=0||!Number.isFinite(total)||total>trade.cash)return t('수량 또는 현재 무역 자본을 확인하세요.','Check the quantity and available cash.');
   if(units+personal>activeTrade.options.capacity)return t('개인 무역 함선의 적재 한도를 초과해요.','This exceeds the trade ship capacity.');
   const q=normalized(text),candidates=market.commodities.filter(c=>[c.name,goods(c.id)].some(n=>q.includes(normalized(n))));
   return choose(candidates,c=>goods(c.id),c=>{
    const record=(size:number)=>tradeOffer({kind:'event',runId:activeTrade.id,event:{kind:'buy',id:crypto.randomUUID(),at:new Date().toISOString(),lotId:crypto.randomUUID(),terminalId:trade.position,commodityId:c.id,ownership:'owned',quantity:units,boxSize:size,amount:total,note:''}},goods(c.id)+' '+units+' SCU · '+size+' SCU/'+t('상자','box')+' · '+total.toLocaleString()+' aUEC '+t('매입 기록','purchase')+(room!==null&&units>room?t(' · 다음 계약 픽업 전에 공간 확보 필요',' · free space before the next freight pickup'):''));
    const sizes=[1,2,4,8,16,24,32].filter(n=>units%n===0);
    return choose(sizes,n=>n+' SCU',record,t('실제로 실은 상자는 몇 SCU짜리인가요?','What size boxes did you load?'));
   },t('어떤 품목인가요?','Which commodity?'));
  }
  if(/팔|판매|sell|sold/i.test(text)){
   if(!trade||!activeTrade||!lots.length)return t('개인 무역 장부에 선내 화물을 먼저 등록해 주세요.','Register your cargo in the personal trade ledger first.');
   if(!market)return t('시세 자료를 준비 중이에요. 잠시 뒤 다시 요청하세요.','Market data is unavailable. Try again shortly.');
   const record=/팔았|판매 완료|sold/i.test(text),q=normalized(text);
   const remembered=follow.current?.revision===revision?follow.current:null;
   const mentioned=market.commodities.filter(c=>[goods(c.id),c.name].some(n=>n&&q.includes(normalized(n))));
   if(mentioned.length&&!mentioned.some(c=>lots.some(l=>l.commodityId===c.id)))return t('그 품목은 선내 개인 화물에 없어요. 거래 장부를 확인해 주세요.','That commodity is not aboard. Check the personal ledger.');
   const named=lots.filter(l=>[goods(l.commodityId),market.commodities.find(c=>c.id===l.commodityId)?.name].some(n=>n&&q.includes(normalized(n))));
   const quantity=text.match(/(\d[\d,]*)\s*(?:scu|에스씨유|만\s*팔|\s+팔았)/i);
   const opt=named.length?named:remembered?lots.filter(l=>l.id===remembered.lot):lots;
   return choose(opt,l=>goods(l.commodityId)+' '+l.quantity+' SCU · '+l.boxSize+' SCU/상자',async lot=>{
    const units=quantity?Number(quantity[1]!.replaceAll(',','')):lot.quantity;
    if(/어디|시세|추천|where|recommend/i.test(text))return compareSales(market,lot.commodityId,units);
    if(record){
     if(trade.target!==null)return t('장부에서 거래소 도착을 먼저 확인하세요.','Confirm arrival in the ledger first.');
     const unit=text.match(/(?:단가|개당|at)\s*([\d,]+(?:\.\d+)?)/i);
     if(!quantity||!unit){recordContext.current={lot:lot.id,revision};return t('실제 판매량과 단가가 얼마였나요? 예를 들어 “티타늄 80 SCU 단가 2000에 팔았어”라고 해 주세요.','Give the quantity and actual unit price, for example “sold titanium 80 SCU at 2000”.');}
     if(units<1||units>lot.quantity||units%lot.boxSize)return t('보유량과 상자 단위를 확인해 주세요.','Check the holding and box size.');
     const total=Math.round(units*Number(unit[1]!.replaceAll(',',''))*100)/100;
     return tradeOffer({kind:'event',runId:activeTrade.id,event:{id:crypto.randomUUID(),kind:'sell',at:new Date().toISOString(),lotId:lot.id,terminalId:trade.position,quantity:units,amount:total,note:''}},terminal(trade.position)+' · '+goods(lot.commodityId)+' '+units+' SCU · '+total.toLocaleString()+' aUEC '+t('판매 기록','sale entry'));
    }
    const terminals=market.terminals.filter(p=>[p.name,p.location,tradeLabel(p.name,'places',locale),tradeLabel(p.location,'places',locale)].some(n=>n&&q.includes(normalized(n))));
    if(!terminals.length&&remembered)return planSale(lot,remembered.at,units);
    if(!terminals.length&&goal&&goal.lotId===lot.id&&/거기|there|만\s*팔/.test(text))return planSale(lot,goal.terminalId,units);
    const candidates=terminals.length?terminals:market.terminals.filter(p=>market.quotes.some(row=>row.terminalId===p.id&&row.commodityId===lot.commodityId&&(row.sell??0)>0));
    return choose(candidates,p=>terminal(p.id),p=>planSale(lot,p.id,units),t('어느 거래소에서 팔까요?','Which terminal will you sell at?'));
   },t('어느 선내 화물인가요?','Which cargo lot?'));
  }
  return t('경유지 변경, 수신 계약 추가·제외, 판매 계획이나 실제 판매 기록을 말해 주세요.','Request a stop, add or remove a contract, plan a sale or record an actual sale.');
 }
 async function execute(command:string):Promise<string|void>{
  try{
   if(command.startsWith('copilot-say:')){const utterance=command.slice(12);++generation.current;const result=await interpret(utterance);setAnswer(result);return result;}
   const decision=/^copilot-(apply|cancel):(.+)$/.exec(command);
   if(decision){const result=await decide(decision[2]!,decision[1]==='apply');setAnswer(result);return result;}
   const quote=/^quote-(buy|sell):(\d+)(?::(\d+))?$/.exec(command);
   if(quote){const data=dock.read()?.market??market??await loadMarket();if(quote[1]==='sell'&&quote[3]){const response=await compareSales(data,Number(quote[2]),Number(quote[3]));setAnswer(response);return response;}await refreshCommodity(data,Number(quote[2])).catch(()=>{});return priceAnswer(marketWithRecentQuotes(data),quote[1] as 'buy'|'sell',Number(quote[2]),en,quote[3]?Number(quote[3]):undefined);}
   if(command==='complete-flight:'+stepId&&stepId){flight.progress('complete',session);return;}
   const view=dock.read();if(view){view.onCommand(command);return;}
   if(['open-flight','show-my-work','open-trade','show-prices'].includes(command))location.hash=(command==='open-flight'||command==='show-my-work'?'#/operations?lang=':'#/division?facility=trade&room='+(command==='show-prices'?'market':'trade-operations')+'&lang=')+locale;
  }catch(e){const message=e instanceof Error?e.message:stale();setAnswer(message);return message;}
 }
 const stepId=useMemo(()=>flight.active&&!flight.blocked&&!flight.busy&&!flight.receiptChanges.length&&visit?crypto.randomUUID():undefined,[session,flight.active,flight.blocked,flight.busy,flight.receiptChanges.length,visit]);
 const step=visit?.jumps[run?.jump??0]?'jump':visit?.events.some(e=>e.type==='departure')?'departure':visit?.events.every(e=>e.type==='pickup')?'pickup':visit?.events.every(e=>e.type==='delivery')?'delivery':'stop';
 function display():CompanionSummary{
  const view=dock.read()?.summary;
  const partner=plan||run||session.draft.partnerSelected||session.draft.partner==='navigator' ? (plan?.mode==='simple'?'operator':session.draft.partner) : undefined;
  if(view?.mode==='fleet')return {...view,partner};
  const fallback:CompanionSummary={mode:flight.active?'flight':'personal',title:t('운항 부조종사','Flight copilot'),lines:[task,sale].filter(Boolean),guidance:{task:(task||sale||tradeBrief).slice(0,220),destination:destination?name(destination.locationId):tradeBrief,load:task.slice(0,220)},step,stepId};
  const main=view??fallback,notes=[...(view?view.lines:[]),...(!view||view.mode!=='flight'?[task]:[]),sale||tradeBrief,suggestion].filter(Boolean);
  const jump=visit?.jumps[run?.jump??0];
  const events=jump||run?.finished?[]:(visit?.events??[]).filter(e=>(e.type==='pickup'||e.type==='delivery')&&!e.reservationContinuation);
  const navigation=main.mode==='flight'&&run&&plan?{
   destination:(run.finished?'':jump?jump.exitName:destination?name(destination.locationId):'').slice(0,100),
   ship:plan.ship.name.slice(0,100),shipArt:shipImageRecord(plan.ship.id)?.file??'',
   visitNumber:Math.min(run.index+1,plan.visits.length),visitCount:plan.visits.length,finished:!!run.finished,route:run.finished?[]:visits.slice(0,3).map(v=>name(v.locationId).slice(0,100)),
   cargo:events.slice(0,128).map(e=>({action:e.type as 'pickup'|'delivery',item:tradeLabel(e.commodity,'goods',locale).slice(0,100),scu:e.pickupQuantityUnknown||!e.scu?null:e.scu})),
   extra:Math.max(0,events.length-128)
  }:undefined;
  return {...main,navigation,partner,lines:[...new Set(notes.length?notes:[recommendation])].slice(0,6),guidance:{...main.guidance,task:[main.guidance?.task,sale,suggestion].filter(Boolean).join(' / ').slice(0,220)||recommendation.slice(0,220)}};
 }
 const status=useCompanionLink(enabled,{display,awaitingDetails:()=>manual.current?.stamp===live.current&&manual.current.until>Date.now(),proposal:pending?.id,proposalText:pending?.label,execute,clear});
 const linkLabel:Record<string,string>={connected:t('앱 연결됨','App connected'),older:t('음성 편집은 앱 업데이트 필요','Update app for voice editing'),offline:t('네비게이터 연결 대기','Waiting for companion'),busy:t('다른 탭 연결 중','Connected in another tab'),upgrade:t('앱 업데이트 필요','App update required'),connecting:t('연결 중','Connecting')};
 return <><button type="button" className="copilot-open" onClick={()=>show(true)}>{t('부조종사','Copilot')}</button>{opened&&createPortal(<dialog className="copilot-dialog" ref={dialog} onClose={()=>show(false)} aria-labelledby="copilot-heading"><header><h2 id="copilot-heading">{t('운항 부조종사','Flight copilot')}</h2><button onClick={()=>dialog.current?.close()}>{t('닫기','Close')}</button></header>
 <p className="copilot-position">{task||sale||recommendation}</p>{task&&sale&&<p>{sale}</p>}
 <p>{t('수신 계약','Received contracts')} {flight.receipts.cards.length} · {enabled?linkLabel[status]:t('웹에서 사용 중','Web only')}</p><button aria-pressed={enabled} onClick={()=>{if(enabled)clear();setEnabled(!enabled);}}>{enabled?t('네비게이터 연결 해제','Disconnect STAM Navigator'):t('네비게이터 연결','Connect STAM Navigator')}</button>
 <form onSubmit={e=>{e.preventDefault();if(input.trim())void execute('copilot-say:'+input.trim());setInput('');}}><label htmlFor="copilot-request">{t('부조종사에게 요청','Ask the copilot')}</label><div><input id="copilot-request" maxLength={160} value={input} onChange={e=>setInput(e.target.value)} placeholder={t('로어빌 다음에 에어리어18 들러','Stop at Lorville')}/><button>{t('전달','Send')}</button></div></form>
 <div className="copilot-actions">{[t('다음에 뭐 해?','Next task'),t('매입 여유 추천','Recommend free space'),t('새 미션 등록','New mission'),t('받은 미션 추가','Add received contract'),...(flight.active?[t('미션 제외','Remove contract'),t('경로 다시 짜줘','Recalculate route')]:[]),...(goal&&flight.active?[t('판매처를 항로에 추가','Add sale stop')]:[])].map(s=><button key={s} onClick={()=>void execute('copilot-say:'+s)}>{s}</button>)}</div>
 <p role="status" className="copilot-answer">{answer}</p>{choices.map((c,i)=><button key={i} onClick={()=>void execute('copilot-say:'+String(i+1))}>{i+1}. {c.label}</button>)}{pending&&<div className="copilot-actions"><button onClick={()=>void execute('copilot-apply:'+pending.id)}>{t('적용','Apply')}</button><button onClick={()=>void execute('copilot-cancel:'+pending.id)}>{t('취소','Cancel')}</button></div>}</dialog>,document.body)}</>;
}

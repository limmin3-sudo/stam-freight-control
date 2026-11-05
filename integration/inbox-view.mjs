import {connectLive} from './log/live-client.mjs';
import {locationIndex} from './log/locations.mjs';
import {inboxCards,cardDraft} from './inbox-core.mjs';
import {L} from '../i18n.mjs';
const el=(tag,copy,cls)=>{const n=document.createElement(tag);if(copy!==undefined)n.textContent=copy;if(cls)n.className=cls;return n;};
export function createInbox({places,missions,review,notify}){
 let source=null,index=null,state={blocked:false,cards:[]},phase='offline';const subscribers=new Set();
 const publish=()=>{for(const fn of subscribers)fn();};
 const project=()=>{state=inboxCards(source,places,index);publish();};
 const connection=el('button',L('로그 연결','Log connection'),'quiet inbox-connection');connection.type='button';document.querySelector('.topnav').prepend(connection);
 const settings=el('dialog',undefined,'inbox-settings');settings.innerHTML='<div class="dialog-title"><h2></h2><button type="button" aria-label="닫기">×</button></div><p class="inbox-link-status"></p><ol></ol><a class="button primary" rel="noopener"></a><p class="small subtle"></p>';document.body.append(settings);
 settings.querySelector('h2').textContent=L('관제 연결','Connect to control');settings.querySelector('button').onclick=()=>settings.close();
 for(const line of [L('연결 앱을 실행해 주세요.','Launch the companion app.'),L('StarCitizen / LIVE / Game.log를 선택해 주세요.','Select StarCitizen / LIVE / Game.log.'),L('앱이 연 관제에서 수신 계약을 확인하세요.','Review received contracts in the flight deck opened by the app.')])settings.querySelector('ol').append(el('li',line));
 const download=settings.querySelector('a');download.href='https://github.com/limmin3-sudo/stam-freight-control/releases/tag/app.1.2.0';download.textContent=L('연결 앱 다운로드','Download companion');
 fetch(new URL('../data/desktop-release.json',import.meta.url)).then(r=>{if(!r.ok)throw Error();return r.json();}).then(m=>{if(m.status!=='published'||!/^app\.\d+\.\d+\.\d+$/.test(m.version)||!Number.isSafeInteger(m.bytes)||m.bytes<=0||!/^[a-f0-9]{64}$/.test(m.sha256))return;const expected=`https://github.com/limmin3-sudo/stam-freight-control/releases/download/${m.version}/STAM-${m.version}-win-x64.zip`;if(m.url===expected)download.href=expected;}).catch(()=>{});
 settings.querySelector('.small').textContent=L('사이트와 앱은 따로 업데이트됩니다. 계약은 수신함에서 선택한 뒤 확인·저장합니다.','Website and app update separately. Choose a received contract, review it and save it.');
 connection.onclick=()=>settings.showModal();
 const label=()=>({offline:L('로그 연결','Log connection'),watching:L('로그 연결됨','Log connected'),'catching-up':L('계약 읽는 중','Reading contracts'),starting:L('연결 중','Connecting'),paused:L('로그 일시정지','Log paused'),'waiting-file':L('로그 대기','Waiting for log'),error:L('연결 확인','Check connection')})[phase]||L('연결 확인','Check connection');
 const refreshStatus=()=>{connection.textContent=label();connection.dataset.connected=String(['watching','catching-up'].includes(phase));settings.querySelector('.inbox-link-status').textContent=label();};refreshStatus();
 const live=connectLive({onSnapshot:s=>{source=s;project();},onStatus:s=>{if(phase!==s.phase){phase=s.phase;refreshStatus();publish();}},onError:()=>{phase='error';refreshStatus();publish();},onDisconnect:()=>{phase='offline';refreshStatus();publish();}});
 fetch(new URL('../data/log-location-index.json',import.meta.url)).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{index=locationIndex(d);project();}).catch(()=>{});
 async function openCard(id){const card=state.cards.find(c=>c.id===id);if(!card)return;try{const prior=missions().findIndex(m=>m.id===id);await review(cardDraft(card),prior);publish();}catch(e){notify(e.message,true);}}
 function mount(host,{onChange=()=>{}}={}){host.classList.add('contract-inbox');
  const header=el('div',undefined,'inbox-head'),title=el('h3',L('계약 수신함','Contract inbox')),count=el('span',undefined,'inbox-count');header.append(title,count);
  const status=el('p',undefined,'inbox-note'),cards=el('div',undefined,'inbox-cards');host.replaceChildren(header,status,cards);
  let previous='';const render=()=>{const stamp=JSON.stringify([state,phase,missions().map(m=>m.id)]);if(stamp===previous)return;previous=stamp;count.textContent=String(state.cards.filter(c=>!c.ended).length);status.textContent=state.blocked?L('여러 플레이어의 기록이 섞였습니다. 현재 Game.log를 다시 연결해 주세요.','Mixed player records. Reconnect your current Game.log.'):state.cards.length?L('계약을 골라 내용을 확인한 뒤 운송 계획에 넣으세요.','Choose a contract, review its details, then add it to your plan.'):live?L('게임에서 받은 계약을 기다리고 있습니다.','Waiting for contracts accepted in game.'):L('앱을 연결하면 받은 계약이 여기에 모입니다.','Connect the app to receive your contracts here.');cards.replaceChildren();
   for(const c of state.cards){const present=missions().some(m=>m.id===c.id),card=el('article',undefined,'inbox-card');card.dataset.id=c.id;
    const upper=el('div',undefined,'inbox-card-head'),badge=el('small',c.ended?L('계약 종료','Contract ended'):c.conflict?L('기록 확인 필요','Review records'):present?L('계획에 등록됨','Added to plan'):L('수신 완료','Received'));
    upper.append(badge,el('span',c.acceptedAt?new Date(c.acceptedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):''));card.append(upper,el('h4',c.title));
    const lines=el('div',undefined,'inbox-cargo');if(c.rows.length)for(const row of c.rows){const dest=places.find(p=>p.id===row.dropoffId)?.name||row._dropoffText||L('배송지 확인 필요','Confirm delivery');lines.append(el('p',`${row.commodity} · ${row.scu} SCU → ${dest}`));}else lines.append(el('p',L('화물·수량·거점을 확인해 주세요.','Review cargo, quantities and stops.')));
    card.append(lines);if(c.pickupNames.length)card.append(el('p',L('픽업 · ','Pickup · ')+c.pickupNames.join(' / '),'inbox-pickups'));
    const footer=el('div',undefined,'inbox-card-footer');footer.append(el('small',c.id.slice(0,8).toUpperCase()));const button=el('button',present?L('등록한 계약 확인','Review saved contract'):L('내용 확인','Review details'),'quiet');button.type='button';button.disabled=c.ended||c.conflict;button.onclick=()=>void openCard(c.id);footer.append(button);card.append(footer);cards.append(card);}
   onChange();
  };subscribers.add(render);render();return ()=>subscribers.delete(render);
 }
 const dock=el('section');document.querySelector('#contracts-dialog .desk-dialog-notice').after(dock);mount(dock);
 const badge=el('span',undefined,'inbox-launch-count');document.querySelector('#contracts-open b').append(badge);subscribers.add(()=>{const count=state.cards.filter(c=>!c.ended&&!missions().some(m=>m.id===c.id)).length;badge.textContent=count?String(count):'';badge.hidden=!count;});publish();
 return {mount,refresh:publish,cardCurrent(draft){const c=state.cards.find(c=>c.id===draft.id);return !!c&&!c.ended&&!c.conflict&&c.signature===draft._logInbox?.signature;},dispose(){live?.disconnect();settings.remove();}};
}

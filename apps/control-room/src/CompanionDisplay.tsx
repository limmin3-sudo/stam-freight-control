import {useEffect,useRef,useState} from 'react';
import type {Locale} from './navigation';
import {ApprovedGlass} from './ApprovedGlass';
import {useTradeView} from './use-trade-view';
export type CompanionSummary={mode:'personal'|'fleet'|'flight';title:string;lines:string[]};
export default function CompanionDisplay({summary,locale,onCommand}:{summary:CompanionSummary;locale:Locale;onCommand:(command:string)=>void}){
 const t=(k:string,e:string)=>locale==='en'?e:k,[enabled,setEnabled]=useTradeView('companion-enabled',false),[status,setStatus]=useState(''),current=useRef(summary),command=useRef(onCommand);
 current.current=summary;command.current=onCommand;
 useEffect(()=>{if(!enabled)return;let stopped=false,token='',sequence=0,after=0,timer:ReturnType<typeof setTimeout>,abort:AbortController|null=null;const session=crypto.randomUUID(),endpoint='http://127.0.0.1:23458';
  const request=async(path:string,body?:unknown,pair=false)=>{const controller=new AbortController();abort=controller;const timeout=setTimeout(()=>controller.abort(),4000);try{const response=await fetch(endpoint+path,{method:body?'POST':'GET',headers:pair?{'X-STAM-Client':'flight-deck'}:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal,credentials:'omit',redirect:'error'});const value=await response.json();if(!response.ok)throw Error(value.error||'offline');return value;}finally{clearTimeout(timeout);}};
  const poll=async()=>{try{if(!token){const p=await request('/api/pair',undefined,true);if(stopped)return;if(!/^[a-f0-9]{64}$/.test(p.token))throw Error('offline');token=p.token;const s=await request('/api/status');if(s.capabilities?.display!==2)throw Error('upgrade');}
   if(stopped)return;await request('/api/display',{session,sequence:++sequence,display:current.current});if(stopped)return;
   const result=await request('/api/commands?session='+encodeURIComponent(session)+'&after='+after);if(stopped)return;
   for(const row of result.commands??[]){if(Number.isSafeInteger(row.id)&&row.id>after){after=row.id;if(['open-trade','open-flight','show-prices','show-my-work'].includes(row.command))command.current(row.command);}}
   setStatus('connected');
  }catch(e){if(!stopped){const code=e instanceof Error?e.message:'offline';setStatus(code==='display-in-use'?'busy':code==='upgrade'?'upgrade':'offline');if(code!=='display-in-use')token='';}}finally{if(!stopped)timer=setTimeout(poll,2000);}};
  void poll();return()=>{stopped=true;clearTimeout(timer);abort?.abort();if(token){void fetch(endpoint+'/api/display',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({session,sequence:++sequence,clear:true}),credentials:'omit',keepalive:true}).catch(()=>{});}};
 },[enabled]);
 useEffect(()=>{const stop=()=>setEnabled(false);window.addEventListener('stam-account-boundary',stop);return()=>window.removeEventListener('stam-account-boundary',stop);},[]);
 return <details className="companion-display"><summary>{t('로그 앱 오버레이','Companion overlay')}{enabled?' · '+({connected:t('연결됨','Connected'),busy:t('다른 탭 사용 중','In use by another tab'),upgrade:t('새 앱 필요','App update required'),offline:t('앱 연결 대기','Waiting for app')}[status]||t('연결 중','Connecting')):''}</summary><p>{t('게임 실행 후 로그 앱을 켜고 연결하세요. 선택한 교역의 요약만 앱에 표시합니다. 단축키·음성은 STAM 화면 조회만 조작합니다.','Start the game and companion first. Only this operation’s summary is displayed. Shortcuts and voice control STAM views and queries.')}</p><button type="button" className="market-action" aria-pressed={enabled} onClick={()=>setEnabled(v=>!v)}><ApprovedGlass/>{enabled?t('표시 연결 해제','Disconnect display'):t('이 화면을 로그 앱에 표시','Show this view in companion')}</button><p className="suite-note">{t('앱 트레이의 오버레이·단축키·음성 설정에서 켜고 끌 수 있습니다. 웹 화면을 닫으면 표시가 자동 해제됩니다.','Use the app tray for overlay, shortcut and voice settings. The display clears when the web view closes.')}</p></details>;
}

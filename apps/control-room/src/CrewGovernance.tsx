import {useEffect,useState} from 'react';
import type {CrewOperation} from '../../../crew-trade.mjs';
import type {CrewCloudClient} from '../../../crew-cloud.mjs';
import type {FreightRow} from '../../../freight-cloud.mjs';
import type {Locale} from './navigation';
import {useFreightCloud} from './use-freight-cloud';
import {ApprovedGlass} from './ApprovedGlass';
export default function CrewGovernance({op,cloud,locale,view}:{op:CrewOperation;cloud:CrewCloudClient;locale:Locale;view:'chat'}){
 const t=(k:string,e:string)=>locale==='en'?e:k,s=useFreightCloud(),[text,setText]=useState(''),[rows,setRows]=useState<FreightRow[]>([]),[past,setPast]=useState<FreightRow[]>([]),[oldest,setOldest]=useState(''),[older,setOlder]=useState(true),[announcement,setAnnouncement]=useState(false);const manager=op.ownerUid===cloud.uid;
 useEffect(()=>{if(!s.client||view!=='chat')return;return s.client.watch('crewTrades/'+op.id+'/chat',r=>setRows([...r].reverse()),()=>s.setMessage(t('대화를 읽지 못했습니다. 연결을 확인하세요.','Unable to read chat. Check your connection.')));},[s.client,op.id,view]);
 const button=(label:string,fn:()=>void,disabled=false)=><button type="button" className="market-action" disabled={s.busy||disabled} onClick={fn}><ApprovedGlass/><span>{label}</span></button>;
 return <section><h3>{t('대화·공지','Chat and announcements')}</h3>{s.error&&<p role="alert">{t('연결 또는 권한을 확인하세요.','Check connection or permissions.')} {s.error}</p>}{s.message&&<p role="status">{s.message}</p>}
 <>{older&&rows.length>=50&&button(t('이전 대화 더 읽기','Earlier messages'),()=>void s.act(async(c,check)=>{const p=await c.page('crewTrades/'+op.id+'/chat',[],oldest||rows[0]!.id,'at');check();setPast(v=>[...p.rows.reverse(),...v]);setOldest(p.next);setOlder(!!p.next);}))}<ol className="fleet-chat">{[...past.filter(r=>!rows.some(x=>x.id===r.id)),...rows].map(r=><li key={r.id}><strong>{r.name}{r.announcement?' · '+t('공지','Announcement'):''}</strong> <time>{new Date(r.at).toLocaleTimeString()}</time><p>{r.text}</p></li>)}</ol><label>{t('메시지','Message')}<textarea value={text} maxLength={1500} onChange={e=>setText(e.target.value)}/></label>{manager&&<label><input type="checkbox" checked={announcement} onChange={e=>setAnnouncement(e.target.checked)}/>{t('공지로 표시','Mark as announcement')}</label>}{button(t('보내기','Send'),()=>void s.act(async(c,check)=>{await c.command({action:'message',operationId:op.id,text,announcement});check();setText('');}),!text.trim()||op.phase==='settled')}</>
 </section>;
}

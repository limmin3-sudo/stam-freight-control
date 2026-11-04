import {ACCOUNT_META} from '../../sync.mjs';
function canonical(value){
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('안내 계획에 유효하지 않은 수치가 있습니다.');return value;}
 if(Array.isArray(value))return value.map(v=>v===undefined?null:canonical(v));
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>[k,canonical(value[k])]));
 throw Error('안내 계획 형식을 확인하지 못했습니다.');
}
// Hash only the recalculated plan, not observed progress, raw log lines or wall-clock animation time.
export async function guidanceFingerprint(plan,evidence=[]){
 const value={version:1,evidence:[...evidence].sort(),scope:plan.scope,ship:plan.ship,partner:plan.partner,contracts:plan.contracts?.map(c=>c.id).sort(),route:plan.route,packing:plan.packing,rows:plan.rows,cargoRows:plan.cargoRows,routeEvidence:plan.routeEvidence};
 const bytes=new TextEncoder().encode(JSON.stringify(canonical(value)));if(bytes.length>8*1024*1024)throw Error('안내 계획이 커서 이어가기 기록을 만들지 못했습니다.');
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
function checked(record){
 if(record===null)return null;
 if(!record||Object.keys(record).some(k=>!['hash','leg','at'].includes(k))||typeof record.hash!=='string'||!/^[a-f0-9]{64}$/.test(record.hash)||!Number.isSafeInteger(record.leg)||record.leg<1||record.leg>256||typeof record.at!=='string'||!Number.isFinite(Date.parse(record.at)))throw Error('안내 이어가기 기록을 읽지 못했습니다.');
 return {hash:record.hash,leg:record.leg,at:record.at};
}
export function resumableGuidance(saved,hash,visitCount){return !!saved&&saved.hash===hash&&Number.isSafeInteger(saved.leg)&&saved.leg>=1&&saved.leg<visitCount;}
export function createGuidanceStore(storage){
 const owner=()=>{const raw=storage?.getItem(ACCOUNT_META);if(!raw)return 'guest';const v=JSON.parse(raw);if(!v||typeof v.uid!=='string'||!v.uid||v.uid.length>256)throw Error('계정을 확인하지 못했습니다.');return v.uid;};
 let initial,key,raw,record=null,error;
 try{if(!storage)throw Error();initial=owner();key='stam-guidance-v1:'+encodeURIComponent(initial);raw=storage.getItem(key);if(raw){if(raw.length>4096)throw Error();const v=JSON.parse(raw);if(v.version!==1||Object.keys(v).some(k=>!['version','record'].includes(k)))throw Error();record=checked(v.record);}}
 catch{error='안내 이어가기 기록을 불러오지 못했습니다. 이전 단계는 복원하지 않습니다.';}
 function check(){if(error)throw Error(error);if(owner()!==initial)throw Error('계정이 바뀌었습니다. 안내 기록을 저장하려면 화면을 다시 열어 주세요.');if(storage.getItem(key)!==raw)throw Error('다른 창에서 안내 기록이 바뀌었습니다. 새로고침해 주세요.');}
 function save(next){check();const clean=checked(next),text=JSON.stringify({version:1,record:clean});try{storage.setItem(key,text);}catch{throw Error('안내 단계를 저장하지 못했습니다. 이전 기록은 유지됩니다.');}record=clean;raw=text;}
 return {snapshot(){try{check();return {record:structuredClone(record),error:null};}catch(e){return {record:null,error:e.message};}},save,clear(){save(null);}};
}

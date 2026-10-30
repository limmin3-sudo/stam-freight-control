import {matchLocation,translateKoTerms,norm} from './aliases.mjs';
const normalize=s=>String(s||'').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'');
const clean=s=>s.replace(/\b5CU\b/gi,'SCU').replace(/(\d+\s*\/\s*\d+)\s*504\b/g,'$1 SCU').replace(/[“”]/g,'"').replace(/[’]/g,"'");
// Korean client titles: "링 가문 신입 화물 운송 - 소량 화물 [BP] [100 평판]", "DEAD SAINTS - 신입 Rank - 중형 Cargo Haul" + "[100 평판]" on the next line.
function koTitle(lines){const i=lines.findIndex(l=>/(?:운송|배송|수송)\s*[-–]|\[[\d,\s~-]+평판\s*\]|Cargo\s+(?:Haul|Run)|계약자\s*필요/i.test(l)&&!/SCU|하십시오|^\s*(?:보상|계약)/.test(l));if(i<0)return '';
 if(/^\s*\[/.test(lines[i])&&i>0)return lines[i-1]+' '+lines[i];return /\]\s*$/.test(lines[i])||!/^\s*\[[\d,\s~-]+평판\s*\]/.test(lines[i+1]||'')?lines[i]:lines[i]+' '+lines[i+1];}

export function parseMissionText(text,locations=[]){
 text=clean(text);const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),warnings=[];
 const company=(text.match(/Red Wind(?: Linehaul)?|Covalex(?: Shipping)?|Ling Family(?: Hauling)?|Dead Saints|Citizens for Prosperity|Quasi Vex|QV Logistics|레드\s*윈드|코발렉스|링\s*가문|데드\s*세인츠/i)||[])[0]||'';
 const title=(text.match(/(?:Title|Contract Name|미션명)\s*[:：]\s*([^\n]+)/i)||[])[1]||lines.find(l=>/\b(?:Junior|Rookie|Member|Senior|Master|Experienced|Direct|Planetary|Interstellar|Solar)\b.*\b(?:Haul|Transport|Delivery)\b/i.test(l))||koTitle(lines)||'';
 const missionId=(text.match(/(?:Mission|Contract)\s*(?:ID|#)\s*[:：]?\s*([\w-]{3,80})/i)||[])[1]||null;
 const rewardMatch=text.match(/(?:Reward|Payout|Payment|보상)\s*[:：]?\s*[¤$€]?\s*([\d,]+)/i)||text.match(/([\d,]+)\s*aUEC/i),reward=rewardMatch?Number(rewardMatch[1].replaceAll(',','')):0;
 const timer=text.match(/(?:Time Remaining|Time Left|남은\s*시간)\s*[:：]?\s*(?:(\d+)\s*(?:h|시간)\s*)?(?:(\d+)\s*(?:m|min|분)\s*)?(?:(\d+)\s*(?:s|초))?/i);const remainingMinutes=timer&&(timer[1]||timer[2]||timer[3])?Number(timer[1]||0)*60+Number(timer[2]||0)+Number(timer[3]||0)/60:null;
 const maxBox=Number((text.match(/(?:max(?:imum)?\s*(?:container|box)(?:\s*size)?|containers?\s*(?:up to|of)|최대\s*(?:상자|컨테이너))\s*[:：]?\s*(1|2|4|8|16|24|32)\s*SCU/i)||[])[1])||null;
 function locationIn(s){
  // "파이로 II의 선셋 메사": the site after "의" beats the planet in front of it.
  const body=l=>['Planet','Moon','Star'].includes(l?.type);let fallback=null;
  // "[Shallow Fields]": the English name the game shows in brackets is the most reliable part.
  const bracket=norm((String(s).match(/\[([A-Za-z][^\]]{3,})\]/)||[])[1]||'');
  if(bracket.length>=6){const hits=locations.filter(l=>!body(l)&&norm(l.name).includes(bracket));if(hits.length===1)return hits[0].id;}
  const site=String(s).replace(/\[[^\]]*\]/g,'').split(/의\s+|에\s*있는\s+/).pop().trim();
  for(const q of [s,translateKoTerms(s),site,translateKoTerms(site)]){const m=matchLocation(q,locations);if(m&&!body(m))return m.id;fallback??=m;}
  for(const q of [translateKoTerms(site),site]){const m=matchLocation(q,locations,{fuzzy:true});if(m&&!body(m))return m.id;}
  // OCR may garble the Korean part; a unique English/number tail ("Mining Area 056") still identifies the site.
  const tail=norm((translateKoTerms(site).match(/[A-Za-z0-9][A-Za-z0-9 '\-]*$/)||[''])[0]);
  if(tail.length>=6){const hits=locations.filter(l=>!body(l)&&norm(l.name).includes(tail));if(hits.length===1)return hits[0].id;}
  return fallback?.id||'';
 }
 const koreanCargo=[];let returnId='';
 for(let i=0;i<lines.length;i++){const line=lines[i],block=lines.slice(i,i+3).join(' ');if(/복귀|return to/i.test(line)){returnId=locationIn(line)||returnId;continue;}if(!/SCU/i.test(line))continue;const d=block.match(/(.+?)\s*(?:\d+\s*\/\s*)?([\d,]+)\s*SCU\s+(.+?)\s*(?:에|으로)\s*배송/i);if(!d)continue;const commodity=d[1].replace(/^[^\p{L}]+/u,'').replace(/(?:[을를]\s*\([을를]\)|\([을를]\)|[을를])\s*$/u,'').trim();const pj=[i+1,i+2,i+3,i+4].find(j=>/에서/.test(lines[j]||'')&&/접수|수령|수집/.test((lines[j]||'')+' '+(lines[j+1]||''))&&!/SCU/i.test(lines[j]||'')),pickup=pj===undefined?'':lines[pj];koreanCargo.push({commodity,scu:Number(d[2].replaceAll(',','')),pickupId:pickup?locationIn(pickup.split('에서')[0]):'',dropoffId:locationIn(d[3]),maxBoxSize:maxBox,boxes:[],_boxesOrigin:'unknown'});}
 if(koreanCargo.length){if(!title)warnings.push('사진에 미션 이름이 없으면 처음 한 번 입력하세요.');warnings.push('배송 SCU를 읽었습니다. 실제 상자 구성은 따로 확인하세요.');return {missionId,title,company,reward,remainingMinutes,cargo:koreanCargo,returnId,warnings,rawText:text};}
 const action=/^(?:[•*\-\s\d.)]*)(Collect|Pick\s*up|Deliver|수령|수집|배송|배달|납품)\b/i,starts=[];lines.forEach((line,i)=>{const m=line.match(action);if(m)starts.push({index:i,type:/deliver|배송|배달|납품/i.test(m[1])?'delivery':'pickup'});});
 const objectives=starts.map((a,i)=>{const block=lines.slice(a.index,Math.min(starts[i+1]?.index??lines.length,a.index+6)).join(' '),quantity=block.match(/(?:\d+\s*\/\s*)?([\d,]+)\s*SCU\b/i);const scu=quantity?Number(quantity[1].replaceAll(',','')):null;let commodity=(block.match(/SCU\s+(?:of\s+)?(.+?)\s+(?:from|to|at)\s+/i)||[])[1]||'';if(!commodity)commodity=(block.match(/(?:collect|pick\s*up|deliver)\s+(.+?)\s+(?:from|to)\s+/i)||[])[1]||'';commodity=commodity.replace(/^\d+\s*\/\s*\d+\s*/,'').trim();if(commodity.length>100)commodity='';return {type:a.type,scu,commodity,locationId:locationIn(block),block};}).filter(o=>o.scu!==null||o.locationId);
 const pickups=objectives.filter(o=>o.type==='pickup'),deliveries=objectives.filter(o=>o.type==='delivery');let cargo=[];
 const record=(p,d)=>({commodity:d?.commodity||p?.commodity||'',scu:d?.scu??p?.scu??null,pickupId:p?.locationId||'',dropoffId:d?.locationId||'',maxBoxSize:maxBox,boxes:[],_boxesOrigin:'unknown'});
 if(pickups.length===1&&deliveries.length) cargo=deliveries.map(d=>record(pickups[0],d));
 else if(deliveries.length===1&&pickups.length)cargo=pickups.map(p=>({...record(p,deliveries[0]),scu:p.scu}));
 else if(pickups.length&&deliveries.length)cargo=deliveries.map(d=>{const matches=pickups.filter(p=>normalize(p.commodity)===normalize(d.commodity)&&p.scu===d.scu);if(matches.length!==1)warnings.push('픽업지와 배송지가 여러 개입니다. 연결을 확인하세요.');return record(matches.length===1?matches[0]:null,d);});
 else cargo=(deliveries.length?deliveries:pickups).map(o=>o.type==='pickup'?record(o,null):record(null,o));
 if(!cargo.length){cargo=[{commodity:'',scu:null,pickupId:'',dropoffId:'',maxBoxSize:maxBox,boxes:[],_boxesOrigin:'unknown'}];warnings.push('운송 목표를 확실히 읽지 못했습니다. 원문을 보며 빈 항목을 채우세요.');}
 if(!title)warnings.push('미션 이름을 확인하세요.');if(cargo.some(c=>!c.pickupId||!c.dropoffId))warnings.push('픽업지·배송지를 확인하세요.');if(cargo.some(c=>!c.scu))warnings.push('읽히지 않은 SCU를 입력하세요.');warnings.push('스샷에 없는 상자 크기·개수는 따로 확인하세요.');
 return {missionId,title,company,reward,remainingMinutes,cargo,returnId,warnings:[...new Set(warnings)],rawText:text};
}
let libraryPromise,workerPromise,activeLanguage,activeWorker;
function loadLibrary(){if(globalThis.Tesseract)return Promise.resolve(globalThis.Tesseract);if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';s.onload=()=>resolve(globalThis.Tesseract);s.onerror=()=>{libraryPromise=null;reject(Error('글자 인식 기능을 불러오지 못했습니다. 인터넷 연결을 확인하거나 직접 입력하세요.'));};document.head.append(s);});return libraryPromise;}
export async function recognizeImage(image,{language='eng',onProgress=()=>{}}={}){
 const T=await loadLibrary();if(workerPromise&&activeLanguage!==language){await stopOCR();}if(!workerPromise){activeLanguage=language;workerPromise=T.createWorker(language==='eng'?['eng']:['eng','kor'],1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',logger:m=>activeWorker?.progress?.(m),errorHandler:()=>{}}).then(w=>{activeWorker={worker:w,progress:onProgress};return w;});}const w=await workerPromise;activeWorker.progress=onProgress;await w.setParameters({tessedit_pageseg_mode:T.PSM.AUTO,preserve_interword_spaces:'1'});const r=await w.recognize(image);return r.data;
}
export async function stopOCR(){if(workerPromise){try{const w=await workerPromise;await w.terminate();}catch{}}workerPromise=null;activeWorker=null;}

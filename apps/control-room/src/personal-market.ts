import type {MarketSnapshot,Quote} from './trade-data.ts';
export type PersonalReport={id:string;terminalId:number;commodityId:number;buy:number|null;sell:number|null;stock:number|null;demand:number|null;containers:number[];observedAt:string;version:string;note:string};
export const personalMarketKey='stam.personal-market.tab.v1',personalMarketEvent='stam-personal-market';
export function validatePersonalReport(r:PersonalReport,data:MarketSnapshot,now=Date.now()){
 if(!r||typeof r.id!=='string'||!r.id||!data.terminals.some(t=>t.id===r.terminalId)||!data.commodities.some(c=>c.id===r.commodityId)||[r.buy,r.sell,r.stock,r.demand].some(n=>n!==null&&(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1e9))||r.buy===null&&r.sell===null||!Array.isArray(r.containers)||!r.containers.length||r.containers.some(n=>![1,2,4,8,16,24,32].includes(n))||new Set(r.containers).size!==r.containers.length||!Number.isFinite(Date.parse(r.observedAt))||Date.parse(r.observedAt)>now+300000||r.version!==data.liveVersion||typeof r.note!=='string'||r.note.length>1000)throw Error('report');return r;
}
export function readPersonalReports(data:MarketSnapshot):PersonalReport[]{try{const rows=JSON.parse(sessionStorage.getItem(personalMarketKey)??'[]');if(!Array.isArray(rows)||rows.length>500)return [];return rows.filter(r=>{try{validatePersonalReport(r,data);return true;}catch{return false;}});}catch{return [];}}
export function savePersonalReports(rows:PersonalReport[],data:MarketSnapshot){rows.forEach(r=>validatePersonalReport(r,data));const result=new Map(readPersonalReports(data).map(r=>[r.terminalId+':'+r.commodityId,r]));for(const r of rows)result.set(r.terminalId+':'+r.commodityId,r);if(result.size>500)throw Error('size');sessionStorage.setItem(personalMarketKey,JSON.stringify([...result.values()]));window.dispatchEvent(new Event(personalMarketEvent));}
export function personalMarket(data:MarketSnapshot,rows:PersonalReport[]):MarketSnapshot{
 const q=new Map(data.quotes.map(q=>[q.terminalId+':'+q.commodityId,q]));let serial=Math.max(0,...data.quotes.map(q=>q.id))+1;
 for(const r of rows){validatePersonalReport(r,data);const key=r.terminalId+':'+r.commodityId,old=q.get(key);const quote:Quote={id:old?.id??serial++,terminalId:r.terminalId,commodityId:r.commodityId,buy:r.buy&&r.buy>0?r.buy:null,sell:r.sell&&r.sell>0?r.sell:null,stock:r.stock,demand:r.demand,containers:r.containers,version:r.version,updatedAt:r.observedAt,personal:true};q.set(key,quote);}return {...data,quotes:[...q.values()]};
}
// RFC 4180 fields, including escaped quotes and embedded newlines. IDs are mandatory:
// names never silently resolve to a similarly named terminal or commodity.
export function parseMarketCsv(text:string,data:MarketSnapshot):PersonalReport[]{
 if(new TextEncoder().encode(text).length>1000000)throw Error('size');let field='',row:string[]=[],quoted=false;const rows:string[][]=[];text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<=text.length;i++){const c=text[i]??'\n';if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else if(quoted)quoted=false;else if(!field)quoted=true;else throw Error('csv');}else if(c===','&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);field='';if(row.some(c=>c.trim()))rows.push(row);row=[];}else field+=c;}
 if(quoted||rows.length<2||rows.length>501)throw Error('csv');const header=rows.shift()!.map(h=>h.trim());if(new Set(header).size!==header.length||!['terminal_id','commodity_id','buy','sell','stock','demand','containers','observed_at','version','price_unit'].every(k=>header.includes(k)))throw Error('headers');
 return rows.map((cells,i)=>{if(cells.length!==header.length)throw Error('columns');const v=Object.fromEntries(header.map((k,j)=>[k,cells[j]!.trim()]));if(!['SCU','UNIT'].includes(v.price_unit!))throw Error('unit');const n=(k:string)=>{const s=v[k]!;if(s==='')return null;if(!/^\d+(\.\d+)?$/.test(s))throw Error('number');return Number(s);};const mul=v.price_unit==='UNIT'?100:1,buy=n('buy'),sell=n('sell');return validatePersonalReport({id:`csv:${Date.now()}:${i}`,terminalId:Number(v.terminal_id),commodityId:Number(v.commodity_id),buy:buy===null?null:buy*mul,sell:sell===null?null:sell*mul,stock:n('stock'),demand:n('demand'),containers:v.containers!.split('|').map(Number),observedAt:v.observed_at!,version:v.version!,note:v.note??''},data);});
}

export function draftPriceText(text:string,data:MarketSnapshot):Partial<PersonalReport>{
 const lines=text.split(/\r?\n/).map(s=>s.trim().toLocaleLowerCase()).filter(Boolean);
 const exact=(name:string)=>lines.some(s=>s===name.toLocaleLowerCase()||s===`commodity: ${name.toLocaleLowerCase()}`||s===`terminal: ${name.toLocaleLowerCase()}`);
 const goods=data.commodities.filter(c=>exact(c.name)),terms=data.terminals.filter(t=>exact(t.name)||exact(t.location));
 const result:Partial<PersonalReport>={};if(goods.length===1)result.commodityId=goods[0]!.id;if(terms.length===1)result.terminalId=terms[0]!.id;
 // Only labels with explicit units are suggested. Bare numbers and ambiguous decimal commas stay unknown.
 for(const [key,label,unit] of [['buy','buy|purchase|구매','auec/scu'],['sell','sell|판매','auec/scu'],['stock','stock|재고','scu'],['demand','demand|수요','scu']] as const){
  const re=new RegExp(`^(?:${label})\\s*[:=]?\\s*((?:[0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)(?:\\.[0-9]+)?)\\s*${unit}$`,'i');
  const values=lines.flatMap(line=>{const m=line.match(re);return m?[Number(m[1]!.replaceAll(',',''))]:[];});if(values.length===1)result[key]=values[0]!;
 }return result;
}

import korean from '../../../data/stam-korean.json' with {type:'json'};
import type {Job,Name} from './mission-trial';

export type ContractFields=Partial<Record<'from'|'to'|'cargo'|'quantity',string>>;
export const contractFields=['from','to','cargo','quantity'] as const;
const labels:Record<string,keyof ContractFields>={픽업지:'from',출발지:'from',배송지:'to',도착지:'to',물품:'cargo',품목:'cargo',화물명:'cargo',수량:'quantity',pickup:'from',destination:'to',dropoff:'to',commodity:'cargo',quantity:'quantity'};
const labelPattern=/(픽업지|출발지|배송지|도착지|물품|품목|화물명|수량)(?:은|는|이|가)?\s*[:：]?\s*|\b(pickup|destination|dropoff|commodity|quantity)\s*[:：]?\s+/gi;
const clean=(s:string)=>s.trim().replace(/^[,，: ]+|[,，.!? ]+$/g,'');
const entry=/^(?:나(?:는)?\s+)?(?:새\s*)?(?:수동\s*)?(?:운송|미션|계약)\s*(?:직접\s*)?(?:등록|추가|입력)(?:해\s*(?:줘|주세요)|\s*하고\s*싶어(?:요)?)?|^(?:create|new|manual) (?:mission|contract)\b/i;
export function startsSpokenContract(text:string){
 return entry.test(text.trim())||/(?:픽업지|출발지).*(?:배송지|도착지)|에서.+(?:으로|로)\s+.+(?:scu|에스씨유)/i.test(text);
}
export function readContractFields(input:string,expected?:keyof ContractFields):ContractFields{
 const s=clean(input.trim().replace(entry,'').replace(/\s*(?:미션|계약)\s*(?:추가|등록)(?:해\s*(?:줘|주세요))?[.!?]?$/,''));
 const out:ContractFields={};
 const matches=Array.from(s.matchAll(labelPattern));
 for(const [i,m] of matches.entries()){
  const value=clean(s.slice(m.index!+m[0].length,matches[i+1]?.index??s.length));
  if(value)out[labels[(m[1]||m[2]!).toLowerCase()]!]=value;
 }
 if(matches.length){
  if(out.cargo&&!out.quantity){
   const amount=out.cargo.match(/^(.+?)\s+([\d,]+|[일이삼사오육칠팔구십백천만]+)\s*(?:scu|에스씨유)$/i);
   if(amount){out.cargo=amount[1];out.quantity=amount[2];}
  }
  return out;
 }
 const freight=s.match(/^(.+?)에서\s*(.+?)\s+([\d,]+|[일이삼사오육칠팔구십백천만]+)\s*(?:scu|에스씨유)\s*(?:를|을)?\s*(?:실어서|싣고|실어(?:서)?|픽업해서)\s*(.+?)(?:으로|로|까지|에)?\s*(?:가는\s*거(?:야|예요)|가(?:줘|요)?|배송(?:해줘)?|배달(?:해줘)?)$/i);
 if(freight)return {from:clean(freight[1]!),cargo:clean(freight[2]!),quantity:freight[3],to:clean(freight[4]!)};
 const pickup=s.match(/^(.+?)에서\s*(.+?)\s+([\d,]+|[일이삼사오육칠팔구십백천만]+)\s*(?:scu|에스씨유)(?:\s*(?:를|을)?\s*(?:실어서|싣고|실어|실었어|픽업해))?$/i);
 const natural=s.match(/^(.+?)에서\s*(.+?)(?:으로|로)\s+(.+?)\s+([\d,]+|[일이삼사오육칠팔구십백천만]+)\s*(?:scu|에스씨유)(?:\s*(?:운송|배송)(?:해줘)?)?$/i)
  ??s.match(/^from (.+?) to (.+?) (?:with |carrying )(.+?)\s+([\d,]+)\s*scu$/i);
 if(natural)return {from:clean(natural[1]!),to:clean(natural[2]!),cargo:clean(natural[3]!),quantity:natural[4]};
 if(pickup)return {from:clean(pickup[1]!),cargo:clean(pickup[2]!),quantity:pickup[3]};
 if(expected&&s)out[expected]=expected==='from'?s.replace(/에서$/,''):expected==='to'?s.replace(/(?:으로|까지)$/,''):s;
 return out;
}
export function spokenScu(input:string){
 const value=input.replace(/\s+/g,'').replace(/(?:scu|에스씨유)$/i,'');
 let total=0;
 if(/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(value))total=Number(value.replaceAll(',',''));
 else if(value==='만'||value==='일만')total=10000;
 else if(/^(?:[일이삼사오육칠팔구]?천)?(?:[일이삼사오육칠팔구]?백)?(?:[일이삼사오육칠팔구]?십)?[일이삼사오육칠팔구]?$/.test(value)){
  let digit=0;for(const c of value){const unit=({십:10,백:100,천:1000} as Record<string,number>)[c];if(unit){total+=(digit||1)*unit;digit=0;}else digit=' 일이삼사오육칠팔구'.indexOf(c);}total+=digit;
 }
 return Number.isSafeInteger(total)&&total>0&&total<=10000?total:null;
}
const cargoNames=new Map<string,Name>();
for(const [en,ko] of Object.entries(korean.goods)){
 const pair:Name=[ko,en];cargoNames.set(en.toLowerCase(),pair);if(!cargoNames.has(ko))cargoNames.set(ko,pair);
}
export function spokenJob(from:string,to:string,cargo:string,scu:number):Job{
 const id=crypto.randomUUID(),title:Name=cargoNames.get(cargo.toLowerCase())??[cargo,cargo];
 return {id,title,pay:0,rewardUnknown:true,shipments:[{id:id+'-1',from,to,cargo:title,scu}]};
}

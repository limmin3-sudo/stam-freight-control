import type {Locale} from './navigation';
import {placeName,places} from './mission-trial';
import type {Job,Shipment} from './mission-trial';
import {PortSearch} from './PortSearch';

export type BoxCounts=NonNullable<Shipment['boxes']>;
export function BoxInputs({boxes=[],onChange}:{boxes?:BoxCounts;onChange:(boxes:BoxCounts)=>void}){
  return <>{[1,2,4,8,16,24,32].map(size=><label key={size}>{size} SCU<input type="number" min="0" max="10000"
    value={boxes.find(b=>b.size===size)?.count||''} onChange={e=>{
      const count=Number(e.target.value);
      const next=boxes.filter(b=>b.size!==size);
      if(Number.isSafeInteger(count)&&count>0)next.push({size,count});
      onChange(next);
    }}/></label>)}</>;
}

const boxTotal=(row:Shipment)=>(row.boxes||[]).reduce((sum,b)=>sum+b.size*b.count,0);
export function invalidCargo(form:Job, n:0|1, quantityOptional:(row:Shipment)=>boolean){
  return !form.shipments.length || form.shipments.some(row=>!places[row.from] || !places[row.to] || row.from===row.to || !row.cargo[n].trim() || (row.scu<1 && !quantityOptional(row)) || !!row.boxes?.length && boxTotal(row)!==row.scu);
}

type Props={form:Job;locale:Locale;setForm:(job:Job)=>void;quantityOptional:(row:Shipment)=>boolean;cargoOnly?:boolean;autoFocus?:boolean};
export function ContractFields({form,locale,setForm,quantityOptional,cargoOnly=false,autoFocus=true}:Props){
  const n=locale==='ko'?0:1;
  const t=(ko:string,en:string)=>locale==='en'?en:ko;
  const where=(place:string)=>placeName(place,n);
  const updateRow=(id:string,patch:Partial<Shipment>)=>setForm({...form,shipments:form.shipments.map(row=>row.id===id?{...row,...patch}:row)});
  return <>
        <label>{t('계약명','Contract name')}<input readOnly={cargoOnly} autoFocus={autoFocus&&!cargoOnly} maxLength={70} value={form.title[n]} onChange={e=>setForm({...form,title:[e.target.value,e.target.value]})}/></label>
        <label>{t('보상','Reward')} · aUEC<input readOnly={cargoOnly} min="0" max="999999999" type="number" placeholder={t('미확인','Unknown')} value={form.rewardUnknown?'':form.pay} onChange={e=>setForm({...form,pay:Number(e.target.value),rewardUnknown:e.target.value===''})}/></label>
        {form.shipments.map((row,i)=><fieldset key={row.id}><legend>{t('운송 항목','Shipment')} {i+1}</legend>
          <label>{t('화물명','Cargo')}<input readOnly={cargoOnly} required maxLength={70} value={row.cargo[n]} onChange={e=>updateRow(row.id,{cargo:[e.target.value,e.target.value]})}/></label>
          <label>SCU<input placeholder={t('미확인','Unknown')} required={!quantityOptional(row)} min="1" max="10000" type="number" value={row.scu||''} onChange={e=>updateRow(row.id,{scu:Number(e.target.value)})}/></label>
          {cargoOnly?<p className="shipment-ports">{where(row.from)} → {where(row.to)}</p>:<>
          <PortSearch locale={locale} label={t('픽업','Pickup')} value={row.from} onSelect={id=>updateRow(row.id,{from:id})}/>
          <PortSearch locale={locale} label={t('배송','Delivery')} value={row.to} onSelect={id=>updateRow(row.id,{to:id})}/></>}
          <details><summary>{t('상자 규격 · 개수','Container sizes and counts')}</summary>
            <BoxInputs boxes={row.boxes} onChange={boxes=>updateRow(row.id,{boxes})}/></details>
          {!!row.boxes?.length && boxTotal(row)!==row.scu &&
            <span role="status">{t('상자 합계와 화물 수량을 맞춰 주세요.','Box total must match cargo quantity.')} ({boxTotal(row)} / {row.scu} SCU)</span>}
          {row.from===row.to&&<span>{t('픽업지와 다른 배송지를 선택하세요.','Choose a different delivery port.')}</span>}
          {!cargoOnly&&form.shipments.length>1&&<button type="button" onClick={()=>setForm({...form,shipments:form.shipments.filter(s=>s.id!==row.id)})}>{t('항목 빼기','Remove shipment')}</button>}
        </fieldset>)}
  </>;
}

import {useState} from 'react';
import {shipImageRecord} from './ship-image';
const images=import.meta.glob<string>('./assets/ships/*.{jpg,webp}',{eager:true,query:'?url',import:'default'});
export function ShipThumbnail({id,name,en}:{id:string;name:string;en:boolean}){
 const record=shipImageRecord(id),src=record&&images[`./assets/ships/${record.file}`];
 const [failed,setFailed]=useState<string>();
 return <span className="pilot-ship-image">
  {src&&failed!==src?<img src={src} alt={name} onError={()=>setFailed(src)} decoding="async"/>:<span className="pilot-image-unavailable">{en?'No image':'이미지 없음'}</span>}
 </span>;
}

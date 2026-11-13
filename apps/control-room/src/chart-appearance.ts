import {createCelestialMaterials} from './celestial-materials';
import {placeName} from './mission-trial';
import type {Locale} from './navigation';
import type {Point} from './flight-types';

// A presentation layer for the original star map. Coordinates and camera stay in starmap.mjs.
export function chartAppearance(locale:Locale,look:'physical'|'hologram'='physical'){
 const celestial=createCelestialMaterials({hologram:look==='hologram'});
 const en=locale==='en';
 return {
  compact:true,fontWeight:500,fontFamily:'BarlowAirReview, SUIT, sans-serif',gameEn:locale!=='ko',
  text:(ko:string,english:string)=>en?english:ko,
  translate:(value:string)=>en?({'항성계 · 더블클릭':'System · Double-click','행성':'Planet','위성':'Moon','정거장':'Station','시설':'Facility','착륙 도시':'City','지상 거점':'Outpost','관심 지점':'Point of interest','소행성 기지':'Asteroid base','소행성':'Asteroid','항법 지점':'Nav point','점프 포인트':'Jump point'}[value]||value):value,
  name:(p:Point)=>placeName(p.id,locale==='ko'?0:1),
  systemName:(id:string)=>locale==='ko'?({stanton:'스탠턴',pyro:'파이로',nyx:'닉스'}[id]||id):id.toUpperCase(),
  ...celestial,
 };
}

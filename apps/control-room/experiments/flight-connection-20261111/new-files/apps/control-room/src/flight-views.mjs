import {createCargoView} from '../../../scene.mjs';
import {createStarMap} from '../../../starmap.mjs';
import locations from '../../../data/locations.json' with {type:'json'};
export function cargoView(element){return createCargoView(element,{labelStorageKey:'stam.control-room.cargo-labels'});}
export function mapView(element,select,nameOf,english,gameEnglish){return createStarMap(element,null,locations,point=>select(point.id),{
 placeLabel:p=>nameOf(p.id),L:(ko,en)=>english?en:ko,gameEn:gameEnglish,qualityStorageKey:'stam.control-room.map-quality',
});}

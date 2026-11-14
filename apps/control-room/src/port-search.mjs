import {suggestLocations} from '../../../aliases.mjs';
import {currentLocationData} from './personal-locations.mjs';
import korean from '../../../data/stam-korean.json' with {type:'json'};

let previous,ports,destinations;
export function findPorts(query){
 const data=currentLocationData();if(data!==previous){previous=data;ports=data.locations.map(p=>({...p,aliases:[...(p.aliases||[]),korean.places[p.name]||p.name]}));
  destinations=ports.filter(p=>p.type!=='Star').sort((a,b)=>a.name.localeCompare(b.name));
 }
 return query.trim()?suggestLocations(query,ports,{limit:10}):destinations;
}

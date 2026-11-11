import {suggestLocations} from '../../../aliases.mjs';
import data from '../../../data/locations.json' with {type:'json'};
import korean from '../../../data/stam-korean.json' with {type:'json'};

const ports=data.locations.map(p=>({...p,aliases:[...(p.aliases||[]),korean.places[p.name]||p.name]}));
const destinations=ports.filter(p=>p.type!=='Star').sort((a,b)=>a.name.localeCompare(b.name));
export const findPorts=query=>query.trim()?suggestLocations(query,ports,{limit:10}):destinations;

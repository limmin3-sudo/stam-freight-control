import {mergeLocations,parseLocationBackup} from '../../locations.mjs';
import {jumpLinks} from './preview-routes.mjs';

// Public matching data is immutable. Personal edits affect navigation only.
export function planningBase(data){
 const counts=new Map();for(const p of data.locations)counts.set(p.id,(counts.get(p.id)||0)+1);
 const gates=new Set(jumpLinks.flatMap(j=>[j.from,j.to]));
 return {meta:{version:data.version||'미확인',downloaded:data.retrievedAt,source:data.source},
  locations:data.locations.filter(p=>p.id&&counts.get(p.id)===1).map(p=>({...p,isGateway:gates.has(p.id)})),jumps:jumpLinks};
}
export function personalNavigation(data,edits=[]){
 // Validate count and duplicate IDs even when edits arrive from a Worker message.
 const checked=parseLocationBackup({format:'sfc-locations-v1',locations:edits});
 return mergeLocations(planningBase(data),checked);
}

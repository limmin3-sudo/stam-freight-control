const uuid=/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
export const plain=value=>String(value??'').replace(/\\r\\n|\\n|\\r/g,'\n').replace(/<[^>]*>/g,'').normalize('NFKC').split('\n').map(s=>s.replace(/[ \t]+/g,' ').trim()).join('\n').replace(/\n{3,}/g,'\n\n').trim().slice(0,24000);
export function wikiDefinition(row){
 if(row.released!==true||row.not_for_release||!uuid.test(row.uuid||'')||!row.hauling_orders?.length)return null;
 const orders=row.hauling_orders.map((o,index)=>({kind:o.kind,name:plain(o.name),minScu:o.min_scu??null,maxScu:o.max_scu??null,minAmount:o.min_amount??null,maxAmount:o.max_amount??null,maxBoxScu:o.max_container_size??null,orderIndex:index,limitSource:'wiki'}));
 if(orders.some(o=>!o.name||!['Resource','Entity','MissionItem'].includes(o.kind)))return null;
 // Tokens are candidate pools, not the locations chosen by an accepted instance.
 const locations=Object.entries(row.mission_tokens||{}).filter(([key,v])=>/^(?:Location|Pickup|Destination|DropOff)\d*\|Address$/i.test(key)&&Array.isArray(v)).map(([slot,names])=>({slot,candidates:names.map(n=>typeof n==='string'?n:'')}));
 return {id:row.uuid.toLowerCase(),title:plain(row.title),giver:plain(row.mission_giver),rank:row.rank_index,parents:[row.uuid.toLowerCase()],templateNames:row.debug_name?[row.debug_name]:[],released:true,notForRelease:false,quantityVersion:row.game_version||row.version,rulesSource:'wiki',rules:{orders,locations,pools:[],haulingObjectives:[],objectiveOrderIndicesVerified:false,source:'wiki'}};
}

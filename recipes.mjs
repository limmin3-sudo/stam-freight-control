export function destinationGroups(m){const groups=new Map();for(const c of m.cargo){const key=c.pickupId+'|'+c.dropoffId;if(!groups.has(key))groups.set(key,{key,pickupId:c.pickupId,dropoffId:c.dropoffId,cargo:[],scu:0});const g=groups.get(key);g.cargo.push(c);g.scu+=c.scu||0;}return [...groups.values()];}
// Changing the estimate is scoped to this contract and pickup/delivery group.
export function useWikiConfiguration(m,g){
 const next=structuredClone(m);next.destinationBoxes=(next.destinationBoxes||[]).filter(d=>d.pickupId!==g.pickupId||d.dropoffId!==g.dropoffId);
 for(const c of next.cargo)if(c.pickupId===g.pickupId&&c.dropoffId===g.dropoffId){c.boxPreference='wiki';if(c._cargoShape!=='cryopod'){c.boxes=[];c._boxesOrigin='unknown';}}
 return next;
}

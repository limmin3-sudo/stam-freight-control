import {readFile} from 'node:fs/promises';
import {LogEvidence} from '../../integration/log/state.mjs';
import {locationIndex} from '../../integration/log/locations.mjs';
export const data = JSON.parse(await readFile(new URL('../../data/log-location-index.json',import.meta.url),'utf8'));
export const index = locationIndex(data);
const large = '461d27cf-9431-4391-89e9-288b3a424385';
const obj = '1358ecdf-36d4-41b2-820b-5d403a56b76e';
const runtime = '11111111-1111-4111-8111-111111111111';
export const stops = ['ArcCorp Mining Area 061','Sunset Mesa','Canard View'].map(name => {
  const p = data.locations.find(p => p.name === name);
  const parent = data.locations.find(q => q.id === p.parentId && q.system === p.system);
  return {...p, position:p.position.map((v,i)=>v-parent.position[i])};
});
export function fixture(id=runtime, locations=index) {
  const state = new LogEvidence({locations});
  const base = {at:'2026-11-03T10:00:00.000Z',source:{input:'synthetic',generation:0,line:1}};
  const events = [
    {...base,type:'game-build-observed',build:'12913470'},
    {...base,type:'accepted',missionId:id,title:'Synthetic large contract'},
    ...stops.map((p,i)=>({...base,type:'marker-observed',missionId:id,hauling:true,definitionId:large,
      role:i===0?'pickup':'dropoff',objectiveId:`${i===0?'pickup':'dropoff'}_${obj}_${i===2?3:0}`,position:p.position})),
  ];
  for (const e of events) state.add(e);
  return {state,events,contract:state.snapshot().contracts[0]};
}

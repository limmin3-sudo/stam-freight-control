import {fixture,data} from './log-preview.mjs';
const medium='6f207f9c-0575-4a88-82f8-ccc348eab9da',objective='7ad329fd-b582-4675-91ed-c474102627b7';
export function mediumFixture(){
 const f=fixture(),c=f.contract;c.definitionId=medium;c.definitionObservations=[medium];
 c.markerObservations=['Brio\'s Breaker Yard','Rayari Cantwell Research Outpost',"Chawla's Beach"].map((name,i)=>{
  const p=data.locations.find(p=>p.name===name),parent=data.locations.find(q=>q.id===p.parentId&&q.system===p.system),role=i<2?'pickup':'dropoff';
  return {...f.events[2],definitionId:medium,role,objectiveId:`${role}_${objective}_${i===1?3:0}`,position:p.position.map((n,j)=>n-parent.position[j])};
 });return c;
}

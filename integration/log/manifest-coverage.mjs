// Completeness needs the entire declared demand and every declared address slot.
// A partial notice cannot be promoted because it merely mentions a valid item.
export function completeDemand(orders,slots,rows,objectives){
 if(!orders?.length||!slots?.length||orders.some(o=>!['Resource','Entity'].includes(o.kind)||o.kind==='Entity'&&o.name!=='CryoPod'))return false;
 const demand=new Map();
 for(const o of orders){const min=o.kind==='Resource'?o.minScu:o.minAmount,max=o.kind==='Resource'?o.maxScu:o.maxAmount;
  if(!Number.isSafeInteger(min)||min<=0||min!==max)return false;
  demand.set(o.name,(demand.get(o.name)||0)+min);
 }
 const actual=new Map();for(const row of rows)actual.set(row.commodity,(actual.get(row.commodity)||0)+row.scu);
 if(demand.size!==actual.size||[...demand].some(([name,total])=>actual.get(name)!==total))return false;
 const addresses=slots.map(s=>({...s,role:/^Destination\d*\|Address$/.test(s.slot)?'dropoff':/^Location\d*\|Address$/.test(s.slot)?'pickup':null}));
 if(addresses.some(s=>!s.role)||objectives.length!==addresses.length||!objectives.some(o=>o.role==='pickup')||!objectives.some(o=>o.role==='dropoff'))return false;
 // Bipartite matching allows two identical candidate pools without assigning
 // commodity rows to a pickup by array position or objective suffix.
 const used=new Set();function match(i){if(i===objectives.length)return true;const o=objectives[i];if(o.status!=='coordinate-match'||o.candidates.length!==1)return false;
  for(let j=0;j<addresses.length;j++){const s=addresses[j];if(used.has(j)||s.role!==o.role||!s.candidates.includes(o.candidates[0].name))continue;used.add(j);if(match(i+1))return true;used.delete(j);}return false;
 }
 return match(0);
}

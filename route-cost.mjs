// System coordinates are separate: avoid extra gate crossings, then minimise
// in-system metres. Time breaks ties; hauling contracts have no deadline.
export function betterTravel(jumps,meters,seconds,bestJumps,bestMeters,bestSeconds){
 return jumps<bestJumps||jumps===bestJumps&&(meters<bestMeters-.001||Math.abs(meters-bestMeters)<=.001&&seconds<bestSeconds-.000001);
}
export function compareRoute(a,b){
 return (a.revisits||0)-(b.revisits||0)||(a.deferred||0)-(b.deferred||0)||(a.jumps||0)-(b.jumps||0)||(Math.abs(a.meters-b.meters)>.001?a.meters-b.meters:0)||(a.cost-b.cost);
}

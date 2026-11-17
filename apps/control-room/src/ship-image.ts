import catalog from './ship-image-catalog.json' with {type:'json'};
const aliases:Record<string,string>={'Cutlass Black':'drake-cutlass-black','C2 Hercules':'crusader-c2-hercules-starlifter'};
export function shipImageRecord(id:string){
 return catalog.ships.find(ship=>ship.id===(aliases[id]??id)&&ship.status==='available');
}

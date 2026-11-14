// One profile resolver for mission capacity, preview packing and the route worker.
import fleet from '../../../data/ships.json' with {type:'json'};
import {DEFAULT_SHIP,validateShip,withStacking,selectShipGrids} from '../../../ships.mjs';
export const shipIdFor=name=>({'Cutlass Black':'drake-cutlass-black','C2 Hercules':'crusader-c2-hercules-starlifter'}[name]||name);
export function draftCargoShip(draft,disabled){
 const id=shipIdFor(draft.ship);
 const custom=draft.customShip?.id===id;
 const raw=custom?draft.customShip:fleet.find(s=>s.id===id);
 if(!raw)throw Error('함선 그리드를 찾지 못했습니다.');
 const ship=withStacking(validateShip(!custom&&id===DEFAULT_SHIP.id?{...raw,...DEFAULT_SHIP}:raw));
 return selectShipGrids(ship,disabled??draft.settings?.disabledGrids?.[id]);
}

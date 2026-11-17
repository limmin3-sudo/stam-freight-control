import type {CargoShip} from './cargo-plan.mjs';
export const tradeShips:CargoShip[];
export function tradeShip(id:string,disabled?:string[]):CargoShip;
export function tradeBoxCapacity(ship:CargoShip,size:number):number;

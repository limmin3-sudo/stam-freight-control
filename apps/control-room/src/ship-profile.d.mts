import type {Draft} from './mission-trial';
import type {CargoShip} from './cargo-plan.mjs';
export function shipIdFor(name:string):string;
export function draftCargoShip(draft:Pick<Draft,'ship'|'customShip'> & {settings?:{disabledGrids?:Record<string,string[]>}},disabled?:string[]):CargoShip;

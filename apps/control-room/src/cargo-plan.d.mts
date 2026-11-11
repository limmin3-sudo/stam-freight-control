import type {Draft} from './mission-trial';
export type Grid={id:string;name:string;w:number;h:number;l:number;x:number;y:number;z:number;rotation:number[];disabled?:boolean;_stack?:string;_world?:{x:number;y:number;w:number;h:number}};
export type CargoShip={id:string;name:string;grids:Grid[];access?:string;source?:string;shareGrids?:boolean};
export type CargoItem={boxId:string;missionId:string;shipmentId:string;dropoffId:string;commodity:string;size:number;color:string;estimated?:boolean;aboard?:boolean;_cargoShape?:string};
export type CargoBox=CargoItem & {bin:number;cell:number[];dims:number[]};
export type Packing={boxes:CargoBox[];used:number;capacity:number;bins:{used:number}[]};
export const cargoShips:CargoShip[];
export function cargoShip(id:string,disabled?:string[]):CargoShip;
export function capacity(ship:CargoShip):number;
export function demoCargo():CargoItem[];
export function manifestCargo(draft:Draft,pickup:string):{boxes:CargoItem[];unresolved:{missionId:string;shipmentId:string}[]};
export function cargoPacking(ship:CargoShip,items:CargoItem[],fixed?:CargoBox[]):Packing|null;
export function cargoWorldCenter(grid:Grid,box:CargoBox):number[];

export function readCargoPreferences():{shipId:string;disabled:Record<string,string[]>}|null;
export function saveCargoPreferences(value:{shipId:string;disabled:Record<string,string[]>}):void;

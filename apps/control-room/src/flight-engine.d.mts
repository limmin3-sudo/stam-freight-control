import type {Draft,Job} from './mission-trial';
import type {Mission} from './flight-types';
export function missionFor(job:Job):Mission;
import type {FlightPlan,Resume} from './flight-types';
export function canonicalPlace(id:string):string;
export function calculateFlight(draft:Draft,context?:{excludedMissionIds?:string[];disabledGrids?:string[];mode?:'simple'|'detail';startId?:string;resume?:Resume;manualStops?:string[]}):FlightPlan;

export function flightShipments(draft:Draft,simple?:boolean,ship?:import('./flight-types').Ship,excluded?:string[]):Array<{id:string;missionId:string;pickupId:string;dropoffId:string;commodity:string;scu:number|null;boxes:unknown[];reservation?:unknown}>;

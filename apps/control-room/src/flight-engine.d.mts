import type {Draft,Job} from './mission-trial';
import type {Mission} from './flight-types';
export function missionFor(job:Job):Mission;
import type {FlightPlan,Resume} from './flight-types';
export function canonicalPlace(id:string):string;
export function calculateFlight(draft:Draft,context?:{mode?:'simple'|'detail';startId?:string;resume?:Resume;manualStops?:string[]}):FlightPlan;

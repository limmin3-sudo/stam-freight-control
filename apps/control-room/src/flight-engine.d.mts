import type {Draft} from './mission-trial';
import type {FlightPlan,Resume} from './flight-types';
export function canonicalPlace(id:string):string;
export function calculateFlight(draft:Draft,context?:{mode?:'simple'|'detail';startId?:string;resume?:Resume;manualStops?:string[]}):FlightPlan;

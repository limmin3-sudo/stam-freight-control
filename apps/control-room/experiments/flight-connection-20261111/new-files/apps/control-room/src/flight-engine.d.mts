import type {Draft} from './mission-trial';
import type {FlightPlan,Mission,Resume} from './flight-types';
export function canonicalPlace(id:string):string;
export function missionsFor(draft:Draft):Mission[];
export function calculateFlight(draft:Draft,context?:{startId:string;resume:Resume}):FlightPlan;

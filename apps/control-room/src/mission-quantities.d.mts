import type {Mission} from './flight-types';
export function quantityPlan(mission:Mission,allowUpperBounds?:boolean):{mission:Mission;ready:boolean;certainty:string;scu:number;deliveries:{id:string;total:number;confirmed:boolean;unknown:boolean}[]};

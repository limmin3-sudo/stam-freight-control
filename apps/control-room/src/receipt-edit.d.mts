import type {Job} from './mission-trial';
type Boxes=NonNullable<Job['shipments'][number]['boxes']>;
export function reservationBoxes(job:Job):Record<string,Boxes>;
export function reviewReceipt(source:Job|undefined,form:Job,allowUnknown?:boolean,groupBoxes?:Record<string,Boxes>):Job;

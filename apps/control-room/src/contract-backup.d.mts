import type {Job} from './mission-trial';
export function importContracts(text:string,existing:Job[]):{jobs:Job[];skipped:number};
export function exportContracts(jobs:Job[]):string;

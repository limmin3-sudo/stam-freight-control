export const FLIGHT_OWNER:string;
export const FLIGHT_KEYS:readonly [string,string];
export function ownerFor(uid:string|null):string;
export function readOwner(storage:Pick<Storage,'getItem'>):string;
export function initializeOwner(storage:Storage):string;
export function archivedFlight(storage:Pick<Storage,'getItem'>,owner:string):Record<string,string|null>;
export function accountBoundary():{phase:string;uid:string|null;epoch:number};

export const HISTORY_KEY: string;
export function readHistory(): Array<{
  id: string; at: number; ship?: string; route?: string; scu: number;
  missions?: Array<{id: string; title?: string}>;
}>;
export function serviceControls(): {partnerIdToken():Promise<string|null>;freightCloud():import('../../../freight-cloud.mjs').FreightClient;crewCloud():import('../../../crew-cloud.mjs').CrewCloudClient;tradeCloud():FlightCloudClient;flightCloud():FlightCloudClient;accountButton: HTMLButtonElement; openHistory(): void; mountAccount(host:HTMLElement):()=>void; mountHistory(host:HTMLElement):()=>void};

export type CloudHeader={format:1;revision:number;updatedAt:number;device:string;parts:number;digest:string;bytes:number;encodedBytes:number;encoding:'gzip-base64'};
export type CloudEncoding={payload:string;digest:string;bytes:number};
export type CloudSnapshot={header:CloudHeader;payload?:string;unchanged?:boolean};
export type FlightCloudClient={uid:string;read(knownRevision?:number):Promise<CloudSnapshot|null>;save(revision:number,value:CloudEncoding):Promise<CloudHeader>};

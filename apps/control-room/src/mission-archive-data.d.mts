export type ArchiveQuantity={known:boolean;min:number|null;max:number|null;fixed?:boolean;unit?:'items'|'SCU'};
export type ArchiveRecord={id:string;title:string;giver:string;rank:number;type:string;quantity:ArchiveQuantity;reward:{min:number;max:number}|null;box:{known:boolean;max:number|null};orders:Array<{name:string;label:string;count:number;quantity:ArchiveQuantity;maxBoxScu:number}>;pickup:string[];dropoff:string[];ids:string[];description:string;illegal:boolean;sources:string[]};
export type ArchiveFilters={company?:string;rank?:string;type?:string;sort?:string;search?:string};
export type MissionArchiveData={version:string;wikiVersion:string;definitions:number;total:number;companies:Array<{value:string;label:string}>;ranks:number[];types:string[];filter(options:ArchiveFilters):ArchiveRecord[]};
export function loadMissionArchive():Promise<MissionArchiveData>;

export type ReferenceStatus='unknown'|'unresolved'|'preferred'|'matched'|'wiki-only'|'supplemented'|'primary';
export type ReferenceField={key:string;value:unknown;sources:string[];variants:Array<{value:unknown;sources:string[]}>;status:ReferenceStatus};
export type ArchiveReference={id:string;origin:string|null;sources:Array<{key:string;name:string;version:string;checkedAt:string|null;url:string|null}>;fields:ReferenceField[]};
export const referenceFields:string[];
export function archiveReference(catalog:unknown,id:string):ArchiveReference|null;
export function referenceValue(field:string,value:unknown,locale?:string):string;

export const STORAGE_JOURNAL:string;
export function recoverStorage(storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>):void;
export function applyStoragePatch(storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>,patch:Record<string,string|null>):void;

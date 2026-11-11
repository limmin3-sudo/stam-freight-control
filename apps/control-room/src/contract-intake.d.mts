import type {Job} from './mission-trial';
export function textContracts(text:string):Job[];
export type OCRReader={read(file:File):Promise<{text:string}>;close():Promise<void>};
export function createOCRReader(language:'eng'|'kor'):OCRReader;

export {reviewReceipt} from './receipt-edit.mjs';

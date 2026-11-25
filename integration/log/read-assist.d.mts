type Receipt = {state?:string;shipments:{from:string;to:string;scu:number;cargo:string[]}[];reservations?:Record<string,number>};
export function missingFields(job:Receipt):string[];
export function receiptCategory(job:Receipt & {title?:string[]}):'freight'|'other'|'unknown';
export function cardDescription(job:Receipt & {title?:string[]},english:boolean):string;

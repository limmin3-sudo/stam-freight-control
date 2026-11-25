export function missingFields(job:{state?:string;shipments:{from:string;to:string;scu:number;cargo:string[]}[];reservations?:Record<string,number>}):string[];

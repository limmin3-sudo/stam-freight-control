type Alias={id:string;word:string};
export function repairReceiptWords(text:string,scope:{ports:Alias[];goods:Alias[];pickup:Set<string>;delivery:Set<string>;cargo:Set<string>;expected?:'from'|'to'|'scu'|'cargo'}):string;

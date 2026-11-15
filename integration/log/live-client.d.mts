export type LiveStatus={protocol:number;phase:string;revision?:number;lastReadAt?:string|null;lastChangeAt?:string|null};
export type LiveConnection={connect:()=>void;disconnect:()=>void;pause:()=>Promise<void>;resume:()=>Promise<void>};
export function connectLive(callbacks:{onSnapshot:(snapshot:unknown,revision:number)=>void;onStatus:(status:LiveStatus)=>void;onError:(code:string)=>void;onDisconnect:()=>void}):LiveConnection|null;

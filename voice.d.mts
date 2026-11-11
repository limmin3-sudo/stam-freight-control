export function flightVoice(id:'standard'|'aide',english:boolean):{
 role:string;ready:string;done:string;welcomeSub:string;
 departure:(place:string)=>string;atStop:(place:string)=>string;jumpWork:(entry:string,exit:string)=>string;
};

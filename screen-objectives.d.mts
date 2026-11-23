export type ScreenGoal={item:string;destination:string;pickups:string[];total:number;done:number};
export function screenObjectives(text:string):ScreenGoal[];
export function screenKey(text:string):string;
export function screenLocation(text:string,places:ReadonlyArray<{id:string;name:string;type?:string;aliases?:string[]}>,translations?:Record<string,string>):string;
export function pickupInstructions(text:string):{item:string;place:string}[];

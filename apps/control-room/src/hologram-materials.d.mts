import type {ShaderMaterial,Mesh,Vector3,Sprite} from 'three';
export function planetMaterial(name:string,type:string):ShaderMaterial;
export function cloudMaterial(name:string,amount:number):ShaderMaterial;
export function atmosphereMaterial(color:string,strength:number):ShaderMaterial;
export function starMaterial(color:string):ShaderMaterial;
export function starCoronaMaterial(color:string):ShaderMaterial;
export function routeRibbon(points:Vector3[],options:{color:string;width:number;flow:number}):Mesh;
export function bodyLook(name:string,type:string):{clouds?:number;atmo?:string;atmoStrength?:number};

export function glowSprite(color:string,scale:number,opacity?:number,ring?:boolean):Sprite;

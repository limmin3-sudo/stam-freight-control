import type {FlightPlan,Packing,Ship} from './flight-types';
export function cargoView(element:HTMLElement):{update:(packing:Packing,options:{ship:Ship;nameOf:(id:string)=>string;missionNameOf:(id:string)=>string})=>void;dispose:()=>void};
export function mapView(element:HTMLElement,select:(id:string)=>void,nameOf:(id:string)=>string,english:boolean,gameEnglish:boolean):{dispose:()=>void;setRoute:(plan:FlightPlan,index:number)=>void;focusLeg:(index:number)=>void;setSystem:(id:string)=>void;home:()=>void};

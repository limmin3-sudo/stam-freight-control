import type {FlightPlan,Point} from './apps/control-room/src/flight-types';
export type StarMap = {
 dispose():void;setRoute(plan:FlightPlan|null,index:number):void;setSystem(id:string):void;selectedSystem():string;flyTo(id:string):void;
 focus(id:string):void;focusLeg(index:number):void;home(top?:boolean):void;galaxy():void;
 zoomBy(factor:number):void;setOrbits(value:boolean):void;setQuality(value:string):void;quality():string;
};
export function createStarMap(host:HTMLElement,labels:HTMLElement|null,data:unknown,onSelect:(point:Point,description:string)=>void,appearance?:object):StarMap;

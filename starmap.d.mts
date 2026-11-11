interface RouteMap {
  setSystem(system:string):void;
  selectedSystem():string;
  setRoute(plan:unknown, index:number):void;
  focusLeg(index:number):void;
  flyTo(id:string):void;
  home(top?:boolean):void;
  quality():string;
  setQuality(quality:string):void;
  dispose():void;
}
export function createStarMap(host:HTMLElement,labels:HTMLElement|null,data:unknown,onSelect:(location:{id:string},text:string)=>void):RouteMap;

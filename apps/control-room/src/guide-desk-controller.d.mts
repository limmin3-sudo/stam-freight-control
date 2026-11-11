import type {SpaceScreen} from './space-navigation';
export type GuideDeskApi={navigate(screen:SpaceScreen):Promise<void>;destroy():void};
export function mountGuideDesk(root:HTMLElement,options:{startWithApproach:boolean;motion:boolean;sound:boolean;translate(text:string):string;onLounge():void;onNavigate(screen:SpaceScreen):void}):GuideDeskApi;

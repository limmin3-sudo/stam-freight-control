import {lazy,Suspense} from 'react';
import type {Draft} from './mission-trial';
import type {Locale} from './navigation';
const Workspace=lazy(()=>import('./CargoWorkspace').then(module=>({default:module.CargoWorkspace})));
import type {Session} from './flight-session';
export function CargoPanel(props:{draft:Draft;locale:Locale;session?:Session}){
 return <Suspense fallback={<p role="status">{props.locale==='en'?'Preparing cargo workspace…':'적재 화면을 준비하고 있습니다.'}</p>}><Workspace {...props}/></Suspense>;
}

import type {AcademyLesson,SpaceRoute} from './space-navigation';
const subjects:readonly {lesson:AcademyLesson;ko:string;en:string}[]=[
 {lesson:'practice',ko:'운송 튜토리얼',en:'Hauling tutorial'},
 {lesson:'trade',ko:'무역 튜토리얼',en:'Trading tutorial'},
];
export function academyTutorials(en:boolean,navigate:(route:Omit<SpaceRoute,'locale'>)=>void){
 return subjects.map(({lesson,ko,en:english})=>({
  id:lesson,label:en?english:ko,open:()=>navigate({screen:'division',facility:'guide-center',lesson}),
 }));
}

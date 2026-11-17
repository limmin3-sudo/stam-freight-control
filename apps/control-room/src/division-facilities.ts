import type {GuideShot} from './guide-scene-camera';
import type {SpaceScreen} from './space-navigation';
// Stable facility IDs keep future replacements independent of flight storage.
export type Facility = {
  id:string; code:string; name:readonly [string,string];
  summary?:readonly [string,string];
  description:readonly [string,string]; state:'open'|'planned'|'construction';
  destination?:SpaceScreen;
  // Add a facility's real tour here when implemented; the shared guide reads it.
  tour?:readonly {title:readonly[string,string];body:readonly[string,string];shot?:GuideShot}[];
  label:readonly [number,number]; marker:readonly [number,number]; contour:string;
  // Optional replacement plate, registered to the full 1672 × 941 scene.
  // Supply a complete patch for this contour, including the terrace behind it.
  plate?:string;
};
export const divisionFacilities:readonly Facility[]=[
  {id:'lounge',code:'01',name:['라운지','Lounge'],state:'open',destination:'lounge',
    summary:['안내 · 계정 · 자료실','Welcome · Account · Archive'],
    description:['운송의 시작을 준비하는 공간. 안내데스크·서비스센터·아카이브·시네마로 이어집니다.','Prepare for your next haul. Visit the welcome desk, service centre, archive and cinema.'],
    label:[24,78],marker:[26,61],contour:'M0 351 L333 348 L472 371 L577 416 L744 513 L726 596 L672 645 L507 686 L260 720 L0 716 Z'},
  {id:'bridge',code:'02',name:['관제센터','Control centre'],state:'open',destination:'bridge',
    summary:['미션 · 항로 · 운항','Missions · Routes · Operations'],
    description:['궤도 스테이션에서 함선과 계약을 준비하고 항로·운항을 관리합니다.','Prepare your ship and contracts, plan routes and manage your flight from the orbital station.'],
    label:[82,28],marker:[80,15],contour:'M1132 17 L1506 5 L1638 70 L1631 132 L1540 172 L1468 218 L1290 215 L1240 181 L1144 167 Z'},
  {id:'trade',code:'03',name:['무역센터','Trade centre'],state:'planned',
    summary:['거래 · 무역','Trade · Commerce'],
    description:['무역과 물류가 만나는 공간입니다. 로비를 둘러볼 수 있으며, 무역 기능은 이후 연결됩니다.','Where commerce meets logistics. Explore the lobby; trading services will follow.'],
    label:[64,53],marker:[66,42],contour:'M650 352 L837 307 L936 244 L1072 249 L1114 308 L1344 335 L1428 430 L1404 482 L1231 510 L887 491 L647 449 Z'},
  {id:'guide-center',code:'04',name:['아카데미','Academy'],state:'planned',
    summary:['운송 팁 · 노하우','Freight tips · Know-how'],
    description:['운송 팁과 노하우를 만날 공간입니다. 로비를 둘러볼 수 있으며, 교육 콘텐츠는 이후 연결됩니다.','A place for freight tips and know-how. Explore the lobby; training content will follow.'],
    label:[73,76],marker:[72,64],contour:'M770 551 L1220 451 L1255 496 L1416 522 L1564 583 L1589 643 L1508 682 L1252 722 L1043 736 L788 658 Z'},
  {id:'expansion-a',code:'05',name:['확장 부지 01','Expansion site 01'],state:'construction',
    description:['새로운 시설을 위한 공사가 진행 중입니다. 들어올 시설은 추후 공개됩니다.','Construction is underway for a future facility. Its purpose will be announced later.'],
    label:[17,34],marker:[17,29],contour:'M118 272 L225 224 L366 224 L416 304 L437 348 L375 362 L169 345 L110 329 Z'},
  {id:'expansion-b',code:'06',name:['확장 부지 02','Expansion site 02'],state:'construction',
    description:['새로운 시설을 위한 공사가 진행 중입니다. 들어올 시설은 추후 공개됩니다.','Construction is underway for a future facility. Its purpose will be announced later.'],
    label:[83,93],marker:[83,85],contour:'M1132 771 L1241 739 L1442 721 L1577 749 L1657 799 L1654 874 L1542 909 L1280 908 L1135 860 Z'},
];

// Stable ordering: ground facilities before boarding, orbital centre afterwards.
export const divisionTourOrder=['guide-center','trade','lounge','bridge'] as const;
export const extensionFacilities=divisionFacilities.filter((f):f is Facility & {id:'trade'|'guide-center'}=>f.id==='trade'||f.id==='guide-center');

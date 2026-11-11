import data from '../../../data/log-location-index.json' with {type:'json'};

// Coordinates stay canonical. Presentation radii are independently tunable and
// identical in the room and expanded view; no oversized planet appears on zoom.
export const hologramScale={star:.40,Crusader:.196,Hurston:.154,ArcCorp:.161,microTech:.175} as const;
export const hologramDisplay={mapZoom:1.4,stationPixels:22,relayPixels:14} as const;
export const hologramFrame={width:11.3,minimumHeight:6.2,tilt:[0,8,10] as const};
export const hologramBodies=['Stanton','Hurston','Crusader','ArcCorp','microTech'] as const;
export const stationNames=['Everus Harbor','Seraphim Station','Baijini Point','Port Tressler'];
export type HologramPoint={id:string;name:string;type:string;parentId:string|null;position:number[]};
export const hologramPoints:HologramPoint[]=data.locations.filter(p=>p.system==='stanton'&&([...hologramBodies,...stationNames] as string[]).includes(p.name)).map(p=>({id:'stanton:'+p.id,name:p.name,type:p.type,parentId:p.parentId?'stanton:'+p.parentId:null,position:p.position}));
export function mapPosition(p:HologramPoint):[number,number,number]{return [p.position[0]!/1e10,p.position[2]!/1e10,-p.position[1]!/1e10];}
export function bodyRadius(p:HologramPoint){return p.type==='Star'?hologramScale.star:hologramScale[p.name as keyof typeof hologramScale]??.02;}
export const bridgePartners={operator:{x:32,y:43,height:43},navigator:{x:68,y:43,height:43}};
export const bridgePatches=[
 // Only these feathered rectangles use the edited clean plate. The rest of the
 // displayed room still comes from the original master at its original resolution.
 {x:610,y:96,width:466,height:446,radius:64},
 {x:62,y:443,width:135,height:165,radius:18},
 {x:1514,y:442,width:158,height:166,radius:18},
 {x:357,y:445,width:108,height:137,radius:18},
 {x:1206,y:445,width:116,height:139,radius:18},
];

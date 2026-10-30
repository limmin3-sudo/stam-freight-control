export const DEFAULT_SHIP={id:'misc-hull-b',name:'MISC Hull B',access:'external',layout:'schematic-x',source:'게임 데이터의 16개 구역명·치수 확인, 부착 위치는 개략',grids:Array.from({length:16},(_,i)=>{const side=i<8?'좌측':'우측',s=i%8,front=s<4,top=s%4<2,upper=s%2===1;return {id:'hull-b-'+i,name:`${i<8?'L':'R'}${s+1} · ${front?'전방':'후방'} ${top?'상부':'하부'} ${upper?'위':'아래'}`,w:2,h:2,l:8,x:i<8?-5:3,y:(top?1:-5)+(upper?2:0),z:front?-9:1,maxBoxSize:32,noUpright:[16]};})};
// How cargo attaches in each hold (user-confirmed 2026-10-30): flat holds stack up from the floor, Hull B and Hull C
// grids attach to the spine and stack outward, the RAFT hangs cargo from the ceiling down.
export const STACK_BY_SHIP={'misc-hull-b':'out','misc-hull-c':'out','argo-raft':'down'};
// Converts world-space grids into each grid's own stacking frame: local y always runs from the attaching face, so the
// packer's "floor/support/blocker" rules apply unchanged, and the 3D view turns the grid back with its rotation.
export function withStacking(ship){if(!ship?.grids)return ship;const mode=STACK_BY_SHIP[ship.id]||STACK_BY_SHIP[ship.performanceId];
 const xs=ship.grids.flatMap(g=>[g.x,g.x+g.w]),mid=(Math.min(...xs)+Math.max(...xs))/2;
 return {...ship,grids:ship.grids.map(g=>{const stack=g.stack||mode;if(!stack||stack==='up'||(g.rotation||[]).some(a=>a))return g;
  const cx=g.x+g.w/2,cy=g.y+g.h/2,world={x:g.x,y:g.y,w:g.w,h:g.h};
  if(stack==='down')return {...g,_stack:'down',_world:world,rotation:[0,0,180]};
  const left=cx<mid,w=g.h,h=g.w;return {...g,_stack:'out',_world:world,w,h,x:cx-w/2,y:cy-h/2,rotation:[0,0,left?90:-90]};})};}
export function hullKind(ship){const id=String(ship?.id||''),name=String(ship?.name||'');if(id==='misc-hull-b'||/hull[ -]?b\b/i.test(name))return 'hull-b';return 'flat';}
export const capacity=ship=>ship.grids.reduce((sum,g)=>sum+g.w*g.h*g.l,0);
export function validateShip(raw){
 if(!raw||typeof raw.name!=='string'||!raw.name.trim()||!Array.isArray(raw.grids)||!raw.grids.length||raw.grids.length>64)throw Error('함선 이름과 그리드 1–64개가 필요합니다.');
 const ids=new Set();const grids=raw.grids.map((g,i)=>{const w=Number(g.w),h=Number(g.h),l=Number(g.l);if(![w,h,l].every(n=>Number.isInteger(n)&&n>=1&&n<=64))throw Error('그리드 가로·높이·길이는 1–64 사이 정수로 입력하세요.');const id=String(g.id||'grid-'+i);if(ids.has(id))throw Error('그리드 ID가 중복됐습니다.');ids.add(id);const coords=['x','y','z'].map((axis,j)=>Number(g[axis]??(j===0?i*5:0)));if(!coords.every(n=>Number.isFinite(n)&&Math.abs(n)<=500))throw Error('그리드 위치는 -500–500 셀 범위로 입력하세요.');const rotation=Array.isArray(g.rotation)?g.rotation:[0,0,0];if(rotation.length!==3||rotation.some(n=>!Number.isFinite(n)||Math.abs(n)>360))throw Error('그리드 회전 값이 올바르지 않습니다.');const maxBoxSize=Number(g.maxBoxSize||g.maxSize||32);if(![1,2,4,8,16,24,32].includes(maxBoxSize))throw Error('최대 상자 크기를 확인하세요.');const noUpright=Array.isArray(g.noUpright)?[...new Set(g.noUpright.map(Number))].filter(n=>[1,2,4,8,16,24,32].includes(n)).sort((a,b)=>a-b):[];return {id,name:String(g.name||'구역 '+(i+1)).slice(0,80),w,h,l,x:coords[0],y:coords[1],z:coords[2],rotation,maxBoxSize,noUpright};});
 const ship={id:String(raw.id||'custom-'+Date.now()),name:raw.name.trim().slice(0,100),grids,layout:raw.layout||'custom',source:raw.source||'직접 등록',sourceUrl:raw.sourceUrl||'',performanceId:String(raw.performanceId||raw.id||''),...(['rear','front','left','right','external'].includes(raw.access)?{access:raw.access}:{}),...(typeof raw.shareGrids==='boolean'?{shareGrids:raw.shareGrids}:{})};if(capacity(ship)>10000)throw Error('함선 용량은 10,000 SCU까지 계산합니다.');return ship;
}
export function overlappingGrids(ship){const result=[];ship.grids.forEach((a,i)=>ship.grids.slice(i+1).forEach(b=>{if(a.rotation?.some(Boolean)||b.rotation?.some(Boolean))return;if(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y&&a.z<b.z+b.l&&a.z+a.l>b.z)result.push([a.name,b.name]);}));return result;}

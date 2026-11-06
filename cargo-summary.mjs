// Shared presentation of actual and assumed containers. Never treats a size limit as a confirmed layout.
const SIZES=[32,24,16,8,4,2,1];
export function containerCounts(boxes=[]){const counts=new Map();for(const b of boxes){const size=typeof b==='number'?b:b.size,count=typeof b==='number'?1:(b.count??1);if(SIZES.includes(size)&&Number.isInteger(count)&&count>0)counts.set(size,(counts.get(size)||0)+count);}return [...counts].sort((a,b)=>b[0]-a[0]).map(([size,count])=>({size,count}));}
export function containerText(boxes=[]){return containerCounts(boxes).map(b=>`${b.size} SCU × ${b.count}`).join(' + ');}
const total=boxes=>boxes.reduce((n,b)=>n+b.size*b.count,0);
export function configurationBasis(cargo=[]){
 if(cargo.length&&cargo.every(c=>c._cargoShape==='cryopod'))return 'entity';
 const pending=cargo.filter(c=>!c.boxes?.length);
 if(pending.some(c=>c._special))return 'special';
 if(pending.length&&pending.every(c=>c._maxBoxSource==='wiki'&&SIZES.includes(c.maxBoxSize)))return 'wiki';
 if(pending.some(c=>c._maxBoxSource==='wiki'))return 'mixed';
 if(pending.length&&pending.every(c=>SIZES.includes(c.maxBoxSize)))return 'contract';
 return 'default';
}
export function configurationLabel(config,en=false){
 if(config.basis==='entity')return en?'Cryopod stacking layout':'냉동포드 적재 구성';
 if(!config.estimated)return en?'Confirmed box configuration':'상자 구성 확인';
 const labels={wiki:['위키 기준 자동 구성','Wiki-based layout'],mixed:['일부 규격 미확인 · 임시 구성','Partly unknown · provisional layout'],special:['특수 화물 · 규격 미확인','Special cargo · size unknown'],contract:['계약 규격 기준 자동 구성','Contract-based layout'],default:['상자 규격 미확인 · 임시 구성','Size unknown · provisional layout']};
 return (labels[config.basis]||labels.default)[Number(en)];
}
export function wikiConfiguration(m,g,unknownBox=8){
 const cargo=g.cargo.map(c=>({...c,boxes:c._cargoShape==='cryopod'?c.boxes:[]}));
 return groupConfiguration({...m,destinationBoxes:[]},{...g,cargo},unknownBox);
}
export function missionTypeText(wiki,en=false){
 return wiki?(en?'Wiki mission matched: ':'위키 유형 확인: ')+wiki.title+(wiki.ambiguous?(en?' · Multiple size candidates':' · 상자 규격 후보 여러 개'):''):(en?'Mission type not found · check contractor, goods and amounts':'미션 유형 미확인 · 발주처·품목·수량을 확인해 주세요');
}
export function groupConfiguration(m,g,unknownBox=8){
 const saved=m.destinationBoxes?.find(d=>d.pickupId===g.pickupId&&d.dropoffId===g.dropoffId);
 if(saved?.boxes?.length&&!g.cargo.some(c=>c._cargoShape==='cryopod'))return {boxes:saved.boxes,estimated:false,origin:saved.origin||'manual',valid:total(saved.boxes)===g.scu};
 if(g.cargo.some(c=>!Number.isInteger(c.scu)||c.scu<1||c.scu>10000))return {boxes:[],estimated:true,origin:'unavailable',valid:false};
 let estimated=false;const all=[];
 for(const c of g.cargo){if(c.boxes?.length){all.push(...c.boxes);continue;}estimated=true;let remaining=c.scu;const limit=SIZES.includes(c.maxBoxSize)?(c._maxBoxSource==='wiki'?c.maxBoxSize:Math.min(c.maxBoxSize,unknownBox)):unknownBox;
  for(const size of SIZES.filter(s=>s<=limit)){const count=Math.floor(remaining/size);if(count)all.push({size,count});remaining-=size*count;}}
 const boxes=containerCounts(all);return {boxes,estimated,basis:configurationBasis(g.cargo),origin:estimated?'estimate':'cargo',special:g.cargo.some(c=>c._special),valid:total(boxes)===g.scu};
}

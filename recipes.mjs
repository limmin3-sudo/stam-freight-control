const norm=s=>String(s||'').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'');
export function recipeKey(m,c,version){if(!norm(m.title)||!norm(m.company)||!norm(c.commodity)||!Number.isInteger(c.scu))return null;return JSON.stringify([version,norm(m.company),norm(m.title),norm(c.commodity),c.scu,c.maxBoxSize||null]);}
export function learnRecipe(recipes,m,c,version){const key=recipeKey(m,c,version);if(!key)throw Error('저장하려면 발주처·미션 이름·품목·총 SCU를 먼저 입력하세요.');if(!c.boxes?.length||c.boxes.reduce((n,b)=>n+b.size*b.count,0)!==c.scu)throw Error('상자 크기·개수 합계가 총 SCU와 같아야 저장됩니다.');return {...recipes,[key]:{boxes:structuredClone(c.boxes),savedAt:Date.now()}};}
export function applyRecipe(recipes,m,c,version){const r=recipes[recipeKey(m,c,version)];if(!r||!Array.isArray(r.boxes)||r.boxes.reduce((n,b)=>n+b.size*b.count,0)!==c.scu)return c;return {...c,boxes:structuredClone(r.boxes),_boxesOrigin:'template'};}
export function destinationGroups(m){const groups=new Map();for(const c of m.cargo){const key=c.pickupId+'|'+c.dropoffId;if(!groups.has(key))groups.set(key,{key,pickupId:c.pickupId,dropoffId:c.dropoffId,cargo:[],scu:0});const g=groups.get(key);g.cargo.push(c);g.scu+=c.scu||0;}return [...groups.values()];}
// A mission type is the commodity mix of one destination (commodity + SCU each). Company, title, places and
// game version do not matter: the same haul re-rolls with new destinations but keeps its cargo.
const cargoMix=g=>g.cargo.map(c=>[norm(c.commodity),c.scu,c.maxBoxSize||null]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
function groupKey(m,g){if(!g.cargo.length||g.cargo.some(c=>!norm(c.commodity)||!Number.isInteger(c.scu)||c.scu<1))return null;return JSON.stringify(['cargo-mix',cargoMix(g)]);}
export function saveDestinationRecipe(recipes,m,g,boxes,version){const key=groupKey(m,g,version);if(!key)throw Error('저장 전에 품목과 수량을 입력하세요.');if(!boxes.length||boxes.reduce((a,b)=>a+b.size*b.count,0)!==g.scu)throw Error('상자 합계가 이 배송지 SCU와 같아야 합니다.');return {...recipes,[key]:{boxes:structuredClone(boxes),savedAt:Date.now()}};}
// Exact game version first; after a patch fall back to the newest box layout saved for the same mission type.
function findRecipe(recipes,key){if(!key)return null;if(recipes[key])return recipes[key];const mix=JSON.stringify(JSON.parse(key)[1]);
 // Layouts saved before the commodity-mix rule were keyed by version/company/title too; reuse them by cargo alone.
 const legacy=k=>{try{const a=JSON.parse(k);return a[0]==='destination'&&JSON.stringify(a[4])===mix;}catch{return false;}};
 return Object.entries(recipes).filter(([k])=>legacy(k)).map(([,r])=>r).reduce((best,r)=>!best||(r.savedAt||0)>=(best.savedAt||0)?r:best,null);}
export function hasDestinationKey(m,g,version){return Boolean(groupKey(m,g,version));}
export function fillDestinationRecipes(recipes,m,version){const result=structuredClone(m);result.destinationBoxes=(result.destinationBoxes||[]).filter(b=>b.origin!=='template');for(const g of destinationGroups(result)){if(result.destinationBoxes.some(b=>b.pickupId===g.pickupId&&b.dropoffId===g.dropoffId))continue;const r=findRecipe(recipes,groupKey(result,g,version));if(r&&r.boxes.reduce((a,b)=>a+b.size*b.count,0)===g.scu)result.destinationBoxes.push({pickupId:g.pickupId,dropoffId:g.dropoffId,boxes:structuredClone(r.boxes),origin:'template'});}return result;}

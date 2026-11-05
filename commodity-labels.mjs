import AI from './data/ai-korean.json' with {type:'json'};
const englishByKorean=new Map(Object.entries(AI.goods).map(([en,ko])=>[ko,en]));
export function commodityLabel(name){const en=englishByKorean.get(name)||name,ko=AI.goods[en];return ko&&ko!==en?`${ko} (${en})`:en;}
export function commodityReference(input){
 const note=document.createElement('small');note.className='commodity-reference';note.dataset.i18nSkip='';input.after(note);
 const update=()=>{const label=commodityLabel(input.value);note.textContent=label===input.value?'':label;};input.addEventListener('input',update);update();
}

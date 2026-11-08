import AI from './data/ai-korean.json' with {type:'json'};
const englishByKorean=new Map(Object.entries(AI.goods).map(([en,ko])=>[ko,en]));
import {gameEn} from './i18n.mjs';
// Korean mode shows the Korean commodity name only; mix and English keep the English name.
export function commodityLabel(name){const en=englishByKorean.get(name)||name;return gameEn?en:(AI.goods[en]||en);}
export function commodityReference(input){
 const note=document.createElement('small');note.className='commodity-reference';note.dataset.i18nSkip='';input.after(note);
 const update=()=>{const label=commodityLabel(input.value);note.textContent=label===input.value?'':label;};input.addEventListener('input',update);update();
}

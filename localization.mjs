import {gameEn} from './i18n.mjs';
// Korean mode only: rendered English commodity names become their Korean names (fleet patch first).
// Canonical English data and IDs remain untouched. Only rendered text is localised.
export function mountAiLabels(data){
 if(gameEn)return;
 const list=Object.entries(data.goods).filter(([en,ko])=>en!==ko&&en.length>2).sort((a,b)=>b[0].length-a[0].length);
 const skip='script,style,input,textarea,option,[contenteditable],[data-i18n-skip]';
 const alternatives=list.map(([en])=>en.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 // Ship names that contain a commodity word (Crusader Mercury Star Runner) keep their name.
 const pattern=new RegExp('(?<![A-Za-z])(?:'+alternatives.join('|')+')(?![A-Za-z])(?! Star Runner)','g');
 const names=new Map(list),last=new WeakMap();
 const translate=n=>{if(!n.parentElement||n.parentElement.closest(skip)||last.get(n)===n.nodeValue)return;const source=n.nodeValue;
  const value=source.replace(pattern,en=>names.get(en));
  last.set(n,value);if(value!==source)n.nodeValue=value;};
 const walk=root=>{if(root.nodeType===3)return translate(root);if(root.nodeType!==1||root.closest(skip))return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);for(let n=w.nextNode();n;n=w.nextNode())translate(n);};
 walk(document.body);new MutationObserver(changes=>{for(const m of changes)m.type==='characterData'?translate(m.target):m.addedNodes.forEach(walk);}).observe(document.body,{subtree:true,childList:true,characterData:true});
}

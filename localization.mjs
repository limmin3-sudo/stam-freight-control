import {gameEn} from './i18n.mjs';
// Canonical English data and IDs remain untouched. Only rendered text is localised.
export function mountAiLabels(data){
 if(gameEn)return;
 const list=Object.entries(data.goods).filter(([en,ko])=>en!==ko&&en.length>2).sort((a,b)=>b[0].length-a[0].length);
 const skip='script,style,input,textarea,option,[contenteditable],[data-i18n-skip]';
 const translate=n=>{if(!n.parentElement||n.parentElement.closest(skip))return;let s=n.nodeValue;for(const [en,ko]of list){if(!s.includes(en))continue;const pattern=en.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');s=s.replace(new RegExp('(?<![A-Za-z])'+pattern+'(?![A-Za-z])','g'),ko);}if(s!==n.nodeValue)n.nodeValue=s;};
 const walk=root=>{if(root.nodeType===3)return translate(root);if(root.nodeType!==1||root.closest(skip))return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);for(let n=w.nextNode();n;n=w.nextNode())translate(n);};
 walk(document.body);new MutationObserver(changes=>{for(const m of changes)m.type==='characterData'?translate(m.target):m.addedNodes.forEach(walk);}).observe(document.body,{subtree:true,childList:true,characterData:true});
}

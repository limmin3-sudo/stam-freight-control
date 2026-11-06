import {isEn} from './i18n.mjs';
import {tutorialInfo} from './tutorial-info.mjs';
const info=tutorialInfo(),el=id=>document.getElementById(id);
document.documentElement.lang=isEn?'en':'ko';document.title=(isEn?'Tutorial':'튜토리얼')+' · STAM FREIGHT CONTROL';
for(const [id,value] of Object.entries({'tutorial-role':info.name,'tutorial-title':info.title,'tutorial-description':info.intro,'tutorial-start':info.status,'tutorial-return':info.back}))el(id).textContent=value;
el('tutorial-portrait').alt=info.name;for(const text of info.points){const li=document.createElement('li');li.textContent=text;el('tutorial-points').append(li);}
if(isEn)el('tutorial-return').href='./index.html?lang=en';

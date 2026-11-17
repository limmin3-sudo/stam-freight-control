import type {Locale} from './navigation';
const names:Record<string,{ko:string;en:string;aliases:string[]}>={
 'rsi-galaxy':{ko:'RSI 갤럭시 · 기본형',en:'RSI Galaxy · Base',aliases:['갤럭시','갈럭시','galaxy','기본형']},
 'rsi-galaxy-cargo':{ko:'RSI 갤럭시 · 화물 모듈',en:'RSI Galaxy · Cargo Module',aliases:['갤럭시','갈럭시','galaxy','화물 모듈','cargo module','RSI_Galaxy_TEMP_Cargo']},
 'rsi-galaxy-medical':{ko:'RSI 갤럭시 · 의료 모듈',en:'RSI Galaxy · Medical Module',aliases:['갤럭시','갈럭시','galaxy','의료 모듈','medical module','RSI_Galaxy_TEMP_Medical']},
 'anvil-liberator':{ko:'앤빌 리버레이터',en:'Anvil Liberator',aliases:['리버레이터','리버레이터','liberator','anvil','앤빌']},
};
const normalize=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[\s_·()\-]+/g,'');
export function shipLabel(id:string,name:string,locale:Locale){const value=names[id];return value?(locale==='ko'?value.ko:value.en):name;}
export function shipMatches(query:string,id:string,name:string){const text=normalize([id,name,...names[id]?.aliases??[]].join(' '));return query.trim().split(/\s+/).every(word=>text.includes(normalize(word)));}
export function shipConfiguration(id:string,locale:Locale){
 const en=locale==='en';
 if(id==='rsi-galaxy-cargo')return en?'Cargo module fitted: 64 SCU in the rear hangar + 656 SCU in the module = 720 SCU. Select the configuration actually installed on your ship.':'화물 모듈 장착: 후방 격납고 64 + 화물 모듈 656 = 총 720 SCU. 실제 장착한 구성에 맞춰 선택하세요.';
 if(id==='rsi-galaxy-medical')return en?'Medical module fitted: 64 SCU in the rear hangar + 4 SCU in medical storage = 68 SCU.':'의료 모듈 장착: 후방 격납고 64 + 의료 보관 구역 4 = 총 68 SCU.';
 if(id==='rsi-galaxy')return en?'Base configuration: 64 SCU in the rear hangar. Choose Cargo Module above if fitted.':'기본 구성은 후방 격납고 64 SCU입니다. 화물 모듈을 장착했다면 위 목록에서 화물 모듈 구성을 선택하세요.';
 return '';
}

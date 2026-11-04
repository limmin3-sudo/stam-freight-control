import {createLocationManager as create} from './location-manager-core.mjs';
export const createLocationManager=(base,options={})=>create(base,{sourceMarkup:'한글 지명 출처: <a href="https://sc.galaxyhub.kr/" target="_blank" rel="noreferrer">스타 시티즌 유저 한국어 프로젝트</a> · 비영리 사용',...options});

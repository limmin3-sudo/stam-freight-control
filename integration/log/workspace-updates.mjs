import {openWorkspacePage} from './page-navigation.mjs';
export const UPDATE_MANIFEST='https://raw.githubusercontent.com/limmin3-sudo/stam-freight-control/refs/heads/rebuild/log-evidence-foundation/data/rebuild-version.json';
export const DOWNLOAD_URL='https://codeload.github.com/limmin3-sudo/stam-freight-control/zip/refs/heads/rebuild/log-evidence-foundation';
export function readRebuildVersion(raw){
 if(typeof raw?.version!=='string'||!/^rebuild\.\d{8}\.[1-9]\d{0,4}$/.test(raw.version))throw Error('시험판 버전 형식을 확인하지 못했습니다.');
 return raw.version;
}
export function newerRebuild(current,next){
 const a=readRebuildVersion({version:current}).split('.'),b=readRebuildVersion({version:next}).split('.');
 return Number(b[1])>Number(a[1])||(b[1]===a[1]&&Number(b[2])>Number(a[2]));
}
export function createWorkspaceUpdates(button){
 const open=()=>openWorkspacePage('patch-notes.html?lang='+document.documentElement.lang);
 button.onclick=open;return {open,destroy(){button.onclick=null;}};
}

// SCMDB-first LIVE mission refresh with an exact-ID Wiki supplement. Failed validation retains the complete snapshot.
import {readFile,writeFile,rename,unlink} from 'node:fs/promises';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';import path from 'node:path';import {scmdbCatalog} from './build-scmdb-missions.mjs';import {downloadWikiSupplement,supplementMissions} from './wiki-mission-supplement.mjs';
const repository='https://api.github.com/repos/KrovaxCode/SCMDB_DATA',raw='https://raw.githubusercontent.com/KrovaxCode/SCMDB_DATA/',files=['mission-details.json','log-mission-index.json','hauling-missions.json'];
export async function refreshScmdb({directory=new URL('../data/',import.meta.url),fetchImpl=fetch,token=process.env.GITHUB_TOKEN}={}){const dir=directory instanceof URL?directory.pathname:directory,old=await Promise.all(files.map(f=>readFile(path.join(dir,f)))),previous=JSON.parse(old[1]);
 const get=async url=>{const r=await fetchImpl(url,{headers:{Accept:'application/vnd.github+json','User-Agent':'STAM-Freight-Control',...(token&&new URL(url).origin==='https://api.github.com'?{Authorization:'Bearer '+token}:{})},signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('SCMDB HTTP '+r.status);return r;};
 const commit=(await(await get(repository+'/commits/main')).json()).sha;if(!/^[a-f0-9]{40}$/.test(commit||''))throw Error('Invalid SCMDB commit');
 const versions=await(await get(raw+commit+'/data/game-versions.json')).json();if(!Array.isArray(versions))throw Error('Invalid SCMDB versions');const live=versions.filter(v=>/^\d+\.\d+\.\d+-live\.\d+$/i.test(v.version)&&v.file===`merged-${v.version}.json`).sort((a,b)=>Number(b.version.match(/\.(\d+)$/)[1])-Number(a.version.match(/\.(\d+)$/)[1]))[0];if(!live)throw Error('No SCMDB LIVE build');
 const info=await(await get(repository+'/contents/data/'+live.file+'?ref='+commit)).json();if(!/^[a-f\d]{40}$/.test(info.sha||'')||!Number.isSafeInteger(info.size)||info.size<1000||info.size>32*1024*1024)throw Error('Invalid SCMDB blob metadata');const bytes=Buffer.from(await(await get(raw+commit+'/data/'+live.file)).arrayBuffer());if(bytes.length!==info.size||createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')!==info.sha)throw Error('SCMDB blob integrity mismatch');
 const sha256=createHash('sha256').update(bytes).digest('hex'),priorDetails=JSON.parse(old[0]);if(priorDetails.sources?.scmdb?.sha256===sha256)return {status:'unchanged',version:live.version};const source=JSON.parse(bytes);if(source.version!==live.version||!Array.isArray(source.contracts)||!Array.isArray(source.legacyContracts)||!source.resourcePools||!source.locationPools)throw Error('Invalid SCMDB schema');
 const next=scmdbCatalog(source,{commit,sha256});if(next.catalog.definitions.length<Math.max(100,(previous.definitions?.filter(d=>d.rulesSource!=='wiki').length||0)*.7))throw Error('SCMDB catalogue unexpectedly shrank');if(next.details.entries.length<next.catalog.definitions.length)throw Error('Incomplete SCMDB details');
 const values=[next.details,next.catalog,next.missions].map(v=>JSON.stringify(v)+'\n');for(let i=0;i<files.length;i++)await writeFile(path.join(dir,files[i]+'.staged'),values[i]);
 try{for(const f of files)await rename(path.join(dir,f+'.staged'),path.join(dir,f));}catch(error){for(let i=0;i<files.length;i++)await writeFile(path.join(dir,files[i]),old[i]);throw error;}finally{for(const f of files)await unlink(path.join(dir,f+'.staged')).catch(()=>{});}
 return {status:'updated',version:source.version,commit,definitions:next.catalog.definitions.length};
}
export async function refreshWiki({directory=new URL('../data/',import.meta.url),fetchImpl=fetch,snapshot}={}){
 const dir=directory instanceof URL?directory.pathname:directory,cache='wiki-mission-supplement.json',names=[...files,cache];
 const old=await Promise.all(names.map(async name=>{try{return await readFile(path.join(dir,name));}catch(error){if(name===cache&&error.code==='ENOENT')return null;throw error;}}));
 const previous=old[3]?JSON.parse(old[3]):undefined;let status='updated';
 if(!snapshot)try{snapshot=await downloadWikiSupplement({previous,fetchImpl,onProgress:p=>console.log('Wiki supplement:',p.completed+'/'+p.total)});}catch(error){if(!previous)throw error;snapshot=previous;status='cached';console.warn('Wiki refresh: retaining validated cached supplement:',error.message);}
 if(previous&&snapshot.records.length<previous.records.length*.7)throw Error('Wiki catalogue unexpectedly shrank');
 const result=supplementMissions({details:JSON.parse(old[0]),catalog:JSON.parse(old[1]),missions:JSON.parse(old[2])},snapshot),values=[result.details,result.catalog,result.missions,snapshot].map(v=>JSON.stringify(v)+'\n');
 for(let i=0;i<names.length;i++)await writeFile(path.join(dir,names[i]+'.staged'),values[i]);
 try{for(const name of names)await rename(path.join(dir,name+'.staged'),path.join(dir,name));}
 catch(error){for(let i=0;i<names.length;i++){if(old[i])await writeFile(path.join(dir,names[i]),old[i]);else await unlink(path.join(dir,names[i])).catch(()=>{});}throw error;}
 finally{for(const name of names)await unlink(path.join(dir,name+'.staged')).catch(()=>{});}
 return {status,version:snapshot.source.version,...result.details.stats};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{console.log('SCMDB mission refresh:',await refreshScmdb());}catch(error){console.warn('SCMDB mission refresh: keeping last validated snapshot:',error.message);}
 try{console.log('Wiki mission supplement:',await refreshWiki());}catch(error){console.warn('Wiki mission supplement: keeping last validated snapshot:',error.message);}
}

// Browser resources only. Nothing downloaded here is imported or executed by Node.
import {createHash, randomUUID} from 'node:crypto';
import {mkdir, readFile, writeFile, rename, rm, readdir} from 'node:fs/promises';
import path from 'node:path';

export const WEB_CHANNEL = 'https://limmin3-sudo.github.io/stam-freight-control/';
export const BRIDGE_PROTOCOL = 1;
const HASH = /^[a-f0-9]{64}$/;
const MAX_MANIFEST = 512 * 1024, MAX_FILE = 32 * 1024 * 1024, MAX_TOTAL = 128 * 1024 * 1024;
const TYPES = {html:'text/html; charset=utf-8',mjs:'text/javascript',js:'text/javascript',css:'text/css',json:'application/json',png:'image/png',jpg:'image/jpeg',webp:'image/webp',svg:'image/svg+xml',mp4:'video/mp4',vtt:'text/vtt; charset=utf-8',wasm:'application/wasm',gz:'application/octet-stream',txt:'text/plain',md:'text/plain'};
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export function webPath(name) {
  if (typeof name !== 'string' || name.length > 180 || !/^[a-zA-Z0-9_./-]+$/.test(name) ||
      name.split('/').some(p => !p || p === '.' || p === '..' || p.startsWith('.')) ||
      /^(?:desktop|scripts|server|tests|api)\//.test(name)) throw Error('invalid-web-path');
  const type = /(?:^|[/-])LICENSE$/.test(name) ? 'text/plain' : TYPES[name.split('.').pop()];
  if (!type) throw Error('invalid-web-type');
  return type;
}
export function readWebManifest(value) {
  if (value?.schema !== 1 || !Number.isSafeInteger(value.protocol) || value.protocol < 1 ||
      (!Number.isSafeInteger(value.snapshotSchema) || value.snapshotSchema < 1) || !/^[a-f0-9]{40}$/.test(value.sourceRevision || '') ||
      !HASH.test(value.id || '') || !Array.isArray(value.files) || value.files.length < 1 || value.files.length > 1000)
    throw Error('invalid-web-manifest');
  let total = 0; const seen = new Set();
  const files = value.files.map(file => {
    webPath(file.path);
    if (seen.has(file.path) || !HASH.test(file.sha256 || '') || !Number.isSafeInteger(file.bytes) || file.bytes < 1 || file.bytes > MAX_FILE)
      throw Error('invalid-web-file');
    seen.add(file.path); total += file.bytes;
    return {path:file.path,bytes:file.bytes,sha256:file.sha256};
  });
  if (total > MAX_TOTAL || !seen.has('index.html')) throw Error('invalid-web-size');
  const payload = {schema:1,protocol:value.protocol,snapshotSchema:value.snapshotSchema,sourceRevision:value.sourceRevision,files};
  if (digest(JSON.stringify(payload)) !== value.id) throw Error('invalid-web-id');
  return {...payload,id:value.id};
}
async function atomicWrite(file, bytes) {
  await mkdir(path.dirname(file),{recursive:true});
  const temp = file + '.' + randomUUID() + '.tmp';
  try { await writeFile(temp,bytes); await rename(temp,file); }
  finally { await rm(temp,{force:true}).catch(()=>{}); }
}
async function boundedBody(response, limit, signal) {
  if (!response.ok || Number(response.headers.get('content-length') || 0) > limit) throw Error('web-download-failed');
  const parts=[]; let length=0;
  try { for await (const chunk of response.body) {
    if (signal?.aborted) throw Error('web-download-aborted');
    length += chunk.length;
    if (length > limit) throw Error('web-download-too-large');
    parts.push(chunk);
  }} catch (e) { throw e; }
  return Buffer.concat(parts);
}
export function createWebUpdates({directory,fetchImpl=fetch}={}) {
  if (!path.isAbsolute(directory || '')) throw Error('web-cache-directory-required');
  let active = null, state = {phase:'bundled',current:null,pending:null}, job = null, stopped = false;
  const controller = new AbortController();
  const objectPath = hash => path.join(directory,'objects',hash);
  async function checkedObject(file) {
    const bytes = await readFile(objectPath(file.sha256));
    if (bytes.length !== file.bytes || digest(bytes) !== file.sha256) throw Error('invalid-cached-web-file');
    return bytes;
  }
  async function load(name) {
    const bytes = await readFile(path.join(directory,name));
    if (bytes.length > MAX_MANIFEST) throw Error('invalid-cached-web-manifest');
    const manifest = readWebManifest(JSON.parse(bytes));
    if ((manifest.protocol !== BRIDGE_PROTOCOL || manifest.snapshotSchema !== 1)) throw Error('incompatible-web-release');
    for (const file of manifest.files) await checkedObject(file);
    return manifest;
  }
  async function select() {
    // Called once before opening the control room. A running service never swaps its map.
    for (const name of ['ready.json','previous.json']) {
      try { active = await load(name); break; } catch {}
    }
    state = {phase:active?'current':'bundled',current:active?.id || null,pending:null};
    if (!active) return null;
    const files = new Map(active.files.map(file=>['/'+file.path,file]));
    return Object.freeze({id:active.id,async read(url) {
      const file = files.get(url === '/' ? '/index.html' : url);
      return file ? {body:await checkedObject(file),type:webPath(file.path)} : null;
    }});
  }
  async function download(relative, limit, roundSignal) {
    // Fixed publisher; redirects are rejected, with no log content or pairing credential.
    const signal = AbortSignal.any([controller.signal,roundSignal,AbortSignal.timeout(20000)]);
    const response = await fetchImpl(new URL(relative,WEB_CHANNEL),{redirect:'error',cache:'no-store',credentials:'omit',signal});
    return boundedBody(response,limit,signal);
  }
  async function stage() {
    const round = new AbortController(), timeout=setTimeout(()=>round.abort(),90000);
    try {
    state = {...state,phase:'checking'};
    const manifest = readWebManifest(JSON.parse(await download('web-release.json',MAX_MANIFEST,round.signal)));
    if ((manifest.protocol !== BRIDGE_PROTOCOL || manifest.snapshotSchema !== 1)) { state={...state,phase:'app-update-required'}; return; }
    if (manifest.id === active?.id) { state={...state,phase:'current'}; return; }
    // Bound disk usage to this release and the previous usable one. Never delete active files.
    const keep=new Set([...(active?.files||[]),...manifest.files].map(file=>file.sha256));
    for(const name of ['previous.json','ready.json'])try{for(const file of (await load(name)).files)keep.add(file.sha256);}catch{}
    for(const name of await readdir(path.join(directory,'objects')).catch(()=>[]))
      if(HASH.test(name)&&!keep.has(name))await rm(objectPath(name),{force:true}).catch(()=>{});
    const queue=[...manifest.files];
    // Reuse identical content between releases, including the video and OCR models.
    const transfers=await Promise.allSettled(Array.from({length:3},async()=>{
      try {while (queue.length) {
        if (stopped || round.signal.aborted) throw Error('web-update-stopped');
        const file=queue.shift();
        try { await checkedObject(file); continue; } catch {}
        const bytes = await download('web-assets/'+file.sha256,file.bytes,round.signal);
        if (bytes.length !== file.bytes || digest(bytes) !== file.sha256) throw Error('invalid-downloaded-web-file');
        await atomicWrite(objectPath(file.sha256),bytes);
      }}catch(error){round.abort();throw error;}
    }));
    const failed=transfers.find(result=>result.status==='rejected');
    if(failed)throw failed.reason;
    if (stopped) return;
    // Keep a verified previous release for a damaged/incomplete cache on next launch.
    if (active) await atomicWrite(path.join(directory,'previous.json'),JSON.stringify(active));
    await atomicWrite(path.join(directory,'ready.json'),JSON.stringify(manifest));
    state={...state,phase:'ready',pending:manifest.id};
    }finally{clearTimeout(timeout);}
  }
  return {
    select,
    check() {
      if (stopped) return Promise.resolve();
      if (!job) job=stage().catch(()=>{state={...state,phase:'unavailable'};}).finally(()=>{job=null;});
      return job;
    },
    status:()=>({...state}),
    async stop(){stopped=true;controller.abort();await job;},
  };
}

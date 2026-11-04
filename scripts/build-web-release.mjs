import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {logServiceFiles} from '../integration/log/live-server.mjs';
import {digest,webPath,readWebManifest,BRIDGE_PROTOCOL} from '../desktop/web-update.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function buildWebRelease(out,sourceRevision) {
  const names=[...new Set([...logServiceFiles().map(url=>path.relative(root,fileURLToPath(url)).split(path.sep).join('/')),
    'version.json','LICENSE','THIRD-PARTY-NOTICES.md','vendor/THREE-LICENSE.txt','vendor/SUPERCARGO-LICENSE.txt','vendor/ocr-LICENSES.txt'])].sort();
  const files=[];
  await mkdir(path.join(out,'web-assets'),{recursive:true});
  for(const name of names) {
    const publicName=name;
    webPath(publicName);
    const bytes=await readFile(path.join(out,name)),sha256=digest(bytes);
    await writeFile(path.join(out,'web-assets',sha256),bytes);
    files.push({path:publicName,bytes:bytes.length,sha256});
  }
  const payload={schema:1,protocol:BRIDGE_PROTOCOL,snapshotSchema:1,sourceRevision,files};
  const manifest=readWebManifest({...payload,id:digest(JSON.stringify(payload))});
  await writeFile(path.join(out,'web-release.json'),JSON.stringify(manifest));
  return manifest;
}

// Build the companion's small local capture window, independent of the public site.
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../apps/control-room/',import.meta.url));
const require=createRequire(path.join(root,'package.json'));
const {build}=await import(pathToFileURL(require.resolve('vite')).href);
await build({root,configFile:false,base:'/contract-reader/',publicDir:false,build:{
 outDir:path.resolve(process.argv[2]),emptyOutDir:false,rollupOptions:{input:path.join(root,'contract-reader.html')}
}});

import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const assets=[
 [
  "eng.traineddata.gz",
  "https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int/eng.traineddata.gz",
  "45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91"
 ],
 [
  "kor.traineddata.gz",
  "https://cdn.jsdelivr.net/npm/@tesseract.js-data/kor@1.0.0/4.0.0_best_int/kor.traineddata.gz",
  "78c21276ab14c9bb734d83be1055d9fe5469a4e7e977c51ad385be5737e61126"
 ],
 [
  "tesseract-core-lstm.wasm.js",
  "https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0/tesseract-core-lstm.wasm.js",
  "775a35df6f2ae100e02609443e6bd5cafcd07983dd6175454ca4a432a7730687"
 ],
 [
  "worker.min.js",
  "https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js",
  "38645599043239c0eb6db08a6504a92dcdc292200535f3e9339cd77c4443b842"
 ],
 [
  "tesseract.min.js",
  "https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js",
  "10fff78484067759c43028a02a72d76d0b90eb17302bb23b58a9ec5410bc928b"
 ],
 [
  "LICENSE-core.txt",
  "https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0/LICENSE",
  "c6596eb7be8581c18be736c846fb9173b69eccf6ef94c5135893ec56bd92ba08"
 ],
 [
  "LICENSE-tesseract.txt",
  "https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/LICENSE.md",
  "b40930bbcf80744c86c46a12bc9da056641d722716c378f5659b9e555ef833e1"
 ],
 [
  "LICENSE-data.txt",
  "https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/main/LICENSE",
  "a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9"
 ]
];
const dest=path.join(path.resolve(process.argv[2]),'ocr');await mkdir(dest,{recursive:true});
for(const [name,url,hash] of assets){
 let bytes;
 if(process.env.STAM_OCR_ASSETS)bytes=await readFile(path.join(process.env.STAM_OCR_ASSETS,name));
 else{
  const response=await fetch(url,{signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw Error('OCR download failed: '+name);bytes=Buffer.from(await response.arrayBuffer());
 }
 if(createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('OCR checksum mismatch: '+name);
 await writeFile(path.join(dest,name),bytes);
}

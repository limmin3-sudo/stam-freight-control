// OCR runs in one local Web Worker. No images/text leave the browser.
let library;
async function loadLibrary(){
 if(globalThis.Tesseract)return globalThis.Tesseract;
 if(!library)library=new Promise((resolve,reject)=>{
  const s=document.createElement('script');s.src='/vendor/screen/tesseract.min.js';
  s.onload=()=>resolve(globalThis.Tesseract);s.onerror=()=>{s.remove();library=null;reject(Error('화면 읽기 도구를 불러오지 못했습니다.'));};document.head.append(s);
 });
 return library;
}
export async function createScreenReader(language='eng'){
 const T=await loadLibrary();
 const worker=await T.createWorker(language==='kor'?['eng','kor']:['eng'],1,{
  workerPath:'/vendor/screen/worker.min.js',workerBlobURL:false,
  corePath:'/vendor/screen/tesseract-core-lstm.wasm.js',langPath:'/vendor/screen',
  cacheMethod:'none',logger:()=>{},errorHandler:()=>{},
 });
 await worker.setParameters({tessedit_pageseg_mode:'6'});
 return {read:async canvas=>{const r=await worker.recognize(canvas);return {text:r.data.text,confidence:r.data.confidence};},close:()=>worker.terminate()};
}

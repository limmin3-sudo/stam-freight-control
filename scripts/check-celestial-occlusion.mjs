import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({executablePath:process.env.STAM_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.STAM_MISSION_URL||'http://127.0.0.1:5182/');
 const result=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/.vite/deps/three.js');const {createCelestialMaterials}=await import('/src/celestial-materials.ts');
  const renderer=new THREE.WebGLRenderer({antialias:false});renderer.setSize(128,128);renderer.setClearColor(0);const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(60,1,.1,10000);
  const materials=createCelestialMaterials();materials.backdrop(scene);
  const target=new THREE.WebGLRenderTarget(128,128);renderer.setRenderTarget(target);
  const pixels=new Uint8Array(128*128*4);const count=()=>{renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,128,128,pixels);let lit=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]+pixels[i+1]+pixels[i+2]>0)lit++;return lit;};
  const exposed=count();const blocker=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshBasicMaterial({color:0}));blocker.position.z=-2;scene.add(blocker);const occluded=count();
  scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});materials.dispose();target.dispose();renderer.dispose();renderer.forceContextLoss();return {exposed,occluded};
 });
 assert(result.exposed>0,'distant stars must actually render');assert.equal(result.occluded,0,'opaque foreground must hide every distant star');assert.deepEqual(errors,[]);console.log('PASS: background stars render and opaque foreground fully occludes them',result);
}finally{await browser.close();}

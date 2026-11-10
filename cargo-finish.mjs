import * as THREE from 'three';

// Static studio illumination: one prefiltered environment per viewport, never a
// per-frame reflection pass. It lights the cargo only; it is not a ship exterior.
export function createCargoFinish(renderer){
 const room=new THREE.Scene(),panels=[];
 const panel=(size,position,color)=>{const mesh=new THREE.Mesh(new THREE.PlaneGeometry(...size),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));mesh.position.set(...position);mesh.lookAt(0,0,0);room.add(mesh);panels.push(mesh);};
 room.background=new THREE.Color(.035,.045,.06);
 panel([16,9],[-8,10,6],new THREE.Color(3.8,3.4,2.9));
 panel([5,18],[10,3,-6],new THREE.Color(1.5,2.1,2.8));
 panel([16,2],[0,5,-12],new THREE.Color(2.4,3.0,3.3));
 panel([9,9],[0,-10,0],new THREE.Color(.13,.17,.21));
 const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(room,.035,.1,80);pmrem.dispose();
 for(const mesh of panels){mesh.geometry.dispose();mesh.material.dispose();}
 const bump=document.createElement('canvas');bump.width=bump.height=256;
 const ctx=bump.getContext('2d'),pixels=ctx.createImageData(256,256);let seed=91847;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 // Fine cast-metal grain and recessed panel seams; no random work in the render loop.
 for(let i=0;i<pixels.data.length;i+=4){const value=126+Math.round(random()*13);pixels.data.set([value,value,value,255],i);}
 ctx.putImageData(pixels,0,0);ctx.fillStyle='#686868';ctx.fillRect(30,32,196,140);
 for(let y=42;y<163;y+=38){ctx.fillStyle='#a0a0a0';ctx.fillRect(40,y,176,27);ctx.fillStyle='#444';ctx.fillRect(40,y+25,176,2);}
 for(const p of [9,229]){ctx.fillStyle='#c2c2c2';ctx.fillRect(p,7,18,242);ctx.fillRect(8,p,240,18);}
 const rough=document.createElement('canvas');rough.width=rough.height=256;const rc=rough.getContext('2d');rc.fillStyle='#c7c7c7';rc.fillRect(0,0,256,256);
 for(const p of [9,229]){rc.fillStyle='#7c7c7c';rc.fillRect(p,7,18,242);rc.fillRect(8,p,240,18);}
 for(let i=0;i<350;i++){rc.fillStyle=`rgba(45,45,45,${random()*.18})`;rc.fillRect(random()*256,random()*256,random()*20+1,1);}
 const bumpMap=new THREE.CanvasTexture(bump),roughnessMap=new THREE.CanvasTexture(rough);bumpMap.anisotropy=roughnessMap.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 return {environment:environment.texture,bumpMap,roughnessMap,dispose(){environment.dispose();bumpMap.dispose();roughnessMap.dispose();}};
}

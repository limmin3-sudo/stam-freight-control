import {cargoPacking,type CargoBox,type CargoShip,type Packing} from './cargo-plan.mjs';
// Geometry only. Original box identities, ownership and quantities cannot be edited.
export function validateCargoLayout(ship:CargoShip,original:Packing,boxes:CargoBox[]):Packing{
 if(boxes.length!==original.boxes.length||new Set(boxes.map(b=>b.boxId)).size!==boxes.length)throw Error('identity');
 const originals=new Map(original.boxes.map(b=>[b.boxId,b])),occupied=new Set<string>();
 for(const b of boxes){const old=originals.get(b.boxId),g=ship.grids[b.bin];if(!old||!g||g.disabled)throw Error('grid');
  const clean=(x:CargoBox)=>{const {cell,dims,bin,...rest}=x;return rest;};if(JSON.stringify(clean(b))!==JSON.stringify(clean(old)))throw Error('identity');
  if(b.dims.length!==3||b.cell.length!==3||b.dims[1]!==old.dims[1]||![[old.dims[0],old.dims[2]],[old.dims[2],old.dims[0]]].some(d=>d[0]===b.dims[0]&&d[1]===b.dims[2]))throw Error('dimensions');
  const [x,y,z]=b.cell as [number,number,number],[w,h,l]=b.dims as [number,number,number];if(!Number.isInteger(x)||!Number.isInteger(z)||!Number.isInteger(y*2)||b._cargoShape!=='cryopod'&&!Number.isInteger(y)||x<0||y<0||z<0||x+w>g.w||y+h>g.h||z+l>g.l)throw Error('bounds');
  for(let k=z;k<z+l;k++)for(let j=y*2;j<(y+h)*2;j++)for(let i=x;i<x+w;i++){const key=[b.bin,i,j,k].join(':');if(occupied.has(key))throw Error('collision');occupied.add(key);}
 }
 for(const b of boxes){if(b.cell[1]===0)continue;for(let z=b.cell[2]!;z<b.cell[2]!+b.dims[2]!;z++)for(let x=b.cell[0]!;x<b.cell[0]!+b.dims[0]!;x++)if(!occupied.has([b.bin,x,b.cell[1]!*2-1,z].join(':')))throw Error('support');}
 const result=cargoPacking(ship,[],boxes);if(!result)throw Error('packing');return result;
}

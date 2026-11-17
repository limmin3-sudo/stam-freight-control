import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateCargoLayout} from '../src/cargo-layout-edit.ts';
import {cargoPacking,type CargoShip,type CargoBox} from '../src/cargo-plan.mjs';
const ship:CargoShip={id:'test',name:'Test',grids:[{id:'g',name:'Grid',w:4,h:2,l:4,x:0,y:0,z:0,rotation:[0,0,0]}]},box=(id:string,cell:number[]):CargoBox=>({boxId:id,missionId:'m',shipmentId:'s',dropoffId:'d',commodity:'C',size:1,color:'#fff',bin:0,cell,dims:[1,1,1]});
const original=cargoPacking(ship,[],[box('a',[0,0,0]),box('b',[0,1,0])])!;
test('manual cargo editing preserves identities and blocks collisions, bounds and unsupported boxes',()=>{
 const before=JSON.stringify(original);assert.throws(()=>validateCargoLayout(ship,original,original.boxes.map(b=>b.boxId==='a'?{...b,cell:[1,0,0]}:b)),/support/);
 assert.throws(()=>validateCargoLayout(ship,original,[original.boxes[0]!,{...original.boxes[1]!,cell:[0,0,0]}]),/collision/);
 assert.throws(()=>validateCargoLayout(ship,original,[{...original.boxes[0]!,commodity:'Other'},original.boxes[1]!]),/identity/);
 const moved=validateCargoLayout(ship,original,original.boxes.map(b=>({...b,cell:[1,b.cell[1]!,0]})));assert.equal(moved.used,original.used);assert.equal(JSON.stringify(original),before);
});

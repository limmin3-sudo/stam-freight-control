// Per-pairing exchange between the Navigator reader and the paired web console.
// Only original contract crops and their text are accepted, never file paths.
import {screenObjectives} from '../../screen-objectives.mjs';
import {createHash} from 'node:crypto';
export function contractScreens(){
 const entries=new Map();
 let revision=0,bytes=0,preview=null,until=0;
 return {
  preview(){return Date.now()<until?preview:null;},
  async receive(req){
   const chunks=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>900000)throw Error('limit');chunks.push(chunk);}
   const v=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(v.id)||typeof v.text!=='string'||!v.text.length||v.text.length>20000||
    typeof v.header!=='string'||v.header.length>20000||typeof v.image!=='string'||!/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/=]+$/.test(v.image))throw Error('invalid');
   const key=createHash('sha256').update(JSON.stringify([v.id,v.header,v.text])).digest('hex');
   if(v.preview===true){
    const goals=screenObjectives(v.header);
    if(goals.length){
     const lines=goals.slice(0,3).flatMap(g=>[(g.item+' · '+g.total+' SCU').slice(0,110),
      ((g.pickups.join(' / ')||'?')+' → '+g.destination).slice(0,110)]);
     preview={mode:'flight',title:(v.header.split('\n')[0]||'STAM').slice(0,80),lines};until=Date.now()+15000;
    }
   }
   if(entries.has(key))return;
   while(entries.size>=128||bytes+size>12000000){const first=entries.keys().next().value;bytes-=entries.get(first).size;entries.delete(first);}
   entries.set(key,{revision:++revision,size,id:v.id,text:v.text,header:v.header,image:v.image});bytes+=size;
  },
  since(n){const frames=[];for(const e of entries.values())if(e.revision>n){frames.push(e);if(frames.length===3)break;}
   return {revision:frames.at(-1)?.revision??revision,frames};},
 };
}

import fs from 'node:fs/promises';
import {aiPlace,aiGood} from '../data/ai-korean-lexicon.mjs';
const locations=JSON.parse(await fs.readFile('data/locations.json','utf8')).locations;
const missions=JSON.parse(await fs.readFile('data/hauling-missions.json','utf8')).missions;
const names=Object.fromEntries([...new Set(locations.map(p=>p.name))].sort().map(n=>[n,aiPlace(n)]));
const goods=Object.fromEntries([...new Set(missions.flatMap(m=>m.orders.map(o=>o[0])))].sort().map(n=>[n,aiGood(n)]));
await fs.writeFile('data/ai-korean.json',JSON.stringify({schema:1,source:'STAM fleet official Korean patch names (data/stam-korean.json), with AI-authored labels for names it does not cover',places:names,goods},null,2)+'\n');
console.log({places:Object.keys(names).length,goods:Object.keys(goods).length});

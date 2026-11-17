import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createFreightCloud} from '../freight-cloud.mjs';
import {webFiles} from '../scripts/web-files.mjs';
test('cancelled fleet, delegation, migration, notification and submission paths fail before any network or database access',async()=>{
 const sdk=new Proxy({auth:{currentUser:{uid:'user'}}},{get:(target,key)=>{if(key==='auth')return target.auth;throw Error('Unexpected SDK access: '+String(key));}});
 const c=createFreightCloud(sdk,'user');
 for(const action of ['createFleet','requestFleet','acceptFleetInvite','createCrew','publishCrew','requestCrew','setOfficer','decideReport','settle','migrateCrew','syncPriceWatches','registerDevice'])await assert.rejects(c.command({action}),/feature-not-enabled/);
 for(const method of ['fleetPage','listingPage','memberships','readListing','readNotifications','submitReport'])await assert.rejects(c[method](),/feature-not-enabled/);
 const capabilities=await c.command({action:'capabilities'});assert.equal(capabilities.billing,'free-only');assert.equal(capabilities.uexReports,false);assert.equal(capabilities.backgroundPriceAlerts,false);
});
test('public packaging and Firebase defaults omit cancelled adapters and paid function deployment',async()=>{
 const files=await webFiles();for(const name of ['freight-free.mjs','uex-submit.mjs','server/freight-domain.mjs'])assert(!files.includes(name),name);
 const config=JSON.parse(await readFile('firebase.json','utf8'));assert.equal(config.functions,undefined);assert.equal(config.emulators.functions,undefined);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {LogEvidence} from '../integration/log/state.mjs';
import {inboxCards} from '../integration/inbox-core.mjs';
import {parseLogLine} from '../integration/log/parser.mjs';

const id='77777777-7777-4777-8777-777777777777',definition='ad7fe12b-b1fb-48f9-8347-8c12f8dcad79';
const stamp='<2026-11-05T10:00:00.000Z> [Notice] ';
const accepted=stamp+`<SHUDEvent_OnNotification> Added notification "Contract Accepted: Junior small haul | from Ashland" [1] to queue. MissionId: [${id}], ObjectiveId: [pickup_test_0]`;
// Deliberately unrecognised synthetic name: this tests preservation, not a claim
// about the template emitted by any particular live game build.
const marker=(def=definition)=>stamp+`<CLocalMissionPhaseMarker::CreateMarker> missionId [${id}], contract [Unrecognised_Template], contractDefinitionId[${def}], objectiveId [pickup_test_0], zoneHostId [42], position [x: 1, y: 2, z: 3]`;
test('an accepted receipt survives an unrecognised template marker with its definition and quantity evidence',()=>{
 const e=new LogEvidence();e.ingest(accepted);assert.equal(inboxCards(e.snapshot()).cards.length,1);
 e.ingest(marker());e.ingest(stamp+`<SHUDEvent_OnNotification> Added notification "New Objective: Deliver 0/8 SCU of Processed Food to Seer's Canyon" [2] to queue. MissionId: [${id}], ObjectiveId: [dropoff_test_0]`);
 const s=e.snapshot();assert.equal(s.contracts.length,0);assert.equal(s.pendingContracts.length,1);
 const c=s.pendingContracts[0];assert.equal(c.classification,'unverified');assert.equal(c.definitionId,definition);assert.equal(c.markerObservations.length,1);assert.equal(c.quantityObservations[0].total,8);assert.equal(c.planning.allowed,false);
 assert.equal(inboxCards(s).cards.length,1);assert.equal(inboxCards(s).cards[0].rows[0].scu,8);
});
test('unknown templates retain terminal and conflicting evidence, and unaccepted markers do not create cards',()=>{
 const e=new LogEvidence();e.ingest(marker());assert.equal(inboxCards(e.snapshot()).cards.length,0);
 e.ingest(accepted);e.ingest(marker('88888888-8888-4888-8888-888888888888'));
 assert.equal(inboxCards(e.snapshot()).cards[0].conflict,true);
 const ended=new LogEvidence();ended.ingest(accepted);ended.ingest(marker());ended.ingest(stamp+`<SHUDEvent_OnNotification> Added notification "Contract Complete: Junior small haul" [3] to queue. MissionId: [${id}], ObjectiveId: [dropoff_test_0]`);
 assert.equal(inboxCards(ended.snapshot()).cards[0].ended,true);
});

test('receipt preservation has no company/title whitelist and accepts HUD formatting around the acceptance prefix',()=>{
 for(const company of ['Red Wind Linehaul','Covalex','Ling Family','Dead Saints'])for(const language of ['Contract Accepted','계약 수락']){
  const e=new LogEvidence();e.ingest(accepted.replace('Contract Accepted: Junior small haul | from Ashland',`<font color="#abc">${language}</font>: ${company} contract`));
  assert.equal(inboxCards(e.snapshot()).cards.length,1,company+' before marker');
  e.ingest(marker());const cards=inboxCards(e.snapshot()).cards;assert.equal(cards.length,1,company+' after marker');assert.equal(cards[0].title,company+' contract');
 }
});

test('both observed hauling template families are recognised without a company restriction',()=>{
 for(const template of ['HaulCargo_SingleToMulti_Interstellar_Bulk_AltUnpro_Trit','RedWind_Pyro_SmallGrade_Solar_HH_TradepostToStation_Silicon_CargoHauling_Multi2ToSingle','RedWind_Pyro_SmallGrade_Solar_HH_TradepostToOutpost_ProcessedFood_CargoHauling_SingleToMulti3','OtherCompany_CargoHauling_SingleToMulti'])assert.equal(parseLogLine(marker().replace('Unrecognised_Template',template),{}).event.hauling,true,template);
 for(const template of ['SalvageCargo','Combat_Template','NotCargoHauling'])assert.equal(parseLogLine(marker().replace('Unrecognised_Template',template),{}).event.hauling,false,template);
});

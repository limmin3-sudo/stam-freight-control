import test from 'node:test';
import assert from 'node:assert/strict';
import {LogEvidence} from '../integration/log/state.mjs';
import {parseLogLine} from '../integration/log/parser.mjs';
import {liveNavigationCandidate,SHIP_REFERENCES} from '../integration/log/navigation.mjs';
import {readFileSync} from 'node:fs';
const at='2026-11-04T10:00:00.000Z';
const pre=t=>`<${t}> [Notice] `;
const target=(ship='MISC_Hull_B',id='12345',t=at,point='LOC_RR_ARC_LEO')=>pre(t)+`<Player Selected Quantum Target - Local> [ItemNavigation][CL][1] | NOT AUTH | ${ship}_${id}[${id}]|CSCItemNavigation::OnPlayerSelectedQuantumTarget|Player has selected point ${point} as their destination, routing locally [Team_CGP4][QuantumTravel]`;
const arrive=(id='12345',t='2026-11-04T10:01:00.000Z')=>pre(t)+`<Quantum Drive Arrived - Arrived at Final Destination> [ItemNavigation][CL][1] | NOT AUTH | MISC_Hull_B_${id}[${id}]|CSCItemNavigation::OnQuantumDriveArrived|Quantum Drive has arrived at final destination [Team_CGP4][QuantumTravel]`;
const release=(id='12345',t='2026-11-04T10:01:30.000Z')=>pre(t)+`<Vehicle Control Flow> CVehicleMovementBase::ClearDriver: Local client node [45678] releasing control token for 'MISC_Hull_B_${id}' [${id}] [Team_CGP4][Vehicle]`;
const inventory=(code='RR_MIC_LEO',t=at)=>pre(t)+`<RequestLocationInventory> Player[PRIVATE_PLAYER] requested inventory for Location[${code}] [Team_CoreGameplayFeatures][Inventory]`;
function fixture(){const state=new LogEvidence();let line=0;return {state,add(text,generation=0,input='live-log'){state.ingest(text,{input,generation,line:++line});},scope(){return state.snapshot().navigation.scopes[0];}};}

test('local target yields a sourced ship candidate without exposing identity or affecting contracts',()=>{
 const f=fixture();f.add(target());f.add(inventory());const result=f.state.snapshot(),scope=f.scope();
 assert.equal(scope.ship.id,'misc-hull-b');assert.equal(scope.ship.verification,'local-navigation-candidate');
 assert.equal(scope.target.location.name,'Baijini Point');assert.equal(scope.inventory.location.name,'Port Tressler');
 assert.equal(scope.inventory.actor,'unverified');assert.equal(result.navigation.currentPositionVerified,false);
 assert.equal(result.contracts.length,0);assert.equal(f.state.contracts.size,0);
 for(const secret of ['PRIVATE_PLAYER','12345','entityId','vehicleClass'])assert.ok(!JSON.stringify(result).includes(secret));
});
test('arrival requires the same vehicle and does not confirm player position or delivery',()=>{
 const f=fixture();f.add(arrive());assert.equal(f.scope().ship,null);assert.equal(f.scope().target,null);
 f.add(target());f.add(arrive('99999'));assert.equal(f.scope().target.phase,'arrived'); // the earlier matching arrival is sorted by timestamp
 const g=fixture();g.add(target());g.add(arrive('99999'));assert.equal(g.scope().target.phase,'selected');
 g.add(arrive());assert.equal(g.scope().target.phase,'arrived');assert.equal(g.scope().currentPositionVerified,false);
 assert.equal(g.state.snapshot().statistics.registeredHauling,0);
});
test('release is never acquisition and a later release invalidates the matching candidate',()=>{
 const f=fixture();f.add(release());assert.equal(f.scope().ship,null);
 f.add(target());assert.equal(f.scope().ship,null);
 f.add(target('MISC_Hull_B','88888','2026-11-04T10:02:00.000Z'));
 assert.equal(f.scope().ship.id,'misc-hull-b');
 f.add(release('12345','2026-11-04T10:03:00.000Z'));assert.equal(f.scope().ship.id,'misc-hull-b');
 f.add(release('88888','2026-11-04T10:04:00.000Z'));assert.equal(f.scope().ship,null);
});
test('session changes, generations and independent files never borrow a previous ship',()=>{
 const f=fixture();f.add(target());f.add(inventory());
 f.add("<2026-11-04T10:01:00.000Z> [Trace] @session:      'PRIVATE_SESSION'");
 assert.equal(f.scope().ship,null);assert.equal(f.scope().inventory,null);assert.ok(!JSON.stringify(f.state.snapshot()).includes('PRIVATE_SESSION'));
 const g=fixture();g.add(target());g.add(arrive(),1);g.add(inventory(),0,'backup');
 assert.equal(g.state.snapshot().navigation.scopes.length,3);
 const status={phase:'watching',generation:1};assert.equal(liveNavigationCandidate(g.state.snapshot().navigation,status,Date.parse(at)+10000).ship,null);
});
test('stale/future observations and disconnected/paused/replay scopes cannot be offered',()=>{
 const f=fixture();f.add(target());const n=f.state.snapshot().navigation,status={phase:'watching',generation:0},now=Date.parse(at);
 assert.equal(liveNavigationCandidate(n,status,now+1000).ship.id,'misc-hull-b');
 assert.equal(liveNavigationCandidate(n,status,now+120001).ship,null);
 assert.equal(liveNavigationCandidate(n,status,now-1).ship,null);
 for(const phase of ['paused','catching-up','waiting-file','error'])assert.equal(liveNavigationCandidate(n,{...status,phase},now),null);
 assert.equal(liveNavigationCandidate(n,{...status,generation:1},now),null);
 const g=fixture();g.add(target(),0,'backup');assert.equal(liveNavigationCandidate(g.state.snapshot().navigation,status,now),null);
});
test('simultaneous different ships stay ambiguous, unknown codes and dynamic beacons are not guessed',()=>{
 const f=fixture();f.add(target());f.add(target('RSI_Salvation','77777'));assert.equal(f.scope().ambiguous,true);assert.equal(f.scope().ship,null);
 const g=fixture();g.add(target('UNKNOWN_SHIP','11111',at,'PRIVATE_BEACON_NAME'));g.add(inventory('UNKNOWN_DEPOT'));
 assert.equal(g.scope().ship.id,null);assert.equal(g.scope().ship.name,null);assert.equal(g.scope().target.location,null);assert.equal(g.scope().inventory.location,null);
 assert.ok(!JSON.stringify(g.state.snapshot()).includes('PRIVATE_BEACON_NAME'));
 const c=fixture();c.add(target('RSI_Constellation_Mk5_Centaurus'));assert.equal(c.scope().ship.id,null);assert.match(c.scope().ship.name,/Centaurus/);
});
test('malformed timestamps, entity mismatches and remote target events fail closed',()=>{
 for(const text of [target().replace(at,'2026-02-30T10:00:00.000Z'),target().replace('[12345]','[99999]')])assert.equal(parseLogLine(text,{}).event,undefined);
 assert.equal(parseLogLine(target().replace('Target - Local','Target - Remote'),{}).event,undefined);
 const ships=JSON.parse(readFileSync(new URL('../data/ships.json',import.meta.url)));
 for(const ref of Object.values(SHIP_REFERENCES).filter(r=>r.id))assert.equal(ships.find(s=>s.id===ref.id)?.name,ref.name);
});

test('quantum target offers expire separately, matching recent arrival never becomes a position',()=>{
 const f=fixture();f.add(target());f.add(arrive());
 const status={phase:'watching',generation:0},navigation=f.state.snapshot().navigation;
 const candidate=liveNavigationCandidate(navigation,status,Date.parse(at)+150000);
 assert.equal(candidate.ship,null);assert.equal(candidate.target.phase,'arrived');assert.equal(candidate.currentPositionVerified,false);
 assert.equal(liveNavigationCandidate(navigation,status,Date.parse(at)+180001).target,null);
 const g=fixture();g.add(target());assert.equal(liveNavigationCandidate(g.state.snapshot().navigation,status,Date.parse(at)-1).target,null);
 assert.equal(liveNavigationCandidate(g.state.snapshot().navigation,status,Date.parse(at)+120001).target,null);
});

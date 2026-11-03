import test from 'node:test';
import assert from 'node:assert/strict';
import { LogEvidence } from '../integration/log/state.mjs';
import { parseLogLine } from '../integration/log/parser.mjs';

// Invented IDs/names and observed grammar; no private log excerpts.
const me = '90000000000000000001', other = '90000000000000000002';
const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222';
const def = '33333333-3333-4333-8333-333333333333';
const prefix = second => `<2026-01-01T00:00:${String(second).padStart(2, '0')}.000Z> [Notice] `;
const identity = (id = me, state = 'STATE_CURRENT', at = 0) => prefix(at) + `<AccountLoginCharacterStatus_Character> Character: createdAt 1 - updatedAt 2 - geid ${id} - accountId 987654321 - name PRIVATE_TEST_NAME - state ${state}`;
const marker = id => prefix(1) + `<CLocalMissionPhaseMarker::CreateMarker> missionId [${id}], contract [Test_HaulCargo_Small], contractDefinitionId[${def}], objectiveId [pickup_${def}_0], zoneHostId [1], position [x: 1, y: 2, z: 3]`;
const accepted = (id = a, at = 3) => prefix(at) + `<SHUDEvent_OnNotification> Added notification "Contract Accepted: Identical title: " [1] to queue. New queue size: 1, MissionId: [${id}], ObjectiveId: []`;
const shared = (id = a, owner = other, at = 2) => prefix(at) + `<MissionShared> Received share push message: ownerId[${owner}] - missionId[${id}]`;
const party = (kind, who = me, id = a, at = 4) => prefix(at) + `<Player${kind}> Received Player${kind} push message for: mission_id ${id} - player_id ${who}`;
const end = (id = a, who = me, at = 5) => prefix(at) + `<EndMission> MissionId[${id}] Player[PRIVATE_TEST_NAME] PlayerId[${who}] CompletionType[Complete] Reason[PRIVATE]`;
const source = { input: 'synthetic', generation: 0, line: 1 };
function replay(lines, context = source) {
  const s = new LogEvidence();
  for (const line of lines) s.ingest(line, context);
  return s;
}

test('same-type shared missions with different execution IDs stay independent', () => {
  const s = replay([identity(), marker(a), marker(b), shared(a), shared(b), accepted(a), accepted(b), party('Left', me, a)]).snapshot();
  assert.equal(s.contracts.length, 2);
  assert.equal(s.contracts.find(c => c.missionId === a).participation.state, 'left-observed');
  assert.equal(s.contracts.find(c => c.missionId === b).participation.state, 'acceptance-observed');
  assert.equal(s.statistics.withSharedObservation, 2);
  assert.ok(s.contracts.every(c => !c.planning.allowed && c.manifest === null));
});

test('share alone and another player joining never register my participation', () => {
  const s = replay([identity(), marker(a), shared(), party('Joined', other)]).snapshot();
  assert.equal(s.contracts.length, 0);
  assert.equal(s.candidates.length, 1);
  assert.equal(s.candidates[0].participation.state, 'unconfirmed');
  assert.equal(s.candidates[0].participation.otherParticipantEvents, 1);
  assert.equal(s.candidates[0].partyObservations[0].actor, 'other');
});

test('self join can register evidence without a HUD acceptance; repeated shares do not clone it', () => {
  const rows = [identity(), marker(a), shared(), party('Joined')];
  const s = replay([...rows, shared(a, other, 5), ...rows]).snapshot();
  assert.equal(s.contracts.length, 1);
  assert.equal(s.statistics.acceptedHauling, 0);
  assert.equal(s.statistics.registeredHauling, 1);
  assert.equal(s.contracts[0].status, 'participation-observed');
  assert.equal(s.contracts[0].participation.state, 'joined-observed');
  assert.equal(s.contracts[0].participation.currentMembershipVerified, false);
});

test('another participant leaving or ending does not end my contract', () => {
  const c = replay([identity(), marker(a), accepted(), party('Left', other), end(a, other)]).snapshot().contracts[0];
  assert.equal(c.status, 'acceptance-observed');
  assert.equal(c.participation.state, 'acceptance-observed');
  assert.deepEqual(c.completionObservations, []);
  assert.equal(c.endingObservations[0].actor, 'other');
});

test('leaving then reaccepting stays in the same contract and retains history', () => {
  const s = replay([identity(), marker(a), shared(), accepted(), party('Left'), accepted(a, 6)]).snapshot();
  assert.equal(s.contracts.length, 1);
  assert.equal(s.contracts[0].participation.reentryObserved, true);
  assert.equal(s.contracts[0].participation.state, 'acceptance-observed');
  assert.equal(s.contracts[0].partyObservations.filter(e => e.type === 'participant-left').length, 1);
});

test('late replay of an older join never overrides a newer leave', () => {
  const rows = [identity(), marker(a), shared(), party('Joined', me, a, 3), party('Left', me, a, 5)];
  const normal = replay(rows).snapshot(), reversed = replay([...rows].reverse()).snapshot();
  assert.deepEqual(normal.contracts, reversed.contracts);
  assert.equal(normal.contracts[0].participation.state, 'left-observed');
});

test('same-time leave and join are ambiguous; join and acceptance are compatible', () => {
  const bad = replay([identity(), marker(a), party('Joined'), party('Left')]).snapshot().contracts[0];
  assert.equal(bad.participation.state, 'conflict');
  assert.ok(bad.conflicts.includes('participation-conflict'));
  const ok = replay([identity(), marker(a), party('Joined'), accepted(a, 4)]).snapshot().contracts[0];
  assert.equal(ok.participation.state, 'joined-observed');
});

test('identity is not borrowed from another input, generation, future or unspecified state', () => {
  for (const [idRows, context] of [
    [[identity()], { input: 'other', generation: 0 }],
    [[identity()], { input: 'synthetic', generation: 1 }],
    [[identity(me, 'STATE_CURRENT', 9)], source],
    [[identity(), identity(me, 'STATE_UNSPECIFIED', 2)], source],
  ]) {
    const state = replay(idRows);
    state.ingest(marker(a), context); state.ingest(party('Joined'), context);
    const s = state.snapshot();
    assert.equal(s.contracts.length, 0);
    assert.equal(s.candidates[0].partyObservations[0].actor, 'unknown');
    assert.equal(s.candidates[0].participation.state, 'unconfirmed');
  }
});

test('mixed login characters fail closed even when their mission IDs overlap', () => {
  const state = replay([identity(), marker(a), accepted(), party('Joined')]);
  state.ingest(identity(other), { input: 'second-file' });
  const s = state.snapshot();
  assert.equal(s.identity.mixedPlayers, true);
  assert.ok(s.contracts[0].conflicts.includes('mixed-local-players'));
  assert.equal(s.contracts[0].participation.state, 'unconfirmed');
});

test('snapshot never exports character GEID, account ID or player names', () => {
  const text = JSON.stringify(replay([identity(), marker(a), accepted(), shared(), party('Joined'), end()]).snapshot());
  for (const secret of [me, other, '987654321', 'PRIVATE_TEST_NAME', 'playerId', 'accountId']) assert.ok(!text.includes(secret), secret);
});

test('IDs are strings and invalid sharing/participation formats are rejected', () => {
  assert.equal(parseLogLine(party('Joined'), source).event.playerId, me);
  for (const line of [shared().replace(other, '-1'), party('Joined').replace(me, '0'), party('Left').replace(a, 'not-a-uuid'), identity('0'), shared().replace('ownerId', 'missingOwner'), party('Joined').replace('Received PlayerJoined', 'Received PlayerLeft')]) {
    assert.equal(parseLogLine(line, source).event, undefined);
  }
});

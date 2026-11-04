import {parseNavigationLine} from './navigation.mjs';
// Observed Game.log formats, build 12913470. No localization tables or game writes.
// These are observations, not a complete cargo manifest or a position tracker.
const UUID = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const OBJECTIVE = /^[\w-]{1,200}$/;
const TAGS = ['SHUDEvent_OnNotification', 'CLocalMissionPhaseMarker::CreateMarker', 'EndMission', 'MissionEnded', 'ObjectiveUpserted',
  'AccountLoginCharacterStatus_Character', 'MissionShared', 'PlayerJoined', 'PlayerLeft'];
const PLAYER_ID = /^[1-9]\d{0,19}$/;
const field = (line, name) => line.match(new RegExp(`${name}\\s*:?\\s*\\[([^\\]]*)\\]`))?.[1];
const clean = text => text.replace(/<[^>]*>/g, '').trim();

export function parseLogLine(line, provenance) {
  const build = line.match(/^<([^>]+)> \[CIG\] build_version\[([1-9]\d{0,11})\]\s*$/);
  if (build) {
    const at = build[1];
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(at) ||
        !Number.isFinite(Date.parse(at)) || new Date(at).toISOString() !== at) return {diagnostic:'unrecognized-build-format'};
    return {event:{type:'game-build-observed', at, build:build[2], source:{...provenance}}};
  }
  const navigation=parseNavigationLine(line,provenance);
  if(navigation)return navigation;
  const tag = TAGS.find(name => line.includes(`<${name}>`));
  if (!tag) return {};
  const fail = () => ({ diagnostic: 'unrecognized-mission-format' });
  const stamp = line.match(/^<([^>]+)>/)?.[1];
  if (!stamp || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(stamp) ||
      !Number.isFinite(Date.parse(stamp)) || new Date(stamp).toISOString() !== stamp) return fail();
  const base = { at: stamp, source: { ...provenance } };
  const emit = (type, missionId, payload) => UUID.test(missionId || '')
    ? { event: { ...base, type, missionId: missionId.toLowerCase(), ...payload } } : fail();

  if (tag === 'AccountLoginCharacterStatus_Character') {
    const m = line.match(/ - geid (\d+) - accountId \d+ - name .*? - state (\w+)\b/);
    if (!m || (m[2] === 'STATE_CURRENT' && !PLAYER_ID.test(m[1]))) return fail();
    // Only the character GEID is needed in memory; never retain name or accountId.
    return { event: { ...base, type: 'local-character-observed',
      playerId: m[2] === 'STATE_CURRENT' ? m[1] : null, characterState: m[2] } };
  }
  if (tag === 'MissionShared') {
    const ownerId = field(line, 'ownerId');
    if (!PLAYER_ID.test(ownerId || '') || !line.includes('Received share push message:')) return fail();
    return emit('share-observed', field(line, 'missionId'), { playerId: ownerId });
  }
  if (tag === 'PlayerJoined' || tag === 'PlayerLeft') {
    const m = line.match(new RegExp(`Received ${tag} push message for: mission_id ([\\w-]+) - player_id (\\d+)\\b`));
    if (!m || !PLAYER_ID.test(m[2])) return fail();
    return emit(tag === 'PlayerJoined' ? 'participant-joined' : 'participant-left', m[1], { playerId: m[2] });
  }

  if (tag === 'SHUDEvent_OnNotification') {
    if (!line.includes('Added notification')) return {};
    const missionId = field(line, 'MissionId');
    // Other HUD notifications are unrelated; never guess a missing mission ID.
    if (!missionId) return {};
    const text = line.match(/Added notification "(.*)" \[\d+\] to queue\./)?.[1];
    if (text === undefined) return fail();
    const plain=clean(text);
    const award=plain.match(/^(?:Awarded\s+((?:\d{1,3}(?:,\d{3})+|\d+))\s+aUEC|((?:\d{1,3}(?:,\d{3})+|\d+))\s+aUEC\s+지급)\s*:?\s*$/i);
    if(award){
      const amount=Number((award[1]||award[2]).replaceAll(',',''));
      if(!UUID.test(missionId)||!Number.isSafeInteger(amount)||amount<=0)return fail();
      const notificationId=line.match(/Added notification ".*" \[(\d+)\] to queue\./)?.[1];
      if(!notificationId||notificationId.length>20)return fail();
      return {event:{...base,type:'credit-award-observed',amount,currency:'aUEC',notificationId,
        missionId:/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(missionId)?null:missionId.toLowerCase()}};
    }
    const terminal=plain.match(/^(Contract Complete|계약 완료|Contract Failed|계약 실패):\s*\S/i);
    if(terminal){
      if(/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(missionId))return fail();
      return emit('terminal-notice-observed',missionId,{completion:/Complete|완료/i.test(terminal[1])?'Complete':'Fail'});
    }
    const accepted = text.match(/^(?:계약 수락|Contract Accepted):\s*(.+)$/i);
    if (accepted) {
      const title = clean(accepted[1]).replace(/:\s*$/, '').trim();
      return title ? emit('accepted', missionId, { title }) : fail();
    }
    const amounts = [...text.matchAll(/(?<![\w.,+−-])([\d]+(?:\.\d+)?)\s*\/\s*([\d]+(?:\.\d+)?)\s*SCU\b/gi)];
    if (!/SCU/i.test(text)) {
      const pod=plain.match(/^(?:New Objective|Objective Complete|새 목표|새로운 목표|목표 완료):.*?(?<![\w.,+−-])(\d+)\s*\/\s*(\d+)\s*(?:개(?:의)?\s*)?CryoPods?\b/i);
      if(pod){const objectiveId=field(line,'ObjectiveId'),current=Number(pod[1]),total=Number(pod[2]);if(!OBJECTIVE.test(objectiveId||'')||!Number.isSafeInteger(current)||!Number.isSafeInteger(total)||total<1||total>2048||current>total)return fail();return emit('quantity-observed',missionId,{objectiveId,current,total,unit:'count',notification:plain.replace(/CryoPods\b/gi,'CryoPod')});}
      // Return/visit instructions can coexist with a later successful delivery.
      // Preserve the notice; its wording does not prove a mandatory route leg.
      if (!/^(?:새로운 목표|New Objective):\s*\S/i.test(clean(text))) return {};
      const objectiveId = field(line, 'ObjectiveId');
      if (!OBJECTIVE.test(objectiveId || '')) return fail();
      return emit('objective-notice-observed', missionId, {objectiveId, notification: clean(text)});
    }
    const objectiveId = field(line, 'ObjectiveId');
    if (amounts.length !== 1 || !OBJECTIVE.test(objectiveId || '')) return fail();
    const current = Number(amounts[0][1]), total = Number(amounts[0][2]);
    if (![current, total].every(n => Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER) || current > total) return fail();
    return emit('quantity-observed', missionId, {
      objectiveId, current, total, unit: 'SCU', notification: clean(text),
      // Text is retained as evidence. It is not split into canonical commodity/terminal IDs.
    });
  }
  if (tag === 'CLocalMissionPhaseMarker::CreateMarker') {
    const missionId = field(line, 'missionId'), definitionId = field(line, 'contractDefinitionId');
    const objectiveId = field(line, 'objectiveId'), template = field(line, 'contract');
    const zoneHostId = field(line, 'zoneHostId');
    const coords = line.match(/position\s*\[x:\s*([^,]+), y:\s*([^,]+), z:\s*([^\]]+)\]/);
    if (!UUID.test(definitionId || '') || !OBJECTIVE.test(objectiveId || '') || !template || !zoneHostId || !coords) return fail();
    const position = coords.slice(1).map(Number);
    if (!position.every(Number.isFinite)) return fail();
    return emit('marker-observed', missionId, {
      definitionId: definitionId.toLowerCase(), template, objectiveId, zoneHostId, position,
      hauling: /(?:^|_)HaulCargo(?:_|$)/.test(template),
      role: objectiveId.startsWith('pickup_') ? 'pickup' : objectiveId.startsWith('dropoff_') ? 'dropoff' : 'unknown',
    });
  }
  if(tag==='MissionEnded'){
    const m=line.match(/Received MissionEnded push message for: mission_id ([\w-]+) - mission_state (MISSION_STATE_[A-Z_]+)\b/);
    return m?emit('mission-state-observed',m[1],{state:m[2]}):fail();
  }
  if (tag === 'EndMission') {
    const completion = field(line, 'CompletionType');
    if (!completion || !/^[A-Za-z_]+$/.test(completion)) return fail();
    const playerId = field(line, 'PlayerId');
    if (playerId !== undefined && !PLAYER_ID.test(playerId)) return fail();
    // PlayerId is only used internally to distinguish another participant's ending.
    return emit('ended', field(line, 'MissionId'), { completion, ...(playerId ? { playerId } : {}) });
  }
  const m = line.match(/mission_id ([\w-]+) - objective_id ([\w-]+) - state (\w+)/);
  if (!m || !OBJECTIVE.test(m[2])) return fail();
  return emit('objective-state-observed', m[1], { objectiveId: m[2], state: m[3] });
}

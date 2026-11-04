// Identity is scoped to an input log generation, never borrowed from another file.
export const identityScope = source => JSON.stringify([source?.input ?? null, source?.generation ?? 0]);

export function identityResolver(identities) {
  const scopes = new Map(), localIds = new Set();
  for (const event of identities) {
    const scope = identityScope(event.source);
    if (!scopes.has(scope)) scopes.set(scope, []);
    scopes.get(scope).push(event);
    if (event.playerId) localIds.add(event.playerId);
  }
  for (const rows of scopes.values()) rows.sort((a, b) => a.at.localeCompare(b.at));
  const mixedPlayers = localIds.size > 1;
  function actor(event) {
    if (mixedPlayers) return 'unknown';
    const available = (scopes.get(identityScope(event.source)) || []).filter(e => e.at <= event.at);
    const last = available.at(-1);
    if (!last?.playerId) return 'unknown';
    const sameTimeIds = new Set(available.filter(e => e.at === last.at).map(e => e.playerId));
    if (sameTimeIds.size !== 1) return 'unknown';
    if (event.type === 'accepted') return 'local-hud';
    if (!event.playerId) return 'unknown';
    return event.playerId === last.playerId ? 'self' : 'other';
  }
  return { actor, mixedPlayers, scopes: scopes.size, observed: localIds.size > 0 };
}

export function participation(events, actor) {
  const party = events.filter(e => ['share-observed', 'participant-joined', 'participant-left'].includes(e.type));
  const own = events.filter(e => (e.type === 'accepted' && actor(e) === 'local-hud') ||
    (['participant-joined', 'participant-left'].includes(e.type) && actor(e) === 'self'));
  own.sort((a, b) => a.at.localeCompare(b.at));
  const stateFor = e => e.type === 'participant-left' ? 'left-observed' : e.type === 'participant-joined' ? 'joined-observed' : 'acceptance-observed';
  const latest = own.at(-1);
  const states = new Set(own.filter(e => e.at === latest?.at).map(stateFor));
  // Joining and accepting at the same time agree; leaving at that time does not.
  const conflict = states.has('left-observed') && states.size > 1;
  const firstLeave = own.find(e => e.type === 'participant-left');
  const reentryObserved = !!firstLeave && own.some(e => e.type !== 'participant-left' && firstLeave.at < e.at);
  return {
    state: conflict ? 'conflict' : latest ? (states.has('joined-observed') ? 'joined-observed' : stateFor(latest)) : 'unconfirmed',
    observedAt: latest?.at ?? null, reentryObserved,
    selfJoinObserved: own.some(e => e.type === 'participant-joined'),
    shared: party.some(e => e.type === 'share-observed'),
    unknownActorEvents: party.filter(e => actor(e) === 'unknown').length,
    otherParticipantEvents: party.filter(e => e.type !== 'share-observed' && actor(e) === 'other').length,
    // These describe past evidence, not guaranteed current party/mission membership.
    currentMembershipVerified: false,
  };
}

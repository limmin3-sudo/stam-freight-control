import { parseLogLine } from './parser.mjs';
import { identityScope, identityResolver, participation } from './participation.mjs';

const stable = value => JSON.stringify(value);
const compare = (a, b) => a.at.localeCompare(b.at) || stable(a).localeCompare(stable(b));

export class LogEvidence {
  constructor({ maxEvents = 100_000, maxContracts = 10_000, maxEvidenceBytes = 32 * 1024 * 1024 } = {}) {
    this.maxEvents = maxEvents;
    this.maxContracts = maxContracts;
    this.maxEvidenceBytes = maxEvidenceBytes;
    this.evidenceBytes = 0;
    this.events = new Map();
    this.contracts = new Map();
    this.identities = [];
    this.diagnostics = new Map();
    this.lines = 0;
    this.duplicates = 0;
  }
  note(code) { this.diagnostics.set(code, (this.diagnostics.get(code) || 0) + 1); }
  ingest(line, source = {}) {
    this.lines++;
    const result = parseLogLine(line, source);
    if (result.diagnostic) this.note(result.diagnostic);
    if (result.event) this.add(result.event);
    return !!result.event;
  }
  add(event) {
    const { source, ...observation } = event;
    const identity = event.type === 'local-character-observed';
    const key = stable(identity ? { ...observation, scope: identityScope(source) } : observation);
    if (this.events.has(key)) {
      this.duplicates++;
      // Deterministic provenance when backup files repeat the same log line.
      const previous = this.events.get(key);
      if (stable(source) < stable(previous.source)) previous.source = source;
      return;
    }
    if (this.events.size >= this.maxEvents) throw new Error('event-limit');
    if (this.evidenceBytes + key.length * 2 > this.maxEvidenceBytes) throw new Error('evidence-size-limit');
    let contract = identity ? this.identities : this.contracts.get(event.missionId);
    if (!identity && !contract) {
      if (this.contracts.size >= this.maxContracts) throw new Error('contract-limit');
      contract = [];
      this.contracts.set(event.missionId, contract);
    }
    const stored = structuredClone(event);
    contract.push(stored);
    this.events.set(key, stored);
    this.evidenceBytes += key.length * 2;
  }
  snapshot() {
    const identity = identityResolver(this.identities);
    const publicEvent = event => {
      const { playerId, ...safe } = event;
      return { ...safe, ...((playerId !== undefined || event.type === 'accepted') ? { actor: identity.actor(event) } : {}) };
    };
    const hauling = [], candidates = [];
    for (const [missionId, unordered] of this.contracts) {
      const events = [...unordered].sort(compare);
      const accepted = events.filter(e => e.type === 'accepted');
      const markers = events.filter(e => e.type === 'marker-observed');
      if (!markers.some(e => e.hauling)) continue; // No title-based cargo guessing.
      const allEndings = events.filter(e => e.type === 'ended');
      const ended = allEndings.filter(e => identity.actor(e) !== 'other');
      const membership = participation(events, identity.actor);
      const quantities = events.filter(e => e.type === 'quantity-observed');
      const definitions = [...new Set(markers.map(e => e.definitionId))].sort();
      const completions = [...new Set(ended.map(e => e.completion))].sort();
      const titles = [...new Set(accepted.map(e => e.title))].sort();
      const conflicts = [];
      if (identity.mixedPlayers) conflicts.push('mixed-local-players');
      if (membership.state === 'conflict') conflicts.push('participation-conflict');
      if (definitions.length > 1) conflicts.push('definition-conflict');
      if (completions.length > 1) conflicts.push('terminal-state-conflict');
      if (ended.length && accepted.some(a => a.at > ended[0].at)) conflicts.push('acceptance-after-end');
      const status = conflicts.length ? 'conflict' : ended.length ? 'end-observed' : accepted.length ? 'acceptance-observed' : membership.selfJoinObserved ? 'participation-observed' : 'acceptance-unconfirmed';
      const entry = {
        missionId, status, acceptedAt: accepted[0]?.at ?? null,
        acceptanceObservations: accepted.map(publicEvent), endingObservations: allEndings.map(publicEvent),
        participation: membership,
        partyObservations: events.filter(e => ['share-observed', 'participant-joined', 'participant-left'].includes(e.type)).map(publicEvent),
        title: titles.length === 1 ? titles[0] : null, titleObservations: titles,
        definitionId: definitions.length === 1 ? definitions[0] : null,
        definitionObservations: definitions, completionObservations: completions,
        quantityObservations: quantities, markerObservations: markers,
        objectiveNotices: events.filter(e => e.type === 'objective-notice-observed'),
        objectiveStateObservations: events.filter(e => e.type === 'objective-state-observed'),
        conflicts,
        // Deliberately no totalSCU, canonical commodities, routes or guessed boxes.
        manifest: null,
        planning: { allowed: false, reasons: [...conflicts, 'complete-manifest-unverified', 'cargo-allocation-unverified', 'box-composition-unverified'] },
      };
      (accepted.length || membership.selfJoinObserved ? hauling : candidates).push(entry);
    }
    hauling.sort((a, b) => a.missionId.localeCompare(b.missionId));
    candidates.sort((a, b) => a.missionId.localeCompare(b.missionId));
    return structuredClone({
      schemaVersion: 1, verification: 'log-observations-only',
      identity: { observed: identity.observed, mixedPlayers: identity.mixedPlayers, scopes: identity.scopes },
      statistics: { lines: this.lines, uniqueEvents: this.events.size, duplicateEvents: this.duplicates,
        acceptedHauling: hauling.filter(c => c.acceptanceObservations.length).length,
        registeredHauling: hauling.length, haulingWithoutAcceptance: candidates.length,
        withSharedObservation: hauling.filter(c => c.participation.shared).length,
        withSelfLeaveObservation: hauling.filter(c => c.partyObservations.some(e => e.type === 'participant-left' && e.actor === 'self')).length,
        withQuantityObservation: hauling.filter(c => c.quantityObservations.length).length,
        planningReady: 0 },
      diagnostics: Object.fromEntries([...this.diagnostics].sort()), contracts: hauling, candidates,
    });
  }
}

export function requireVerifiedManifest(contract) {
  // No supported source currently proves complete per-contract cargo/box allocation.
  // A caller-provided `allowed:true` must not bypass this foundation's hard gate.
  throw new Error('manifest-not-verified');
}

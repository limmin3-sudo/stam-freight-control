// Only planning preferences persist. Contract evidence and order drafts stay in
// this page's memory; they never enter the existing guest/account run store.
const KEY = 'stam-log-preview-settings-v1';
export function createPreviewSession(storage) {
  let saved;
  try { saved = JSON.parse(storage?.getItem(KEY)); } catch {}
  const preferences = {
    shipId: typeof saved?.shipId === 'string' ? saved.shipId : '',
    startId: typeof saved?.startId === 'string' ? saved.startId : '',
    partner: saved?.partner === 'operator' ? 'operator' : 'navigator',
    disabled: Object.fromEntries(Object.entries(saved?.disabled || {}).filter(([id, values]) =>
      id.length < 160 && Array.isArray(values) && values.length <= 500 && values.every(v => typeof v === 'string'))),
  };
  const drafts = new Map();
  const persist = () => { try { storage?.setItem(KEY, JSON.stringify(preferences)); } catch {} };
  return {
    preferences,
    setPreferences(patch) { Object.assign(preferences, patch); persist(); },
    setDisabled(shipId, ids) { preferences.disabled[shipId] = [...ids]; persist(); },
    observe(contract) {
      const fingerprint = JSON.stringify(contract), previous = drafts.get(contract.missionId);
      if (previous?.fingerprint === fingerprint) return false;
      drafts.set(contract.missionId, {fingerprint, rows: previous?.rows || [], confirmed: false});
      return true;
    },
    draft(id) { return structuredClone(drafts.get(id) || {rows: [], confirmed: false}); },
    saveDraft(id, value) {
      const draft = drafts.get(id);
      if (draft) { draft.rows = structuredClone(value.rows); draft.confirmed = value.confirmed === true; }
    },
    clearDrafts() { drafts.clear(); },
  };
}

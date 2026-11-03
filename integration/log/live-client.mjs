// Same-origin loopback only. No connection to game servers or public web endpoints.
export function connectLive({ onSnapshot, onStatus, onError, onDisconnect }) {
  if (location.hostname !== '127.0.0.1' || location.protocol !== 'http:') return null;
  const key = 'stam-local-log-pairing';
  let token = new URLSearchParams(location.hash.slice(1)).get('token');
  try { token ||= sessionStorage.getItem(key); } catch {}
  if (!/^[a-f\d]{64}$/.test(token || '')) return null;
  try { sessionStorage.setItem(key, token); } catch {}
  history.replaceState(null, '', location.pathname + location.search);
  let timer, closed = false, polling = false, revision = -1, failures = 0;
  const pending = new Set();
  async function request(path, method = 'GET', timeoutMs = 4000) {
    const controller = new AbortController();
    pending.add(controller);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(path, { method, headers: { Authorization: `Bearer ${token}` },
        credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal });
      if (response.status === 401 || response.status === 403) throw new Error('pairing-expired');
      if (!response.ok) throw new Error('local-service-error');
      return await response.json();
    } finally { clearTimeout(timeout); pending.delete(controller); }
  }
  function disconnect() {
    closed = true;
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', wake);
    for (const controller of pending) controller.abort();
    try { sessionStorage.removeItem(key); } catch {}
    token = null;
    onDisconnect();
  }
  async function poll() {
    if (closed || polling) return;
    polling = true;
    try { await pollOnce(); } finally { polling = false; }
  }
  async function pollOnce() {
    if (closed) return;
    try {
      const status = await request('/api/status');
      if (closed) return;
      if (status.protocol !== 1 || !Number.isSafeInteger(status.revision)) throw new Error('unsupported-service');
      onStatus(status);
      if (status.revision !== revision) {
        const data = await request('/api/snapshot');
        if (closed) return;
        if (data.snapshot?.schemaVersion !== 1 || !Number.isSafeInteger(data.revision) ||
            !Array.isArray(data.snapshot.contracts) || !Array.isArray(data.snapshot.candidates)) throw new Error('unsupported-service');
        onSnapshot(data.snapshot);
        revision = data.revision;
      }
      failures = 0;
    } catch (error) {
      if (closed) return;
      onError(error.message);
      if (['pairing-expired', 'unsupported-service'].includes(error.message)) { disconnect(); return; }
      failures++;
    }
    if (!closed) timer = setTimeout(poll, failures ? Math.min(5000, 500 * 2 ** Math.min(failures, 4)) : document.hidden ? 2000 : 500);
  }
  async function control(action) {
    if (closed) return;
    try { const status = await request('/api/' + action, 'POST'); if (!closed) onStatus(status); }
    catch (error) { if (!closed) onError(error.message); }
  }
  function wake() {
    if (!closed && !polling && !document.hidden) { clearTimeout(timer); timer = setTimeout(poll, 0); }
  }
  document.addEventListener('visibilitychange', wake);
  timer = setTimeout(poll, 0);
  return { preparePreview: () => request('/api/preview-assets', 'POST', 20000), disconnect, pause: () => control('pause'), resume: () => control('resume') };
}

// One preference for the control room, detached dialogs, and classic web tools.
const key = 'stam.web.theme.v1';
const changed = 'stam-web-theme-change';
const normalize = value => value === 'white-gold' ? value : 'black-gold';

function apply(value) {
  const theme = normalize(value);
  if (document.documentElement.dataset.webTheme === theme) return;
  document.documentElement.dataset.webTheme = theme;
  window.dispatchEvent(new Event(changed));
}

export function getWebTheme() {
  return normalize(document.documentElement.dataset.webTheme);
}

export function setWebTheme(value) {
  const theme = normalize(value);
  try { localStorage.setItem(key, theme); } catch { /* Keep the current tab usable. */ }
  apply(theme);
}

export function subscribeWebTheme(listener) {
  window.addEventListener(changed, listener);
  return () => window.removeEventListener(changed, listener);
}

let initial;
try { initial = localStorage.getItem(key); } catch { /* Storage can be disabled. */ }
apply(initial);
window.addEventListener('storage', event => {
  if (event.key !== key && event.key !== null) return;
  try {
    if (event.storageArea === localStorage) apply(localStorage.getItem(key));
  } catch { /* Access can be revoked while the tab is open. */ }
});

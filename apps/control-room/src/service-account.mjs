import {createAccount} from '../../../account.mjs';
import {createHistory, readHistory, HISTORY_KEY} from '../../../history.mjs';
import {ACCOUNT_META} from '../../../sync.mjs';

export {readHistory, HISTORY_KEY};

let controls;
export function serviceControls() {
  if (controls) return controls;
  const accountButton = document.createElement('button');
  accountButton.type = 'button';
  const notify = message => window.dispatchEvent(new CustomEvent('stam-account-message', {detail: message}));
  const history = createHistory(null, {notify});
  const account=createAccount(accountButton, {historyContext: true, notify, openHistory:()=>{if(location.hash.startsWith('#/service')){const params=new URLSearchParams(location.hash.split('?')[1]);params.set('section','history');location.hash='#/service?'+params;}else history.open();}, resetHistory: history.reset});
  controls = {accountButton, openHistory: history.open, mountAccount:account.mount, mountHistory:history.mount};
  return controls;
}

// Restore account sync even when a returning pilot goes directly to flight control.
if (typeof window !== 'undefined') {
  let resume = false;
  try { resume = Boolean(localStorage.getItem(ACCOUNT_META)); } catch { /* Storage is unavailable in this browser. */ }
  if (resume) serviceControls();
}

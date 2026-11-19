// Inspect only the STAM Worker. Never print the deployed bundle or build variables.
import {appendFile} from 'node:fs/promises';
const base = 'https://api.cloudflare.com/client/v4/accounts/5fb0f6d0fa99c783973d667151b868aa';
const worker = 'stam-partner-chat';
const headers = {Authorization: 'Bearer ' + process.env.CLOUDFLARE_API_TOKEN};

async function api(path, options = {}) {
  return fetch(base + path, {
    ...options, headers: {...headers, ...options.headers}, redirect: 'error', signal: AbortSignal.timeout(20000)
  });
}
async function result(response) {
  if (!response.ok) throw new Error('Cloudflare API HTTP ' + response.status);
  const body = await response.json();
  if (!body.success) throw new Error('Cloudflare API did not confirm success');
  return body.result;
}

async function roles() {
  const response = await api('/workers/scripts/' + worker);
  if (!response.ok) throw new Error('Worker content HTTP ' + response.status);
  const source = await response.text();
  const original = ['Senior trade officer for routes within one star system', 'Ling family broker for interstellar trade', 'Academy advisor for new captains'];
  const added = ['Flight guide at the lounge welcome desk', 'Bridge operator for mission preparation and flight operations', 'Senior navigator for route planning and cargo reference'];
  if (!original.every(role => source.includes(role))) throw new Error('Unrecognized deployed Worker');
  if (added.every(role => source.includes(role))) return 'six';
  if (added.every(role => !source.includes(role))) return 'three';
  throw new Error('Unexpected partial partner set');
}

async function checkBuildSource(repair) {
  const scripts = await result(await api('/workers/scripts'));
  const tag = scripts.find(script => script.id === worker)?.tag;
  if (!tag || !/^[a-f0-9]{32}$/.test(tag)) throw new Error('Partner Worker tag unavailable');
  const path = '/builds/workers/' + tag;
  const response = await api(path);
  if (response.status === 403) {
    console.log('Build configuration HTTP 403. Future automatic build source is unverified.');
    return;
  }
  const config = await result(response);
  const install = 'npm ci --prefix workers/partner';
  const pin = 'git fetch --depth=1 origin 36fa1eb508262fe357966d14013f97f705ebcfb5 && git checkout --detach FETCH_HEAD && ' + install;
  if (config.production_settings?.build_command === install) {
    console.log('Production build uses the checked-out Git revision.');
    return;
  }
  if (config.production_branch !== 'main' || config.production_settings?.build_command !== pin) {
    console.log('Build configuration differs from the known main-branch pin. Manual review required.');
    return;
  }
  console.log('Confirmed production builds are pinned to the three-partner revision.');
  if (repair) {
    const patched = await api(path, {method:'PATCH', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({production_settings:{build_command:install}})});
    if (patched.status === 403) {
      console.log('Build configuration edit refused (HTTP 403). Future builds may reintroduce the old version.');
      return;
    }
    await result(patched);
    if ((await result(await api(path))).production_settings?.build_command !== install) throw new Error('Build command update not confirmed');
    console.log('Verified production build command now uses main.');
  }
}

const phase = process.argv[2];
const roster = await roles();
console.log('Production Worker partner roles: ' + roster);
if (phase === 'verify') {
  if (roster !== 'six') throw new Error('Six production partner roles required');
} else if (phase === 'inspect') {
  await appendFile(process.env.GITHUB_OUTPUT, 'roster=' + roster + '\n');
  await checkBuildSource(process.env.REPAIR === 'true');
} else throw new Error('Unknown check phase');

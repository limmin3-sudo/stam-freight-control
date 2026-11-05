import {identityScope} from './participation.mjs';

// Build evidence belongs to the selected input and generation, just like identity.
// Never use the backup filename, current calendar date or Wiki version as a build.
export function buildResolver(observations) {
  const scopes = new Map();
  for (const event of observations) {
    const scope = identityScope(event.source);
    if (!scopes.has(scope)) scopes.set(scope, []);
    scopes.get(scope).push(event);
  }
  return events => {
    const values = new Set();
    let missing = false;
    for (const event of events) {
      const builds = (scopes.get(identityScope(event.source)) || []).filter(b => b.at <= event.at);
      if (!builds.length) missing = true;
      builds.forEach(b => values.add(b.build));
    }
    if (values.size > 1) return {status:'conflict', value:null};
    return values.size === 1 && !missing
      ? {status:'known', value:[...values][0]} : {status:'unknown', value:null};
  };
}

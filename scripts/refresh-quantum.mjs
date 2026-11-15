// Compatibility entry point: performance and quantum data must update as one validated set.
import {refreshFleet} from './refresh-fleet.mjs';
console.log(await refreshFleet());

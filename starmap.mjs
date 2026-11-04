// Compatibility entry point for the existing application. The new log workbench
// imports starmap-core directly and does not load legacy translation data.
import {createStarMap as createCore} from './starmap-core.mjs';
import {koName} from './aliases.mjs';
import {tr} from './i18n.mjs';
export function createStarMap(container,labelContainer,data,onSelect) {
 return createCore(container,labelContainer,data,onSelect,{koName,tr});
}

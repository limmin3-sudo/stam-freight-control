import {L} from './i18n.mjs';
import {createHistory as create,historyTotalsMarkup as totals} from './history-core.mjs';
export {HISTORY_KEY,readHistory,addRecord,summarize,formatHistoryDistance,clearHistory} from './history-core.mjs';
export const historyTotalsMarkup=records=>totals(records,L);
export const createHistory=(button,options={})=>create(button,{translate:L,...options});

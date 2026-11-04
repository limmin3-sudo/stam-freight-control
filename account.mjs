import {historyTotalsMarkup} from './history.mjs';
import {createAccount as create} from './account-core.mjs';
export const createAccount=(button,options={})=>create(button,{totalsMarkup:historyTotalsMarkup,...options});

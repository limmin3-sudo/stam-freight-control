import { bestSplitSale } from './trade-split';
import { quickRoutes, fieldScenario } from './trade-field';
import { calculateSuite } from './trade-suite';
import { suiteContext, packSuite, fittingTradeShips } from './trade-suite-runtime.mjs';
self.onmessage = (event) => {
  try {
    const { market, options, items, shipId, findFor } = event.data;
    if (event.data.quick) {
      const context = suiteContext(options),
        now = Date.now();
      const routes = quickRoutes(market, options, context, now);
      const field = event.data.observations?.length ? fieldScenario(market,event.data.observations,now) : null;
      const reported = field ? quickRoutes(field,options,context,now) : [];
      const split=event.data.compare ? bestSplitSale(market,options,context,now) : null;
      const fieldSplit=event.data.compare && field ? bestSplitSale(field,options,context,now) : null;
      self.postMessage({ routes, reported, split, fieldSplit });
      return;
    }
    if (findFor) {
      self.postMessage({ ships: fittingTradeShips(findFor) });
      return;
    }
    self.postMessage(
      items
        ? { packing: packSuite(shipId, items) }
        : { result: calculateSuite(market, options, suiteContext(options)) },
    );
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'calculation' });
  }
};

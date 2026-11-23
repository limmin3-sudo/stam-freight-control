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
      const reported = event.data.observations?.length
        ? quickRoutes(fieldScenario(market, event.data.observations, now), options, context, now)
        : [];
      self.postMessage({ routes, reported });
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

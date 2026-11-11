import type {Session} from './flight-session';
export function importSavedFlight(snapshot:Record<string,unknown>):Session & {plan:NonNullable<Session['plan']>;run:NonNullable<Session['run']>};

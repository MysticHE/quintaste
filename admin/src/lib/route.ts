import 'server-only';
import { HttpError, json } from './http';
import { logger } from './db';

export async function route(work: () => Promise<Response>) {
  try { return await work(); }
  catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    logger.error({ event: 'admin_request_failed' });
    return json({ error: 'The request could not be completed. Try again.' }, 500);
  }
}

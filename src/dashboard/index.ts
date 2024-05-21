export default {
  // Use this to create an externally callable function
  async fetch(event: FetchEvent, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Get the ENV variables
    const DUNE_API_KEY = await env.DATA_CHECKS_ENV.get('DUNE_API_KEY');

    if (!DUNE_API_KEY) {
      return new Response('DUNE_API_KEY is not set', { status: 500 });
    }

    return new Response('OK');
  },
  // Use this for scheduled checks
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Get the ENV variables
    const DUNE_API_KEY = await env.DATA_CHECKS_ENV.get('DUNE_API_KEY');

    if (!DUNE_API_KEY) {
      console.error('DUNE_API_KEY is not set');
      return;
    }

    console.log('Scheduled event');
  },
};

export default {
  // Use this to create an externally callable function
  async fetch(event: FetchEvent, env: Env, ctx: ExecutionContext): Promise<Response> {
    return new Response('OK');
  },
  // Use this for scheduled checks
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Scheduled event');
  },
};

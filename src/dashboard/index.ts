export default {
  // Use this to create an externally callable function
  async fetch(event: FetchEvent, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Get the check results from KV
    const aprs = await env.DATA_CHECKS_ENV.get('aprs');
    const prices = await env.DATA_CHECKS_ENV.get('prices');

    // Format the response as a simple HTML in pre tags
    return new Response(
      `<pre>APR Check Results: ${JSON.stringify(aprs, null, 2)}</pre><pre>Price Check Results: ${JSON.stringify(prices, null, 2)}</pre>`,
      { headers: { 'Content-Type': 'text/html' } },
    );
  },
};

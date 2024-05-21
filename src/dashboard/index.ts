interface CheckResult {
  name: string;
  timestamp: number;
  status: 'success' | 'failure';
  result: string;
}

export default {
  // Use this to create an externally callable function
  async fetch(event: FetchEvent, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Get the check results from KV
    const checks: CheckResult[] = await Promise.all(
      ['aprs', 'prices']
        .map(async (key) => {
          const value = await env.DATA_CHECKS_ENV.get(key);
          if (value) {
            return JSON.parse(value);
          }
          return null;
        })
        .filter((check) => check !== null),
    );

    // Build the HTML response
    const responseParts = checks.map((check) => {
      return `<pre>${check.name} status: ${check.status}\n\n${JSON.stringify(check.result, null, 2)}</pre>`;
    });

    // Format the response as a simple HTML in pre tags
    return new Response(responseParts.join('\n'), { headers: { 'Content-Type': 'text/html' } });
  },
};

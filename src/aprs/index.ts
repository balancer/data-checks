/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

async function fetchAndCompareAprs(slackUrl: string) {
  const graphqlEndpoint = 'https://api-v3.balancer.fi/';
  const restEndpoint = 'https://api.balancer.fi/pools/10/0x8bb826afc0ff7d2c034a2883f4c461ffd238e1c300020000000000000000012b';
  const graphqlQuery = {
    query: `
      query AprSample {
        poolGetPool(
          chain: OPTIMISM
          id: "0x8bb826afc0ff7d2c034a2883f4c461ffd238e1c300020000000000000000012b"
        ) {
          dynamicData {
            apr {
              apr {
                ... on GqlPoolAprTotal {
                  total
                }
              }
            }
          }
        }
      }
    `,
  };

  try {
    // Fetching APR from GraphQL API
    const graphqlResponse = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(graphqlQuery),
    });
    const graphqlData = await graphqlResponse.json();
    const apr1 = parseFloat(graphqlData.data.poolGetPool.dynamicData.apr.apr.total);

    // Fetching APR from REST API
    const restResponse = await fetch(restEndpoint);
    const restData = await restResponse.json();
    const apr2 = restData.apr.tokenAprs.total / 10000.0; // Adjusting for scale difference

    // Comparing APRs and triggering an alert if the difference is more than 5%
    const difference = Math.abs(apr1 - apr2);
    if (difference > 0.05 * Math.max(apr1, apr2)) {
      console.log('APR values differ by more than 5%', { apr1, apr2 });
      // Here you would typically call another endpoint or handle the mismatch
      // Example: await fetch('YOUR_ENDPOINT', { method: 'POST', body: JSON.stringify({apr1, apr2}) });
      await fetch(slackUrl, {
        method: 'POST',
        body: JSON.stringify({
          channel: '#data-checks',
          username: 'APRs',
          text: 'APRs off - need to call poolReloadAllPoolAprs(chain: OPTIMISM) mutation',
        }),
      });
      return `APR values differ by more than 5% ${apr1}, ${apr2}`;
    } else {
      console.log('APR values are within the acceptable range', { apr1, apr2 });
      return `APR values are within the acceptable range ${apr1}, ${apr2}`;
    }
  } catch (error) {
    console.error('Error fetching APR data:', error);
  }
}

export default {
  async fetch(event: FetchEvent, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Get the ENV variables
    const SLACK_WEBHOOK = await env.DATA_CHECKS_ENV.get('SLACK_WEBHOOK');

    if (!SLACK_WEBHOOK) {
      return new Response('SLACK_WEBHOOK is not set', { status: 500 });
    }

    const r = await fetchAndCompareAprs(SLACK_WEBHOOK);
    return new Response(r);
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Get the ENV variables
    const SLACK_WEBHOOK = await env.DATA_CHECKS_ENV.get('SLACK_WEBHOOK');

    if (!SLACK_WEBHOOK) {
      return;
    }

    console.log(event.scheduledTime);

    await fetchAndCompareAprs(SLACK_WEBHOOK);
  },
};

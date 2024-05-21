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

    // Returns the relative difference between the two APRs in percentage
    return Math.max(apr1, apr2) / difference;
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

    const difference = await fetchAndCompareAprs(SLACK_WEBHOOK);

    if (!difference) {
      return new Response('Error fetching APR data', { status: 500 });
    }

    let responseBody = '';
    if (difference > 0.05) {
      responseBody = `APR values differ by ${difference * 100}`;
    } else {
      responseBody = `APR values are within the acceptable range ${difference * 100}`;
    }

    return new Response(responseBody);
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Get the ENV variables
    const SLACK_WEBHOOK = await env.DATA_CHECKS_ENV.get('SLACK_WEBHOOK');

    if (!SLACK_WEBHOOK) {
      return;
    }

    const difference = await fetchAndCompareAprs(SLACK_WEBHOOK);

    // Store the check result in KV
    await env.DATA_CHECKS_ENV.put(
      'aprs',
      JSON.stringify({
        timestamp: event.scheduledTime,
        passed: difference && difference <= 0.05,
        result: difference,
      }),
    );

    let errorMessage = '';

    if (!difference) {
      errorMessage = 'Failed to fetch APRs for checking';
    } else if (difference > 0.05) {
      errorMessage = `APR values differ by ${difference * 100}, need to call poolReloadAllPoolAprs(chain: OPTIMISM) mutation`;
    }

    if (errorMessage) {
      await fetch(SLACK_WEBHOOK, {
        method: 'POST',
        body: JSON.stringify({
          channel: '#data-checks',
          username: 'APRs',
          text: errorMessage,
        }),
      });
    }
  },
};

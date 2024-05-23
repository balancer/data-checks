/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

async function fetchAndCompareAprs() {
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

  let newApr = 0;
  let oldApr = 0;

  // Fetching APR from GraphQL API
  try {
    const graphqlResponse = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(graphqlQuery),
    });
    const graphqlData = await graphqlResponse.json();
    newApr = parseFloat(graphqlData.data.poolGetPool.dynamicData.apr.apr.total);
  } catch (error) {
    console.error('Error fetching APR data from the new API:', error);
  }

  // Fetching APR from REST API
  try {
    const restResponse = await fetch(restEndpoint);
    const restData = await restResponse.json();
    oldApr = restData.apr.tokenAprs.total / 10000.0; // Adjusting for scale difference
  } catch (error) {
    console.error('Error fetching APR data:', error);
  }

  // Comparing APRs and triggering an alert if the difference is more than 5%
  const difference = Math.abs(newApr - oldApr);

  // Returns the relative difference between the two APRs in percentage
  return difference / Math.max(newApr, oldApr);
}

export default {
  async fetch(event: FetchEvent, env: Env, ctx: ExecutionContext): Promise<Response> {
    const difference = await fetchAndCompareAprs();

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

    const difference = await fetchAndCompareAprs();

    // Store the check result in KV
    await env.DATA_CHECKS_ENV.put(
      'aprs',
      JSON.stringify({
        name: 'APR',
        timestamp: event.scheduledTime,
        status: difference && difference <= 0.05 ? 'success' : 'failure',
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

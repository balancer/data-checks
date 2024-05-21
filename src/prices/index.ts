type Fetcher = (key?: string) => Promise<Map<string, number>>;

// Ethereum addresses to fetch prices for
// const addresses = [
//   '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
//   '0x83f20f44975d03b1b09e64809b757c47f942beea', // sDAI
//   '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
//   '0xba100000625a3754423978a60c9317c58a424e3d', // BAL
//   '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', // AAVE
//   '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
// ];

// Fetches the current prices from the balancer API
const getPricesFromAPI: Fetcher = async () => {
  const query = `query Prices {
    tokenGetCurrentPrices(chains:[MAINNET]) {
      updatedAt
      address
      price
    }
  }`;
  const host = 'https://api-v3.balancer.fi/';
  const response = await fetch(host, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const {
    data: { tokenGetCurrentPrices },
  } = (await response.json()) as {
    data: { tokenGetCurrentPrices: { updatedAt: number; address: string; price: number }[] };
  };
  const prices = new Map<string, number>();
  tokenGetCurrentPrices.forEach((price: { address: string; price: number }) => {
    prices.set(price.address, price.price);
  });
  return prices;
};

const getPricesFromDune: Fetcher = async (key?: string) => {
  if (!key) {
    return {} as Map<string, number>;
  }
  const url = 'https://api.dune.com/api/v1/query/3707230/results';
  const headers = {
    'X-Dune-API-Key': key,
  };
  let offset = 0;
  const limit = 1000;
  const prices = new Map<string, number>();

  while (true) {
    const response = await fetch(`${url}?limit=${limit}&offset=${offset}`, { headers });
    const body = await response.json();
    const {
      result: { rows },
    } = body as { result: { rows: { contract_address: string; price: number }[] } };

    rows.forEach((price) => {
      prices.set(price.contract_address, price.price);
    });

    if (rows.length < limit) {
      break;
    }

    offset += limit;
  }

  return prices;
};

const compare = async (duneKey: string) => {
  // Fetch the prices from the balancer API
  const balancerPrices = await getPricesFromAPI();
  // Fetch the prices from the Dune API
  const dunePrices = await getPricesFromDune(duneKey);
  // Use all balancer API addresses
  const addresses = Array.from(new Set([...balancerPrices.keys()]));

  const checks = addresses.map((address) => {
    const balancerPrice = balancerPrices.get(address);
    const dunePrice = dunePrices.get(address);
    if (!dunePrice) {
      console.log(`No price for ${address} in Dune`);
    }
    if (!balancerPrice || !dunePrice) {
      return {
        address,
        balancerPrice,
        dunePrice,
        diff: null,
        drift: null,
      };
    }
    const diff = Math.abs(balancerPrice - dunePrice);
    return {
      address,
      balancerPrice,
      dunePrice,
      diff,
      drift: diff / balancerPrice,
    };
  });

  return checks;
};

export default {
  async fetch(event: FetchEvent, env: Env, ctx: ExecutionContext): Promise<Response> {
    const checks = await compare(env.DUNE_API_KEY);

    // return only the addresses with a price difference greater than 2%
    const drifters = checks.filter((check) => check.drift && check.drift > 0.02);
    return new Response(JSON.stringify(drifters), { headers: { 'Content-Type': 'application/json' } });

    // return new Response(JSON.stringify(checks));
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Compare the prices from the balancer API and the Dune API
    const checks = await compare(env.DUNE_API_KEY);

    // Send an alert if the price difference is greater than 2%
    const drifters = checks.filter((check) => check.drift && check.drift > 0.02);

    if (drifters.length > 0) {
      await fetch(env.SLACK_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: '#data-checks',
          username: 'TokenPrices',
          text: `Price differences: ${drifters.map((check) => `${check.address}: ${check.diff && check.diff * 100}%`)}`,
        }),
      });
    }
  },
};

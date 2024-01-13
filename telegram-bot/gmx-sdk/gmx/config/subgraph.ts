import { Client, cacheExchange, createClient, fetchExchange } from "@urql/core";
import {
  ARBITRUM,
  ARBITRUM_GOERLI,
  AVALANCHE,
  AVALANCHE_FUJI,
  ETH_MAINNET,
} from "./chains";

const SUBGRAPH_URLS = {
  [ARBITRUM]: {
    stats:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-arbitrum-stats/api",
    referrals:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-arbitrum-referrals/api",
    nissohVault: "https://api.thegraph.com/subgraphs/name/nissoh/gmx-vault",
    syntheticsStats:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-arbitrum-stats/version/add-timestamp-231212190517-5cb777b/api",
  },

  [ARBITRUM_GOERLI]: {
    stats:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-arbitrum-stats/api",
    referrals:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-goerli-referrals/api",
    syntheticsStats:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-goerli-stats/version/earnings-2-231121085556-d8ceec8/api",
  },

  [AVALANCHE]: {
    stats:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-avalanche-stats/api",
    referrals:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-avalanche-referrals/api",
    syntheticsStats:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-avalanche-stats/version/add-timestamp-231212190539-5cb777b/api",
  },

  [AVALANCHE_FUJI]: {
    stats: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-stats",
    referrals:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-fuji-referrals/api",
    syntheticsStats:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-fuji-stats/api",
  },

  common: {
    [ETH_MAINNET]: {
      chainLink: "https://api.thegraph.com/subgraphs/name/deividask/chainlink",
    },
  },
} as any;

function getSubgraphUrl(chainId: number, subgraph: string) {
  return SUBGRAPH_URLS?.[chainId]?.[subgraph];
}

export function getClientForSubgraph(
  chainId: number,
  subgraph: string
): Client {
  const url = getSubgraphUrl(chainId, subgraph);
  console.log({ url });

  if (!url) {
    throw new Error(`Subgraph ${subgraph} not found for chain ${chainId}`);
  }
  const client = createClient({
    url,
    exchanges: [cacheExchange, fetchExchange],
  });

  return client;
}

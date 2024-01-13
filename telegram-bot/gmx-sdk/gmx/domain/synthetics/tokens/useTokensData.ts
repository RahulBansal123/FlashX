import { getTokensMap, getV2Tokens } from "../../../config/tokens";
import { bigNumberify } from "../../../lib/numbers";
import { TokenBalancesData, TokensData } from "./types";
import { useTokenBalances } from "./useTokenBalances";
import { useTokenRecentPrices } from "./useTokenRecentPricesData";

type TokensDataResult = {
  tokensData?: TokensData;
  pricesUpdatedAt?: number;
};

export async function useTokensData(
  chainId: number,
  account: string,
  fetchBalance: boolean = false
): Promise<TokensDataResult> {
  const tokenConfigs = getTokensMap(chainId);
  const tokenAddresses = getV2Tokens(chainId)?.map((token) => token.address);
  const { pricesData, updatedAt: pricesUpdatedAt } = await useTokenRecentPrices(
    chainId
  );

  if (!tokenAddresses || !pricesData) {
    return {};
  }

  let balancesData: TokenBalancesData | undefined;
  if (fetchBalance) {
    const result = await useTokenBalances(chainId, account);
    balancesData = result.balancesData;
  }

  const tokensData = tokenAddresses.reduce((acc: TokensData, tokenAddress) => {
    const tokenConfig = tokenConfigs[tokenAddress];
    const prices = pricesData[tokenAddress];

    if (prices && tokenConfig) {
      acc[tokenAddress] = {
        ...tokenConfig,
        prices,
        balance: fetchBalance ? balancesData?.[tokenAddress] : bigNumberify(0),
      };
    }

    return acc;
  }, {} as TokensData);

  return {
    tokensData: tokensData || undefined,
    pricesUpdatedAt,
  };
}

export async function useTokenData(
  chainId: number,
  account: string,
  fetchBalance: boolean = false,
  tokenAddress: string[]
): Promise<TokensDataResult> {
  const tokenConfigs = getTokensMap(chainId);

  const { pricesData, updatedAt: pricesUpdatedAt } = await useTokenRecentPrices(
    chainId
  );

  if (!tokenAddress || !pricesData) {
    return {};
  }

  let balancesData: TokenBalancesData | undefined;
  if (fetchBalance) {
    const result = await useTokenBalances(chainId, account);
    balancesData = result.balancesData;
  }

  const tokensData = tokenAddress.reduce((acc: TokensData, tokenAddr) => {
    const tokenConfig = tokenConfigs[tokenAddr];
    const prices = pricesData[tokenAddr];

    if (prices && tokenConfig) {
      acc[tokenAddr] = {
        ...tokenConfig,
        prices,
        balance: fetchBalance ? balancesData?.[tokenAddr] : bigNumberify(0),
      };
    }

    return acc;
  }, {} as TokensData);

  return {
    tokensData: tokensData || undefined,
    pricesUpdatedAt,
  };
}

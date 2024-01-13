import { NATIVE_TOKEN_ADDRESS } from "@/gmx-sdk/gmx/config/tokens";
import { useMarketsInfo } from "@/gmx-sdk/gmx/domain/synthetics/markets";
import {
  expandDecimals,
  formatAmount,
  formatTokenAmount,
  formatUsd,
  numberWithCommas,
} from "@/gmx-sdk/gmx/lib/numbers";
import { getByKey } from "@/gmx-sdk/gmx/lib/objects";
import { TokenData } from "@/gmx-sdk/gmx/types";

export const selectTokenText = (type: string, marketList: string) =>
  `<b>Create Order</b>
\n<b>═══ Overview ═══</b>
Order Type: <b>${type}</b>
\n<b>═══ Market Price List ═══</b>
${marketList}
<b>Action: </b>Select the token you want to long or short
`;

export const selectTokenForCollateralText = (
  type: string,
  symbol: string,
  balances: string
) =>
  `<b>Create Order</b>
\n<b>═══ Overview ═══</b>
Order Type: <b>${type}</b>
Token: <b>${symbol.toUpperCase()}</b>
\n<b>═══ Your Balance ═══</b>
${balances}
<b>Action: </b>Select the collateral you want to use
`;

export const addCollateralText = (
  type: string,
  token: string,
  collateral: string
) =>
  `<b>Create Order</b>
\n<b>═══ Overview ═══</b>
Order Type: <b>${type}</b>
Token: <b>${token.toUpperCase()}</b>
Collateral: <b>${collateral.toUpperCase()}</b>
\n<b>Action: </b>Enter the amount of ${String(
    collateral
  ).toUpperCase()} you want to use as collateral. (Numbers and decimals only). Example: 10.12`;

export const addLeverageText = (
  type: string,
  token: string,
  collateral: string,
  amount: string
) =>
  `<b>Create Order</b>
\n<b>═══ Overview ═══</b>
Order Type: <b>${type}</b>
Token: <b>${token.toUpperCase()}</b>
Collateral: <b>${amount} ${collateral.toUpperCase()}</b>
\n<b>Action: </b>Enter leverage(1-50). Example: 20.5`;

export const addTriggerPriceText = (
  type: string,
  token: string,
  collateral: string,
  amount: string,
  leverage: string,
  entryPrice: string
) =>
  `<b>Create Order</b>
\n<b>═══ Overview ═══</b>
Order Type: <b>${type}</b>
Token: <b>${token.toUpperCase()}</b>
Collateral: <b>${amount} ${collateral.toUpperCase()}</b>
Leverage: <b>${leverage}x</b>
Entry Price: <b>${entryPrice}</b>
\n<b>Action: </b>Enter trigger price`;

export const showOrderOverviewText = (
  type: string,
  token: string,
  collateral: string,
  amount: string,
  leverage: string,
  entryPrice: string,
  liquidationPrice: string,
  fees: string,
  triggerPrice?: string
) => {
  const text = `<b>Order Details</b>
\nOrder Type: <b>${type}</b>
Token: <b>${token.toUpperCase()}</b>
Entry Price: <b>${entryPrice}</b>
Liquidation Price: <b>${liquidationPrice}</b>
Collateral: <b>${amount} ${collateral.toUpperCase()}</b>
Leverage: <b>${leverage}x</b>
Fees: <b>${fees}</b>`;

  if (triggerPrice) {
    return `${text}\nTrigger Price: <b>${triggerPrice}</b>`;
  }

  return text;
};

export const fetchTokensToLongOrShort = async (
  chainId: number,
  account: string
): Promise<null | {
  tokens: string[];
  marketList: string;
}> => {
  const { marketsInfoData } = await useMarketsInfo(chainId, account);

  if (!marketsInfoData) {
    throw new Error("No markets info data");
  }

  const marketsInfo = Object.values(marketsInfoData || {})
    .filter((market) => !market.isDisabled)
    .sort((a, b) => {
      return a.indexToken.symbol.localeCompare(b.indexToken.symbol);
    });

  const indexTokens = new Set<TokenData>();

  for (const marketInfo of marketsInfo) {
    const longToken = marketInfo.longToken;
    const shortToken = marketInfo.shortToken;
    const indexToken = marketInfo.indexToken;

    if (marketInfo.isDisabled || !longToken || !shortToken || !indexToken) {
      continue;
    }

    if (!marketInfo.isSpotOnly) {
      indexTokens.add(indexToken);
    }
  }

  let marketList = "";

  Array.from(indexTokens).forEach((token) => {
    const tokenPrice = formatUsd(token.prices.minPrice, {
      displayDecimals: token.priceDecimals,
    });

    marketList += `${token.symbol}: ${tokenPrice}\n`;
  });

  return {
    tokens: Array.from(indexTokens)
      .filter((t) => t && !t.isTempHidden)
      .map((t) => t.symbol),
    marketList,
  };
};

export const generateBalanceAndPriceList = async (
  chainId: number,
  account: string
): Promise<null | {
  balances: string;
  collateralTokens: string[];
}> => {
  const { marketsInfoData, tokensData } = await useMarketsInfo(
    chainId,
    account,
    true
  );

  if (!marketsInfoData || !tokensData) {
    return null;
  }

  const marketsInfo = Object.values(marketsInfoData || {})
    .filter((market) => !market.isDisabled)
    .sort((a, b) => {
      return a.indexToken.symbol.localeCompare(b.indexToken.symbol);
    });

  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);
  const collaterals = new Set<TokenData>();

  for (const marketInfo of marketsInfo) {
    const longToken = marketInfo.longToken;
    const shortToken = marketInfo.shortToken;
    const indexToken = marketInfo.indexToken;

    if (marketInfo.isDisabled || !longToken || !shortToken || !indexToken) {
      continue;
    }

    if ((longToken.isWrapped || shortToken.isWrapped) && nativeToken) {
      collaterals.add(nativeToken);
    }

    collaterals.add(longToken);
    collaterals.add(shortToken);
  }

  const collateralTokens = Array.from(collaterals)
    .filter((t) => t && !t.isTempHidden)
    .map((t) => t.symbol);

  let balances = "";

  const tokensWithBalance: TokenData[] = Object.values(tokensData).filter(
    (token) =>
      token.balance &&
      token.balance.gt(0) &&
      token.prices.minPrice &&
      collateralTokens.includes(token.symbol)
  );

  tokensWithBalance.forEach((token) => {
    const tokenBalanceText = formatTokenAmount(token.balance!, token.decimals);

    const tokenBalanceUsd = token
      .balance!.mul(token.prices.maxPrice)
      .div(expandDecimals(1, token.decimals));

    const tokenBalanceUsdText = formatAmount(tokenBalanceUsd, 30, 2, false);

    balances += `${token.symbol}: ${tokenBalanceText} ($${numberWithCommas(
      tokenBalanceUsdText
    )})\n`;
  });

  return {
    balances,
    collateralTokens: tokensWithBalance.map((t) => t.symbol),
  };
};

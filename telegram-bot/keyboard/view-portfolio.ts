import { getMarketsInfo } from "@/gmx-sdk/gmx";
import { useMarketsInfo } from "@/gmx-sdk/gmx/domain/synthetics/markets";
import { convertToUsd } from "@/gmx-sdk/gmx/domain/synthetics/tokens";
import {
  expandDecimals,
  formatAmount,
  formatTokenAmount,
  limitDecimals,
  numberWithCommas,
} from "@/gmx-sdk/gmx/lib/numbers";
import { TokenData } from "@/gmx-sdk/gmx/types";
import { BigNumber } from "ethers";

export const getUserBalance = async (
  chainId: number,
  account: string
): Promise<{ symbol: string; balance: BigNumber }[]> => {
  const { tokensData } = await getMarketsInfo(chainId, account, true);

  if (!tokensData) {
    return [];
  }

  const tokensWithBalance: {
    symbol: string;
    balance: BigNumber;
  }[] = Object.values(tokensData)
    .filter(
      (token) => token.balance && token.balance.gt(0) && token.prices.minPrice
    )
    .map((token) => {
      const tokenBalanceUsd = token
        .balance!.mul(token.prices.maxPrice)
        .div(expandDecimals(1, token.decimals));

      return {
        symbol: token.symbol,
        balance: tokenBalanceUsd,
      };
    });

  return tokensWithBalance;
};

export const viewPortfolio = async (
  chainId: number,
  account: string
): Promise<string> => {
  const { tokensData } = await useMarketsInfo(chainId, account, true);

  if (!tokensData) {
    return "No tokens data found";
  }

  const tokensWithBalance: TokenData[] = Object.values(tokensData)
    .filter(
      (token) => token.balance && token.balance.gt(0) && token.prices.minPrice
    )
    .sort((a, b) => {
      const aBalanceUsd = convertToUsd(
        a.balance!,
        a.decimals,
        a.prices.minPrice!
      );
      const bBalanceUsd = convertToUsd(
        b.balance!,
        b.decimals,
        b.prices.minPrice!
      );
      return bBalanceUsd?.sub(aBalanceUsd || 0).gt(0) ? 1 : -1;
    });

  const balanceLines: string[] = [];

  let netWorth = 0;

  tokensWithBalance.forEach((token) => {
    const tokenBalanceText = formatTokenAmount(token.balance!, token.decimals);

    const tokenBalanceUsd = token
      .balance!.mul(token.prices.maxPrice)
      .div(expandDecimals(1, token.decimals));

    const tokenBalanceUsdText = formatAmount(tokenBalanceUsd, 30, 2, false);

    netWorth += Number(tokenBalanceUsdText);

    balanceLines.push(
      `${token.symbol}: ${tokenBalanceText} ($${numberWithCommas(
        tokenBalanceUsdText
      )})\n`
    );
  });

  const balanceText = balanceLines.join("");

  const text = `<b>Statement</b>

═══ Overview ═══
Address: ${account}
Net worth: $${limitDecimals(netWorth, 2)}`;

  if (balanceText.length > 0) {
    return `${text}

═══ Token Balances ═══
${balanceText}`;
  }

  return text;
};

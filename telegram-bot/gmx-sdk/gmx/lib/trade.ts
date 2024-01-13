import { BigNumber, utils } from "ethers";
import { BASIS_POINTS_DIVISOR } from "./factors";
import { getClientForSubgraph } from "../config/subgraph";
import { getWrappedToken } from "../config/tokens";
import { OrderType } from "../types";
import { getByKey } from "./objects";
import { gql } from "@urql/core";
import { PositionTradeAction } from "../domain/synthetics/trade";
import { bigNumberify } from "./numbers";
import { parseContractPrice } from "../domain/synthetics/tokens";
import { useMarketsInfo } from "../domain/synthetics/markets";

export function applySlippageToPrice(
  allowedSlippage: number,
  price: BigNumber,
  isIncrease: boolean,
  isLong: boolean
) {
  const shouldIncreasePrice = getShouldUseMaxPrice(isIncrease, isLong);

  const slippageBasisPoints = shouldIncreasePrice
    ? BASIS_POINTS_DIVISOR + allowedSlippage
    : BASIS_POINTS_DIVISOR - allowedSlippage;

  return price
    .mul(BigNumber.from(slippageBasisPoints))
    .div(BigNumber.from(BASIS_POINTS_DIVISOR));
}

export function getShouldUseMaxPrice(isIncrease: boolean, isLong: boolean) {
  return isIncrease ? isLong : !isLong;
}

export async function useTradeHistory(
  chainId: number,
  p: {
    account: string;
  }
): Promise<PositionTradeAction[] | null> {
  const { account } = p;

  const client = getClientForSubgraph(chainId, "syntheticsStats");

  const query = gql`query TradeActions($account: String!) {
  tradeActions(
    orderBy: transaction__timestamp,
    orderDirection: desc,
    where: { account: $account }
  ) {
    id
    eventName
    account
    marketAddress
    swapPath
    initialCollateralTokenAddress
    initialCollateralDeltaAmount
    sizeDeltaUsd
    triggerPrice
    acceptablePrice
    executionPrice
    executionAmountOut
    orderType
    isLong
    transaction {
      timestamp
      hash
    }
  }
}
`;

  const { data } = await client!
    .query(query, { account: account.toLowerCase() })
    .toPromise();

  console.log("data", data);

  if (!data || !data.tradeActions) {
    return null;
  }

  const { marketsInfoData, tokensData } = await useMarketsInfo(
    chainId,
    account,
    false
  );

  const tradeActions = data.tradeActions
    .flat()
    .map((rawAction: PositionTradeAction) => {
      const orderType = Number(rawAction.orderType);

      if (![OrderType.MarketSwap, OrderType.LimitSwap].includes(orderType)) {
        const marketAddress = utils.getAddress(rawAction.marketAddress!);
        const marketInfo = getByKey(marketsInfoData, marketAddress);
        const indexToken = marketInfo?.indexToken;
        const initialCollateralTokenAddress = utils.getAddress(
          rawAction.initialCollateralTokenAddress!
        );

        const initialCollateralToken = getByKey(
          tokensData,
          initialCollateralTokenAddress
        );

        if (!indexToken || !initialCollateralToken) {
          return undefined;
        }

        const tradeAction: PositionTradeAction = {
          indexToken,
          marketAddress,
          initialCollateralToken,
          initialCollateralTokenAddress,
          sizeDeltaUsd: bigNumberify(rawAction.sizeDeltaUsd)!,
          isLong: rawAction.isLong!,
          orderType,
          triggerPrice: rawAction.triggerPrice
            ? parseContractPrice(
                bigNumberify(rawAction.triggerPrice)!,
                indexToken.decimals
              )
            : undefined,
          executionPrice: rawAction.executionPrice
            ? parseContractPrice(
                bigNumberify(rawAction.executionPrice)!,
                indexToken.decimals
              )
            : undefined,
          eventName: rawAction.eventName,
          acceptablePrice: parseContractPrice(
            bigNumberify(rawAction.acceptablePrice)!,
            indexToken.decimals
          ),
          indexTokenPriceMin: rawAction.indexTokenPriceMin
            ? parseContractPrice(
                BigNumber.from(rawAction.indexTokenPriceMin),
                indexToken.decimals
              )
            : undefined,
          indexTokenPriceMax: rawAction.indexTokenPriceMax
            ? parseContractPrice(
                BigNumber.from(rawAction.indexTokenPriceMax),
                indexToken.decimals
              )
            : undefined,
          initialCollateralDeltaAmount: bigNumberify(
            rawAction.initialCollateralDeltaAmount
          )!,
        };

        return tradeAction;
      }
    })
    .filter(Boolean) as PositionTradeAction[];

  return tradeActions;
}

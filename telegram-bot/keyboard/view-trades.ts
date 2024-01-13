import { fetchTrades } from "@/gmx-sdk/gmx";
import { formatAcceptablePrice } from "@/gmx-sdk/gmx/domain/synthetics/positions";
import { usePositionsConstants } from "@/gmx-sdk/gmx/domain/synthetics/positions/usePositionsConstants";
import {
  PositionTradeAction,
  TradeActionType,
  getTriggerThresholdType,
} from "@/gmx-sdk/gmx/domain/synthetics/trade";
import { formatTokenAmount, formatUsd } from "@/gmx-sdk/gmx/lib/numbers";
import { getShouldUseMaxPrice } from "@/gmx-sdk/gmx/lib/trade";
import { OrderType } from "@/gmx-sdk/gmx/types";

export const viewTrades = async (
  chainId: number,
  account: string
): Promise<string> => {
  let text = "<b>Tradebook</b>";

  const trades = await fetchTrades(chainId, account);
  if (!trades || Object.keys(trades).length === 0) {
    return "No trades yet.";
  }

  trades.map((trade) => {
    const positionText = getPositionOrderMessage(trade);
    if (!positionText) return;

    text += `\n\n${positionText}`;
  });

  return text;
};

function getPositionOrderMessage(
  tradeAction: PositionTradeAction
): string | null {
  const messages = formatPositionMessage(tradeAction);
  if (messages === null) return null;

  let text = "";

  messages.forEach((message: string) => {
    text += `${message} `;
  });

  return text;
}

export const formatPositionMessage = (
  tradeAction: PositionTradeAction
): string[] | null => {
  const indexToken = tradeAction.indexToken;
  const priceDecimals = tradeAction.indexToken.priceDecimals;
  const collateralToken = tradeAction.initialCollateralToken;
  const sizeDeltaUsd = tradeAction.sizeDeltaUsd;
  const collateralDeltaAmount = tradeAction.initialCollateralDeltaAmount;

  const isIncrease = isIncreaseOrderType(tradeAction.orderType);
  const increaseText = isIncrease ? `Increase` : `Decrease`;
  const longText = tradeAction.isLong ? `Long` : `Shor`;
  const positionText = `${longText} ${indexToken.symbol}`;
  const sizeDeltaText = `${isIncrease ? "+" : "-"}${formatUsd(sizeDeltaUsd)}`;

  switch (tradeAction.orderType) {
    case OrderType.LimitIncrease:
    case OrderType.LimitDecrease: {
      const triggerPrice = tradeAction.triggerPrice;
      const executionPrice = tradeAction.executionPrice;
      const pricePrefix = getTriggerThresholdType(
        tradeAction.orderType!,
        tradeAction.isLong!
      );
      const actionText = getOrderActionText(tradeAction.eventName);
      const tokenPrice = getTokenPriceByTradeAction(tradeAction);
      const orderTypeName = [
        OrderType.LimitIncrease,
        OrderType.LimitSwap,
      ].includes(tradeAction.orderType)
        ? "Limit"
        : getTriggerNameByOrderType(tradeAction.orderType);

      if (tradeAction.eventName === TradeActionType.OrderExecuted) {
        const executeOrderStr = `Execute ${orderTypeName} Order: ${positionText} ${sizeDeltaText},`;
        return [
          `${executeOrderStr} `,
          [
            tokenPrice
              ? `Triggered at: ${formatUsd(tokenPrice, {
                  displayDecimals: priceDecimals,
                })}`
              : undefined,
            `Execution Price: ${formatUsd(executionPrice, {
              displayDecimals: priceDecimals,
            })}`,
          ]
            .filter(Boolean)
            .join(", "),
        ];
      }

      const isFrozen = tradeAction.eventName === TradeActionType.OrderFrozen;
      const prefix = isFrozen
        ? "Execution Failed"
        : `${actionText} ${orderTypeName} Order`;

      const triggerPriceStr = `Trigger Price: ${pricePrefix} ${formatUsd(
        triggerPrice,
        {
          displayDecimals: priceDecimals,
        }
      )}`;
      const acceptablePriceStr = `Acceptable Price: ${formatAcceptablePrice(
        tradeAction.acceptablePrice,
        {
          displayDecimals: priceDecimals,
        }
      )}`;

      const isTakeProfit = tradeAction.orderType === OrderType.LimitDecrease;
      const shouldRenderAcceptablePrice = isTakeProfit || isIncrease;

      if (isFrozen) {
        const arr = [triggerPriceStr];

        if (shouldRenderAcceptablePrice) {
          arr.push(acceptablePriceStr);
        }

        return [
          `${orderTypeName} Order Execution Failed`,
          `: ${positionText} ${sizeDeltaText}`,
          `, ${arr.join(", ")}`,
        ];
      } else {
        const arr = [
          `${prefix}: ${positionText} ${sizeDeltaText}`,
          triggerPriceStr,
        ];

        if (shouldRenderAcceptablePrice) {
          arr.push(acceptablePriceStr);
        }

        return [arr.join(", ")];
      }
    }

    case OrderType.MarketDecrease:
    case OrderType.MarketIncrease: {
      let actionText = {
        [TradeActionType.OrderCreated]: `Request`,
        [TradeActionType.OrderExecuted]: "",
        [TradeActionType.OrderCancelled]: `Cancel`,
        [TradeActionType.OrderUpdated]: `Update`,
        [TradeActionType.OrderFrozen]: `Freeze`,
      }[tradeAction.eventName!];

      if (sizeDeltaUsd?.gt(0)) {
        const pricePrefix =
          tradeAction.eventName === TradeActionType.OrderExecuted
            ? `Execution Price`
            : `Acceptable Price`;
        const price =
          tradeAction.eventName === TradeActionType.OrderExecuted
            ? tradeAction.executionPrice
            : tradeAction.acceptablePrice;
        const formattedPrice = formatAcceptablePrice(price, {
          displayDecimals: priceDecimals,
        });
        const priceStr = `${pricePrefix}: ${formattedPrice}`;
        const marketStr = `Market`;

        return [
          trimStart(
            `${actionText} ${marketStr} ${increaseText}: ${positionText} ${sizeDeltaText}, `
          ),
          priceStr,
        ];
      } else {
        const collateralText = formatTokenAmount(
          collateralDeltaAmount,
          collateralToken.decimals,
          collateralToken.symbol,
          {
            useCommas: true,
          }
        );

        if (isIncrease) {
          return [
            `${actionText} Deposit ${collateralText} into ${positionText}`,
          ];
        } else {
          return [
            `${actionText} Withdraw ${collateralText} from ${positionText}`,
          ];
        }
      }
    }

    case OrderType.Liquidation: {
      const executionPriceStr = `Execution Price`;

      if (tradeAction.eventName === TradeActionType.OrderExecuted) {
        const executionPrice = tradeAction.executionPrice;
        return [
          "Liquidated",
          ` ${positionText} ${sizeDeltaText}, ${executionPriceStr}: ${formatUsd(
            executionPrice,
            {
              displayDecimals: priceDecimals,
            }
          )}`,
        ];
      }

      return null;
    }

    default: {
      throw new Error(`Must never exist`);
    }
  }
};

const trimStart = (str: string) => {
  return str.replace(/^\s+/, "");
};

export function getTriggerNameByOrderType(
  orderType: OrderType | undefined,
  abbr = false
) {
  const triggerStr = abbr ? `T` : `Trigger`;
  const takeProfitStr = abbr ? `TP` : `Take-Profit`;
  const stopLossStr = abbr ? `SL` : `Stop-Loss`;

  if (orderType === OrderType.LimitDecrease) {
    return takeProfitStr;
  }

  if (orderType === OrderType.StopLossDecrease) {
    return stopLossStr;
  }

  return triggerStr;
}

export function getOrderActionText(eventName: TradeActionType) {
  let actionText = "";

  if (eventName === TradeActionType.OrderCreated) {
    actionText = `Create`;
  }

  if (eventName === TradeActionType.OrderCancelled) {
    actionText = `Cancel`;
  }

  if (eventName === TradeActionType.OrderExecuted) {
    actionText = `Execute`;
  }

  if (eventName === TradeActionType.OrderUpdated) {
    actionText = `Update`;
  }

  if (eventName === TradeActionType.OrderFrozen) {
    actionText = `Freeze`;
  }

  return actionText;
}

function getTokenPriceByTradeAction(tradeAction: PositionTradeAction) {
  return getShouldUseMaxPrice(
    isIncreaseOrderType(tradeAction.orderType),
    tradeAction.isLong
  )
    ? tradeAction.indexTokenPriceMax
    : tradeAction.indexTokenPriceMin;
}

function isIncreaseOrderType(orderType: OrderType) {
  return [OrderType.LimitIncrease, OrderType.MarketIncrease].includes(
    orderType
  );
}

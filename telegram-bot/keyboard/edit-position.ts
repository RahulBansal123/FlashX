import { fetchPositions } from '@/gmx-sdk/gmx';
import { getMarketPoolName } from '@/gmx-sdk/gmx/domain/synthetics/markets';
import {
  PositionInfo,
  formatLeverage,
  formatLiquidationPrice,
} from '@/gmx-sdk/gmx/domain/synthetics/positions';
import {
  formatDeltaUsd,
  formatTokenAmount,
  formatUsd,
} from '@/gmx-sdk/gmx/lib/numbers';
import { generateKeys } from '@/utils/generateKeys';
import { BigNumber } from 'ethers';
import { InlineKeyboardButton } from 'node-telegram-bot-api';

export const getPosition = async (
  chainId: number,
  account: string,
  increasedAtBlock: string
): Promise<PositionInfo | null> => {
  const increasedAtBlockModified = BigNumber.from(increasedAtBlock);
  const positions = await fetchPositions(chainId, account);
  if (!positions) {
    return null;
  }

  for (const [_, position] of Object.entries(positions)) {
    if (position.increasedAtBlock.eq(increasedAtBlockModified)) {
      return position;
    }
  }

  return null;
};

export const editPositionText = (position: PositionInfo): string => {
  let text = '<b>Position Details:</b>';

  const indexPriceDecimals = position.indexToken?.priceDecimals;

  text += `\n
Market: ${getMarketPoolName(position.marketInfo)}
Net Value: ${formatUsd(position.netValue)}
Leverage: ${formatLeverage(position.leverage)} ${
    position.isLong ? 'Long' : 'Short'
  }

Mark Price: ${formatUsd(position.markPrice, {
    displayDecimals: indexPriceDecimals,
  })}
Entry Price: ${formatUsd(position.entryPrice, {
    displayDecimals: indexPriceDecimals,
  })}
Liquidation Price: ${formatLiquidationPrice(position.liquidationPrice, {
    displayDecimals: indexPriceDecimals,
  })}

PnL:  ${
    position.pnlAfterFees?.gte(0) ? '\u{2b06}' : '\u{2b07}'
  }${formatDeltaUsd(position.pnlAfterFees, position.pnlAfterFeesPercentage)}

Collateral: ${formatTokenAmount(
    position.remainingCollateralAmount,
    position.collateralToken?.decimals,
    position.collateralToken?.symbol,
    {
      useCommas: true,
    }
  )}
Remaining Collateral: ${formatUsd(position.remainingCollateralUsd)}
Need to add collateral: ${position.hasLowCollateral ? 'Yes' : 'No'}
`;

  return text;
};

export const editPositionButtons = (
  position: PositionInfo
): InlineKeyboardButton[][] => {
  return [
    [
      //   {
      //     text: 'Add Stop Loss/Triger Price',
      //     callback_data: generateKeys(
      //       'add-trigger-price',
      //       position.increasedAtBlock.toString()
      //     ),
      //   },
      // ],
      // [
      //   ...(position.hasLowCollateral
      //     ? [
      //         {
      //           text: 'Add Collateral',
      //           callback_data: generateKeys(
      //             'add-collateral',
      //             position.increasedAtBlock.toString()
      //           ),
      //         },
      //       ]
      //     : []),
      {
        text: 'Close Position',
        callback_data: generateKeys(
          'close-position',
          position.indexToken.symbol,
          position.collateralToken.symbol
        ),
      },
    ],
  ];
};

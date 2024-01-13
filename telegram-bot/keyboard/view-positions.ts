import { fetchPositions } from '@/gmx-sdk/gmx';
import { getMarketPoolName } from '@/gmx-sdk/gmx/domain/synthetics/markets';
import {
  PositionInfo,
  PositionsInfoData,
  formatLeverage,
  formatLiquidationPrice,
} from '@/gmx-sdk/gmx/domain/synthetics/positions';
import {
  formatDeltaUsd,
  formatTokenAmount,
  formatUsd,
} from '@/gmx-sdk/gmx/lib/numbers';
import { generateKeys } from '@/utils/generateKeys';
import { groupKeyboardButtons } from '@/utils/group-tokens';
import { BigNumber } from 'ethers';
import { InlineKeyboardButton } from 'node-telegram-bot-api';

export const viewPositions = async (
  chainId: number,
  account: string
): Promise<PositionsInfoData | undefined> => {
  const positions = await fetchPositions(chainId, account);
  return positions;
};

export const generatePositionsText = async (
  positions: PositionsInfoData
): Promise<string> => {
  let text = '<b>Positions</b>';

  Object.keys(positions).forEach((key, index) => {
    const position: PositionInfo = positions[key];
    const indexPriceDecimals = position.indexToken?.priceDecimals;

    text += `\n\n<b>Position ${index + 1}:</b>
    
Market: ${getMarketPoolName(position.marketInfo)}
Net Value: ${formatUsd(position.netValue)}
Leverage: ${formatLeverage(position.leverage)} ${
      position.isLong ? 'Long' : 'Short'
    }
Collateral: ${formatTokenAmount(
      position.remainingCollateralAmount,
      position.collateralToken?.decimals,
      position.collateralToken?.symbol,
      {
        useCommas: true,
      }
    )}
PnL:  ${position.pnlAfterFees.gte(0) ? '\u{2b06}' : '\u{2b07}'}${formatDeltaUsd(
      position.pnlAfterFees,
      position.pnlAfterFeesPercentage
    )}
Entry Price: ${formatUsd(position.entryPrice, {
      displayDecimals: indexPriceDecimals,
    })}
Liquidation Price: ${formatLiquidationPrice(position.liquidationPrice, {
      displayDecimals: indexPriceDecimals,
    })}
`;
  });

  text += '\n\n<b>Select a position to edit it.</b>';

  return text;
};

export const editPositionsButtons = (
  positions: PositionsInfoData
): InlineKeyboardButton[][] => {
  const buttons: any[] = [];

  Object.keys(positions).forEach((key) => {
    const position: PositionInfo = positions[key];
    const market = getMarketPoolName(position.marketInfo);
    const leverage = formatLeverage(position.leverage);
    const increasedAtBlock = BigNumber.from(
      position.increasedAtBlock
    ).toString();

    buttons.push({
      text: `${market} ${leverage} (${position.isLong ? 'Long' : 'Short'})`,
      callback_data: generateKeys('edit-pos', increasedAtBlock),
    });
  });

  return groupKeyboardButtons(buttons);
};

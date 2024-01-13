import config from '@/config';
import {
  checkAndIncreaseAllowance,
  createDecreaseOrder,
  createIncreaseOrder,
  getMarketsInfo,
} from '@/gmx-sdk/gmx';
import { getContract } from '@/gmx-sdk/gmx/config/contracts';
import { BASIS_POINTS_DIVISOR } from '@/gmx-sdk/gmx/config/factors';
import {
  NATIVE_TOKEN_ADDRESS,
  getTokenBySymbol,
} from '@/gmx-sdk/gmx/config/tokens';
import {
  DecreasePositionAmounts,
  IncreasePositionAmounts,
} from '@/gmx-sdk/gmx/domain/synthetics/trade';
import { parseValue } from '@/gmx-sdk/gmx/lib/numbers';
import { PriceOverrides } from '@/gmx-sdk/gmx/simulateTxn';
import { ExecutionFee, OrderType } from '@/gmx-sdk/gmx/types';
import { BigNumber, Contract, Signer, constants } from 'ethers';
import ExchangeRouter from '@/gmx-sdk/gmx/abis/ExchangeRouter.json';
import { callContract } from '@/gmx-sdk/gmx/lib/contracts';

export const executedOrderText = (txHash: string) =>
  `\u{1f389}Order has been created successfully.

You can view the transaction on Arbiscan:
https://arbiscan.io/tx/${txHash}
  `;

export const executedClosePosText = (txHash: string) =>
  `\u{1f389}Position has been closed successfully.

You can view the transaction on Arbiscan:
https://arbiscan.io/tx/${txHash}
  `;

export async function buildIncreaseOrder(
  chainId: number,
  account: string,
  type: string,
  tokenSymbol: string,
  collateralTokenSymbol: string,
  collateralAmount: string,
  leverage: string,
  isLimit?: boolean,
  triggerPrice?: string
): Promise<{
  marketAddress: string;
  positionAmounts: IncreasePositionAmounts;
  initialCollateralAmount: BigNumber;
  executionFee: ExecutionFee;
  txPayload: string[];
}> {
  const { marketsInfoData } = await getMarketsInfo(chainId, account);

  if (!marketsInfoData) {
    throw new Error('No markets info data');
  }

  const market = Object.values(marketsInfoData).filter(
    (m) =>
      !m.isSpotOnly &&
      m.indexToken.symbol.toLowerCase() === tokenSymbol.toLowerCase()
  );

  if (market.length === 0) {
    throw new Error('No market found');
  }

  const collateralToken = getTokenBySymbol(chainId, collateralTokenSymbol);

  const initialCollateralAmount = parseValue(
    collateralAmount,
    collateralToken.decimals
  );

  const orderType = isLimit
    ? OrderType.LimitIncrease
    : OrderType.MarketIncrease;

  const modifiedLeverage = BigNumber.from(
    parseInt(String(Number(leverage) * BASIS_POINTS_DIVISOR))
  );

  const isLong = type[0] === 'l';

  const increaseOrder = await createIncreaseOrder({
    chainId,
    account,
    marketAddress: market[0]!.marketTokenAddress,
    collateralTokenAddress: collateralToken.address,
    initialCollateralAmount: initialCollateralAmount!.toString(),
    leverage: modifiedLeverage.toString(),
    triggerPrice, // triggerPrice is only for limit orders
    isLong,
    slippage: config.allowedSlippage,
    orderType,
  });

  return {
    marketAddress: market[0]!.marketTokenAddress,
    positionAmounts: increaseOrder.positionAmounts,
    initialCollateralAmount: initialCollateralAmount!,
    executionFee: increaseOrder.executionFee!,
    txPayload: increaseOrder.txPayload,
  };
}

export async function handleIncreaseOrderExecution(
  orderId: string,
  chainId: number,
  signer: Signer,
  tokenSymbol: string,
  collateralTokenSymbol: string,
  collateralAmount: BigNumber,
  executionFeeTokenAmount: BigNumber,
  triggerPrice: BigNumber | undefined,
  txPayload: string[]
) {
  const primaryPriceOverrides: PriceOverrides = {};

  const token = getTokenBySymbol(chainId, tokenSymbol);
  const collateralToken = getTokenBySymbol(chainId, collateralTokenSymbol);

  if (triggerPrice) {
    primaryPriceOverrides[token.address] = {
      minPrice: triggerPrice,
      maxPrice: triggerPrice,
    };
  }

  const isNativePayment = collateralToken.address === NATIVE_TOKEN_ADDRESS;

  const wntCollateralAmount = isNativePayment
    ? BigNumber.from(collateralAmount)
    : BigNumber.from(0);
  const totalWntAmount = wntCollateralAmount.add(executionFeeTokenAmount);

  const exchangeRouter = new Contract(
    getContract(chainId, 'ExchangeRouter'),
    ExchangeRouter.abi,
    signer
  );

  const needCollateralApproval =
    collateralToken.address !== constants.AddressZero && collateralAmount;

  if (needCollateralApproval)
    await checkAndIncreaseAllowance(
      signer,
      chainId,
      collateralToken.address,
      collateralAmount
    );

  try {
    const txn = await callContract(
      chainId,
      exchangeRouter,
      'multicall',
      [txPayload],
      {
        value: totalWntAmount,
      }
    );

    console.log('txn', txn);

    return txn?.hash;
  } catch (e) {
    console.error('error', e);
    throw new Error(`Error executing order with order id: ${orderId}`);
  }
}

export async function buildDecreaseOrder(
  chainId: number,
  account: string,
  type: string,
  tokenSymbol: string,
  collateralTokenSymbol: string,
  collateralAmount: string,
  isLimit: boolean,
  triggerPrice?: string
): Promise<{
  marketAddress: string;
  positionAmounts: DecreasePositionAmounts;
  initialCollateralAmount: BigNumber;
  executionFee: ExecutionFee;
  txPayload: string[];
}> {
  const { marketsInfoData } = await getMarketsInfo(chainId, account);

  if (!marketsInfoData) {
    throw new Error('No markets info data');
  }

  const market = Object.values(marketsInfoData).filter(
    (m) =>
      !m.isSpotOnly &&
      m.indexToken.symbol.toLowerCase() === tokenSymbol.toLowerCase()
  );

  if (market.length === 0) {
    throw new Error('No market found');
  }

  const collateralToken = getTokenBySymbol(chainId, collateralTokenSymbol);

  const initialCollateralAmount = parseValue(
    collateralAmount,
    collateralToken.decimals
  );

  const orderType = isLimit
    ? OrderType.LimitDecrease
    : OrderType.MarketDecrease;

  const isLong = type[0] === 'l';

  const decreaseOrder = await createDecreaseOrder({
    chainId,
    account,
    marketAddress: market[0]!.marketTokenAddress,
    collateralTokenAddress: collateralToken.address,
    isLong,
    slippage: config.allowedSlippage,
    closeSizeUsd: initialCollateralAmount!.toString(),
    triggerPrice,
    orderType,
  });

  return {
    marketAddress: market[0]!.marketTokenAddress,
    positionAmounts: decreaseOrder.positionAmounts,
    initialCollateralAmount: initialCollateralAmount!,
    executionFee: decreaseOrder.executionFee!,
    txPayload: decreaseOrder.txPayload,
  };
}

export async function handleDecreaseOrderExecution(
  orderId: string,
  chainId: number,
  signer: Signer,
  executionFeeTokenAmount: BigNumber,
  txPayload: string[]
) {
  const exchangeRouter = new Contract(
    getContract(chainId, 'ExchangeRouter'),
    ExchangeRouter.abi,
    signer
  );

  try {
    const txn = await callContract(
      chainId,
      exchangeRouter,
      'multicall',
      [txPayload],
      {
        value: executionFeeTokenAmount,
      }
    );

    console.log('txn', txn);

    return txn?.hash;
  } catch (e) {
    console.error('error', e);
    throw new Error(`Error executing order with order id: ${orderId}`);
  }
}

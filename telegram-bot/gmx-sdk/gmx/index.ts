import { MarketsInfoData, useMarketsInfo } from './domain/synthetics/markets';
import { BigNumber, Contract, Signer, constants, utils } from 'ethers';
import {
  DecreasePositionAmounts,
  IncreasePositionAmounts,
  getDecreasePositionAmounts,
  getIncreasePositionAmounts,
  getMarkPrice,
  getNextPositionValuesForIncreaseTrade,
  useSwapRoutes,
} from './domain/synthetics/trade';
import {
  formatLiquidationPrice,
  getLiquidationPrice,
  getPositionKey,
  usePositionsInfo,
} from './domain/synthetics/positions';
import {
  estimateExecuteIncreaseOrderGasLimit,
  gasLimits,
  getExecutionFee,
  useGasPrice,
} from './domain/synthetics/fees';
import {
  cancelOrdersTxn,
  createDecreaseOrderTxn,
  createIncreaseOrderTxn,
  useOrders,
} from './lib/order';
import { OrderType, TokensData } from './types';
import { getContract } from './config/contracts';
import ExchangeRouter from './abis/ExchangeRouter.json';
import { useTokensAllowanceData } from './domain/synthetics/tokens';
import { useTradeHistory } from './lib/trade';
import { formatUsd } from './lib/numbers';
import { getTokenBySymbol } from './config/tokens';
import { callContract } from './lib/contracts';
import Token from '@/gmx-sdk/gmx/abis/Token.json';
import { usePositionsConstants } from './domain/synthetics/positions/usePositionsConstants';
import config from '@/config';

const caches: {
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
} = {};

export async function getMarketsInfo(
  chainId: number,
  account: string,
  fetchBalance: boolean = false
) {
  let { marketsInfoData, tokensData } = caches;
  if (!marketsInfoData || !tokensData) {
    var info = await useMarketsInfo(chainId, account, fetchBalance);
    marketsInfoData = info.marketsInfoData;
    tokensData = info.tokensData;
    caches.marketsInfoData = marketsInfoData;
    caches.tokensData = tokensData;
  }
  return { marketsInfoData, tokensData };
}

export async function fetchMarkets(chainId: number, account: string) {
  account = utils.getAddress(account);
  const { marketsInfoData, tokensData } = await getMarketsInfo(
    chainId,
    account
  );
  return { markets: marketsInfoData, tokens: tokensData };
}

export { getPositionKey } from './domain/synthetics/positions';

export async function fetchPositions(chainId: number, account: string) {
  try {
    account = utils.getAddress(account);
    let { marketsInfoData, tokensData } = await getMarketsInfo(
      chainId,
      account
    );
    const { positionsInfoData } = await usePositionsInfo(chainId, {
      account: account,
      marketsInfoData: marketsInfoData,
      tokensData: tokensData,
      showPnlInLeverage: false,
    });
    return positionsInfoData;
  } catch (e) {
    console.error('fetchPositions error', e);
    throw e;
  }
}

type IncreaseOrderReq = {
  chainId: number;
  account: string;
  marketAddress: string;
  collateralTokenAddress: string;
  initialCollateralAmount: string;
  leverage: string;
  triggerPrice?: string;
  isLong: boolean;
  slippage: number;
  orderType: OrderType.LimitIncrease | OrderType.MarketIncrease;
};

export async function createIncreaseOrder(p: IncreaseOrderReq) {
  p.account = utils.getAddress(p.account);

  const values = await Promise.all([
    getMarketsInfo(p.chainId, p.account),
    // useUserReferralInfo(undefined, p.chainId, p.account, true),
    gasLimits(p.chainId),
    useGasPrice(p.chainId),
  ]);

  const { marketsInfoData, tokensData } = values[0];
  const market = marketsInfoData![p.marketAddress]!;
  const collateralToken = tokensData![p.collateralTokenAddress]!;

  const { positionsInfoData } = await usePositionsInfo(p.chainId, {
    account: p.account,
    marketsInfoData: marketsInfoData,
    tokensData: tokensData,
    showPnlInLeverage: false,
  });
  const posKey = getPositionKey(
    p.account,
    p.marketAddress,
    p.collateralTokenAddress,
    p.isLong
  );

  const swapRoute = useSwapRoutes(p.chainId, {
    marketsInfoData,
    fromTokenAddress: p.collateralTokenAddress,
    toTokenAddress: p.collateralTokenAddress,
  });

  // const userReferralInfo = values[1];

  const increaseAmounts = getIncreasePositionAmounts({
    marketInfo: market,
    indexToken: market.indexToken,
    initialCollateralToken: collateralToken,
    collateralToken: collateralToken,
    isLong: p.isLong,
    initialCollateralAmount: BigNumber.from(p.initialCollateralAmount),
    position: positionsInfoData![posKey],
    leverage: BigNumber.from(p.leverage),
    indexTokenAmount: BigNumber.from(0),
    userReferralInfo: undefined,
    strategy: 'leverageByCollateral',
    findSwapPath: swapRoute.findSwapPath,
  });

  const estimatedGas = estimateExecuteIncreaseOrderGasLimit(values[1], {
    swapsCount: increaseAmounts.swapPathStats?.swapPath.length,
  });
  const { gasPrice } = values[2];
  const executionFee = getExecutionFee(
    values[1],
    tokensData!,
    estimatedGas,
    gasPrice!
  );

  const txPayload = await createIncreaseOrderTxn(p.chainId, {
    account: p.account,
    marketAddress: p.marketAddress,
    initialCollateralAddress: p.collateralTokenAddress,
    initialCollateralAmount: BigNumber.from(p.initialCollateralAmount),
    swapPath: increaseAmounts.swapPathStats?.swapPath || [],
    sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
    acceptablePrice: increaseAmounts.acceptablePrice,
    triggerPrice: p.triggerPrice ? BigNumber.from(p.triggerPrice) : undefined,
    isLong: p.isLong,
    orderType: p.orderType,
    executionFee: executionFee?.feeTokenAmount!,
    allowedSlippage: p.slippage ?? 0,
    referralCode: undefined,
    indexToken: market.indexToken,
  });

  const address = getContract(p.chainId, 'ExchangeRouter');
  const abi = ExchangeRouter.abi;
  const method = 'multicall';
  return {
    txPayload,
    address,
    abi,
    method,
    executionFee,
    indexToken: market.indexToken,
    positionAmounts: increaseAmounts,
  };
}

type DecreaseOrderReq = {
  chainId: number;
  account: string;
  marketAddress: string;
  collateralTokenAddress: string;
  isLong: boolean;
  slippage: number;
  closeSizeUsd: string;
  triggerPrice?: string;
  orderType: OrderType.LimitDecrease | OrderType.MarketDecrease;
};

export async function createDecreaseOrder(p: DecreaseOrderReq) {
  p.account = utils.getAddress(p.account);
  const values = await Promise.all([
    getMarketsInfo(p.chainId, p.account),
    // useUserReferralInfo(undefined, p.chainId, p.account, true),
    gasLimits(p.chainId),
    useGasPrice(p.chainId),
  ]);

  const { marketsInfoData, tokensData } = values[0];
  const market = marketsInfoData![p.marketAddress];
  const collateralToken = tokensData![p.collateralTokenAddress];

  const { positionsInfoData } = await usePositionsInfo(p.chainId, {
    account: p.account,
    marketsInfoData: marketsInfoData,
    tokensData: tokensData,
    showPnlInLeverage: false,
  });

  const posKey = getPositionKey(
    p.account,
    p.marketAddress,
    p.collateralTokenAddress,
    p.isLong
  );

  const decreaseAmounts = getDecreasePositionAmounts({
    marketInfo: market,
    collateralToken: collateralToken,
    isLong: p.isLong,
    position: positionsInfoData![posKey],
    userReferralInfo: undefined,
    closeSizeUsd: BigNumber.from(p.closeSizeUsd),
    keepLeverage: false,
    triggerPrice:
      p.triggerPrice == null ? undefined : BigNumber.from(p.triggerPrice),
    minCollateralUsd: BigNumber.from(0),
    minPositionSizeUsd: BigNumber.from(0),
  });

  const estimatedGas = estimateExecuteIncreaseOrderGasLimit(values[1], {
    swapsCount: 0,
  });

  const { gasPrice } = values[2];
  const executionFee = getExecutionFee(
    values[1],
    tokensData!,
    estimatedGas,
    gasPrice!
  );

  const txPayload = await createDecreaseOrderTxn(p.chainId, {
    account: p.account,
    marketAddress: p.marketAddress,
    initialCollateralAddress: p.collateralTokenAddress,
    initialCollateralDeltaAmount: BigNumber.from(0),
    swapPath: [],
    receiveTokenAddress: p.collateralTokenAddress,
    sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
    sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
    acceptablePrice: decreaseAmounts.acceptablePrice,
    triggerPrice: decreaseAmounts.triggerPrice,
    minOutputUsd: BigNumber.from(0),
    isLong: p.isLong,
    decreasePositionSwapType: decreaseAmounts.decreaseSwapType,
    orderType: p.orderType,
    executionFee: executionFee?.feeTokenAmount!,
    allowedSlippage: p.slippage ?? 0,
    referralCode: undefined,
    indexToken: market.indexToken,
    tokensData: tokensData!,
  });

  const address = getContract(p.chainId, 'ExchangeRouter');
  const abi = ExchangeRouter.abi;
  const method = 'multicall';
  return {
    txPayload,
    address,
    abi,
    method,
    executionFee,
    indexToken: market.indexToken,
    positionAmounts: decreaseAmounts,
  };
}

export async function cancelOrder(chainId: number, keys: string[]) {
  const address = getContract(chainId, 'ExchangeRouter');
  const abi = ExchangeRouter.abi;
  const method = 'multicall';
  const tx = await cancelOrdersTxn(chainId, {
    orderKeys: keys,
    setPendingTxns: () => {},
  });
  return { tx, address, abi, method };
}

export async function fetchOrders(chainId: number, account: string) {
  return await useOrders(chainId, { account });
}

export async function fetchAllowance(
  chainId: number,
  account: string,
  tokens: string[]
) {
  const spenderAddress = getContract(chainId, 'SyntheticsRouter');
  const { tokensAllowanceData } = await useTokensAllowanceData(
    chainId,
    account,
    {
      spenderAddress: spenderAddress,
      tokenAddresses: [...tokens],
    }
  );
  return tokensAllowanceData;
}

export async function fetchTrades(chainId: number, account: string) {
  return await useTradeHistory(chainId, { account });
}

export async function fetchOrderPrices(
  chainId: number,
  account: string,
  type: string,
  tokenSymbol: string,
  collateralTokenSymbol: string,
  positionAmounts: IncreasePositionAmounts | DecreasePositionAmounts,
  marketAddress: string
) {
  const { marketsInfoData, tokensData } = await getMarketsInfo(
    chainId,
    account
  );

  if (!marketsInfoData || !tokensData) {
    throw new Error('No markets info data');
  }

  const token = getTokenBySymbol(chainId, tokenSymbol);
  const collateralToken = getTokenBySymbol(chainId, collateralTokenSymbol);

  const { minCollateralUsd } = await usePositionsConstants(chainId);

  if (!tokensData[token.address] || !tokensData[collateralToken.address]) {
    throw new Error('No tokens data');
  }

  const isLong = type[0] === 'l';

  const entryPrice = await getEntryPrice(chainId, account, tokenSymbol, isLong);

  const nextPositionValues = getLiquidationPrice({
    marketInfo: marketsInfoData[marketAddress]!,
    collateralToken: tokensData[collateralToken.address]!,
    sizeInUsd: positionAmounts.sizeDeltaUsd,
    sizeInTokens: positionAmounts.sizeDeltaInTokens,
    collateralUsd: positionAmounts.collateralDeltaUsd,
    collateralAmount: positionAmounts.collateralDeltaAmount,
    minCollateralUsd: minCollateralUsd!,
    pendingBorrowingFeesUsd: BigNumber.from(0), // deducted on order
    pendingFundingFeesUsd: BigNumber.from(0), // deducted on order
    isLong,
    userReferralInfo: undefined,
  });

  const liqPrice = formatLiquidationPrice(nextPositionValues, {
    displayDecimals: token.priceDecimals,
  });

  return { entryPrice, liqPrice };
}

export async function getEntryPrice(
  chainId: number,
  account: string,
  tokenSymbol: string,
  isLong: boolean
) {
  const { marketsInfoData, tokensData } = await getMarketsInfo(
    chainId,
    account
  );

  if (!marketsInfoData || !tokensData) {
    throw new Error('No markets info data');
  }

  const token = getTokenBySymbol(chainId, tokenSymbol);

  const markPrice = getMarkPrice({
    prices: tokensData[token.address]!.prices,
    isIncrease: true,
    isLong,
  });

  const entryPrice = formatUsd(markPrice, {
    displayDecimals: token.priceDecimals,
  });

  return entryPrice;
}

export const checkAndIncreaseAllowance = async (
  signer: Signer,
  chainId: number,
  tokenAddress: string,
  amount: BigNumber
) => {
  const account = await signer.getAddress();

  const tokensAllowanceData = await fetchAllowance(chainId, account, [
    tokenAddress,
  ]);

  if (!tokensAllowanceData || !tokensAllowanceData[tokenAddress]) {
    return;
  }

  if (amount.gt(tokensAllowanceData[tokenAddress] || 0)) {
    const spenderAddress = getContract(chainId, 'SyntheticsRouter');
    const contract = new Contract(tokenAddress, Token.abi, signer);
    await callContract(
      chainId,
      contract,
      'approve',
      [spenderAddress, constants.MaxUint256],
      {}
    );
  }
};

export function getTotalFees(executionFeeUSD: BigNumber): string {
  const totalFees = executionFeeUSD.add(config.commission);

  const formattedTotalUSD = formatUsd(totalFees, {
    fallbackToZero: false,
  });

  if (!formattedTotalUSD) {
    return BigNumber.from('0').toString();
  }

  return formattedTotalUSD.toString();
}

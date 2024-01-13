import { OrderStatus } from '@prisma/client';

export type Order = {
  type: string;
  token: string;
  amount: string;
  collateral: string;
  leverage: string;
  entryPrice: string;
  liquidationPrice: string;
  fees: string;
  executionFeeTokenAmount: string;
  txPayload: string;
  status: OrderStatus;
  userId: string;
  triggerPrice: string | undefined;
};

import { prisma } from "@/index";
import { Order } from "@/types";
import { OrderStatus } from "@prisma/client";

export const createUserMutation = async (user: {
  userId: number;
  first_name: string;
  last_name: string | undefined;
  username: string;
}) => {
  try {
    await prisma.user.create({
      data: {
        userId: user.userId.toString(),
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        lastSeenAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`Error adding user ${user.userId}: ${error}`);
    throw error;
  }
};

export const updateUserLastSeenMutation = async (userId: number) => {
  try {
    await prisma.user.update({
      where: { userId: userId.toString() },
      data: {
        lastSeenAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`Error udpating user last seen ${userId}: ${error}`);
  }
};

export const updateUserWalletMutation = async (
  privateKey: string,
  address: string,
  userId: number
) => {
  try {
    await prisma.user.update({
      where: { userId: userId.toString() },
      data: {
        privateKey,
        wallet_address: address,
      },
    });
  } catch (error) {
    console.error(`Error udpating user wallet ${userId}: ${error}`);
    throw error;
  }
};

export const saveOrderMutation = async (order: Order): Promise<string> => {
  try {
    const { id } = await prisma.order.create({
      data: {
        type: order.type,
        token: order.token,
        amount: order.amount,
        collateral: order.collateral,
        leverage: order.leverage,
        entryPrice: order.entryPrice,
        liquidationPrice: order.liquidationPrice,
        fees: order.fees,
        status: order.status,
        userId: order.userId,
        txPayload: order.txPayload,
        executionFeeTokenAmount: order.executionFeeTokenAmount,
        triggerPrice: order.triggerPrice,
      },
      select: {
        id: true,
      },
    });

    return id;
  } catch (error) {
    console.error(`Error saving order for user ${order.userId}: ${error}`);
    throw error;
  }
};

export const updateOrderStatusMutation = async (
  orderId: string,
  status: OrderStatus,
  txHash?: string
) => {
  if (status === OrderStatus.COMPLETED && !txHash) {
    throw new Error(
      `txHash is required for COMPLETED order with orderId: ${orderId}`
    );
  }

  try {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        txHash,
      },
    });
  } catch (error) {
    console.error(`Error updating order status ${orderId} ${status}: ${error}`);
    throw error;
  }
};

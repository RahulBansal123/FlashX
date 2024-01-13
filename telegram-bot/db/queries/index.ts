import { prisma } from '@/index';
import { getSignerFromEncryptedPrivateKey } from '@/lib';
import { Order } from '@prisma/client';
import { Signer } from 'ethers';

export const fetchOrder = async (id: string): Promise<Order | null> => {
  try {
    const order = await prisma.order.findUnique({
      where: { id },
    });

    return order;
  } catch (error) {
    console.error(`Error fetching order with id: ${id}`);
    throw error;
  }
};

export const fetchPosition = async (
  userId: number,
  token: string,
  collateral: string
): Promise<Order | undefined> => {
  try {
    const position = await prisma.order.findMany({
      where: { token, userId: userId.toString(), collateral },
    });

    return position[0];
  } catch (error) {
    console.error(`Error fetching position with token: ${token}`);
    throw error;
  }
};

export const getSigner = async (userId: number): Promise<Signer | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: { userId: userId.toString() },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return getSignerFromEncryptedPrivateKey(user.privateKey!);
  } catch (error) {
    console.error(`Error fetching signer of user with id: ${userId}`);
    throw error;
  }
};

export const getUser = async (
  userId: number
): Promise<{ id: string; wallet_address: string | null } | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: { userId: userId.toString() },
      select: { id: true, wallet_address: true },
    });

    return user || null;
  } catch (error) {
    console.error(`Error fetching orders of user with id: ${userId}`);
    throw error;
  }
};

export const getUserAddress = async (
  userId: number
): Promise<string | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: { userId: userId.toString() },
      select: { wallet_address: true },
    });

    return user?.wallet_address || null;
  } catch (error) {
    console.error(`Error fetching orders of user with id: ${userId}`);
    throw error;
  }
};

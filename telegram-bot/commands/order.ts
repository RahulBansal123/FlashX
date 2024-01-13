import { getContract } from "@/gmx-sdk/gmx/config/contracts";
import { callContract } from "@/gmx-sdk/gmx/lib/contracts";
import { getProvider } from "@/gmx-sdk/gmx/provider";
import { ChatId, Message, SendMessageOptions } from "node-telegram-bot-api";
import Token from "@/gmx-sdk/gmx/abis/Token.json";
import { BigNumber, Contract, Wallet, constants } from "ethers";
import {
  createIncreaseOrder,
  fetchAllowance,
  getPositionKey,
} from "@/gmx-sdk/gmx";
import { OrderType } from "@/gmx-sdk/gmx/types";
import config from "@/config";
import { parseValue } from "@/gmx-sdk/gmx/lib/numbers";
import { PriceOverrides } from "@/gmx-sdk/gmx/simulateTxn";
import { isMarketOrderType } from "@/gmx-sdk/gmx/lib/utils";
import ExchangeRouter from "@/gmx-sdk/gmx/abis/ExchangeRouter.json";
import { NATIVE_TOKEN_ADDRESS } from "@/gmx-sdk/gmx/config/tokens";

export const createLongPosition =
  (
    bot: {
      sendMessage: (
        chatId: ChatId,
        text: string,
        options?: SendMessageOptions
      ) => Promise<Message>;
    },
    p: {
      chainId: number;
      marketAddress: string;
      collateralTokenAddress: string;
      collateralAmount: string;
      leverage: string;
      triggerPrice?: string;
      isLimit: boolean;
    }
  ) =>
  async (message: Message) => {
    const chatId = message.chat.id;

    const {
      chainId,
      marketAddress,
      collateralTokenAddress,
      collateralAmount,
      leverage,
      isLimit,
      triggerPrice,
    } = p;

    if (
      !chainId ||
      !marketAddress ||
      !collateralTokenAddress ||
      !collateralAmount ||
      !leverage
    ) {
      return Promise.resolve();
    }

    const collateralDecimals = 6;

    const pKey =
      "728a3e19a5080a401949ead92d52c61a5d7b5b8172e65c5ad1c6fb7f7236b1c6";
    const provider = new Wallet(pKey, getProvider());
    const account = await provider.getAddress();

    const parsedCollateralAmount = parseValue(
      collateralAmount,
      collateralDecimals
    );

    console.log("parsedCollateralAmount", parsedCollateralAmount!.toString());

    const orderType = isLimit
      ? OrderType.LimitIncrease
      : OrderType.MarketIncrease;

    const orderDetails: any = {};
    const positionDetails: any = {};

    const increaseOrder = await createIncreaseOrder({
      chainId,
      account,
      marketAddress,
      collateralTokenAddress,
      initialCollateralAmount: parsedCollateralAmount!.toString(),
      leverage,
      triggerPrice, // triggerPrice is only for limit orders
      isLong: true,
      slippage: config.allowedSlippage,
      orderType,
    });

    const secondaryPriceOverrides: PriceOverrides = {};
    const primaryPriceOverrides: PriceOverrides = {};

    if (triggerPrice) {
      primaryPriceOverrides[increaseOrder.indexToken.address] = {
        minPrice: BigNumber.from(triggerPrice),
        maxPrice: BigNumber.from(triggerPrice),
      };
    }

    const isNativePayment = collateralTokenAddress === NATIVE_TOKEN_ADDRESS;

    const wntCollateralAmount = isNativePayment
      ? BigNumber.from(parsedCollateralAmount)
      : BigNumber.from(0);
    const totalWntAmount = wntCollateralAmount.add(
      increaseOrder.executionFee?.feeTokenAmount!
    );

    const exchangeRouter = new Contract(
      getContract(chainId, "ExchangeRouter"),
      ExchangeRouter.abi,
      provider
    );

    const needCollateralApproval =
      collateralTokenAddress !== constants.AddressZero &&
      parsedCollateralAmount;

    if (needCollateralApproval)
      await checkAndIncreaseAllowance(
        pKey,
        chainId,
        collateralTokenAddress,
        parsedCollateralAmount!
      );

    try {
      const txn = await callContract(
        chainId,
        exchangeRouter,
        "multicall",
        [increaseOrder.txPayload],
        {
          value: totalWntAmount,
        }
      );

      console.log("txn", txn);
      if (isMarketOrderType(orderType)) {
        const positionKey = getPositionKey(
          account,
          marketAddress,
          collateralTokenAddress,
          true
        );

        positionDetails[positionKey] = {
          isLong: true,
          collateralTokenAddress,
          marketAddress,
          leverage,
          parsedCollateralAmount,
          txn,
          hash: txn.hash,
          updatedAt: Date.now(),
        };
      }

      orderDetails["order"] = {
        orderType,
        marketAddress,
        collateralTokenAddress,
        leverage,
        parsedCollateralAmount,
        txn,
        hash: txn.hash,
        updatedAt: Date.now(),
      };
    } catch (e) {
      console.log("error", e);
    }

    await bot.sendMessage(chatId, `Order created`);
  };

const checkAndIncreaseAllowance = async (
  pKey: string,
  chainId: number,
  tokenAddress: string,
  amount: BigNumber
) => {
  const signer = new Wallet(pKey, getProvider());
  const account = await signer.getAddress();

  const tokensAllowanceData = await fetchAllowance(chainId, account, [
    tokenAddress,
  ]);

  console.log(tokensAllowanceData![tokenAddress].toString());

  if (amount.gt(tokensAllowanceData![tokenAddress])) {
    const spenderAddress = getContract(chainId, "SyntheticsRouter");

    const contract = new Contract(tokenAddress, Token.abi, signer);
    const approveRes = await callContract(
      chainId,
      contract,
      "approve",
      [spenderAddress, constants.MaxUint256],
      {}
    );
  }
};

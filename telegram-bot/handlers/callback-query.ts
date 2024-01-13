import {
  CallbackQuery,
  ChatId,
  EditMessageTextOptions,
  Message,
  ReplyListener,
  SendMessageOptions,
} from 'node-telegram-bot-api';

import { errorHandler } from '../keyboard/error-handler';
import { groupTokens } from '../utils/group-tokens';

import { formatOrderType } from '../utils';

import {
  addCollateralText,
  generateBalanceAndPriceList,
  selectTokenText,
  selectTokenForCollateralText,
  fetchTokensToLongOrShort,
  addLeverageText,
  showOrderOverviewText,
  addTriggerPriceText,
} from '@/keyboard/build-order';
import {
  mainMenu,
  generateMainMenu,
  goToMainMenu,
  generateWalletText,
} from '@/keyboard/main-menu';
import { selectMarketText, marketTypes } from '@/keyboard/create-order';
import {
  editPositionsButtons,
  generatePositionsText,
  viewPositions,
} from '@/keyboard/view-positions';
import { viewTrades } from '@/keyboard/view-trades';
import { getUserBalance, viewPortfolio } from '@/keyboard/view-portfolio';
import {
  createUserMutation,
  saveOrderMutation,
  updateOrderStatusMutation,
  updateUserLastSeenMutation,
  updateUserWalletMutation,
} from '@/db/mutations';
import { OrderStatus } from '@prisma/client';
import { fetchOrderPrices, getEntryPrice, getTotalFees } from '@/gmx-sdk/gmx';
import {
  buildDecreaseOrder,
  buildIncreaseOrder,
  executedClosePosText,
  executedOrderText,
  handleDecreaseOrderExecution,
  handleIncreaseOrderExecution,
} from '@/keyboard/execute-order';
import {
  fetchOrder,
  fetchPosition,
  getSigner,
  getUser,
  getUserAddress,
} from '@/db/queries';
import { BigNumber } from 'ethers';
import {
  generateEncryptedPrivKey,
  getWalletAddressFromEncryptedPrivateKey,
} from '@/lib';
import { lruCache } from '..';
import config from '@/config';
import { collateralTokens } from '@/utils/tokens';
import { formatLeverage } from '@/gmx-sdk/gmx/domain/synthetics/positions';
import {
  editPositionButtons,
  editPositionText,
  getPosition,
} from '@/keyboard/edit-position';
import { BASIS_POINTS_DIVISOR } from '@/gmx-sdk/gmx/config/factors';

const chainId = config.chainId;

interface IBot {
  answerCallbackQuery: (callbackQueryId: string) => Promise<boolean>;
  editMessageText: (
    text: string,
    options?: EditMessageTextOptions
  ) => Promise<Message | boolean>;
  deleteMessage: (chatId: ChatId, messageId: number) => Promise<boolean>;
  removeReplyListener(replyListenerId: number): ReplyListener;
  onReplyToMessage: (
    chatId: ChatId,
    messageId: number,
    callback: (msg: Message) => void
  ) => number;
  sendMessage: (
    chatId: ChatId,
    text: string,
    options?: SendMessageOptions
  ) => Promise<Message>;
}

export const callbackQuery = (bot: IBot) => async (cbq: CallbackQuery) => {
  const message = cbq.message;
  if (!message) {
    return;
  }

  const userId = cbq.from.id;
  const username = cbq.from.username;
  const chatId = message.chat.id;
  const cb = cbq.data ? cbq.data.split(':') : null;

  if (!cb || !userId || !username) {
    return;
  }

  try {
    await bot.answerCallbackQuery(cbq.id);

    const type = cb[0];

    switch (type) {
      case 'agree':
        await handleAgreeCallback(bot, chatId, message.message_id, {
          id: userId,
          first_name: cbq.from.first_name,
          last_name: cbq.from.last_name,
          username: cbq.from.username!,
        });
        break;
      case 'generate-wallet':
        await handleGenerateWalletCallback(
          bot,
          chatId,
          message.message_id,
          userId
        );
        break;
      case 'create-order':
        await handleSelectMarketCallback(
          bot,
          chatId,
          message.message_id,
          userId
        );
        break;
      case 'view-positions':
        await handleViewPositionsCallback(
          bot,
          chatId,
          message.message_id,
          userId
        );
        break;
      case 'view-portfolio':
        await handleViewPortfolioCallback(
          bot,
          chatId,
          message.message_id,
          userId
        );
        break;
      case 'tradebook':
        await handleTradebookCallback(bot, chatId, message.message_id, userId);
        break;
      case 'long-market':
      case 'short-market':
      case 'long-limit':
      case 'short-limit':
        await handleSelectTokenCallback(
          bot,
          chatId,
          message.message_id,
          cb,
          userId
        );
        break;
      case 'select-token':
        await handleSelectTokenForCollateralCallback(
          bot,
          chatId,
          message.message_id,
          cb,
          userId
        );
        break;
      case 'add-collateral':
        await handleAddCollateralCallback(
          bot,
          chatId,
          message.message_id,
          cb,
          userId
        );
        break;
      case 'execute':
        await handleExecuteCallback(
          bot,
          chatId,
          message.message_id,
          cb,
          userId
        );
        break;
      case 'edit-pos':
        await handleEditPositionCallback(
          bot,
          chatId,
          message.message_id,
          cb,
          userId
        );
        break;
      // case 'add-trigger-price':
      //   await handleAddTriggerPriceCallback(
      //     bot,
      //     chatId,
      //     message.message_id,
      //     cb,
      //     userId
      //   );
      //   break;
      // case 'add-collateral':
      //   await handleAddCollateralPosCallback(
      //     bot,
      //     chatId,
      //     message.message_id,
      //     cb,
      //     userId
      //   );
      //   break;
      case 'close-position':
        await handleClosePositionCallback(
          bot,
          chatId,
          message.message_id,
          cb,
          userId
        );
        break;
      case 'exit':
        await bot.editMessageText('\u{1f44b} Thank you for using FlashX.', {
          chat_id: chatId,
          message_id: message.message_id,
          parse_mode: 'HTML',
        });
        break;
      default:
        await bot.editMessageText(
          '\u{1f6a7} This feature is not available yet.',
          {
            chat_id: chatId,
            message_id: message.message_id,
            parse_mode: 'HTML',
          }
        );
        break;
    }
  } catch (error: any) {
    errorHandler(bot, chatId, error);
  }
};

// Helper functions to handle different callback types
async function handleAgreeCallback(
  bot: IBot,
  chatId: ChatId,
  messageId: number,
  u: {
    id: number;
    first_name: string;
    last_name: string | undefined;
    username: string;
  }
) {
  const user = await getUser(u.id);

  if (!user) {
    await createUserMutation({
      userId: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      username: u.username,
    });
  }

  const userHasWallet = !!user?.wallet_address;

  if (userHasWallet) {
    lruCache.set(u.id, user.wallet_address!);
  }

  const [mainMenuText] = await Promise.all([
    generateMainMenu(user!.wallet_address ?? '', userHasWallet),
    updateUserLastSeenMutation(u.id),
  ]);

  await bot.editMessageText(mainMenuText, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: mainMenu(userHasWallet),
    },
  });
}

async function handleGenerateWalletCallback(
  bot: IBot,
  chatId: ChatId,
  messageId: number,
  userId: number
) {
  await bot.editMessageText(`\u{1f6e0}Generating your wallet...`, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: goToMainMenu,
    },
  });

  const encryptedPrivateKey = generateEncryptedPrivKey();
  const walletAddress =
    getWalletAddressFromEncryptedPrivateKey(encryptedPrivateKey);

  lruCache.set(userId, walletAddress);

  await updateUserWalletMutation(encryptedPrivateKey, walletAddress, userId);

  await bot.editMessageText(generateWalletText(walletAddress), {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: goToMainMenu,
    },
  });
}

async function handleViewPositionsCallback(
  bot: IBot,
  chatId: ChatId,
  messageId: number,
  userId: number
) {
  await bot.editMessageText(`\u{1F4E8} Fetching your positions...`, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'HTML',
  });

  const account = await getUserWalletAddress(userId);
  const positions = await viewPositions(chainId, account);

  if (!positions || Object.keys(positions).length === 0) {
    await bot.editMessageText(`\u{1f44e} You do not have any positions.`, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: goToMainMenu,
      },
    });
    return;
  }

  const viewPositionsText = await generatePositionsText(positions);
  await bot.editMessageText(viewPositionsText, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: editPositionsButtons(positions),
    },
  });
}

async function handleViewPortfolioCallback(
  bot: IBot,
  chatId: ChatId,
  messageId: number,
  userId: number
) {
  await bot.editMessageText(`\u{1F6E0} Fetching your portfolio...`, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'HTML',
  });

  const account = await getUserWalletAddress(userId);

  const statementText = await viewPortfolio(chainId, account);

  await bot.editMessageText(statementText, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: goToMainMenu,
    },
  });
}

async function handleTradebookCallback(
  bot: IBot,
  chatId: ChatId,
  messageId: number,
  userId: number
) {
  await bot.editMessageText(`\u{1F4E8} Fetching your trades...`, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'HTML',
  });

  const account = await getUserWalletAddress(userId);

  const viewTradesText = await viewTrades(chainId, account);

  await bot.editMessageText(viewTradesText, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: goToMainMenu,
    },
  });
}

async function handleSelectMarketCallback(
  bot: IBot,
  chatId: ChatId,
  messageId: number,
  userId: number
) {
  const account = await getUserWalletAddress(userId);

  const userBalances = await getUserBalance(chainId, account);
  const hasEthBalance = userBalances.some(
    (balance) => balance.symbol === 'ETH' && balance.balance.gt(0)
  );

  if (!hasEthBalance) {
    await bot.editMessageText(
      '\u{1f6ab} You do not have any ETH in your wallet. Please deposit some ETH first to pay for gas fees.',
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: goToMainMenu,
        },
      }
    );
    return;
  }

  const hasCollateralBalance = userBalances.some(
    (balance) =>
      collateralTokens.includes(balance.symbol) && balance.balance.gt(0)
  );

  if (!hasCollateralBalance) {
    await bot.editMessageText(
      '\u{1f6ab} You do not have any collateral tokens in your wallet. Please deposit some collateral tokens first.',
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: goToMainMenu,
        },
      }
    );
    return;
  }

  await bot.editMessageText(selectMarketText, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [...marketTypes, ...goToMainMenu],
    },
  });
}

async function handleSelectTokenCallback(
  bot: IBot,
  chatId: ChatId,
  messageId: number,
  cb: any,
  userId: number
) {
  const order = cb[1];
  const account = await getUserWalletAddress(userId);

  const res = await fetchTokensToLongOrShort(chainId, account);

  if (!res) {
    throw new Error('Tokens not found');
  }

  const { marketList, tokens } = res;

  const groupedTokens = await groupTokens('select-token', order, tokens);

  await bot.editMessageText(
    selectTokenText(formatOrderType(order), marketList),
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [...groupedTokens, ...goToMainMenu],
      },
    }
  );
}

async function handleSelectTokenForCollateralCallback(
  bot: IBot,
  chatId: ChatId,
  messageId: number,
  cb: any,
  userId: number
) {
  const order = cb[1];
  const token = cb[2];

  const account = await getUserWalletAddress(userId);

  const res = await generateBalanceAndPriceList(chainId, account);

  if (!res) {
    await bot.editMessageText(
      '\u{1f6ab} You do not have any tokens in your wallet. Please deposit some tokens first.',
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: goToMainMenu,
        },
      }
    );

    return;
  }

  const { balances, collateralTokens } = res;
  const groupedTokens = await groupTokens(
    'add-collateral',
    order,
    collateralTokens,
    token
  );

  await bot.editMessageText(
    selectTokenForCollateralText(formatOrderType(order), token, balances),
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [...groupedTokens, ...goToMainMenu],
      },
    }
  );
}

async function handleAddCollateralCallback(
  bot: IBot,
  chatId: ChatId,
  messageId: number,
  cb: any,
  userId: number
) {
  const [order, token, collateral] = cb.slice(1, 4);
  const { isLimit, isLong } = getOrderType(order);

  const account = await getUserWalletAddress(userId);

  async function promptForAmount() {
    const { message_id } = await bot.sendMessage(
      chatId,
      addCollateralText(formatOrderType(order), token, collateral),
      {
        parse_mode: 'HTML',
        reply_markup: {
          force_reply: true,
          input_field_placeholder: 'Enter amount with minimum amount of $2',
        },
      }
    );

    const listenerIdForAmount = bot.onReplyToMessage(
      chatId,
      message_id,
      async (reply) => {
        bot.removeReplyListener(listenerIdForAmount);
        const amount = reply.text;

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
          await bot.editMessageText(
            `\u{1f6ab} Invalid amount. Please enter a valid amount.`,
            {
              chat_id: chatId,
              message_id: messageId,
            }
          );
          await promptForAmount();
          return;
        }
        await bot.deleteMessage(chatId, message_id);
        promptForLeverage(amount);
      }
    );
  }

  async function promptForLeverage(amount: string) {
    const { message_id } = await bot.sendMessage(
      chatId,
      addLeverageText(formatOrderType(order), token, collateral, amount!),
      {
        parse_mode: 'HTML',
        reply_markup: {
          force_reply: true,
          input_field_placeholder: 'Enter leverage',
        },
      }
    );

    const listenerIdForLeverage = bot.onReplyToMessage(
      chatId,
      message_id,
      async (reply) => {
        bot.removeReplyListener(listenerIdForLeverage);
        const leverage = reply.text;

        if (
          !leverage ||
          isNaN(Number(leverage)) ||
          Number(leverage) <= 1 ||
          Number(leverage) > 50
        ) {
          await bot.editMessageText(
            `\u{1f6ab} Invalid leverage. Please enter a valid leverage between 1 and 50.`,
            {
              chat_id: chatId,
              parse_mode: 'HTML',
              message_id: messageId,
            }
          );
          await promptForLeverage(amount);
          return;
        }

        await bot.deleteMessage(chatId, message_id);
        if (isLimit) promptForTriggerPrice(amount, leverage);
        else {
          await buildOrder(amount, leverage);
        }
      }
    );
  }

  async function promptForTriggerPrice(amount: string, leverage: string) {
    const entryPrice = await getEntryPrice(chainId, account, token, isLong);

    const { message_id } = await bot.sendMessage(
      chatId,
      addTriggerPriceText(
        formatOrderType(order),
        token,
        collateral,
        amount!,
        leverage,
        entryPrice || 'N/A'
      ),
      {
        parse_mode: 'HTML',
        reply_markup: {
          force_reply: true,
          input_field_placeholder: 'Enter trigger price',
        },
      }
    );

    const listenerIdForTriggerPrice = bot.onReplyToMessage(
      chatId,
      message_id,
      async (reply) => {
        bot.removeReplyListener(listenerIdForTriggerPrice);
        const triggerPrice = reply.text;

        if (
          !triggerPrice ||
          isNaN(Number(triggerPrice)) ||
          Number(triggerPrice) <= 0
        ) {
          await bot.editMessageText(
            `\u{1f6ab} Invalid trigger price. Please enter a valid trigger price.`,
            {
              chat_id: chatId,
              parse_mode: 'HTML',
              message_id: messageId,
            }
          );
          await promptForTriggerPrice(amount, leverage);
          return;
        }

        await bot.deleteMessage(chatId, message_id);
        await buildOrder(amount, leverage, triggerPrice);
      }
    );
  }

  async function buildOrder(
    amount: string,
    leverage: string,
    triggerPrice?: string
  ) {
    await bot.editMessageText(`\u{1f6e0} Building your order...`, {
      chat_id: chatId,
      parse_mode: 'HTML',
      message_id: messageId,
    });

    let result = await buildIncreaseOrder(
      chainId,
      account,
      order,
      token,
      collateral,
      amount,
      leverage,
      false,
      triggerPrice
    );

    const {
      marketAddress,
      positionAmounts,
      initialCollateralAmount,
      executionFee,
      txPayload,
    } = result;

    const { entryPrice, liqPrice } = await fetchOrderPrices(
      chainId,
      account,
      order,
      token,
      collateral,
      positionAmounts,
      marketAddress
    );

    if (!entryPrice || !liqPrice) {
      await bot.editMessageText(
        `\u{1f6ab} Order building failed. Please try again.`,
        {
          chat_id: chatId,
          parse_mode: 'HTML',
          message_id: messageId,
        }
      );
      return;
    }

    const totalFees = getTotalFees(executionFee.feeUsd);

    const orderId = await saveOrderMutation({
      type: order,
      token,
      collateral,
      amount: BigNumber.from(initialCollateralAmount).toString(),
      leverage: formatLeverage(
        BigNumber.from(
          parseInt(String(Number(leverage) * BASIS_POINTS_DIVISOR))
        )
      )!,
      entryPrice: entryPrice!, // In USD
      liquidationPrice: liqPrice!, // In USD
      fees: totalFees,
      status: OrderStatus.PENDING,
      userId: userId.toString(),
      txPayload: JSON.stringify(txPayload),
      executionFeeTokenAmount: executionFee.feeTokenAmount.toString(),
      triggerPrice,
    });

    await bot.editMessageText(
      showOrderOverviewText(
        formatOrderType(order),
        token,
        collateral,
        amount!,
        leverage,
        entryPrice,
        liqPrice,
        totalFees,
        triggerPrice
      ),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '\u{2705} Execute Order',
                callback_data: `execute:${orderId}`,
              },
            ],
            ...goToMainMenu,
          ],
        },
      }
    );
  }

  await promptForAmount();
}

async function handleExecuteCallback(
  bot: IBot,
  chatId: ChatId,
  messageId: number,
  cb: any,
  userId: number
) {
  const orderId = cb[1];

  await bot.editMessageText(`\u{26a1} Executing your order...`, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'HTML',
  });

  try {
    const order = await fetchOrder(orderId);

    if (!order) throw new Error(`Order with id ${orderId} not found`);

    const signer = await getSigner(userId);

    let txHash = await handleIncreaseOrderExecution(
      orderId,
      chainId,
      signer!,
      order.token,
      order.collateral,
      BigNumber.from(order.amount),
      BigNumber.from(order.executionFeeTokenAmount),
      undefined,
      JSON.parse(order.txPayload) as string[]
    );

    console.info(
      `Order with orderId: ${orderId} executed successfully`,
      txHash
    );

    await updateOrderStatusMutation(orderId, OrderStatus.COMPLETED, txHash);

    await bot.editMessageText(executedOrderText(txHash), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: goToMainMenu,
      },
    });
  } catch (error) {
    console.error(`Error executing order with orderId: ${orderId}`, error);

    await updateOrderStatusMutation(orderId, OrderStatus.FAILED);

    await bot.editMessageText(
      `\u{1f6ab} Order execution failed. Please try again.`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: goToMainMenu,
        },
      }
    );
  }
}

async function handleEditPositionCallback(
  bot: IBot,
  chatId: ChatId,
  messageId: number,
  cb: any,
  userId: number
) {
  const increasedAtBlock = cb[1];

  await bot.editMessageText(`\u{26a1} Fetching position details...`, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'HTML',
  });

  const account = await getUserWalletAddress(userId);
  const position = await getPosition(chainId, account, increasedAtBlock);
  if (!position) throw new Error(`Position not found`);

  await bot.editMessageText(editPositionText(position), {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [...editPositionButtons(position), ...goToMainMenu],
    },
  });
}

async function handleClosePositionCallback(
  bot: IBot,
  chatId: ChatId,
  messageId: number,
  cb: any,
  userId: number
) {
  const token = cb[1];
  const collateral = cb[2];

  await bot.editMessageText(`\u{26a1} Executing your order...`, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'HTML',
  });

  const position = await fetchPosition(userId, token, collateral);
  try {
    if (!position) throw new Error(`Position with token ${token} not found`);

    const signer = await getSigner(userId);
    const account = await signer?.getAddress();

    const { isLimit } = getOrderType(position.type);

    const result = await buildDecreaseOrder(
      chainId,
      account as string,
      position.type,
      token,
      collateral,
      position.amount,
      isLimit,
      position.triggerPrice ?? undefined
    );

    const { executionFee, txPayload } = result;

    const txHash = await handleDecreaseOrderExecution(
      position.id,
      chainId,
      signer!,
      executionFee.feeTokenAmount,
      txPayload
    );

    console.info(
      `Order with orderId: ${position.id} closed successfully`,
      txHash
    );

    await updateOrderStatusMutation(position.id, OrderStatus.CLOSED, txHash);

    await bot.editMessageText(executedClosePosText(txHash), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: goToMainMenu,
      },
    });
  } catch (error) {
    if (position) {
      console.error(`Error closing order with orderId: ${position.id}`, error);

      await updateOrderStatusMutation(position.id, OrderStatus.FAILED_TO_CLOSE);
    }

    await bot.editMessageText(
      `\u{1f6ab} Order execution failed. Please try again.`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: goToMainMenu,
        },
      }
    );
  }
}

// Helper functions
async function getUserWalletAddress(userId: number): Promise<string> {
  const wallet = lruCache.get(userId);

  if (!wallet) {
    const userAddress = await getUserAddress(userId);
    return userAddress!;
  }

  if (typeof wallet === 'string') {
    return wallet;
  } else {
    throw new Error('Unexpected value in cache for user wallet');
  }
}

export function getOrderType(order: string): {
  isLong: boolean;
  isLimit: boolean;
} {
  const isLong = order.split('-')[0] === 'l';
  const isLimit = order.split('-')[1] === 'l';

  return {
    isLimit,
    isLong,
  };
}

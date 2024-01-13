import { ChatId, Message, SendMessageOptions } from 'node-telegram-bot-api';
import { prisma } from '..';
import { generateKeys } from '@/utils/generateKeys';

export const start =
  (bot: {
    sendMessage: (
      chatId: ChatId,
      text: string,
      options?: SendMessageOptions
    ) => Promise<Message>;
  }) =>
  async (message: Message) => {
    const chatId = message.chat.id;
    const firstName = message.from?.first_name;

    await bot.sendMessage(
      chatId,
      `\u{1F44B} Hello${
        firstName ? ` , ${firstName}` : ''
      }! Welcome to FlashX. I'm a bot to trade BTC, ETH, DOGE, and other cryptocurrencies with upto 50x leverage directly from Telegram!
      \n\u{26A0}<b>Terms of Service </b>\u{26A0}
      \nPlease read the terms of service before using this bot. By using this bot, you agree to the terms of service.`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Terms of Service', url: 'https://flashx.vercel.app/' }],
            [
              {
                text: '\u{2705} I agree',
                callback_data: generateKeys('agree'),
              },
            ],
          ],
        },
      }
    );
  };

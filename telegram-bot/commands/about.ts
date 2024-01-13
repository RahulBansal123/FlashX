import { ChatId, Message } from 'node-telegram-bot-api';

export const about =
  (bot: { sendMessage: (chatId: ChatId, text: string) => Promise<Message> }) =>
  async (message: Message) => {
    const chatId = message.chat.id;
    await bot.sendMessage(
      chatId,
      `\u{2139} *About*
		\nWelcome to ${process.env.BOT_NAME}.`
    );
  };

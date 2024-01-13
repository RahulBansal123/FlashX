import { ChatId, Message } from 'node-telegram-bot-api';

export const errorHandler = (
  bot: { sendMessage: (chatId: ChatId, text: string) => Promise<Message> },
  chatId: ChatId,
  error: Error
) => {
  const isDev = process.env.NODE_ENV === 'development';

  if (error && isDev) {
    console.error(error);
  }
  // @todo

  bot.sendMessage(chatId, '\u{1F6AB} An error occurred, try again later.');
};

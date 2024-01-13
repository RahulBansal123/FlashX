import { generateKeys } from '@/utils/generateKeys';
import { InlineKeyboardButton } from 'node-telegram-bot-api';

export interface TokenData {
  text: string;
  callback_data: string;
}

export const groupTokens = async (
  type: string,
  order: string,
  tokens: string[],
  token?: string
): Promise<InlineKeyboardButton[][]> => {
  const data: TokenData[] = tokens.map((item) => ({
    text: item,
    callback_data: token
      ? generateKeys(type, order, token, item)
      : generateKeys(type, order, item),
  }));

  return groupKeyboardButtons(data);
};

export const groupKeyboardButtons = (data: any[]): InlineKeyboardButton[][] => {
  const grouped: InlineKeyboardButton[][] = [];
  for (let i = 0; i < data.length; i += 2) {
    grouped.push(data.slice(i, i + 2));
  }
  return grouped;
};

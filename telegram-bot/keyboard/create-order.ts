import { generateKeys } from "@/utils/generateKeys";

export const selectMarketText = `<b>Create Order</b>
\n<b>Action: </b>Select a market to trade on`;

export const marketTypes = [
  [
    {
      text: "\u{2191} Long (Market)",
      callback_data: generateKeys("long-market", "l-m"),
    },
    {
      text: "\u{2193} Short (Market)",
      callback_data: generateKeys("short-market", "s-m"),
    },
  ],
  [
    {
      text: "\u{2191} Long (Limit)",
      callback_data: generateKeys("long-limit", "l-l"),
    },
    {
      text: "\u{2193} Short (Limit)",
      callback_data: generateKeys("short-limit", "s-l"),
    },
  ],
];

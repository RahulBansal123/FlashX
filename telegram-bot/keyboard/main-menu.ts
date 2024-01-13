import { generateKeys } from '@/utils/generateKeys';
import { collateralTokens } from '@/utils/tokens';

export const mainMenu = (userHasWallet: boolean) => {
  return userHasWallet
    ? [
        [
          {
            text: '\u{270f} Open Position',
            callback_data: generateKeys('create-order'),
          },
          {
            text: '\u{1f4c2} View Positions',
            callback_data: generateKeys('view-positions'),
          },
        ],
        [
          {
            text: '\u{1f4b0} Portfolio',
            callback_data: generateKeys('view-portfolio'),
          },
          {
            text: '\u{1f4d2} Tradebook',
            callback_data: generateKeys('tradebook'),
          },
        ],
      ]
    : [
        [
          {
            text: '\u{270f} Generate Wallet',
            callback_data: generateKeys('generate-wallet'),
          },
        ],
      ];
};

export const generateMainMenu = async (
  account: string,
  userHasWallet: boolean
): Promise<string> => {
  const text = `<b>Main Menu</b>
\nTrade at elite speeds with convenient shortcuts.
\nCurrent chain: Arbitrum`;

  if (userHasWallet) {
    return `${text}\n\n<b>═══ Your Wallet ═══</b>\nAddress: ${account}`;
  }

  return text;
};

export const goToMainMenu = [
  [
    {
      text: '\u{2190} Back',
      callback_data: generateKeys('agree'),
    },
    {
      text: '\u{274c} Exit',
      callback_data: generateKeys('exit'),
    },
  ],
];

export const generateWalletText = (
  address: string
) => `\u{1f4b3} Your wallet has been generated successfully.
\n<b>Wallet Address:</b> ${address}

Now you can start trading by depositing ETH for gas and either of the following tokens: <b>${collateralTokens.join(
  ', '
)}</b>`;

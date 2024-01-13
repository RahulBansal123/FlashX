import { BigNumber } from "ethers";

const config = {
  bot: {
    polling: true,
    onlyFirstMatch: true,
    filepath: false,
  },

  mongodb: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },

  message: {
    textLimit: 300,
  },

  chainId: 42161, // Arbitrum

  referralCode: process.env.REFERRAL_CODE || "",
  allowedSlippage: 30, // 0.3%
  commission: BigNumber.from("1000000000000000000000000000000"), // $1

  cache: {
    max: 500,
    ttl: 60 * 60 * 24, // 1 day
  },
};

export default config;

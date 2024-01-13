import { JsonRpcProvider } from "@ethersproject/providers";
import CustomErrors from "../gmx/abis/CustomErrors.json";
import DataStore from "../gmx/abis/DataStore.json";
import ExchangeRouter from "../gmx/abis/ExchangeRouter.json";
import { getContract } from "../gmx/config/contracts";
import { NONCE_KEY, orderKey } from "../gmx/config/dataStore";
import { convertTokenAddress } from "../gmx/config/tokens";
import {
  TokenPrices,
  TokensData,
  convertToContractPrice,
  getTokenData,
} from "../gmx/domain/synthetics/tokens";
import { BigNumber, ethers } from "ethers";
import { getProvider } from "../gmx/lib/rpc";

export type MulticallRequest = { method: string; params: any[] }[];

export type PriceOverrides = {
  [address: string]: TokenPrices | undefined;
};

type SimulateExecuteOrderParams = {
  account: string;
  createOrderMulticallPayload: string[];
  secondaryPriceOverrides: PriceOverrides;
  primaryPriceOverrides: PriceOverrides;
  tokensData: TokensData;
  value: BigNumber;
  method?: string;
  errorTitle?: string;
};

export async function simulateTxn(
  chainId: number,
  p: SimulateExecuteOrderParams
) {
  const dataStoreAddress = getContract(chainId, "DataStore");
  const provider = getProvider(undefined, chainId) as JsonRpcProvider;

  const dataStore = new ethers.Contract(
    dataStoreAddress,
    DataStore.abi,
    provider
  );

  const exchangeRouter = new ethers.Contract(
    getContract(chainId, "ExchangeRouter"),
    ExchangeRouter.abi,
    provider
  );

  const blockNumber = await provider.getBlockNumber();
  const nonce = await dataStore.getUint(NONCE_KEY, { blockTag: blockNumber });
  const nextNonce = nonce.add(1);
  const nextKey = orderKey(dataStoreAddress, nextNonce);

  const { primaryTokens, primaryPrices, secondaryTokens, secondaryPrices } =
    getSimulationPrices(
      chainId,
      p.tokensData,
      p.primaryPriceOverrides,
      p.secondaryPriceOverrides
    );

  const simulationPayload = [
    ...p.createOrderMulticallPayload,
    exchangeRouter.interface.encodeFunctionData(
      p.method || "simulateExecuteOrder",
      [
        nextKey,
        {
          primaryTokens: primaryTokens,
          primaryPrices: primaryPrices,
          secondaryTokens: secondaryTokens,
          secondaryPrices: secondaryPrices,
        },
      ]
    ),
  ];

  const errorTitle = p.errorTitle || `Execute order simulation failed.`;

  try {
    await exchangeRouter.callStatic.multicall(simulationPayload, {
      value: p.value,
      blockTag: blockNumber,
      from: p.account,
    });
  } catch (txnError) {
    const customErrors = new ethers.Contract(
      ethers.constants.AddressZero,
      CustomErrors.abi
    );

    let msg: any = undefined;

    try {
      const errorData = extractDataFromError(txnError?.message);
      console.log({ errorData });
      const parsedError = customErrors.interface.parseError(errorData);
      const isSimulationPassed = parsedError.name === "EndOfOracleSimulation";

      if (isSimulationPassed) {
        return;
      }

      const parsedArgs = Object.keys(parsedError.args).reduce((acc: any, k) => {
        if (!Number.isNaN(Number(k))) {
          return acc;
        }
        acc[k] = parsedError.args[k].toString();
        return acc;
      }, {});

      msg = errorTitle;
    } catch (parsingError) {
      // eslint-disable-next-line no-console
      console.error(parsingError);
      msg = parsingError?.message || errorTitle;
    }

    if (!msg) {
      msg = "Execute order simulation failed";
    }

    throw txnError;
  }
}

function extractDataFromError(error_message: any) {
  const pattern = /data="([^"]+)"/;
  const match = error_message.match(pattern);

  if (match && match[1]) {
    return match[1];
  }
  return null;
}

function getSimulationPrices(
  chainId: number,
  tokensData: TokensData,
  primaryPricesMap: PriceOverrides,
  secondaryPricesMap: PriceOverrides
) {
  const tokenAddresses = Object.keys(tokensData);

  const primaryTokens: string[] = [];
  const primaryPrices: { min: BigNumber; max: BigNumber }[] = [];
  const secondaryPrices: { min: BigNumber; max: BigNumber }[] = [];

  for (const address of tokenAddresses) {
    const token = getTokenData(tokensData, address);
    const convertedAddress = convertTokenAddress(chainId, address, "wrapped");

    if (!token?.prices || primaryTokens.includes(convertedAddress)) {
      continue;
    }

    primaryTokens.push(convertedAddress);

    const currentPrice = {
      min: convertToContractPrice(token.prices.minPrice, token.decimals),
      max: convertToContractPrice(token.prices.maxPrice, token.decimals),
    };

    const primaryOverridedPrice = primaryPricesMap[address];

    if (primaryOverridedPrice) {
      primaryPrices.push({
        min: convertToContractPrice(
          primaryOverridedPrice.minPrice,
          token.decimals
        ),
        max: convertToContractPrice(
          primaryOverridedPrice.maxPrice,
          token.decimals
        ),
      });
    } else {
      primaryPrices.push(currentPrice);
    }

    const secondaryOverridedPrice = secondaryPricesMap[address];

    if (secondaryOverridedPrice) {
      secondaryPrices.push({
        min: convertToContractPrice(
          secondaryOverridedPrice.minPrice,
          token.decimals
        ),
        max: convertToContractPrice(
          secondaryOverridedPrice.maxPrice,
          token.decimals
        ),
      });
    } else {
      secondaryPrices.push(currentPrice);
    }
  }

  return {
    primaryTokens,
    secondaryTokens: primaryTokens,
    primaryPrices,
    secondaryPrices,
  };
}

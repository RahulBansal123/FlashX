import "@ethersproject/shims";
import { ethers } from "ethers";

export const rpcUrl: string =
  "https://arb-mainnet.g.alchemy.com/v2/s8iwjrgtP09rt8xOvfPB1NjyQT_Zdi22";
let chainId = 42161;

export function getProvider() {
  return new ethers.providers.JsonRpcProvider({ url: rpcUrl }, chainId);
}

export function initProvider(rpc: string, chainId: number) {
  rpc = rpc;
  chainId = chainId;
}

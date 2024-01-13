import { Signer, Wallet } from "ethers";
import { decryptWithPassphrase } from "./decrypt";
import { encryptWithPassphrase } from "./encrypt";
import { getProvider } from "@/gmx-sdk/gmx/provider";

export const generateEncryptedPrivKey = () => {
  const privKey = Wallet.createRandom().privateKey;
  const encryptedPrivateKey = encryptWithPassphrase(privKey);

  return encryptedPrivateKey;
};

export function getWalletAddressFromEncryptedPrivateKey(
  encryptedPrivateKey: string
) {
  const decryptedPrivateKey = decryptWithPassphrase(encryptedPrivateKey);

  return new Wallet(decryptedPrivateKey).address;
}

export function getSignerFromEncryptedPrivateKey(
  encryptedPrivateKey: string
): Signer {
  const decryptedPrivateKey = decryptWithPassphrase(encryptedPrivateKey);
  const provider = getProvider();

  return new Wallet(decryptedPrivateKey, provider);
}

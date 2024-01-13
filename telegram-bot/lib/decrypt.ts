import { createDecipheriv, createHash } from "crypto";

export function decryptWithPassphrase(encryptedMessage: string) {
  const passphrase = process.env.PRIVATE_KEY_PASSPHRASE!;
  const iv = Buffer.from(encryptedMessage.slice(0, 32), "hex");
  const ciphertext = Buffer.from(encryptedMessage.slice(32), "hex");
  const encryptionKey = createHash("sha256").update(passphrase).digest();
  const decipher = createDecipheriv("aes-256-cbc", encryptionKey, iv);

  let decryptedData = decipher.update(ciphertext);
  decryptedData = Buffer.concat([decryptedData, decipher.final()]);

  return decryptedData.toString("utf8");
}

import { createCipheriv, createHash, randomBytes } from 'crypto';

export function encryptWithPassphrase(message: string) {
  const passphrase = '@ha*xX6Q622JwQGTF*cE';
  // const passphrase = process.env.PRIVATE_KEY_PASSPHRASE!;
  const iv = randomBytes(16);
  const encryptionKey = createHash('sha256').update(passphrase).digest();
  const cipher = createCipheriv('aes-256-cbc', encryptionKey, iv);

  let encryptedData = cipher.update(message, 'utf8', 'hex');
  encryptedData += cipher.final('hex');

  return `${iv.toString('hex')}${encryptedData}`;
}

export const generateKeys = (...keys: string[]): string => {
  if (keys.length === 1) {
    return keys[0]!;
  } else {
    return keys.join(":");
  }
};

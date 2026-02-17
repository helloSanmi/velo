const randomHex = (): string => Math.floor(Math.random() * 16).toString(16);

export const createId = (): string => {
  const cryptoRef = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoRef?.randomUUID) return cryptoRef.randomUUID();

  const timestamp = Date.now().toString(16);
  const randomPart = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = char === 'x' ? Math.floor(Math.random() * 16) : (Math.floor(Math.random() * 4) + 8);
    return value.toString(16);
  });
  return `${timestamp}-${randomPart}`;
};

export const createShortId = (length = 8): string => {
  const cryptoRef = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoRef?.getRandomValues) {
    const buffer = new Uint8Array(Math.max(length, 1));
    cryptoRef.getRandomValues(buffer);
    return Array.from(buffer)
      .map((value) => (value % 36).toString(36))
      .join('')
      .slice(0, length);
  }

  let fallback = '';
  while (fallback.length < length) fallback += randomHex();
  return fallback.slice(0, length);
};

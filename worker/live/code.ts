const liveCodeAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateLiveCode(randomBytes: (length: number) => Uint8Array = defaultRandomBytes) {
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => liveCodeAlphabet[byte % liveCodeAlphabet.length]).join("");
}

function defaultRandomBytes(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

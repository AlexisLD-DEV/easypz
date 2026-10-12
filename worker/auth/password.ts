const encoder = new TextEncoder();
export const PASSWORD_HASH_ALGORITHM = "pbkdf2-sha256";
export const PASSWORD_HASH_ITERATIONS = 210000;
export const LEGACY_PASSWORD_HASH_ITERATIONS = [10000, 210000] as const;

function toBase64(bytes: ArrayBuffer) {
  const values = new Uint8Array(bytes);
  let binary = "";
  for (const value of values) binary += String.fromCharCode(value);
  return btoa(binary);
}

export function randomToken(bytes = 32) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return toBase64(data.buffer).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function sha256Base64(value: string) {
  return toBase64(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

export async function hashPassword(password: string, salt = randomToken(16), iterations = PASSWORD_HASH_ITERATIONS) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: encoder.encode(salt), iterations, hash: "SHA-256" },
    key,
    256
  );
  return { algorithm: PASSWORD_HASH_ALGORITHM, iterations, salt, hash: toBase64(bits) };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string, iterations = PASSWORD_HASH_ITERATIONS) {
  const actual = await hashPassword(password, salt, iterations);
  return actual.hash === expectedHash;
}

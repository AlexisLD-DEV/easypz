import { describe, expect, it } from "vitest";
import { PASSWORD_HASH_ITERATIONS, hashPassword, verifyPassword } from "../../worker/auth/password";

describe("password hashing", () => {
  it("stores the derivation algorithm with the hash", async () => {
    const hashed = await hashPassword("Correct horse battery staple", "fixed-salt");
    expect(hashed.algorithm).toBe("pbkdf2-sha256");
    expect(hashed.iterations).toBe(PASSWORD_HASH_ITERATIONS);
    expect(hashed.salt).toBe("fixed-salt");
    expect(hashed.hash).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("verifies the original password", async () => {
    const hashed = await hashPassword("Correct horse battery staple");
    await expect(verifyPassword("Correct horse battery staple", hashed.salt, hashed.hash)).resolves.toBe(true);
  });

  it("rejects a different password", async () => {
    const hashed = await hashPassword("Correct horse battery staple");
    await expect(verifyPassword("wrong", hashed.salt, hashed.hash)).resolves.toBe(false);
  });

  it("can verify a legacy lower-cost hash when iterations are supplied", async () => {
    const hashed = await hashPassword("Correct horse battery staple", "legacy-salt", 10000);
    await expect(verifyPassword("Correct horse battery staple", hashed.salt, hashed.hash, 10000)).resolves.toBe(true);
  });
});

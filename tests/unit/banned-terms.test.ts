import { describe, expect, it } from "vitest";
import {
  findBlockedTerm,
  normalizeBannedTerm,
  normalizeModerationText
} from "../../worker/moderation/bannedTerms";

describe("banned terms moderation", () => {
  it("normalizes banned terms with case, accents, and repeated spaces removed", () => {
    expect(normalizeBannedTerm("  MÉchant   mot  ")).toBe("mechant mot");
    expect(normalizeModerationText("Zoé")).toBe("zoe");
  });

  it("rejects empty banned terms after trimming", () => {
    expect(() => normalizeBannedTerm("   ")).toThrow("empty_banned_term");
  });

  it("finds a banned word inside a display name without case or accent sensitivity", () => {
    const terms = ["mechant", "grossier"];

    expect(findBlockedTerm("Alex le Méchant", terms)).toBe("mechant");
    expect(findBlockedTerm("Alex sympa", terms)).toBeNull();
  });

  it("finds banned emoji terms inside a display name", () => {
    expect(findBlockedTerm("Alex 🤬", ["🤬"])).toBe("🤬");
  });
});

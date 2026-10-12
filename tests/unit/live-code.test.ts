import { describe, expect, it } from "vitest";
import { generateLiveCode } from "../../worker/live/code";

describe("generateLiveCode", () => {
  it("generates a six-character classroom code without punctuation", () => {
    const code = generateLiveCode(() => new Uint8Array([0, 1, 2, 3, 4, 5]));

    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    expect(code).toBe("234567");
  });
});

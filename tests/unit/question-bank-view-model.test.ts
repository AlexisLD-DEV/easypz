import { describe, expect, it } from "vitest";
import { bankTabs, defaultBankTab } from "../../src/features/questionBank/questionBankViewModel";

describe("question bank view model", () => {
  it("keeps the teacher private bank as the default tab", () => {
    expect(defaultBankTab).toBe("my_bank");
    expect(bankTabs).toEqual(["program_bank", "my_bank"]);
  });
});

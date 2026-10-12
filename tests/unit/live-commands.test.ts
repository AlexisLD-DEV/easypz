import { describe, expect, it } from "vitest";
import { canStartQuestion } from "../../worker/live/commands";

describe("live teacher commands", () => {
  it("does not allow restarting an ended session", () => {
    expect(canStartQuestion("ended")).toBe(false);
    expect(canStartQuestion("lobby")).toBe(true);
    expect(canStartQuestion("reveal")).toBe(true);
  });
});

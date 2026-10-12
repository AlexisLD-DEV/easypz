import { describe, expect, it } from "vitest";
import { livePhaseView } from "../../src/features/live/livePhaseViewModel";

describe("live phase view model", () => {
  it("maps live statuses to classroom phase keys", () => {
    expect(livePhaseView("lobby")).toEqual({ key: "lobby", tone: "waiting" });
    expect(livePhaseView("question")).toEqual({ key: "question", tone: "active" });
    expect(livePhaseView("reveal")).toEqual({ key: "reveal", tone: "review" });
    expect(livePhaseView("ended")).toEqual({ key: "ended", tone: "done" });
  });
});

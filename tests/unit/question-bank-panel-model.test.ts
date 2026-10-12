import { describe, expect, it } from "vitest";
import { questionBankPanelQuery } from "../../src/features/questionBank/questionBankPanelModel";

describe("questionBankPanelQuery", () => {
  it("builds compact query strings for editor bank filters", () => {
    expect(questionBankPanelQuery({
      q: " past verbs ",
      type: "reformulation",
      level: "A2",
      language: "en",
      tag: "grammar",
      schoolLevel: "seconde",
      languageTrack: "LVA",
      cefrLevel: "B1+",
      programAxis: "seconde_axis_3",
      languageActivity: "expression_ecrite",
      linguisticFocus: "simple past"
    })).toBe("q=past+verbs&type=reformulation&level=A2&language=en&tag=grammar&schoolLevel=seconde&languageTrack=LVA&cefrLevel=B1%2B&programAxis=seconde_axis_3&languageActivity=expression_ecrite&linguisticFocus=simple+past");
  });

  it("omits empty and default filters", () => {
    expect(questionBankPanelQuery({
      q: " ",
      type: "all",
      level: "",
      language: "all",
      tag: "",
      schoolLevel: "all",
      languageTrack: "all",
      cefrLevel: "all",
      programAxis: "all",
      languageActivity: "all",
      linguisticFocus: ""
    })).toBe("");
  });
});

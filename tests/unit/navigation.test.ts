import { describe, expect, it } from "vitest";
import { englishNavLabels, frenchNavLabels, topbarLinks } from "../../src/navigation";

describe("topbarLinks", () => {
  it("shows a discrete teacher-space header action to anonymous visitors", () => {
    const links = topbarLinks(null, englishNavLabels);

    expect(links.map((link) => link.href)).toEqual(["/", "/join", "/login"]);
    expect(links.map((link) => link.label)).toEqual(["Quiz", "Join a quiz", "Teacher space"]);
    expect(links.map((link) => link.variant)).toEqual(["highlight", "primary", "secondary"]);
  });

  it("keeps student live pages focused on the quiz flow", () => {
    expect(topbarLinks(null, englishNavLabels, { surface: "student" })).toEqual([]);
  });

  it("shows teacher space and classroom actions to authenticated teachers", () => {
    const links = topbarLinks({ role: "teacher" });

    expect(links.map((link) => link.href)).toEqual(["/dashboard", "/dashboard#launch", "/editor", "/dashboard#results", "#"]);
    expect(links.map((link) => link.label)).toEqual([
      frenchNavLabels.dashboard,
      frenchNavLabels.launchQuiz,
      frenchNavLabels.createQuiz,
      frenchNavLabels.results,
      frenchNavLabels.more
    ]);
    expect(links[4].children?.map((link) => link.label)).toEqual([
      frenchNavLabels.bank,
      frenchNavLabels.gallery,
      frenchNavLabels.settings
    ]);
  });

  it("shows admin actions to admins", () => {
    const links = topbarLinks({ role: "admin" });

    expect(links.map((link) => link.href)).toEqual(["/dashboard", "/dashboard#launch", "/editor", "/dashboard#results", "#"]);
    expect(links[4].children?.map((link) => link.label)).toEqual([
      frenchNavLabels.bank,
      frenchNavLabels.gallery,
      frenchNavLabels.admin,
      frenchNavLabels.settings
    ]);
  });

  it("uses injected labels for translated navigation", () => {
    expect(topbarLinks(null, englishNavLabels).map((link) => link.label)).toEqual(["Quiz", "Join a quiz", "Teacher space"]);
    expect(topbarLinks({ role: "teacher" }, englishNavLabels).map((link) => link.label)).toEqual([
      "Teacher space",
      "Launch quiz",
      "Create quiz",
      "Results",
      "More"
    ]);
  });

  it("uses teacher-space wording instead of dashboard wording", () => {
    expect(frenchNavLabels.dashboard).toBe("Espace prof");
    expect(englishNavLabels.dashboard).toBe("Teacher space");
  });
});

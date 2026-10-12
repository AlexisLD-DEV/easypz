import { describe, expect, it } from "vitest";
import { deleteSessionDialogContent, removeSessionFromHistory } from "../../src/features/dashboard/sessionHistoryModel";

describe("session history model", () => {
  it("removes a deleted session from the history list", () => {
    expect(removeSessionFromHistory([
      { id: "s1", quizTitle: "Quiz 1", code: "ABCD" },
      { id: "s2", quizTitle: "Quiz 2", code: "EFGH" }
    ], "s1")).toEqual([
      { id: "s2", quizTitle: "Quiz 2", code: "EFGH" }
    ]);
  });

  it("builds dialog content with quiz title and code", () => {
    expect(deleteSessionDialogContent({ quizTitle: "Irregular verbs", code: "ABCD" })).toEqual({
      title: "Supprimer cet historique ?",
      body: "La session \"Irregular verbs\" (code ABCD) et ses resultats seront supprimes. Le quiz reste disponible."
    });
  });
});

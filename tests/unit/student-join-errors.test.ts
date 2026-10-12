import { describe, expect, it } from "vitest";
import { studentJoinErrorMessage } from "../../src/features/live/joinErrors";

describe("studentJoinErrorMessage", () => {
  it("turns banned_name into a clear student-facing message", () => {
    expect(studentJoinErrorMessage("banned_name")).toBe("Ce prenom ne peut pas etre utilise.");
  });

  it("keeps known join errors clear", () => {
    expect(studentJoinErrorMessage("name_required")).toBe("Entre ton prenom pour rejoindre le quiz.");
    expect(studentJoinErrorMessage("rate_limited")).toBe("Trop de tentatives. Reessaie dans quelques minutes.");
    expect(studentJoinErrorMessage("session_not_found")).toBe("Ce code de quiz est introuvable.");
  });
});

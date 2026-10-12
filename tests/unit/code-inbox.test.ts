import { describe, expect, it } from "vitest";
import { emailSearchText, extractCodeInboxPayload, normalizeCodeInboxEmail } from "../../worker/codeInbox/model";

describe("code inbox", () => {
  it("accepts only codex ez1 aliases", () => {
    expect(normalizeCodeInboxEmail("Codex4f7r@ez1.fr")).toBe("codex4f7r@ez1.fr");
    expect(normalizeCodeInboxEmail("Easy <codex4f7r@ez1.fr>")).toBe("codex4f7r@ez1.fr");
    expect(normalizeCodeInboxEmail("admin@ez1.fr")).toBeNull();
    expect(normalizeCodeInboxEmail("codex4f7r@example.com")).toBeNull();
  });

  it("extracts a labelled one-time code", () => {
    expect(extractCodeInboxPayload({
      subject: "Votre code",
      raw: "Content-Type: text/plain\r\n\r\nCode de verification : 482 913"
    })).toEqual({ code: "482913", link: null });
  });

  it("extracts a magic link", () => {
    expect(extractCodeInboxPayload({
      raw: "Content-Type: text/html\r\n\r\n<a href=\"https://example.com/login?token=abc&amp;next=/home\">Connexion</a>"
    })).toEqual({ code: null, link: "https://example.com/login?token=abc&next=/home" });
  });

  it("decodes quoted printable text before searching", () => {
    expect(emailSearchText("Content-Transfer-Encoding: quoted-printable\r\n\r\nVotre code =\r\nest 7=32=33=34")).toContain("7234");
  });
});

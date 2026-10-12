import { describe, expect, it } from "vitest";
import { sessionCookieHeader } from "../../worker/auth/cookies";

describe("sessionCookieHeader", () => {
  it("keeps Secure on HTTPS requests", () => {
    const header = sessionCookieHeader("abc", new Request("https://quiz.ledeunf.fr/login"));

    expect(header).toContain("Secure");
  });

  it("omits Secure on local HTTP requests", () => {
    const header = sessionCookieHeader("abc", new Request("http://127.0.0.1:53211/login"));

    expect(header).not.toContain("Secure");
  });
});

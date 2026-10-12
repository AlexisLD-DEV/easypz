import { describe, expect, it } from "vitest";
import { emailSummaryButtonLabel, emailSummaryStatusMessage } from "../../src/features/results/sessionEmailModel";

const labels = {
  send: "Envoyer par email",
  sending: "Envoi...",
  sent: "Recap envoye a {email}.",
  notConfigured: "Email non configure : ajoute la cle Resend gratuite dans Cloudflare.",
  failed: "Impossible d'envoyer le recap pour le moment."
};

describe("session email model", () => {
  it("uses the sending label while the recap is being sent", () => {
    expect(emailSummaryButtonLabel({ sending: true }, labels)).toBe("Envoi...");
    expect(emailSummaryButtonLabel({ sending: false }, labels)).toBe("Envoyer par email");
  });

  it("formats success and configuration messages for the teacher", () => {
    expect(emailSummaryStatusMessage({ sentTo: "alexis@ledeunf.fr" }, labels))
      .toBe("Recap envoye a alexis@ledeunf.fr.");
    expect(emailSummaryStatusMessage({ error: "email_not_configured" }, labels))
      .toBe("Email non configure : ajoute la cle Resend gratuite dans Cloudflare.");
    expect(emailSummaryStatusMessage({ error: "email_send_failed" }, labels))
      .toBe("Impossible d'envoyer le recap pour le moment.");
  });
});

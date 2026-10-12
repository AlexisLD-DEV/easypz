import { describe, expect, it } from "vitest";
import { errorCodeFromReason, userFacingErrorMessage } from "../../src/errorMessages";

describe("userFacingErrorMessage", () => {
  it("maps API error codes to French user-facing copy", () => {
    expect(userFacingErrorMessage("fr", new Error("invalid_credentials"))).toBe("Email ou mot de passe incorrect.");
    expect(userFacingErrorMessage("fr", new Error("image_too_large"))).toBe("Image trop lourde. Limite : 3 Mo.");
    expect(userFacingErrorMessage("fr", new Error("rate_limited"))).toBe("Trop de tentatives. Reessaie dans quelques minutes.");
  });

  it("maps API error codes to English user-facing copy", () => {
    expect(userFacingErrorMessage("en", new Error("account_already_exists"))).toBe("An account already exists with this email.");
    expect(userFacingErrorMessage("en", new Error("rate_limited"))).toBe("Too many attempts. Try again in a few minutes.");
  });

  it("falls back to a generic message for unknown errors", () => {
    expect(userFacingErrorMessage("en", new Error("unexpected_code"))).toBe("Action unavailable right now. Try again in a moment.");
  });
});

describe("errorCodeFromReason", () => {
  it("extracts error codes from Error instances", () => {
    expect(errorCodeFromReason(new Error("quiz_not_found"))).toBe("quiz_not_found");
  });

  it("uses the fallback for non-error values", () => {
    expect(errorCodeFromReason(null, "image_upload_failed")).toBe("image_upload_failed");
  });
});

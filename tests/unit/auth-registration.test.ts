import { describe, expect, it } from "vitest";
import { registrationPreflight } from "../../worker/auth/registration";

describe("registrationPreflight", () => {
  it("rejects emails that are not allowlisted", () => {
    expect(registrationPreflight({ allowedRole: null, existingUserId: null })).toEqual({
      ok: false,
      status: 403,
      code: "email_not_allowed"
    });
  });

  it("rejects existing accounts before hashing the password", () => {
    expect(registrationPreflight({ allowedRole: "admin", existingUserId: "u1" })).toEqual({
      ok: false,
      status: 409,
      code: "account_already_exists"
    });
  });

  it("returns the role for a new allowed account", () => {
    expect(registrationPreflight({ allowedRole: "teacher", existingUserId: null })).toEqual({
      ok: true,
      role: "teacher"
    });
  });
});

type Role = "admin" | "teacher";

export function registrationPreflight({ allowedRole, existingUserId }: { allowedRole: Role | null; existingUserId: string | null }) {
  if (!allowedRole) {
    return { ok: false as const, status: 403, code: "email_not_allowed" };
  }
  if (existingUserId) {
    return { ok: false as const, status: 409, code: "account_already_exists" };
  }
  return { ok: true as const, role: allowedRole };
}

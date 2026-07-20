// Mirrors premium-packages-api's constants/permissions.ts canManagePackages
// — same restricted-role list, so sidebar visibility matches what the
// backend actually enforces on package management endpoints. This is a
// rendering convenience only; real authorization still lives server-side.
export type Role = "admin" | "superadmin" | "masteragent" | "whitelabel" | "agent" | "subagent" | "accounting" | "merchant";

const MANAGEMENT_RESTRICTED_ROLES: Role[] = ["agent", "masteragent", "subagent", "accounting"];

export function canManagePackages(role: string | undefined): boolean {
  if (!role) return false;
  return !MANAGEMENT_RESTRICTED_ROLES.includes(role as Role);
}
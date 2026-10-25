const ORG_CLIENT_MANAGER_ROLES = ["owner", "admin", "manager"] as const;

export function canManageOrgClients(role?: string | null): boolean {
  return !!role && (ORG_CLIENT_MANAGER_ROLES as readonly string[]).includes(role);
}

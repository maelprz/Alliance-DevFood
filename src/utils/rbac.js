// RBAC helpers for the UI. The server is the real gatekeeper: every API call is
// checked against the user's role and permissions in the database. These helpers
// only decide what to show and where to route.
// Exports only functions — React Compiler rule (one export type per file)

/**
 * Whether the logged-in user's role grants a permission.
 * `user.permissions` comes from POST /api/auth/login and GET /api/auth/me.
 * @param {{ permissions?: string[] } | null} user
 * @param {string} permission one of PERMISSIONS
 */
export function hasPermission(user, permission) {
  return Array.isArray(user?.permissions) && user.permissions.includes(permission);
}

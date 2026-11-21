





export const API_BASE = "/api";


export const SESSION_EXPIRED_EVENT = "devfood:session-expired";


export const ROLES = {
  CUSTOMER: "customer",
  ADMIN: "admin",
};


export const PERMISSIONS = {
  ADMIN_PANEL: "admin.panel",
  USERS_VIEW: "users.view",
  USERS_DEACTIVATE: "users.deactivate",
  PROFILE_MANAGE_OWN: "profile.manage_own",
  NOTIFICATIONS_READ_OWN: "notifications.read_own",
};


export const MAX_LOGIN_ATTEMPTS = 5;


export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;


export const PASSWORD_MIN_LENGTH = 8;


export const STORAGE_KEYS = {
  TOKEN: "devfood_token",
  USER: "devfood_user",
  ADMIN_TOKEN: "devfood_admin_token",
  LOGIN_ATTEMPTS: "devfood_login_attempts",
  LOCKOUT_UNTIL: "devfood_lockout_until",
};

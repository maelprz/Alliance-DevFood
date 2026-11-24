





export const API_BASE = "/api";


export const API_ROUTES = {
  REGISTER: `${API_BASE}/auth/register`,
  LOGIN: `${API_BASE}/auth/login`,
  LOGOUT: `${API_BASE}/auth/logout`,
  ME: `${API_BASE}/auth/me`,
  FORGOT_PASSWORD: `${API_BASE}/auth/forgot-password`,
  RESET_PASSWORD: `${API_BASE}/auth/reset-password`,
  USERS: `${API_BASE}/users`,
  NOTIFICATIONS: `${API_BASE}/notifications`,
  COUPONS: `${API_BASE}/coupons`,
};


export const TOTAL_COUNT_HEADER = "X-Total-Count";


export const RESET_TOKEN_PARAM = "reset_token";


export const NOTIFICATION_AUDIENCES = {
  ALL: "all",
  NEW_USERS: "new_users",
};


export const NOTIFICATION_TYPES = {
  ORDER_CONFIRMED: "order_confirmed",
  ORDER_STATUS: "order_status",
  COUPON: "coupon",
  BROADCAST: "broadcast",
};


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

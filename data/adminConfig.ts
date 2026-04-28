/**
 * Client-side fallback when `GET /admin/me` is unavailable (e.g. old API).
 * Primary admin list: database `admin_phones` + this bootstrap, merged on the server
 * (`AdminRoleService`). FlickShorts are capped at 15s via `start_sec` / `end_sec` on the server.
 */
export const ADMIN_ROLE_PHONE_DIGITS = new Set<string>(['9321538768']);

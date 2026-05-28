/** Backend API (Nest). Override with `VITE_API_BASE_URL` in `.env` / `.env.local`. */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

/** Contact Support mailto + footer (matches native `FIELDFLIX_SUPPORT_EMAIL`). */
export const SUPPORT_INBOX_EMAIL =
  import.meta.env.VITE_SUPPORT_INBOX_EMAIL ?? "admin@fieldflicks.com";

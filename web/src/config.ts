/** Backend API (Nest). Override with `VITE_API_BASE_URL` in `.env` / `.env.local`. */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

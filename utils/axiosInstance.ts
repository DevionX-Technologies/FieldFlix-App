// utils/axiosInstance.ts
import { BASE_URL } from "@/data/constants";
import { Paths } from "@/data/paths";
import { unwrapNestPayload } from "@/utils/unwrapNestPayload";
import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";

const defaultHeaders: Record<string, string> = {
  // Some mobile stacks send no UA; a few edge/WAF rules reject empty UAs
  "User-Agent": "FieldFlicks/1.0 (React Native; FieldFlicks Mobile)",
  ...(BASE_URL.includes("ngrok")
    ? { "ngrok-skip-browser-warning": "true" as const }
    : {}),
};

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: defaultHeaders,
});

/** Prevent repeated logout redirects when multiple requests fail together. */
let authRedirectInProgress = false;

/**
 * Endpoints that may return 401 for reasons unrelated to current user session.
 * We should not wipe auth storage globally for these.
 */
function shouldSkipGlobalAuthLogout(url: string): boolean {
  return (
    url.includes("/auth/send-otp") ||
    url.includes("/auth/verify-otp") ||
    url.includes("/recording/shared/media/")
  );
}

function isTransientNetworkError(error: AxiosError): boolean {
  if (error.response) return false;
  return (
    error.code === "ERR_NETWORK" ||
    error.code === "ECONNABORTED" ||
    String(error.message ?? "")
      .toLowerCase()
      .includes("network")
  );
}

// Inject token before request
axiosInstance.interceptors.request.use(
  async (
    config: InternalAxiosRequestConfig,
  ): Promise<InternalAxiosRequestConfig> => {
    const token = await SecureStore.getItemAsync("token");
    if (token) {
      const headers = AxiosHeaders.from(config.headers);
      headers.set("Authorization", `Bearer ${token}`);
      config.headers = headers;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Unwrap Nest success envelope for every call (so callers use `response.data` as the API payload)
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response.data !== undefined) {
      response.data = unwrapNestPayload(response.data);
    }
    return response;
  },
  async (error: AxiosError) => {
    const method = String(error.config?.method ?? "get").toLowerCase();
    const isGet = method === "get";
    const cfg = error.config as (InternalAxiosRequestConfig & { _retryOnce?: boolean }) | undefined;

    // One safe retry for idempotent GETs on transient transport failures only.
    if (isGet && cfg && !cfg._retryOnce && isTransientNetworkError(error)) {
      cfg._retryOnce = true;
      await new Promise((resolve) => setTimeout(resolve, 350));
      return axiosInstance(cfg);
    }

    return Promise.reject(error);
  }
);

// Handle 401 errors globally
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      const reqUrl = String(error.config?.url ?? "");
      if (shouldSkipGlobalAuthLogout(reqUrl)) {
        return Promise.reject(error);
      }

      // Ignore 401s for requests that did not carry auth.
      const authHeader =
        (error.config?.headers as Record<string, unknown> | undefined)
          ?.Authorization ??
        (error.config?.headers as Record<string, unknown> | undefined)
          ?.authorization;
      const tokenUsedByRequest =
        typeof authHeader === "string" && authHeader.startsWith("Bearer ")
          ? authHeader.slice("Bearer ".length)
          : null;

      const currentToken = await SecureStore.getItemAsync("token");
      if (!currentToken || !tokenUsedByRequest) {
        return Promise.reject(error);
      }

      // If user re-authenticated while this request was in-flight, do not force logout.
      if (tokenUsedByRequest !== currentToken) {
        return Promise.reject(error);
      }

      if (!authRedirectInProgress) {
        authRedirectInProgress = true;
        console.log("🔐 Session expired (401) – redirecting to login");
        await SecureStore.deleteItemAsync("token");
        await SecureStore.deleteItemAsync("fcmToken");
        router.replace(Paths.login);
        setTimeout(() => {
          authRedirectInProgress = false;
        }, 1000);
      }

      return Promise.reject(new Error("Session expired"));
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
